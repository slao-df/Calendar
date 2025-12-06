// backend/routes/assistant.gemini.js
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { addDays, isAfter, isBefore, parseISO } from "date-fns";

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ---- 1) Gemini의 함수 선언들(툴 스키마) ----
const functionDeclarations = [
  {
    name: "create_recurring_events",
    description: "반복 일정 생성. byWeekday 예: ['MO','WE']",
    parameters: {
      type: "OBJECT",
      properties: {
        calendarId: { type: "STRING" },
        title: { type: "STRING" },
        startDate: { type: "STRING", description: "YYYY-MM-DD" },
        endDate: { type: "STRING", description: "YYYY-MM-DD (미지정시 startDate 하루만)" },
        startTime: { type: "STRING", description: "HH:mm (24h)" },
        durationMinutes: { type: "NUMBER" },
        byWeekday: { type: "ARRAY", items: { type: "STRING" }, description: "MO..SU" }
      },
      required: [ "calendarId", "title", "startDate", "startTime", "byWeekday" ]
    }
  },
  {
    name: "find_free_slots",
    description: "여러 캘린더의 공통 비는 시간대(단순 버전)",
    parameters: {
      type: "OBJECT",
      properties: {
        calendarIds: { type: "ARRAY", items: { type: "STRING" } },
        rangeStart: { type: "STRING", description: "YYYY-MM-DD" },
        rangeEnd: { type: "STRING", description: "YYYY-MM-DD" },
        slotMinutes: { type: "NUMBER" }
      },
      required: [ "calendarIds", "rangeStart", "rangeEnd" ]
    }
  }
];

// ---- 2) 유틸 ----
const DOW = ["SU","MO","TU","WE","TH","FR","SA"];

function* eachDay(startISO, endISO) {
  let d = parseISO(startISO);
  const end = parseISO(endISO || startISO);
  while (true) {
    if (isAfter(d, end)) break;
    yield new Date(d);
    d = addDays(d, 1);
  }
}

function toISODate(d) {
  return d.toISOString().slice(0,10);
}
function toDateTimeISO(day, timeHHmm) {
  // "YYYY-MM-DDTHH:mm:00Z" (local naive→Date uses local tz; fine for demo)
  const iso = `${toISODate(day)}T${timeHHmm}:00`;
  return new Date(iso);
}

// ---- 3) 메인 라우트 ----
router.post("/", async (req, res) => {
  const { message } = req.body || {};
  const userToken = req.header("x-token") || "";   // 프론트의 기존 로그인 토큰 재사용

  if (!message) return res.status(400).json({ error: "message is required" });

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      tools: [{ functionDeclarations }],
      // 더 보수적으로 해석하려면↓
      // toolConfig: { functionCallingConfig: { mode: "AUTO" } }
    });

    const prompt = [
      {
        role: "user",
        parts: [{ text: `
          너는 일정관리 비서야. 한국어 요청을 받아 아래 함수들 중 하나를 반드시 호출해.
          모를 땐 사용자에게 필요한 정보(예: 날짜, 캘린더ID, 시간)를 물어볼 수 있지만,
          가능하면 합리적으로 유추해 호출해.

          요청: ${message}
        `}]
      }
    ];

    const response = await model.generateContent({ contents: prompt });
    const cand = response?.response?.candidates?.[0];
    const parts = cand?.content?.parts || [];
    const callPart = parts.find(p => p.functionCall);

    if (!callPart || !callPart.functionCall) {
      // 함수 호출이 없으면 그냥 모델 답변 반환
      const text = response.response.text() || "무슨 작업인지 확정할 수 없었습니다.";
      return res.json({ reply: text });
    }

    const { name, args } = callPart.functionCall;

    // ---- 4) 함수별로 실제 캘린더 API 호출 수행 ----
    if (name === "create_recurring_events") {
      const {
        calendarId,
        title,
        startDate,
        endDate,
        startTime,
        durationMinutes = 60,
        byWeekday = ["MO","TU","WE","TH","FR"]
      } = args || {};

      const allowed = new Set(byWeekday);
      let created = 0;

      for (const day of eachDay(startDate, endDate || startDate)) {
        const dow = DOW[day.getUTCDay()]; // 0..6 -> SU..SA
        if (!allowed.has(dow)) continue;

        const startDt = toDateTimeISO(day, startTime);
        const endDt   = new Date(startDt.getTime() + durationMinutes * 60000);

        await axios.post(
          `${process.env.BACKEND_URL}/api/events`,
          { title, start: startDt, end: endDt, calendar: calendarId },
          { headers: { "x-token": userToken } }
        );
        created++;
      }

      return res.json({
        reply: `요청하신 '${title}' 일정 ${created}건을 추가했어요.`,
        data: { created }
      });
    }

    if (name === "find_free_slots") {
      const { calendarIds = [], rangeStart, rangeEnd, slotMinutes = 60 } = args || {};
      // 단순 버전: 지정 구간의 모든 이벤트를 가져와 같은 날짜별로 겹침이 적은 날을 추천
      const { data } = await axios.get(
        `${process.env.BACKEND_URL}/api/events`,
        { headers: { "x-token": userToken } }
      );
      const events = (data?.events || [])
        .filter(ev => {
          const cid = ev?.calendar?._id || ev?.calendar?.id || ev?.calendar;
          return calendarIds.includes(String(cid));
        })
        .map(ev => ({ start: new Date(ev.start), end: new Date(ev.end) }))
        .sort((a,b)=>a.start-b.start);

      // 매우 러프한 방식: 범위 내 날짜들 중 이벤트가 가장 적은 3일 제안
      const dayMap = new Map(); // key: yyyy-mm-dd -> count
      for (const d of eachDay(rangeStart, rangeEnd)) {
        dayMap.set(toISODate(d), 0);
      }
      for (const ev of events) {
        for (const d of dayMap.keys()) {
          const dayStart = new Date(`${d}T00:00:00`);
          const dayEnd   = new Date(`${d}T23:59:59`);
          if (!(isAfter(ev.start, dayEnd) || isBefore(ev.end, dayStart))) {
            dayMap.set(d, (dayMap.get(d) || 0) + 1);
          }
        }
      }
      const suggestions = Array.from(dayMap.entries())
        .sort((a,b)=>a[1]-b[1])
        .slice(0,3)
        .map(([d,c]) => `${d} (이벤트 ${c}건) → ${slotMinutes}분 예약 가능 후보`);

      return res.json({
        reply: suggestions.length
          ? `다음 날짜가 비교적 한가합니다:\n- ${suggestions.join("\n- ")}`
          : "지정한 기간에 후보를 찾지 못했어요. 기간을 넓혀보세요."
      });
    }

    return res.json({ reply: "아직 연결되지 않은 기능입니다." });

  } catch (e) {
    console.error("[assistant.gemini]", e?.response?.data || e);
    res.status(500).json({ error: "Assistant 실행 중 오류", detail: String(e) });
  }
});

export default router;
