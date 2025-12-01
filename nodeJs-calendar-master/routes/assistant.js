// routes/assistant.js
// 자연어 → 내부 MongoDB Event 생성 + 비서형 추천
// - user / calendar 자동 추론
// - 캘린더 이름 부분 매칭 + 제목/내용 기반 추론
// - 한 번짜리 / 매주 반복 일정 구분
// - 한국어 자연어 파서(월/일/요일/시간/캘린더명/제목)
// - intent: 'create' / 'suggest-time'

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

// ───────────────────── 제목 추출 유틸 ─────────────────────
function extractTitleFromText(text = '') {
  // "사용자가 진짜로 말한 제목"이 있을 때만 문자열을 돌려주고,
  // 그냥 "일정 추가해줘" 같은 문장은 null을 반환
  let t = text.trim();

  // 1) 날짜/요일/시간 표현 제거
  t = t
    // 11월, 3월 같은 월
    .replace(/[0-9０-９]{1,2}\s*월/g, ' ')
    // 20일 같은 '일'(날짜) 제거
    .replace(/[0-9０-９]{1,2}\s*일/g, ' ')
    // 매주
    .replace(/매주/g, ' ')
    // 월요일, 화요일 …
    .replace(/[일월화수목금토]요일/g, ' ')
    // 15:00~16:00 / 15~16 등
    .replace(
      /\d{1,2}\s*[:시]\s*\d{0,2}\s*[\~\-–]\s*\d{1,2}\s*[:시]?\s*\d{0,2}/g,
      ' ',
    )
    // 3시부터 4시, 3시 4시 형식
    .replace(/\d{1,2}\s*시\s*(?:부터)?\s*\d{1,2}\s*시?/g, ' ');

  // 2) "일정 추가해줘" 같은 동사구 제거
  t = t.replace(
    /(일정\s*)?(추가|등록|생성|만들|잡아|예약)(해줘|해|해줘요)?/g,
    ' ',
  );

  // 기타 "해줘"류 제거
  t = t.replace(/해줘요?|해 줘/g, ' ');

  // 공백 정리
  t = t.replace(/\s+/g, ' ').trim();

  // 3) 남은 텍스트가 없거나, 그냥 '일정' 하나만 남았으면 제목 없음으로 본다
  if (!t || t === '일정') return null;

  // 4) 너무 길면 앞부분만 잘라서 사용
  if (t.length > 30) t = t.slice(0, 30).trim();

  return t || null;
}

