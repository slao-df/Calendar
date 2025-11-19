// routes/assistant.js
// 자연어 → 내부 MongoDB Event 생성
// - user / calendar 자동 추론
// - 캘린더 이름 부분 매칭
// - 한 번짜리 / 매주 반복 일정 구분
// - 한국어 자연어 파서(월/일/요일/시간/캘린더명/제목)

const router = require('express').Router();
const mongoose = require('mongoose');
const Event = require('../models/Event');

// Calendar 모델(있으면 사용, 없으면 null)
let Calendar = null;
try {
  Calendar = require('../models/Calendar');
} catch (_) {
  Calendar = null;
}

// ── validateJWT 안전 로드(함수/객체 어떤 형태든 대응, 없으면 통과) ──
let jwtModule = null;
try {
  jwtModule = require('../middlewares/validate-jwt');
} catch (_) {
  jwtModule = null;
}
const jwtMw =
  (jwtModule &&
    (typeof jwtModule === 'function'
      ? jwtModule
      : jwtModule.validateJWT || jwtModule.validarJWT)) ||
  ((_req, _res, next) => next());

// ───────────────────── 유틸: 한글 숫자 → 정수 ─────────────────────
const HAN_NUM = {
  '영': 0,
  '공': 0,
  '일': 1,
  '이': 2,
  '삼': 3,
  '사': 4,
  '오': 5,
  '육': 6,
  '륙': 6,
  '칠': 7,
  '팔': 8,
  '구': 9,
  '십': 10,
};

function parseKoreanNumberToken(s = '') {
  // 매우 단순: "십일"=11, "십이"=12, "일"=1 … 만 지원
  if (!s) return null;
  if (s.length === 1) return HAN_NUM[s] ?? null;

  // "십X"
  if (s.startsWith('십')) {
    const tail = HAN_NUM[s.slice(1)] ?? 0;
    return 10 + tail;
  }

  // "X십"
  if (s.endsWith('십')) {
    const head = HAN_NUM[s[0]] ?? 0;
    return head * 10;
  }

  // "X십Y"
  const m = s.match(/^([일이삼사오육륙칠팔구])?십([일이삼사오육륙칠팔구])?$/);
  if (m) {
    const a = m[1] ? HAN_NUM[m[1]] ?? 0 : 1;
    const b = m[2] ? HAN_NUM[m[2]] ?? 0 : 0;
    return a * 10 + b;
  }
  return null;
}

