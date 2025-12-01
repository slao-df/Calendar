// AssistantChatModal.jsx
import { useEffect, useRef, useState } from "react";
import "./assistant.css";
import { askAssistant } from "../../hooks/useAssistant";
import { useCalendarStore } from "../../hooks/useCalendarStore";

export default function AssistantChatModal({ open, onClose }) {
  const [list, setList] = useState([
    { role: "bot", text: "무엇을 도와드릴까요?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const { startLoadingEvents } = useCalendarStore();

  // { answer: string, baseTitle: string | null, sourceText: string }
  const [pendingSuggest, setPendingSuggest] = useState(null);

  const weekdayNames = ["일", "월", "화", "수", "목", "금", "토"];

  const bodyRef = useRef(null);
  const taRef = useRef(null);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      if (bodyRef.current) {
        bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
      }
      if (taRef.current) {
        taRef.current.value = "";
        taRef.current.style.height = "44px";
      }
      setInput("");
      setPendingSuggest(null);
    });
  }, [open]);

  // 메시지 추가 시 자동 스크롤
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [list]);

  // textarea 자동 높이 조절
  const onInput = (e) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
    setInput(el.value);
  };

  // "1", "1번", "1번으로 할게" 등에서 숫자 추출
  const parseChoiceIndex = (text) => {
    const m = text.match(/(\d+)\s*번?/);
    if (!m) return null;
    const idx = Number(m[1]) - 1;
    if (Number.isNaN(idx) || idx < 0) return null;
    return idx;
  };

  // 서버가 baseTitle 안 준 경우를 위한 간단 백업 추론
  const fallbackInferTitle = (src = "") => {
    if (/회의/.test(src)) return "회의";
    if (/미팅/.test(src)) return "미팅";
    if (/여행/.test(src)) return "여행";
    if (/약속/.test(src)) return "약속";
    return "일정";
  };

  // 추천 응답에서 N번 후보를 실제 "일정 추가" 문장으로 변환
  const buildPromptFromSuggestion = (
    answerText,
    choiceIndex,
    baseTitle,
    sourceText
  ) => {
    if (!answerText) return null;

    const lines = answerText.split("\n");
    const candidateLines = lines.filter((l) => /^\s*\d+\./.test(l));
    if (choiceIndex < 0 || choiceIndex >= candidateLines.length) return null;

    const line = candidateLines[choiceIndex];
    const mDay = line.match(/(일|월|화|수|목|금|토)/);
    if (!mDay) return null;

    const dayChar = mDay[1];
    const weekdayIndex = ["일", "월", "화", "수", "목", "금", "토"].indexOf(
      dayChar
    );
    if (weekdayIndex < 0) return null;

    const weekdayName = weekdayNames[weekdayIndex] + "요일";

    const isMorning = /오전/.test(line);
    const isAfternoon = /오후/.test(line);

    let startHour = 9;
    if (isMorning) startHour = 10;
    if (isAfternoon) startHour = 15;
    const endHour = startHour + 1;

    const hh = (n) => String(n).padStart(2, "0");
    const now = new Date();
    const month = now.getMonth() + 1;

    const titleWord =
      baseTitle && baseTitle.trim().length >= 2
        ? baseTitle.trim()
        : fallbackInferTitle(sourceText || "");

    let prompt =
      `${month}월 매주 ${weekdayName} ` +
      `${hh(startHour)}:00~${hh(endHour)}:00 일정 추가해줘`;

    // 백엔드 robustParse가 이 태그를 읽어서 최종 제목으로 사용
    if (titleWord && titleWord !== "일정") {
      prompt += ` [TITLE:${titleWord}]`;
    }

    return prompt;
  };

  const send = async () => {
    const userText = input.trim();
    if (!userText || loading) return;

    // 입력창 리셋
    if (taRef.current) {
      taRef.current.value = "";
      taRef.current.style.height = "44px";
    }
    setInput("");

    // 유저 메시지 추가
    setList((prev) => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    try {
      let promptToSend = userText;

      // 직전에 추천 모드였고, 이번 입력이 "1번/2번…" 같은 선택이면
      if (pendingSuggest && pendingSuggest.answer) {
        const choiceIdx = parseChoiceIndex(userText);
        if (choiceIdx != null) {
          const built = buildPromptFromSuggestion(
            pendingSuggest.answer,
            choiceIdx,
            pendingSuggest.baseTitle || null,
            pendingSuggest.sourceText || ""
          );
          if (built) {
            promptToSend = built;
            setPendingSuggest(null);
          }
        }
      }

      // 서버 호출
      const res = await askAssistant(promptToSend);
      console.log("[assistant] client response", res);

      if (!res || res.ok === false) {
        setList((prev) => [
          ...prev,
          {
            role: "bot",
            text:
              res?.msg ||
              res?.message ||
              "요청 처리 중 문제가 발생했어요. 다시 한 번 말씀해 주실래요?",
          },
        ]);
        return;
      }

      // 추천 모드 응답
      if (
        (res.mode === "suggest-time" || res.mode === "suggest_time") &&
        typeof res.answer === "string"
      ) {
        setPendingSuggest({
          answer: res.answer,
          baseTitle: res.baseTitle || null, // 서버에서 계산한 기본 제목
          sourceText: userText,
        });
        setList((prev) => [...prev, { role: "bot", text: res.answer }]);
        return;
      }

      // 실제 일정 생성 응답
      if (typeof res.inserted === "number" && res.inserted > 0) {
        const {
          year,
          month,
          day,
          weekday,
          time,
          calendarName,
          title,
        } = res;

        let when = "";
        if (day) {
          when = `${month}월 ${day}일`;
        } else if (typeof weekday === "number") {
          when = `${month}월의 매주 ${weekdayNames[weekday]}요일`;
        } else if (month) {
          when = `${month}월`;
        } else if (year) {
          when = `${year}년`;
        } else {
          when = "선택하신 날짜";
        }

        const timeText =
          time && time.start && time.end
            ? ` ${time.start} ~ ${time.end}`
            : "";

        const calText = calendarName ? `${calendarName} 캘린더에 ` : "";
        const titleText = title || "일정";

        const msg = `${when}${timeText}에 ${calText}'${titleText}' 일정 ${res.inserted}개를 추가했어요.`;

        setList((prev) => [...prev, { role: "bot", text: msg }]);

        // 새로고침 없이 이벤트 다시 로딩
        if (startLoadingEvents) {
          startLoadingEvents();
        }

        setPendingSuggest(null);
        return;
      }

      // 일반 텍스트 답변
      if (res.answer) {
        setList((prev) => [...prev, { role: "bot", text: res.answer }]);
        setPendingSuggest(null);
        return;
      }

      // 그 외 애매한 케이스
      setList((prev) => [
        ...prev,
        { role: "bot", text: "요청하신 내용을 처리했어요." },
      ]);
      setPendingSuggest(null);
    } catch (e) {
      console.error("[assistant] error", e);
      setList((prev) => [
        ...prev,
        { role: "bot", text: "서버 연결에 실패했어요." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Enter=전송(Shift+Enter 줄바꿈)
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!open) return null;

  return (
    <div className="assistant-modal" role="dialog" aria-modal="true">
      <div className="assistant-header">
        <span>AI 도우미</span>
        <button
          className="assistant-close"
          onClick={onClose}
          aria-label="close"
        >
          ×
        </button>
      </div>

      <div className="assistant-body" ref={bodyRef}>
        {list.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">{m.text}</div>
          </div>
        ))}
        {loading && (
          <div className="msg bot">
            <div className="bubble">생각 중…</div>
          </div>
        )}
      </div>

      <div className="assistant-input">
        <textarea
          ref={taRef}
          className="assistant-textarea"
          placeholder="메시지 입력"
          defaultValue=""
          onInput={onInput}
          onKeyDown={onKeyDown}
          rows={1}
        />
        <button className="assistant-send" onClick={send}>
          보내기
        </button>
      </div>
    </div>
  );
}