// ───────────────────── 자연어 파서 ─────────────────────
function robustParse(text = '') {
  // 0) 프론트에서 숨겨서 보낸 제목 태그 [TITLE:회의] 추출
  let explicitTitle = null;
  {
    const m = text.match(/\[TITLE:([^\]]+)\]/);
    if (m) {
      explicitTitle = m[1].trim();
      text = text.replace(/\[TITLE:[^\]]+\]/, '').trim();
    }
  }

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
      /(\d{1,2})(?::?(\d{2}))?\s*[\~\-–]\s*(\d{1,2})(?::?(\d{2}))?/,
    ) ||
    text.match(/(\d{1,2})\s*시\s*[\~\-–]\s*(\d{1,2})\s*시/);
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

  // (0) "매주 여행 일정", "여행 일정" 같은 패턴에서 바로 뽑기
  // 예: "매주 회의 일정 만들고 싶은데", "매주 여행 일정 만들고 싶은데"
  const topicMatch = text.match(
    /(?:매주|이번주|다음주)?\s*([가-힣A-Za-z0-9_\s]{1,20})\s*일정/
  );
  if (topicMatch) {
    const topic = topicMatch[1].trim();
    if (topic && topic !== '매주') {
      title = topic; // 예: "여행", "회의"
    }
  }

  // (1) "캘린더에 ~ 추가" 패턴이 있는 경우 우선 시도
  if (title === '일정') {
    const titleMatch = text.match(
      /캘린더(?:에|에다)?\s*([^'"]+?)\s*(?:추가|등록|생성)/,
    );
    if (titleMatch) {
      title =
        titleMatch[1]
          .trim()
          .replace(
            /\s*(일정|회의|미팅|약속)?\s*(추가|등록|생성).*$/,
            '',
          ) || title;
    }
  }

  // (2) 일반적인 "… 추가해줘" 문장에서 제목 추출
  if (title === '일정') {
    const extracted = extractTitleFromText(text);
    if (extracted) {
      title = extracted;
    }
  }

  // (3) 그래도 여전히 '일정'이면 회의/미팅 키워드로 폴백
  if (title === '일정' && /회의|미팅/.test(text)) {
    title = '회의';
  }

  // (4) 숨은 태그로 제목이 명시된 경우 최우선 사용
  if (explicitTitle && explicitTitle.trim().length > 0) {
    title = explicitTitle.trim();
  }

  // (5) 한 글자밖에 안 남은 경우는 의미 없다고 보고 '일정'으로 통일
  if (!title || title.trim().length < 2) {
    title = '일정';
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

// ───────── 의도(intent) 판단 ─────────
function detectIntent(text = '', parsed = {}) {
  const t = text.trim();

  // 추천 관련 키워드
  const suggestKeywords = ['추천', '괜찮', '좋을까', '어떤 요일', '언제가 좋'];
  if (suggestKeywords.some((k) => t.includes(k))) {
    return 'suggest-time';
  }

  // 생성 관련 키워드 + 날짜/요일이 있는 경우
  const createKeywords = ['추가해', '등록해', '잡아줘', '만들어줘', '생성해', '추가해줘'];
  const hasDateInfo =
    parsed.month != null || parsed.day != null || parsed.weekday != null;

  if (createKeywords.some((k) => t.includes(k)) && hasDateInfo) {
    return 'create';
  }

  // 기본값: 날짜 정보가 있으면 생성, 없으면 추천
  return hasDateInfo ? 'create' : 'suggest-time';
}

// ───────── 요일/시간 추천 ─────────
async function suggestWeeklyTimes({ userId, baseDate = new Date(), durationMin = 60 }) {
  const year = baseDate.getFullYear();
  const monthIdx = baseDate.getMonth(); // 0~11

  const startOfMonth = new Date(year, monthIdx, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);

  const events = await Event.find({
    user: userId,
    start: { $gte: startOfMonth, $lte: endOfMonth },
  }).lean();

  // 요일별 "바쁨 정도" 점수 (밀리초 합)
  const busyScore = [0, 0, 0, 0, 0, 0, 0]; // 일~토

  for (const ev of events) {
    const s = new Date(ev.start);
    const e = new Date(ev.end || ev.start);
    const wd = s.getDay();
    const diff = Math.max(e - s, 0);
    busyScore[wd] += diff;
  }

  // 평일만 대상으로 가장 덜 바쁜 2개 추천
  const weekdayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const candidates = [1, 2, 3, 4, 5]; // 월~금

  const sorted = candidates
    .slice()
    .sort((a, b) => busyScore[a] - busyScore[b])
    .slice(0, 2);

  const suggestions = sorted.map((wd, idx) => ({
    year,
    month: monthIdx + 1,           // 1~12
    weekday: wd,                   // 1=월 ~ 5=금
    startHour: idx === 0 ? 15 : 10,
    endHour: idx === 0 ? 16 : 11,
    label: `${weekdayNames[wd]} ${idx === 0 ? '오후 3시' : '오전 10시'}`,
  }));

  return { year, month: monthIdx + 1, suggestions };
}

// ───────── 사용자 자동 추론 ─────────
async function resolveUserId(req) {
  if (req.uid) return req.uid; // JWT 미들웨어가 세팅한 값
  const xUser = req.headers['x-user-id']; // 개발용 임시 헤더
  if (xUser) return xUser;
  if (req.body?.userId) return req.body.userId; // 최후
  return null;
}

// ───────── 캘린더 자동 추론 (제목/텍스트 기반 힌트 포함) ─────────
async function resolveCalendarId({
  userId,
  calendarId,
  calendarSummary,
  hintTitle,
  rawText,
}) {
  // 0) 명시적인 calendarId가 있으면 그대로 사용
  if (calendarId) return calendarId;
  if (!Calendar) return null;

  const calendars = await Calendar.find({ user: userId }).lean();
  if (!calendars.length) return null;

  // 1) 자연어에서 캘린더 이름이 들어온 경우 → 최대한 이름 매칭
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

  // 2) 제목/원문 텍스트 기반 힌트
  const text = `${hintTitle || ''} ${rawText || ''}`;

  if (text.trim()) {
    // 업무/회사 관련 키워드 → '회사/업무/work/office' 같은 캘린더 우선
    const businessKw = /(회의|미팅|업무|보고|프로젝트|회사|office|work)/;
    const tripKw = /(여행|trip|tour|휴가|holiday)/i;

    if (businessKw.test(text)) {
      const workCal = calendars.find((c) =>
        /(회사|업무|office|work|직장)/i.test(c.name),
      );
      if (workCal) return workCal._id;
    }

    if (tripKw.test(text)) {
      const travelCal = calendars.find((c) =>
        /(여행|trip|tour|travel)/i.test(c.name),
      );
      if (travelCal) return travelCal._id;
    }
  }

  // 3) 위에 해당 안 되면 기존처럼 첫 번째 캘린더
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
        msg: '로그인이 필요해요. 다시 한 번 시도해 주세요.',
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

    // 최종 제목 결정: 한 글자 이하이면 무조건 '일정'으로 폴백
    let rawTitle = (titleInput ?? parsed.title ?? '일정');
    rawTitle = rawTitle.toString().trim();
    const title = !rawTitle || rawTitle.length < 2 ? '일정' : rawTitle;

    // 4) intent 판단 (추천 vs 생성)
    const intent = detectIntent(rawText, parsed);

    // ───────── intent === 'suggest-time' : 요일/시간 추천만 ─────────
    if (intent === 'suggest-time') {
      const { suggestions } = await suggestWeeklyTimes({
        userId,
        baseDate: now,
        durationMin: 60,
      });

      const koWeek = ['일', '월', '화', '수', '목', '금', '토'];
      const msgLines = suggestions.map(
        (s, idx) =>
          `${idx + 1}. ${koWeek[s.weekday]}요일 ${s.label.split(' ')[1]}`
      );
      const answer =
        `이번 달 일정 기준으로는\n` +
        msgLines.join('\n') +
        `\n쪽이 가장 여유 있어 보여요.\n원하는 시간을 선택해서 다시 말씀해 주세요.`;

      // 사용자가 처음 보낸 문장에서 뽑은 기본 제목(회의, 여행 등)
      const baseTitle =
        parsed.title &&
        parsed.title !== '일정' &&
        parsed.title.trim().length >= 2
          ? parsed.title.trim()
          : null;

      return res.json({
        ok: true,
        mode: 'suggest-time',
        answer,
        suggestions,
        baseTitle, // 프론트에서 두 번째 요청에 함께 반영하기 위한 기본 제목
      });
    }

    // ───────── intent === 'create' : 실제 일정 생성 ─────────

    // 5) 캘린더 결정
    const calendarId = await resolveCalendarId({
      userId,
      calendarId: calendarIdInput,
      calendarSummary: calendarSummaryInput ?? parsed.calendarSummary,
      hintTitle: title,
      rawText,
    });

    if (!calendarId) {
      const requestedName =
        calendarSummaryInput != null && calendarSummaryInput !== ''
          ? calendarSummaryInput
          : parsed.calendarSummary || '';
      return res.status(404).json({
        ok: false,
        msg:
          '어디에 일정을 넣어야 할지 찾지 못했어요. 캘린더 이름을 한 번 더 말씀해 주실래요?',
        requestedName,
      });
    }

    // 5-1) 전시용: 캘린더 이름도 함께 응답에 내려주기
    let calendarName = null;
    if (Calendar) {
      try {
        const cal = await Calendar.findById(calendarId).lean();
        if (cal) calendarName = cal.name;
      } catch (_) {
        // 캘린더 이름 조회 실패 시에는 그냥 null 유지
      }
    }

    // 6) 디버그 로그 (전시 때는 NODE_ENV=production 으로 두면 안 찍힘)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ASSISTANT PARSE]', {
        body: req.body,
        parsed,
        resolved: {
          year,
          month,
          day,
          weekday,
          sh,
          sm,
          eh,
          em,
          calendarId,
          userId,
          finalTitle: title,
        },
      });
    }

    const isEveryWeek = /매주/.test(rawText);

    // 7) 유효성 검사
    if (!month || Number.isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({
        ok: false,
        msg:
          '언제인지 잘 이해하지 못했어요. 예를 들어 "11월 3일 오후 3시"처럼 다시 말씀해 주세요.',
      });
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
        return res.status(400).json({
          ok: false,
          msg:
            '해당 월에는 요청하신 요일이 없어요. 다른 달이나 요일로 다시 말씀해 주세요.',
        });
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
      return res.status(400).json({
        ok: false,
        msg:
          '날짜와 시간을 잘 이해하지 못했어요.\n"11월 3일 오후 3시에 회의 잡아줘"처럼 다시 한 번 말씀해 주세요.',
      });
    }

    // 8) DB 저장
    const result = await Event.insertMany(docs, { ordered: true });

    return res.json({
      ok: true,
      mode: 'create',
      inserted: result.length,
      user: userId,
      calendar: calendarId,
      calendarName: calendarName || null, // 전시용: 캘린더 이름
      title,                               // 전시용: 최종 일정 제목
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
    return res.status(500).json({
      ok: false,
      msg:
        '일정을 만드는 동안 문제가 발생했어요. 잠시 후에 다시 시도해 주세요.',
    });
  }
}

module.exports = router;

// update