// ───────────────────── 자연어 파서 ─────────────────────
function robustParse(text = '') {
  // 1) 월: 숫자 "11월" / "11 월"
  let month = null;
  {
    const m = text.match(/([0-9０-９]{1,2})\s*월/);
    if (m) {
      const numStr = m[1].replace(/[０-９]/g, (d) =>
        String(d.charCodeAt(0) - 65248),
      );
      month = Number(numStr);
    }
  }
  // 2) 월: 한글 "십일월", "열한월", "열두월"
  if (!month) {
    const m2 = text.match(/([가-힣]{1,3})\s*월/);
    if (m2) {
      const tok = m2[1].replace('열한', '십일').replace('열두', '십이');
      const n = parseKoreanNumberToken(tok);
      if (n && n >= 1 && n <= 12) month = n;
    }
  }

  // 3) 일(day): "20일", "20 일"
  let day = null;
  {
    const d = text.match(/([0-9０-９]{1,2})\s*일/);
    if (d) {
      const numStr = d[1].replace(/[０-９]/g, (x) =>
        String(x.charCodeAt(0) - 65248),
      );
      day = Number(numStr);
    }
  }

  // 4) 요일: "월요일" 처럼 요일까지 있는 경우만 인식
  const weekdayMap = {
    '일요일': 0,
    '월요일': 1,
    '화요일': 2,
    '수요일': 3,
    '목요일': 4,
    '금요일': 5,
    '토요일': 6,
  };
  let weekday = null;
  for (const [k, v] of Object.entries(weekdayMap)) {
    if (text.includes(k)) {
      weekday = v;
      break;
    }
  }

  // 5) 시간 "13:00~14:00" / "13~14" / "13시~14시"
  let sh = null,
    sm = 0,
    eh = null,
    em = 0;
  let t =
    text.match(
      /(\d{1,2})(?::?(\d{2}))?\s*[\~\-–~]\s*(\d{1,2})(?::?(\d{2}))?/,
    ) ||
    text.match(/(\d{1,2})\s*시\s*[\~\-–~]\s*(\d{1,2})\s*시/);
  if (t) {
    sh = Number(t[1]);
    sm = t[2] ? Number(t[2]) : 0;
    eh = Number(t[3]);
    em = t[4] ? Number(t[4]) : 0;
  }

  // 6) 캘린더명: '회사' / "회사" / "회사 캘린더"
  let calendarSummary = null;
  {
    const m = text.match(/[\'\‘\’\"]([^\'\"\“\”]+)[\'\’\"]/);
    if (m && text.includes('캘린더')) {
      calendarSummary = m[1].trim();
    }
    if (!calendarSummary) {
      const m2 = text.match(/([가-힣A-Za-z0-9_\-\s]{1,30})\s*캘린더/);
      if (m2) calendarSummary = m2[1].trim();
    }
  }

  // 7) 제목(대략)
  let title = '일정';
  const titleMatch = text.match(
    /캘린더(?:에|에다)?\s*([^'"]+?)\s*(?:추가|등록|생성)/,
  );
  if (titleMatch) {
    title =
      titleMatch[1].trim().replace(
        /\s*(일정|회의|미팅|약속)?\s*(추가|등록|생성).*$/,
        '',
      ) || title;
  }
  if (title === '일정' && /회의|미팅/.test(text)) {
    title = '회의';
  }

  return { month, day, weekday, sh, sm, eh, em, calendarSummary, title };
}

// ───────── 해당 월의 특정 요일(0=일~6=토) 전부 구하기 ─────────
function allWeekdaysOfMonth(year, month /*1-12*/, weekday /*0-6*/) {
  const out = [];
  const d = new Date(year, month - 1, 1, 0, 0, 0, 0);
  while (d.getMonth() === month - 1) {
    if (d.getDay() === weekday) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// ───────── 사용자 자동 추론 ─────────
async function resolveUserId(req) {
  if (req.uid) return req.uid; // JWT 미들웨어가 세팅한 값
  const xUser = req.headers['x-user-id']; // 개발용 임시 헤더
  if (xUser) return xUser;
  if (req.body?.userId) return req.body.userId; // 최후
  return null;
}

// ───────── 캘린더 자동 추론 ─────────
async function resolveCalendarId({ userId, calendarId, calendarSummary }) {
  // 0) 명시적인 calendarId가 있으면 그대로 사용
  if (calendarId) return calendarId;
  if (!Calendar) return null;

  const calendars = await Calendar.find({ user: userId }).lean();
  if (!calendars.length) return null;

  // 자연어에서 캘린더 이름이 들어온 경우 → 최대한 이름 매칭
  if (calendarSummary) {
    const raw = calendarSummary.trim();
    const keyword = raw.replace(/캘린더|일정/g, '').trim();

    // (1) 완전 일치
    let found = calendars.find((c) => c.name === keyword);
    if (found) return found._id;

    // (2) 부분 포함
    found = calendars.find(
      (c) => c.name.includes(keyword) || keyword.includes(c.name),
    );
    if (found) return found._id;

    // (3) 원문 기준 부분 포함
    found = calendars.find(
      (c) => c.name.includes(raw) || raw.includes(c.name),
    );
    if (found) return found._id;

    // 이름까지 받았는데 못 찾으면 폴백하지 말고 null
    return null;
  }

  // 이름 자체가 없는 경우에만 첫 번째 캘린더로 폴백
  return calendars[0]._id;
}

// ───────── 라우트 ─────────
router.post('/', jwtMw, handler);

async function handler(req, res) {
  try {
    const now = new Date();
    const {
      text,
      month: mInput,
      day: dayInput,
      weekday: wdInput,
      startHour,
      startMinute = 0,
      endHour,
      endMinute = 0,
      untilDay,
      title: titleInput,
      notes = '',
      calendarId: calendarIdInput,
      calendarSummary: calendarSummaryInput,
      year: yearInput,
    } = req.body || {};

    // 1) 사용자 식별
    const userId = await resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        ok: false,
        msg: '인증 필요: 사용자 식별 불가(JWT 또는 x-user-id)',
      });
    }

    // 2) 자연어 원문 추출
    const rawText =
      (typeof text === 'string' && text) ||
      (typeof req.body?.prompt === 'string' && req.body.prompt) ||
      (typeof req.body?.message === 'string' && req.body.message) ||
      (typeof req.body?.query === 'string' && req.body.query) ||
      '';

    // 3) 자연어 파싱
    let parsed = {
      month: null,
      day: null,
      weekday: null,
      sh: null,
      sm: 0,
      eh: null,
      em: 0,
      calendarSummary: null,
      title: '일정',
    };
    if (rawText && rawText.trim()) {
      parsed = robustParse(rawText.trim());
    }

    const year = Number(yearInput) || now.getFullYear();
    const month = Number(mInput ?? parsed.month ?? now.getMonth() + 1);
    const day =
      dayInput != null
        ? Number(dayInput)
        : parsed.day != null
        ? Number(parsed.day)
        : null;
    const weekday =
      wdInput != null
        ? Number(wdInput)
        : parsed.weekday != null
        ? Number(parsed.weekday)
        : null;
    const sh = Number(startHour ?? parsed.sh ?? 9);
    const sm = Number(startMinute ?? parsed.sm ?? 0);
    const eh = Number(endHour ?? parsed.eh ?? sh + 1);
    const em = Number(endMinute ?? parsed.em ?? 0);
    const title = (titleInput ?? parsed.title ?? '일정').toString();

    // 4) 캘린더 결정
    const calendarId = await resolveCalendarId({
      userId,
      calendarId: calendarIdInput,
      calendarSummary: calendarSummaryInput ?? parsed.calendarSummary,
    });

    if (!calendarId) {
      const requestedName =
        calendarSummaryInput != null && calendarSummaryInput !== ''
          ? calendarSummaryInput
          : parsed.calendarSummary || '';
      return res.status(404).json({
        ok: false,
        msg:
          '캘린더를 찾지 못했습니다. (요청: "' +
          requestedName +
          '")',
      });
    }

    // 5) 디버그 로그
    console.log('[ASSISTANT PARSE]', {
      body: req.body,
      parsed,
      resolved: { year, month, day, weekday, sh, sm, eh, em, calendarId, userId },
    });

    const isEveryWeek = /매주/.test(rawText);

    // 6) 유효성 검사
    if (!month || Number.isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ ok: false, msg: 'month(1~12)가 필요합니다.' });
    }

    let docs = [];

    // (1) 하루짜리 일정
    if (!isEveryWeek && day != null && (weekday == null || Number.isNaN(weekday))) {
      const start = new Date(year, month - 1, day, sh, sm, 0, 0);
      const end = new Date(year, month - 1, day, eh, em, 0, 0);
      docs.push({ title, notes, start, end, user: userId, calendar: calendarId });
    }

    // (2) 매주 반복 일정
    else if (weekday != null && !Number.isNaN(weekday)) {
      const days = allWeekdaysOfMonth(year, month, weekday).filter(
        (d) => !untilDay || d.getDate() <= Number(untilDay),
      );

      if (!days.length) {
        return res
          .status(400)
          .json({ ok: false, msg: '해당 월에 해당 요일이 없습니다.' });
      }

      docs = days.map((d) => {
        const start = new Date(d);
        start.setHours(sh, sm || 0, 0, 0);
        const end = new Date(d);
        end.setHours(eh, em || 0, 0, 0);
        return { title, notes, start, end, user: userId, calendar: calendarId };
      });
    }

    // (3) 둘 다 아니라서 이해 못한 경우
    else {
      return res
        .status(400)
        .json({ ok: false, msg: '날짜 또는 요일 정보를 이해하지 못했습니다.' });
    }

    // 7) DB 저장
    const result = await Event.insertMany(docs, { ordered: true });

    return res.json({
      ok: true,
      inserted: result.length,
      user: userId,
      calendar: calendarId,
      year,
      month,
      day,
      weekday,
      time: {
        start: `${sh}:${String(sm).padStart(2, '0')}`,
        end: `${eh}:${String(em).padStart(2, '0')}`,
      },
    });
  } catch (e) {
    console.error('[ASSISTANT-LOCAL]', e);
    return res.status(500).json({ ok: false, msg: '이벤트 생성 실패' });
  }
}

module.exports = router;
