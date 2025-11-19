// AssistantChatModal.jsx
import { useEffect, useRef, useState } from "react";
import "./assistant.css";
import { askAssistant } from "../../hooks/useAssistant";
import { useCalendarStore } from "../../hooks/useCalendarStore";

export default function AssistantChatModal({ open, onClose }) {
  
  const { startLoadingEvents } = useCalendarStore();
  const [list, setList] = useState([
    { role: "bot", text: "무엇을 도와드릴까요?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bodyRef = useRef(null);
  const taRef = useRef(null); // textarea ref (자동 확장)

  // 모달이 열릴 때 스크롤 최하단 + 입력창 높이 초기화(기본 한 줄)
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      if (bodyRef.current)
        bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
      if (taRef.current) {
        taRef.current.style.height = "auto";
        taRef.current.style.height =
          Math.min(taRef.current.scrollHeight, 120) + "px";
      }
    });
  }, [open]);

  // 메시지 추가 시 자동 스크롤
  useEffect(() => {
    if (bodyRef.current)
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [list]);

  // textarea 자동 높이 조절(스크롤 없음, 최대 120px)
  const onInput = (e) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
    setInput(el.value);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // 보낸 직후 입력창을 “항상 기본 한 줄”로 되돌림
    if (taRef.current) {
      taRef.current.value = "";
      taRef.current.style.height = "44px";
    }

    setInput("");
    setList((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await askAssistant(text);
      console.log("[assistant] client response", res);

      // askAssistant 가 항상 { ok: boolean, message? } 형식으로 돌려준다고 가정
      if (!res || res.ok === false) {
        setList((prev) => [
          ...prev,
          { role: "bot", text: res?.message || "서버 연결에 실패했어요." },
        ]);
      } else {
        // 성공 응답 처리
        if (typeof startLoadingEvents === "function") {
         await startLoadingEvents();
        }
        const inserted = typeof res.inserted === "number" ? res.inserted : null;

        // 요일 한글 표시용
        const weekdayKo = ["일", "월", "화", "수", "목", "금", "토"];
        const w = typeof res.weekday === "number" ? res.weekday : null;

        let successText = "";

        if (inserted && inserted > 0) {
          // 예) 11월 매주 화요일 13:00~14:00 '회사' 캘린더에 회의1 추가해줘
          const yy = res.year;
          const mm = res.month;
          const time =
            res.time && res.time.start && res.time.end
              ? `${res.time.start} ~ ${res.time.end}`
              : "";

          successText =
            `${inserted}개의 일정을 추가했어요.` +
            (yy && mm && w !== null
              ? ` (${yy}년 ${mm}월 매주 ${weekdayKo[w]}요일${time ? ` ${time}` : ""})`
              : "");
        } else {
          successText = "요청하신 내용을 반영했어요.";
        }

        setList((prev) => [...prev, { role: "bot", text: successText }]);
      }
    } catch (e) {
      console.error("[assistant] unexpected error", e);
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
        <button className="assistant-send" onClick={send} disabled={loading}>
          보내기
        </button>
      </div>
    </div>
  );
}
