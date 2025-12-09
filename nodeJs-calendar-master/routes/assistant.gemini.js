// routes/assistant.gemini.js
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const { addDays, isAfter, isBefore, parseISO } = require("date-fns");

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
        byWeekday: { type: "ARRAY", items: { type: "STRING" }, description: "MO..SU" },
      },
      required: ["calendarId", "title", "startDate", "startTime", "byWeekday"],
    },
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
        slotMinutes: { type: "NUMBER" },
      },
      required: ["calendarIds", "rangeStart", "rangeEnd"],
    },
  },
];

// ---- 2) 유틸 ----
const DOW = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

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
  return d.toISOString().slice(0, 10);
}
function toDateTimeISO(day, timeHHmm) {
  const iso = `${toISODate(day)}T${timeHHmm}:00`;
  return new Date(iso);
}

// ---- 3) 메인 라우트 ----
router.post("/", async (req, res) => {
  const { message } = req.body || {};
  const userToken = req.header("x-token") || "";

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      tools: [{ functionDeclarations }],
    });

    const prompt = [
    {
      role: "user",
      parts: [
        {
          text: `
  너는 일정 관리 전용 한국어 비서야.
  아래 두 가지 도구를 사용할 수 있다.

  1) create_recurring_events
    - 주기적인(매주/정기) 일정을 실제로 생성할 때 사용한다.
    - startDate ~ endDate 사이에서 byWeekday 에 포함된 요일마다 이벤트를 만든다.
    - 사용자가 "매주", "정기 회의", "고정된 요일" 같은 표현을 쓰면
      무조건 단일 날짜가 아니라 "반복 일정"으로 생각하고 이 함수를 사용해야 한다.

  2) find_free_slots
    - 여러 캘린더의 기존 일정을 보고, 비교적 한가한 시간대를 찾는 도구다.

  ***응답 규칙***

  - 사용자가 먼저
    "매주 회의 일정 추가하고 싶은데 무슨 요일이 좋을까?"
    같은 식으로 "매주 / 정기" 회의의 '요일'을 물어보면,

    1단계) find_free_slots 를 사용해서 **다음 4주 정도 범위**의 일정을 보고,
          특정 "요일 + 시간" 패턴을 2~3개 추천해라.
          예) "이번 달 기준으로는 수요일 15:00~16:00, 목요일 10:00~11:00가 가장 여유 있어 보입니다."
          이때는 **구체적인 날짜(12월 16일)** 만 나열하지 말고,
          반드시 요일 기준으로 설명해라.

    2단계) 이 단계에서는 create_recurring_events 를 호출하지 말고,
          텍스트로만 후보를 제시하고
          "원하시는 번호를 선택해 주세요" 처럼 물어본다.

  - 사용자가 그 다음에 "1", "2", "수요일이 좋아" 처럼
    하나의 후보를 선택하거나 특정 요일/시간을 골랐다면,

    그때는 create_recurring_events 를 호출해서
    **적어도 2~3개월 정도(endDate 기준)** 동안의 주간 반복 일정을 생성한다.
    (예: startDate 는 이번 달 첫 회의 날짜, endDate 는 startDate 로부터 8~12주 뒤)

  - 사용자가 단순히 "이번 주 수요일에 약속 잡아줘" 처럼
    한 번짜리 일정만 원하는 경우에는
    굳이 반복으로 만들 필요는 없다. 이 경우 적절한 기간의 create_recurring_events 를 쓰거나
    byWeekday 에 해당 날짜의 요일만 넣고 startDate=endDate 로 단일 이벤트를 만들어도 된다.

  - 어떤 경우든, 사용자의 의도를 최대한 반영해서
    불필요하게 짧은(한 번짜리) 일정만 만들지 말고,
    "매주"라고 말하면 실제로 여러 주에 걸친 반복 일정이 생성되도록 하라.

  요청: ${message}
        `,
        },
      ],
    },
  ];


    const response = await model.generateContent({ contents: prompt });
    const cand = response?.response?.candidates?.[0];
    const parts = cand?.content?.parts || [];
    const callPart = parts.find((p) => p.functionCall);

    if (!callPart || !callPart.functionCall) {
      const text =
        (response?.response && response.response.text()) ||
        "무슨 작업인지 확정할 수 없었습니다.";
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
        byWeekday = ["MO", "TU", "WE", "TH", "FR"],
      } = args || {};

      const allowed = new Set(byWeekday);
      let created = 0;

      for (const day of eachDay(startDate, endDate || startDate)) {
        const dow = DOW[day.getUTCDay()];
        if (!allowed.has(dow)) continue;

        const startDt = toDateTimeISO(day, startTime);
        const endDt = new Date(startDt.getTime() + durationMinutes * 60000);

        await axios.post(
          `${process.env.BACKEND_URL || "http://localhost:4000"}/api/events`,
          { title, start: startDt, end: endDt, calendar: calendarId },
          { headers: { "x-token": userToken } }
        );
        created++;
      }

      return res.json({
        reply: `요청하신 '${title}' 일정 ${created}건을 추가했어요.`,
        data: { created },
      });
    }

    if (name === "find_free_slots") {
      const {
        calendarIds = [],
        rangeStart,
        rangeEnd,
        slotMinutes = 60,
      } = args || {};

      const { data } = await axios.get(
        `${process.env.BACKEND_URL || "http://localhost:4000"}/api/events`,
        { headers: { "x-token": userToken } }
      );

      const events = (data?.events || [])
        .filter((ev) => {
          const cid = ev?.calendar?._id || ev?.calendar?.id || ev?.calendar;
          return calendarIds.includes(String(cid));
        })
        .map((ev) => ({
          start: new Date(ev.start),
          end: new Date(ev.end),
        }))
        .sort((a, b) => a.start - b.start);

      const dayMap = new Map();
      for (const d of eachDay(rangeStart, rangeEnd)) {
        dayMap.set(toISODate(d), 0);
      }

      for (const ev of events) {
        for (const d of dayMap.keys()) {
          const dayStart = new Date(`${d}T00:00:00`);
          const dayEnd = new Date(`${d}T23:59:59`);
          if (!(isAfter(ev.start, dayEnd) || isBefore(ev.end, dayStart))) {
            dayMap.set(d, (dayMap.get(d) || 0) + 1);
          }
        }
      }

      const suggestions = Array.from(dayMap.entries())
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .map(([d, c]) => `${d} (이벤트 ${c}건) → ${slotMinutes}분 예약 가능 후보`);

      return res.json({
        reply: suggestions.length
          ? `다음 날짜가 비교적 한가합니다:\n- ${suggestions.join("\n- ")}`
          : "지정한 기간에 후보를 찾지 못했어요. 기간을 넓혀보세요.",
      });
    }

    return res.json({ reply: "아직 연결되지 않은 기능입니다." });
  } catch (e) {
    console.error("[assistant.gemini]", e?.response?.data || e);
    res
      .status(500)
      .json({ error: "Assistant 실행 중 오류", detail: String(e) });
  }
});

module.exports = router;
