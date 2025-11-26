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

  // 달력 이벤트 다시 불러오기 (새로고침 없이 반영)
  const { startLoadingEvents } = useCalendarStore();

  // 직전 “추천 모드” 응답 보관 (숫자 선택용)
  // { answer: string }
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
      setPendingSuggest(null); // 새로 열면 이전 추천 상태는 버림
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

  // "1", "1번", "1번으로 할게", "그럼 1번으로 할게" → 0,1,2...
  const parseChoiceIndex = (text) => {
    const m = text.match(/(\d+)\s*번?/); // 문장 어디에 있든 첫 숫자
    if (!m) return null;
    const idx = Number(m[1]) - 1;
    if (Number.isNaN(idx) || idx < 0) return null;
    return idx;
  };

  // pendingSuggest.answer에서 N번째 후보(1,2,3..)의 요일 + 시간대 파싱 후
  // "11월 매주 수요일 15:00~16:00 일정 추가해줘" 같은 문장 생성
  const buildPromptFromSuggestion = (answerText, choiceIndex) => {
    if (!answerText) return null;

    // 줄 단위로 쪼개고, "1. ~", "2. ~" 같은 줄만 추려냄
    const lines = answerText.split("\n");
    const candidateLines = lines.filter((l) => /^\s*\d+\./.test(l));
    if (choiceIndex < 0 || choiceIndex >= candidateLines.length) return null;

    const line = candidateLines[choiceIndex]; // 예: "2. 금요일 오전"
    // 요일 추출
    const mDay = line.match(/(일|월|화|수|목|금|토)/);
    if (!mDay) return null;
    const dayChar = mDay[1];
    const weekdayIndex = ["일", "월", "화", "수", "목", "금", "토"].indexOf(
      dayChar
    );
    if (weekdayIndex < 0) return null;
    const weekdayName = weekdayNames[weekdayIndex] + "요일";

    // 오전/오후 추출 → 대략 시간대 설정
    const isMorning = /오전/.test(line);
    const isAfternoon = /오후/.test(line);

    let startHour = 9;
    if (isMorning) startHour = 10; // 오전 기본 10:00
    if (isAfternoon) startHour = 15; // 오후 기본 15:00
    const endHour = startHour + 1;

    const hh = (n) => String(n).padStart(2, "0");
    const now = new Date();
    const month = now.getMonth() + 1; // “이번 달” 기준

    // 굳이 제목/캘린더까지 반영하려면 추가 메타가 필요하지만
    // 여기서는 우선 동작 위주로: 제목은 그냥 “일정”
    const prompt =
      `${month}월 매주 ${weekdayName} ` +
      `${hh(startHour)}:00~${hh(endHour)}:00 일정 추가해줘`;

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

      // 1. 직전에 추천 모드였고, 이번 입력이 "1번/2번…" 같은 선택이라면
      //    → 선택된 후보로부터 실제 "일정 추가" 문장을 만들어서 보냄

      if (pendingSuggest && pendingSuggest.answer) {
        const choiceIdx = parseChoiceIndex(userText);
        if (choiceIdx != null) {
          const built = buildPromptFromSuggestion(
            pendingSuggest.answer,
            choiceIdx
          );
          if (built) {
            promptToSend = built;
            // 한 번 사용했으니 추천 상태 해제
            setPendingSuggest(null);
          }
        }
      }

      // 2. 서버 호출
      const res = await askAssistant(promptToSend);
      console.log("[assistant] client response", res);

      if (!res || res.ok === false) {
        setList((prev) => [
          ...prev,
          {
            role: "bot",
            text:
              res?.message ||
              "요청 처리 중 문제가 발생했어요. 다시 한 번 말씀해 주실래요?",
          },
        ]);
        return;
      }

      // 3. “추천 모드” 응답 (mode: 'suggest-time')
      //    → answer 그대로 보여주고, 나중에 숫자 선택에 쓰기 위해 보관
      if (
        (res.mode === "suggest-time" || res.mode === "suggest_time") &&
        typeof res.answer === "string"
      ) {
        setPendingSuggest({ answer: res.answer });
        setList((prev) => [...prev, { role: "bot", text: res.answer }]);
        return;
      }

      // ──────────────────────────────
      // 4. 실제 일정 생성 응답
      //    { ok:true, inserted, year, month, day, weekday, time:{start,end} }
      // ──────────────────────────────
      if (typeof res.inserted === "number" && res.inserted > 0) {
        const { year, month, day, weekday, time } = res;

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

        const msg = `${when}${timeText}에 ${res.inserted}개의 일정을 추가했어요.`;

        // 챗봇 답변
        setList((prev) => [...prev, { role: "bot", text: msg }]);

        // 새로고침 없이 이벤트 다시 로딩
        if (startLoadingEvents) {
          startLoadingEvents();
        }

        // 일정 생성까지 끝났으니 pendingSuggest는 더 이상 필요 없음
        setPendingSuggest(null);
        return;
      }

      // ──────────────────────────────
      // 5. 그냥 일반 텍스트 답변 (설명/안내 등)
      // ──────────────────────────────
      if (res.answer) {
        setList((prev) => [...prev, { role: "bot", text: res.answer }]);
        setPendingSuggest(null);
        return;
      }

      // ──────────────────────────────
      // 6. 그 외 애매한 케이스
      // ──────────────────────────────
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
