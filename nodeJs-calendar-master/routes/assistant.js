// routes/assistant.js
// 자연어 → 내부 MongoDB Event 생성 + 비서형 추천/삭제/조회/질문/공유 메일
// - user / calendar 자동 추론
// - 캘린더 이름 부분 매칭 + 제목/내용 기반 추론
// - 한 번짜리 / 매주 반복 일정 구분
// - 한국어 자연어 파서(월/일/요일/시간/캘린더명/제목)
// - intent: 'chat' / 'clarify-date' / 'create' / 'suggest-time' / 'delete' / 'query' / 'share-calendar'

const router = require("express").Router();
const mongoose = require("mongoose");
const Event = require("../models/Event");

let Calendar = null;
try {
  Calendar = require("../models/Calendar");
} catch (_) {
  Calendar = null;
}

let User = null;
try {
  User = require("../models/User");
} catch (_) {
  User = null;
}

// ───────────────────── 추가: Gemini / 이메일 설정 ─────────────────────
const { GoogleGenerativeAI } = require("@google/generative-ai");
const nodemailer = require("nodemailer");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const MAIL_USER = process.env.MAIL_USER || "";
const MAIL_PASS = process.env.MAIL_PASS || "";
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:3000").replace(
  /\/+$/,
  ""
);

let geminiModel = null;

/**
 * Gemini 모델 초기화(필요할 때 한 번만)
 */
function ensureGeminiModel() {
  if (!GEMINI_API_KEY) return null;
  if (geminiModel) return geminiModel;
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    return geminiModel;
  } catch (e) {
    console.error("[ASSISTANT CHAT] Gemini 초기화 오류:", e);
    geminiModel = null;
    return null;
  }
}

/**
 * 일반 대화용 Gemini 호출
 * - Schedy(공유 캘린더 비서) 역할을 설명하도록 system 성격의 프롬프트 포함
 * - 오류 시에는 안내용 기본 답변으로 fallback
 */
async function runGeneralChat(userText) {
  const model = ensureGeminiModel();

  const fallback =
    "저는 'Schedy'라는 이름의 **공유 캘린더 도우미**예요.\n" +
    "이 캘린더 안에서 일정 추가·추천·삭제·조회 같은 일을 도와주고,\n" +
    "가벼운 질문이나 고민에도 답변을 드릴 수 있습니다.\n\n" +
    "예를 들어,\n" +
    '- "다음 주 화요일 오후 3시에 회의 일정 추가해줘"\n' +
    '- "이번 달 중에 여행 가기 좋은 날 추천해줘"\n' +
    '- "회사1 일정 삭제해줘"\n' +
    "처럼 말씀하시면 캘린더를 대신 조작해 드려요. 🙂";

  if (!model) return fallback;

  const systemPrompt =
    "너는 'Schedy'라는 이름의 **공유 캘린더/스케줄 관리 도우미**다. " +
    "사용자와는 항상 한국어로 대화하고, 우선 사용자의 질문이 일정/시간/약속과 관련된지 살펴본다. " +
    "관련이 있을 경우, 캘린더 안에서 어떤 도움을 줄 수 있는지 먼저 짧게 안내한 뒤 답변한다. " +
    "코딩 공부처럼 캘린더와 직접적 관련이 없는 질문도 친절하게 답해도 되지만, " +
    "네가 '공유 캘린더 내부에서 동작하는 비서'라는 정체성을 1~2문장 정도에서 자연스럽게 언급해라. " +
    "답변은 최대한 간결하고 단계적으로 설명해라.";

  const fullPrompt = `${systemPrompt}\n\n사용자 질문: ${userText}`;

  try {
    const result = await model.generateContent(fullPrompt);
    const response = result && result.response;
    const text =
      (response && typeof response.text === "function"
        ? response.text()
        : "") || "";
    if (text.trim()) return text.trim();
    return fallback;
  } catch (err) {
    console.error("[ASSISTANT CHAT][Gemini] 호출 오류:", err);
    return fallback;
  }
}

// ───────────────────── 이메일 전송 설정 ─────────────────────

let mailer = null;
if (MAIL_USER && MAIL_PASS) {
  mailer = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: MAIL_USER,
      pass: MAIL_PASS,
    },
  });
}

/**
 * Calendar 문서에 shareId / sharePassword가 없으면 생성해 주는 헬퍼
 */
async function ensureCalendarShareFields(calendarDoc) {
  if (!calendarDoc || !Calendar) return null;
  let updated = false;
  const update = {};

  if (!calendarDoc.shareId) {
    update.shareId = new mongoose.Types.ObjectId().toString();
    updated = true;
  }
  if (!calendarDoc.sharePassword) {
    update.sharePassword = Math.random().toString(36).slice(-10);
    updated = true;
  }

  if (updated) {
    await Calendar.findByIdAndUpdate(calendarDoc._id, { $set: update });
    return { ...calendarDoc, ...update };
  }
  return calendarDoc;
}

/**
 * 캘린더 공유 이메일 전송
 * - from: 공용 발신 주소(MAIL_USER)
 * - 본문에 실제 사용자 이름/이메일을 최대한 표시
 */
async function sendCalendarShareMail({ to, calendar, owner }) {
  if (!mailer) {
    throw new Error("메일 발송 설정(MAIL_USER/MAIL_PASS)이 되어 있지 않습니다.");
  }

  const ownerName =
    owner?.name ||
    owner?.nombre ||
    owner?.displayName ||
    owner?.username ||
    "";
  const ownerEmail = owner?.email || owner?.correo || "";

  const subject = `[Schedy] '${calendar.name}' 캘린더 공유 초대`;
  const shareLink = `${FRONTEND_URL}/share/${calendar.shareId}`;

  const lines = [
    "안녕하세요.",
    "",
    `'${calendar.name}' 캘린더가 공유되었습니다.`,
    "",
    `공유 링크: ${shareLink}`,
    `비밀번호: ${calendar.sharePassword || "(설정된 비밀번호가 없습니다.)"}`,
    "",
  ];
  if (ownerName || ownerEmail) {
    lines.push(
      `보낸 사람: ${ownerName || "알 수 없음"}${
        ownerEmail ? ` (${ownerEmail})` : ""
      }`
    );
  }
  lines.push("", "감사합니다.\nSchedy 공유 캘린더 드림.");

  await mailer.sendMail({
    from: `"Schedy 캘린더" <${MAIL_USER}>`,
    to,
    subject,
    text: lines.join("\n"),
  });
}

// ── validateJWT 안전 로드(함수/객체 어떤 형태든 대응, 없으면 통과) ──
let jwtModule = null;
try {
  jwtModule = require("../middlewares/validate-jwt");
} catch (_) {
  jwtModule = null;
}
const jwtMw =
  (jwtModule &&
    (typeof jwtModule === "function"
      ? jwtModule
      : jwtModule.validateJWT || jwtModule.validarJWT)) ||
  ((_req, _res, next) => next());

// ───────────────────── 유틸: 한글 숫자 → 정수 ─────────────────────
const HAN_NUM = {
  "영": 0,
  "공": 0,
  "일": 1,
  "이": 2,
  "삼": 3,
  "사": 4,
  "오": 5,
  "육": 6,
  "륙": 6,
  "칠": 7,
  "팔": 8,
  "구": 9,
  "십": 10,
};

function parseKoreanNumberToken(s = "") {
  if (!s) return null;
  if (s.length === 1) return HAN_NUM[s] ?? null;

  // "십X"
  if (s.startsWith("십")) {
    const tail = HAN_NUM[s.slice(1)] ?? 0;
    return 10 + tail;
  }

  // "X십"
  if (s.endsWith("십")) {
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
function extractTitleFromText(text = "") {
  // "사용자가 진짜로 말한 제목"이 있을 때만 문자열을 돌려주고,
  // 그냥 "일정 추가해줘" 같은 문장은 null을 반환
  let t = text.trim();

  // 1) 날짜/요일/시간 표현 제거
  t = t
    // 11월, 3월 같은 월
    .replace(/[0-9０-９]{1,2}\s*월/g, " ")
    // 20일 같은 '일'(날짜) 제거
    .replace(/[0-9０-９]{1,2}\s*일/g, " ")
    // 매주
    .replace(/매주/g, " ")
    // 월요일, 화요일 …
    .replace(/[일월화수목금토]요일/g, " ")
    // 15:00~16:00 / 15~16 등
    .replace(
      /\d{1,2}\s*[:시]\s*\d{0,2}\s*[\~\-–]\s*\d{1,2}\s*[:시]?\s*\d{0,2}/g,
      " "
    )
    // 3시부터 4시, 3시 4시 형식
    .replace(/\d{1,2}\s*시\s*(?:부터)?\s*\d{1,2}\s*시?/g, " ");

  // 2) "일정 추가해줘" 같은 동사구 제거
  t = t.replace(
    /(일정\s*)?(추가|등록|생성|만들|잡아|예약)(해줘|해|해줘요)?/g,
    " "
  );

  // 기타 "해줘"류 제거
  t = t.replace(/해줘요?|해 줘/g, " ");

  // 공백 정리
  t = t.replace(/\s+/g, " ").trim();

  // 3) 남은 텍스트가 없거나, 그냥 '일정' 하나만 남았으면 제목 없음으로 본다
  if (!t || t === "일정") return null;

  // 4) 너무 길면 앞부분만 잘라서 사용
  if (t.length > 30) t = t.slice(0, 30).trim();

  return t || null;
}

// ───────────────────── 자연어 파서 ─────────────────────
function robustParse(text = "") {
  // 0) 프론트에서 숨겨서 보낸 제목 태그 [TITLE:회의] 추출
  let explicitTitle = null;
  {
    const m = text.match(/\[TITLE:([^\]]+)\]/);
    if (m) {
      explicitTitle = m[1].trim();
      text = text.replace(/\[TITLE:[^\]]+\]/, "").trim();
    }
  }

  // 1) 월: 숫자 "11월" / "11 월"
  let month = null;
  {
    const m = text.match(/([0-9０-９]{1,2})\s*월/);
    if (m) {
      const numStr = m[1].replace(/[０-９]/g, (d) =>
        String(d.charCodeAt(0) - 65248)
      );
      month = Number(numStr);
    }
  }
  // 2) 월: 한글 "십일월", "열한월", "열두월"
  if (!month) {
    const m2 = text.match(/([가-힣]{1,3})\s*월/);
    if (m2) {
      const tok = m2[1].replace("열한", "십일").replace("열두", "십이");
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
        String(x.charCodeAt(0) - 65248)
      );
      day = Number(numStr);
    }
  }

  // 4) 요일: "월요일" 처럼 요일까지 있는 경우만 인식
  const weekdayMap = {
    "일요일": 0,
    "월요일": 1,
    "화요일": 2,
    "수요일": 3,
    "목요일": 4,
    "금요일": 5,
    "토요일": 6,
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
      /(\d{1,2})(?::?(\d{2}))?\s*[\~\-–]\s*(\d{1,2})(?::?(\d{2}))?/
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
    if (m && text.includes("캘린더")) {
      calendarSummary = m[1].trim();
    }
    if (!calendarSummary) {
      const m2 = text.match(/([가-힣A-Za-z0-9_\-\s]{1,30})\s*캘린더/);
      if (m2) calendarSummary = m2[1].trim();
    }
  }

  // 7) 제목(대략)
  let title = "일정";

  // (0) "매주 여행 일정", "여행 일정" 같은 패턴에서 바로 뽑기
  const topicMatch = text.match(
    /(?:매주|이번주|다음주)?\s*([가-힣A-Za-z0-9_\s]{1,20})\s*일정/
  );
  if (topicMatch) {
    const topic = topicMatch[1].trim();
    if (topic && topic !== "매주") {
      title = topic;
    }
  }

  // (1) "캘린더에 ~ 추가" 패턴
  if (title === "일정") {
    const titleMatch = text.match(
      /캘린더(?:에|에다)?\s*([^'"]+?)\s*(?:추가|등록|생성)/
    );
    if (titleMatch) {
      title =
        titleMatch[1]
          .trim()
          .replace(
            /\s*(일정|회의|미팅|약속)?\s*(추가|등록|생성).*$/,
            ""
          ) || title;
    }
  }

  // (2) 일반적인 문장에서 제목 추출
  if (title === "일정") {
    const extracted = extractTitleFromText(text);
    if (extracted) {
      title = extracted;
    }
  }

  // (3) 회의/미팅 키워드
  if (title === "일정" && /회의|미팅/.test(text)) {
    title = "회의";
  }

  // (4) 숨은 태그가 있으면 최우선
  if (explicitTitle && explicitTitle.trim().length > 0) {
    title = explicitTitle.trim();
  }

  // (5) 한 글자밖에 안 남은 경우는 의미 없다고 보고 '일정'
  if (!title || title.trim().length < 2) {
    title = "일정";
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

// ───────── intent 판단 ─────────
function detectIntent(text = "", parsed = {}) {
  const t = (text || "").trim();

  const calendarKeywords = [
    "일정",
    "스케줄",
    "캘린더",
    "약속",
    "회의",
    "미팅",
    "행사",
    "예약",
  ];
  const hasCalendarWord = calendarKeywords.some((k) => t.includes(k));

  const hasExplicitDateInfo =
    parsed.month != null ||
    parsed.day != null ||
    parsed.weekday != null ||
    parsed.sh != null ||
    parsed.eh != null;

  const timePattern = /\d{1,2}\s*시|\d{1,2}\s*[:시]\s*\d{0,2}/;
  const hasTimePattern = timePattern.test(t);

  const suggestKeywords = ["추천", "괜찮", "좋을까", "어떤 요일", "언제가 좋"];
  const hasSuggestWord = suggestKeywords.some((k) => t.includes(k));

  const createKeywords = [
    "추가해",
    "등록해",
    "잡아줘",
    "만들어줘",
    "생성해",
    "추가해줘",
    "추가",
  ];
  const hasCreateWord = createKeywords.some((k) => t.includes(k));

  const deleteKeywords = [
    "삭제",
    "지워",
    "지워줘",
    "없애",
    "취소해",
    "지워라",
    "지워줘요",
  ];
  const hasDeleteWord = deleteKeywords.some((k) => t.includes(k));

  const queryKeywords = [
    "보여줘",
    "있었어",
    "있어?",
    "있어",
    "알려줘",
    "확인",
    "어땠어",
    "정리해줘",
  ];
  const hasQueryWord = queryKeywords.some((k) => t.includes(k));

  const relativeDayPattern = /(어제|오늘|내일|모레)/;
  const hasRelativeDay = relativeDayPattern.test(t);

  const rangeKeywords =
    /(어제|오늘|내일|모레|이번주|이번 주|다음주|다음 주|이번달|이번 달|다음달|다음 달|지난달|지난 달)/;
  const hasRangeWord = rangeKeywords.test(t);

  const hasAnyDateInfo =
    hasExplicitDateInfo || hasTimePattern || hasRelativeDay;

  // ── 공유 메일 전송 intent ──
  const shareKeywords = ["공유", "초대", "share", "invite"];
  const hasShareWord = shareKeywords.some((k) => t.includes(k));
  const emailPattern =
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  const emailKeywords = ["이메일", "메일", "email"];
  const hasEmailWord =
    emailPattern.test(t) ||
    emailKeywords.some((k) => t.toLowerCase().includes(k));

  if (hasCalendarWord && hasShareWord && hasEmailWord) {
    return "share-calendar";
  }

  // 삭제
  if (hasDeleteWord && hasCalendarWord) {
    return "delete";
  }

  // 일정 조회
  if (hasQueryWord && hasCalendarWord) {
    return "query";
  }

  // 날짜가 빠진 애매한 "일정 추가" → 날짜/시간 확인
  if (
    (hasCreateWord || hasCalendarWord) &&
    !hasAnyDateInfo &&
    !hasSuggestWord &&
    !hasDeleteWord &&
    !hasQueryWord
  ) {
    return "clarify-date";
  }

  // 추천 관련 키워드
  if (hasSuggestWord) {
    return "suggest-time";
  }

  // 생성 관련
  if ((hasCreateWord || hasCalendarWord) && (hasAnyDateInfo || hasRangeWord)) {
    return "create";
  }

  // 완전 일반 대화
  if (
    !hasCalendarWord &&
    !hasExplicitDateInfo &&
    !hasTimePattern &&
    !hasSuggestWord &&
    !hasCreateWord &&
    !hasDeleteWord &&
    !hasQueryWord &&
    !hasRangeWord
  ) {
    return "chat";
  }

  // 기본값: 캘린더 관련이면 생성, 아니면 chat
  if (hasCalendarWord) return "create";
  return "chat";
}

// ───────── 정규식 escape ─────────
function escapeRegex(str = "") {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ───────── 조회/삭제용 기간 해석 ─────────
function resolveQueryRange(text = "", baseDate = new Date()) {
  const t = text || "";
  const now = baseDate;
  const start = new Date(now);
  const end = new Date(now);
  let label = "";

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (/어제/.test(t)) {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
    label = "어제 기준으로";
  } else if (/내일/.test(t)) {
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);
    label = "내일 기준으로";
  } else if (/모레/.test(t)) {
    start.setDate(start.getDate() + 2);
    end.setDate(end.getDate() + 2);
    label = "모레 기준으로";
  } else if (/오늘/.test(t)) {
    label = "오늘 기준으로";
  } else if (/이번주|이번 주/.test(t)) {
    const day = start.getDay();
    const diffToMon = (day + 6) % 7;
    start.setDate(start.getDate() - diffToMon);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    label = "이번 주 기준으로";
  } else if (/다음주|다음 주/.test(t)) {
    const day = start.getDay();
    const diffToMon = (day + 6) % 7;
    start.setDate(start.getDate() - diffToMon + 7);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    label = "다음 주 기준으로";
  } else if (/지난달|지난 달/.test(t)) {
    start.setMonth(start.getMonth() - 1, 1);
    end.setMonth(end.getMonth() - 1 + 1, 0);
    label = "지난 달 기준으로";
  } else if (/이번달|이번 달/.test(t)) {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
    label = "이번 달 기준으로";
  } else if (/다음달|다음 달/.test(t)) {
    start.setMonth(start.getMonth() + 1, 1);
    end.setMonth(end.getMonth() + 1 + 1, 0);
    label = "다음 달 기준으로";
  } else {
    label = "최근 1년에서";
    start.setFullYear(start.getFullYear() - 1);
  }

  return { start, end, label };
}

// ───────── 추천용: 이번 달에서 상대적으로 덜 바쁜 날짜 2개 ─────────
function nextDateForWeekdayInMonth(year, monthIdx, weekday, baseDate) {
  const d = new Date(year, monthIdx, baseDate.getDate(), 0, 0, 0, 0);
  let safe = 0;
  while (d.getMonth() === monthIdx && d.getDay() !== weekday && safe < 40) {
    d.setDate(d.getDate() + 1);
    safe++;
  }
  if (d.getMonth() === monthIdx && d.getDay() === weekday) return d;

  const d2 = new Date(year, monthIdx, 1, 0, 0, 0, 0);
  safe = 0;
  while (d2.getMonth() === monthIdx && d2.getDay() !== weekday && safe < 40) {
    d2.setDate(d2.getDate() + 1);
    safe++;
  }
  return d2;
}

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

  const weekdayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const candidates = [1, 2, 3, 4, 5]; // 월~금

  const sorted = candidates
    .slice()
    .sort((a, b) => busyScore[a] - busyScore[b])
    .slice(0, 2);

  const suggestions = sorted.map((wd, idx) => {
    const startHour = idx === 0 ? 15 : 10;
    const endHour = startHour + durationMin / 60;
    const date = nextDateForWeekdayInMonth(year, monthIdx, wd, baseDate);

    return {
      year,
      month: monthIdx + 1,
      day: date.getDate(),
      weekday: wd,
      startHour,
      startMinute: 0,
      endHour,
      endMinute: 0,
      label: `${monthIdx + 1}월 ${date.getDate()}일(${weekdayNames[wd]}) ${String(
        startHour
      ).padStart(2, "0")}:00~${String(endHour).padStart(2, "0")}:00`,
    };
  });

  return { year, month: monthIdx + 1, suggestions };
}

// ───────── 사용자 자동 추론 ─────────
async function resolveUserId(req) {
  if (req.uid) return req.uid; // JWT 미들웨어가 세팅한 값
  const xUser = req.headers["x-user-id"]; // 개발용 임시 헤더
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
    const keyword = raw.replace(/캘린더|일정/g, "").trim();

    // (1) 완전 일치
    let found = calendars.find((c) => c.name === keyword);
    if (found) return found._id;

    // (2) 부분 포함
    found = calendars.find(
      (c) => c.name.includes(keyword) || keyword.includes(c.name)
    );
    if (found) return found._id;

    // (3) 원문 기준 부분 포함
    found = calendars.find(
      (c) => c.name.includes(raw) || raw.includes(c.name)
    );
    if (found) return found._id;

    // 이름까지 받았는데 못 찾으면 폴백하지 말고 null
    return null;
  }

  // 2) 제목/원문 텍스트 기반 힌트
  const text = `${hintTitle || ""} ${rawText || ""}`;

  if (text.trim()) {
    const businessKw = /(회의|미팅|업무|보고|프로젝트|회사|office|work)/;
    const tripKw = /(여행|trip|tour|휴가|holiday)/i;

    if (businessKw.test(text)) {
      const workCal = calendars.find((c) =>
        /(회사|업무|office|work|직장)/i.test(c.name)
      );
      if (workCal) return workCal._id;
    }

    if (tripKw.test(text)) {
      const travelCal = calendars.find((c) =>
        /(여행|trip|tour|travel)/i.test(c.name)
      );
      if (travelCal) return travelCal._id;
    }
  }

  // 3) 위에 해당 안 되면 첫 번째 캘린더
  return calendars[0]._id;
}

// ───────── 라우트 ─────────
router.post("/", jwtMw, handler);

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
      notes = "",
      calendarId: calendarIdInput,
      calendarSummary: calendarSummaryInput,
      year: yearInput,
    } = req.body || {};

    // 1) 사용자 식별
    const userId = await resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        ok: false,
        msg: "로그인이 필요해요. 다시 한 번 시도해 주세요.",
      });
    }

    // 2) 자연어 원문 추출
    const rawText =
      (typeof text === "string" && text) ||
      (typeof req.body?.prompt === "string" && req.body.prompt) ||
      (typeof req.body?.message === "string" && req.body.message) ||
      (typeof req.body?.query === "string" && req.body.query) ||
      "";

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
      title: "일정",
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
    let rawTitle = titleInput ?? parsed.title ?? "일정";
    rawTitle = rawTitle.toString().trim();
    const title = !rawTitle || rawTitle.length < 2 ? "일정" : rawTitle;

    // 4) intent 판단
    const intent = detectIntent(rawText, parsed);

    // ───────── chat : 일반 대화 (Gemini + Schedy 역할 설명) ─────────
    if (intent === "chat") {
      const answer = await runGeneralChat(rawText || "");
      return res.json({
        ok: true,
        mode: "chat",
        answer,
      });
    }

    // ───────── clarify-date : 날짜/시간 한 번 더 물어보기 ─────────
    if (intent === "clarify-date") {
      const baseTitle =
        parsed.title && parsed.title !== "일정"
          ? parsed.title.trim()
          : "일정";

      const answer =
        `'${baseTitle}' 일정을 추가할 날짜와 시간을 알려주세요.\n` +
        `예: "오늘 오후 3시", "내일 오전 10시", "12월 8일 11시" 처럼 말해주시면\n` +
        `그 시간에 일정을 넣어 드릴게요.`;

      return res.json({
        ok: true,
        mode: "clarify-date",
        answer,
        baseTitle,
      });
    }

    // ───────── query : 일정 조회 ─────────
    if (intent === "query") {
      const { start, end, label } = resolveQueryRange(rawText, now);

      const calendarId = await resolveCalendarId({
        userId,
        calendarId: calendarIdInput,
        calendarSummary: calendarSummaryInput ?? parsed.calendarSummary,
        hintTitle: title,
        rawText,
      });

      const findQuery = {
        user: userId,
        start: { $gte: start, $lte: end },
      };
      if (calendarId) findQuery.calendar = calendarId;

      const events = await Event.find(findQuery)
        .sort({ start: 1 })
        .limit(10)
        .lean();

      if (!events.length) {
        return res.json({
          ok: true,
          mode: "query",
          answer: `${label} 등록된 일정은 없어요.`,
        });
      }

      const koWeek = ["일", "월", "화", "수", "목", "금", "토"];
      const fmtTime = (d) => {
        const h = d.getHours();
        const m = d.getMinutes();
        const ampm = h < 12 ? "오전" : "오후";
        let h12 = h % 12;
        if (h12 === 0) h12 = 12;
        return `${ampm} ${h12}:${String(m).padStart(2, "0")}`;
      };

      const lines = events.map((ev) => {
        const d = new Date(ev.start);
        const dayStr = `${d.getMonth() + 1}월 ${d.getDate()}일(${
          koWeek[d.getDay()]
        })`;
        const timeStr = fmtTime(d);
        const tTitle = ev.title || "일정";
        return `- ${dayStr} ${timeStr} ${tTitle}`;
      });

      const answer =
        `${label} 등록된 일정은 다음과 같아요.\n` + lines.join("\n");

      return res.json({
        ok: true,
        mode: "query",
        answer,
      });
    }

    // ───────── delete : 일정 삭제 ─────────
    if (intent === "delete") {
      const deleteTitle =
        parsed.title && parsed.title !== "일정"
          ? parsed.title.trim()
          : null;

      const hasRangeWord = /(어제|오늘|내일|모레|이번주|이번 주|다음주|다음 주|이번달|이번 달|다음달|다음 달|지난달|지난 달)/.test(
        rawText
      );
      const hasExplicitDate = /[0-9０-９]{1,2}\s*월|[0-9０-９]{1,2}\s*일(?!\s*정)/.test(
        rawText
      );
      const hasAnyRange = hasRangeWord || hasExplicitDate;

      if (!deleteTitle && !hasAnyRange) {
        return res.status(400).json({
          ok: false,
          msg:
            '어떤 일정을 지워야 할지 잘 모르겠어요.\n' +
            '"오늘 여행3 일정 삭제", "내일 오전 회의 일정 삭제"처럼 조금만 더 구체적으로 말씀해 주세요.',
        });
      }

      let start = null;
      let end = null;
      let rangeLabel = "";

      if (hasAnyRange) {
        const range = resolveQueryRange(rawText, now);
        start = range.start;
        end = range.end;
        rangeLabel = range.label;
      } else {
        rangeLabel = "최근 1년";
        start = new Date(now);
        start.setFullYear(start.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setFullYear(end.getFullYear() + 1);
        end.setHours(23, 59, 59, 999);
      }

      const calendarId = await resolveCalendarId({
        userId,
        calendarId: calendarIdInput,
        calendarSummary: calendarSummaryInput ?? parsed.calendarSummary,
        hintTitle: deleteTitle || title,
        rawText,
      });

      const findQuery = {
        user: userId,
        start: { $gte: start, $lt: end },
      };
      if (calendarId) findQuery.calendar = calendarId;
      if (deleteTitle) {
        findQuery.title = new RegExp(escapeRegex(deleteTitle), "i");
      }

      const targetEvents = await Event.find(findQuery).lean();

      if (!targetEvents.length) {
        return res.json({
          ok: true,
          mode: "delete",
          deleted: 0,
          answer:
            `${rangeLabel || "지정하신 범위"} 안에서 ` +
            (deleteTitle ? `'${deleteTitle}'` : "해당") +
            " 일정은 찾지 못했어요.",
          deletedIds: [],
        });
      }

      const ids = targetEvents.map((e) => e._id);
      const delResult = await Event.deleteMany({ _id: { $in: ids } });

      console.log("[ASSISTANT DELETE]", {
        requestedTitle: deleteTitle,
        rangeLabel,
        ids,
        deletedCount: delResult.deletedCount,
      });

      const koWeek = ["일", "월", "화", "수", "목", "금", "토"];
      const fmtTime = (d) => {
        const h = d.getHours();
        const m = d.getMinutes();
        const ampm = h < 12 ? "오전" : "오후";
        let h12 = h % 12;
        if (h12 === 0) h12 = 12;
        return `${ampm} ${h12}:${String(m).padStart(2, "0")}`;
      };

      targetEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
      const lines = targetEvents.map((ev) => {
        const d = new Date(ev.start);
        const dayStr = `${d.getMonth() + 1}월 ${d.getDate()}일(${
          koWeek[d.getDay()]
        })`;
        const timeStr = fmtTime(d);
        const tTitle = ev.title || "일정";
        return `- ${dayStr} ${timeStr} ${tTitle}`;
      });

      const answer =
        `${rangeLabel || "지정하신 범위"}에서 다음 일정들을 삭제했어요.\n` +
        lines.join("\n");

      return res.json({
        ok: true,
        mode: "delete",
        deleted: delResult.deletedCount ?? targetEvents.length,
        deletedIds: ids.map(String),
        answer,
      });
    }

    // ───────── share-calendar : 공유 캘린더 이메일 보내기 ─────────
    if (intent === "share-calendar") {
      if (!Calendar) {
        return res.status(500).json({
          ok: false,
          msg: "캘린더 정보를 찾을 수 없어 공유 메일을 보낼 수 없습니다.",
        });
      }

      const emailMatch = rawText.match(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/
      );
      if (!emailMatch) {
        return res.status(400).json({
          ok: false,
          msg:
            "어떤 이메일 주소로 보낼지 잘 모르겠어요.\n" +
            '"test@example.com 으로 회사 캘린더 공유 링크 보내줘"처럼 말씀해 주세요.',
        });
      }
      const targetEmail = emailMatch[0];

      const calendarIdForShare = await resolveCalendarId({
        userId,
        calendarId: calendarIdInput,
        calendarSummary: calendarSummaryInput ?? parsed.calendarSummary,
        hintTitle: title,
        rawText,
      });

      if (!calendarIdForShare) {
        return res.status(404).json({
          ok: false,
          msg:
            "어느 캘린더를 공유해야 할지 찾지 못했어요.\n" +
            "'여행 캘린더를 ooo@example.com 으로 공유해줘'처럼 이름을 함께 말해 주세요.",
        });
      }

      let calDoc = await Calendar.findById(calendarIdForShare).lean();
      if (!calDoc) {
        return res.status(404).json({
          ok: false,
          msg: "선택하신 캘린더를 찾지 못했어요.",
        });
      }

      calDoc = await ensureCalendarShareFields(calDoc);

      let ownerUser = null;
      if (User) {
        try {
          ownerUser = await User.findById(userId).lean();
        } catch (_) {
          ownerUser = null;
        }
      }

      const shareLink = `${FRONTEND_URL}/share/${calDoc.shareId}`;

      if (!MAIL_USER || !MAIL_PASS || !mailer) {
        // 메일 설정이 안 되어 있으면 링크만 알려주기
        const answer =
          "메일 발송 설정이 되어 있지 않아서, 링크와 비밀번호만 알려드릴게요.\n" +
          `- 캘린더 이름: ${calDoc.name}\n` +
          `- 공유 링크: ${shareLink}\n` +
          `- 비밀번호: ${calDoc.sharePassword || "(설정된 비밀번호가 없습니다.)"}`;

        return res.json({
          ok: true,
          mode: "share-calendar",
          answer,
          email: targetEmail,
          calendarId: String(calDoc._id),
        });
      }

      try {
        await sendCalendarShareMail({
          to: targetEmail,
          calendar: calDoc,
          owner: ownerUser,
        });

        const answer =
          `공유 캘린더 링크를 ${targetEmail} 주소로 보냈어요.\n` +
          `- 캘린더 이름: ${calDoc.name}\n` +
          `- 공유 링크: ${shareLink}\n` +
          `- 비밀번호: ${calDoc.sharePassword || "(설정된 비밀번호가 없습니다.)"}`;

        return res.json({
          ok: true,
          mode: "share-calendar",
          answer,
          email: targetEmail,
          calendarId: String(calDoc._id),
        });
      } catch (err) {
        console.error("[ASSISTANT SHARE] 메일 발송 오류:", err);
        const answer =
          "공유 메일을 보내는 중 오류가 발생해서, 링크와 비밀번호만 알려드릴게요.\n" +
          `- 캘린더 이름: ${calDoc.name}\n` +
          `- 공유 링크: ${shareLink}\n` +
          `- 비밀번호: ${calDoc.sharePassword || "(설정된 비밀번호가 없습니다.)"}`;

        return res.json({
          ok: true,
          mode: "share-calendar",
          answer,
          email: targetEmail,
          calendarId: String(calDoc._id),
        });
      }
    }

    // ───────── suggest-time : 날짜/시간 추천 ─────────
    if (intent === "suggest-time") {
      const { suggestions } = await suggestWeeklyTimes({
        userId,
        baseDate: now,
        durationMin: 60,
      });

      if (!suggestions || !suggestions.length) {
        return res.json({
          ok: true,
          mode: "suggest-time",
          answer:
            "이번 달에는 특별히 비어 있는 시간이 잘 보이지 않아요.\n" +
            "원하시는 날짜와 시간을 직접 말씀해 주실래요?",
          suggestions: [],
        });
      }

      const msgLines = suggestions.map(
        (s, idx) => `${idx + 1}. ${s.label}`
      );
      const answer =
        "이번 달 일정 기준으로는\n" +
        msgLines.join("\n") +
        "\n쪽이 가장 여유 있어 보여요.\n" +
        "원하는 번호를 선택해서 다시 말씀해 주세요.";

      const baseTitle =
        parsed.title &&
        parsed.title !== "일정" &&
        parsed.title.trim().length >= 2
          ? parsed.title.trim()
          : null;

      return res.json({
        ok: true,
        mode: "suggest-time",
        answer,
        suggestions,
        baseTitle,
      });
    }

    // ───────── create : 실제 일정 생성 ─────────
    const calendarId = await resolveCalendarId({
      userId,
      calendarId: calendarIdInput,
      calendarSummary: calendarSummaryInput ?? parsed.calendarSummary,
      hintTitle: title,
      rawText,
    });

    if (!calendarId) {
      const requestedName =
        calendarSummaryInput != null && calendarSummaryInput !== ""
          ? calendarSummaryInput
          : parsed.calendarSummary || "";
      return res.status(404).json({
        ok: false,
        msg:
          "어디에 일정을 넣어야 할지 찾지 못했어요. 캘린더 이름을 한 번 더 말씀해 주실래요?",
        requestedName,
      });
    }

    let calendarName = null;
    if (Calendar) {
      try {
        const cal = await Calendar.findById(calendarId).lean();
        if (cal) calendarName = cal.name;
      } catch (_) {
        // ignore
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[ASSISTANT PARSE]", {
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

    if (!month || Number.isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({
        ok: false,
        msg:
          '언제인지 잘 이해하지 못했어요. 예를 들어 "11월 3일 오후 3시"처럼 다시 말씀해 주세요.',
      });
    }

    let docs = [];

    // 응답용 day / weekday
    let respDay = day;
    let respWeekday = weekday;

    // (1) 하루짜리 일정 : 숫자 날짜가 명시된 경우
    if (!isEveryWeek && day != null && (weekday == null || Number.isNaN(weekday))) {
      const start = new Date(year, month - 1, day, sh, sm, 0, 0);
      const end = new Date(year, month - 1, day, eh, em, 0, 0);
      docs.push({ title, notes, start, end, user: userId, calendar: calendarId });
      respDay = day;
      respWeekday = start.getDay();
    }

    // (2) 요일만 있는 경우
    else if (weekday != null && !Number.isNaN(weekday)) {
      if (!isEveryWeek) {
        // "매주"가 없으면 → 가장 가까운 해당 요일 하루만
        const base = new Date(year, month - 1, day ?? now.getDate(), 0, 0, 0, 0);
        let target = new Date(base);
        let safe = 0;
        while (target.getMonth() === month - 1 && target.getDay() !== weekday && safe < 20) {
          target.setDate(target.getDate() + 1);
          safe++;
        }
        if (target.getMonth() !== month - 1) {
          // 이번 달을 벗어나면 그 달의 첫 번째 해당 요일
          target = new Date(year, month - 1, 1, 0, 0, 0, 0);
          safe = 0;
          while (target.getMonth() === month - 1 && target.getDay() !== weekday && safe < 20) {
            target.setDate(target.getDate() + 1);
            safe++;
          }
        }

        const start = new Date(target);
        start.setHours(sh, sm || 0, 0, 0);
        const end = new Date(target);
        end.setHours(eh, em || 0, 0, 0);

        docs.push({ title, notes, start, end, user: userId, calendar: calendarId });

        respDay = start.getDate();
        respWeekday = start.getDay();
      } else {
        // "매주"가 있는 경우에만 반복 일정
        const days = allWeekdaysOfMonth(year, month, weekday).filter(
          (d) => !untilDay || d.getDate() <= Number(untilDay)
        );

        if (!days.length) {
          return res.status(400).json({
            ok: false,
            msg:
              "해당 월에는 요청하신 요일이 없어요. 다른 달이나 요일로 다시 말씀해 주세요.",
          });
        }

        docs = days.map((d) => {
          const start = new Date(d);
          start.setHours(sh, sm || 0, 0, 0);
          const end = new Date(d);
          end.setHours(eh, em || 0, 0, 0);
          return { title, notes, start, end, user: userId, calendar: calendarId };
        });

        respDay = null;
        respWeekday = weekday;
      }
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
      mode: "create",
      inserted: result.length,
      user: userId,
      calendar: calendarId,
      calendarName: calendarName || null,
      title,
      year,
      month,
      day: respDay,
      weekday: respWeekday,
      time: {
        start: `${sh}:${String(sm).padStart(2, "0")}`,
        end: `${eh}:${String(em).padStart(2, "0")}`,
      },
    });
  } catch (e) {
    console.error("[ASSISTANT-LOCAL]", e);
    return res.status(500).json({
      ok: false,
      msg:
        "일정을 처리하는 동안 문제가 발생했어요. 잠시 후에 다시 시도해 주세요.",
    });
  }
}

module.exports = router;
