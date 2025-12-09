// AssistantChatModal.jsx
import { useEffect, useRef, useState } from "react";
import "./assistant.css";
import { askAssistant } from "../../hooks/useAssistant";
import { useCalendarStore } from "../../hooks/useCalendarStore";

const BASE_TEXTAREA_HEIGHT = 44; // px
const MIN_WIDTH = 320;
const MIN_HEIGHT = 360;
const MAX_WIDTH = 700;
const MAX_HEIGHT = 800;

export default function AssistantChatModal({ open, onClose }) {
  const [list, setList] = useState([
    { role: "bot", text: "무엇을 도와드릴까요?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  //캘린더/이벤트 다시 불러오기용 훅들
  const { startLoadingEvents, deleteEventsByIds, startLoadingCalendars } =
    useCalendarStore();

  // 추천 / 날짜 확인 상태
  const [pendingSuggest, setPendingSuggest] = useState(null);
  const [pendingClarify, setPendingClarify] = useState(null);

  const weekdayNames = ["일", "월", "화", "수", "목", "금", "토"];

  const bodyRef = useRef(null);
  const taRef = useRef(null);

  // ───────── 창 위치/크기 상태 (기본: 오른쪽 아래 420×560, margin right 24 / bottom 96 유지) ─────────
  const [windowRect, setWindowRect] = useState(() => {
    const width = 420;
    const height = 560;
    const marginRight = 24;
    const marginBottom = 96;

    if (typeof window !== "undefined") {
      return {
        width,
        height,
        left: window.innerWidth - width - marginRight,
        top: window.innerHeight - height - marginBottom,
      };
    }
    // SSR 대비 기본값
    return { width, height, left: 100, top: 80 };
  });

  // 드래그용 ref
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startTop: 0,
    startLeft: 0,
  });

  // 리사이즈용 ref
  const resizeRef = useRef({
    resizing: false,
    edges: { top: false, right: false, bottom: false, left: false },
    startX: 0,
    startY: 0,
    startRect: null,
  });

  // ───────── 모달 열릴 때 초기화 ─────────
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      if (bodyRef.current) {
        bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
      }
      if (taRef.current) {
        taRef.current.value = "";
        taRef.current.style.height = BASE_TEXTAREA_HEIGHT + "px";
      }
      setInput("");
      setPendingSuggest(null);
      setPendingClarify(null);
    });
  }, [open]);

  // 메시지 추가 시 자동 스크롤
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [list]);

  // ───────── textarea 자동 높이 조절 ─────────
  const onInput = (e) => {
    const el = e.currentTarget;

    // 기본 한 줄 높이로 리셋
    el.style.height = BASE_TEXTAREA_HEIGHT + "px";

    // 내용이 넘치면 그때만 높이 증가
    if (el.scrollHeight > BASE_TEXTAREA_HEIGHT) {
      el.style.height = Math.min(el.scrollHeight, 120) + "px"; // 최대 3줄 정도
    }

    setInput(el.value);
  };

  // ───────── 드래그 (위치 이동) ─────────
  const beginDrag = (e) => {
    // X 버튼을 눌렀을 때는 드래그 시작 안 함
    if (e.target.closest(".assistant-close")) return;

    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startTop: windowRect.top,
      startLeft: windowRect.left,
    };

    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", endDrag);
  };

  const onDragMove = (e) => {
    const state = dragRef.current;
    if (!state.dragging) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let newTop = state.startTop + dy;
    let newLeft = state.startLeft + dx;

    // 화면 밖으로 안 나가게 clamp
    newTop = Math.min(
      Math.max(0, newTop),
      Math.max(0, viewportH - 120) // 헤더만 보이도록
    );
    newLeft = Math.min(
      Math.max(0, newLeft),
      Math.max(0, viewportW - 160)
    );

    setWindowRect((prev) => ({
      ...prev,
      top: newTop,
      left: newLeft,
    }));
  };

  const endDrag = () => {
    dragRef.current.dragging = false;
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", endDrag);
  };

  // ───────── 리사이즈 (모든 변/모서리) ─────────
  const beginResize = (e, edges) => {
    e.stopPropagation();
    resizeRef.current = {
      resizing: true,
      edges,
      startX: e.clientX,
      startY: e.clientY,
      startRect: { ...windowRect },
    };
    document.addEventListener("mousemove", onResizeMove);
    document.addEventListener("mouseup", endResize);
  };

  const onResizeMove = (e) => {
    const state = resizeRef.current;
    if (!state.resizing) return;

    const { edges, startRect, startX, startY } = state;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let { top, left, width, height } = startRect;

    // 오른쪽 변
    if (edges.right) {
      width = startRect.width + dx;
    }
    // 아래쪽 변
    if (edges.bottom) {
      height = startRect.height + dy;
    }
    // 왼쪽 변 (왼쪽으로 드래그하면 left 이동 + width 감소)
    if (edges.left) {
      const newWidth = startRect.width - dx;
      const clamped = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH);
      const diff = startRect.width - clamped;
      width = clamped;
      left = startRect.left + diff;
    }
    // 위쪽 변
    if (edges.top) {
      const newHeight = startRect.height - dy;
      const clamped = Math.min(Math.max(newHeight, MIN_HEIGHT), MAX_HEIGHT);
      const diff = startRect.height - clamped;
      height = clamped;
      top = startRect.top + diff;
    }

    // 크기 클램프
    width = Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH);
    height = Math.min(Math.max(height, MIN_HEIGHT), MAX_HEIGHT);

    // 화면 밖으로 나가지 않도록 위치도 클램프
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    if (left < 0) left = 0;
    if (top < 0) top = 0;
    if (left + width > viewportW) left = viewportW - width;
    if (top + height > viewportH) top = viewportH - height;

    setWindowRect({ top, left, width, height });
  };

  const endResize = () => {
    resizeRef.current.resizing = false;
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup", endResize);
  };

  // ───────── 유틸: 추천 번호 파싱 / 제목 추론 / 추천→문장 ─────────
  const parseChoiceIndex = (text) => {
    const m = text.match(/(\d+)\s*번?/);
    if (!m) return null;
    const idx = Number(m[1]) - 1;
    if (Number.isNaN(idx) || idx < 0) return null;
    return idx;
  };

  const fallbackInferTitle = (src = "") => {
    if (/회의/.test(src)) return "회의";
    if (/미팅/.test(src)) return "미팅";
    if (/여행/.test(src)) return "여행";
    if (/약속/.test(src)) return "약속";
    return "일정";
  };

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

    // "1. 12월 매주 목요일 10:00~11:00" → 번호 제거
    const labelPart = line.replace(/^\s*\d+\.\s*/, "").trim();
    // labelPart 자체가 "12월 매주 목요일 10:00~11:00" 형태
    let prompt = `${labelPart} 일정 추가해줘`;

    const titleWord =
      baseTitle && baseTitle.trim().length >= 2
        ? baseTitle.trim()
        : fallbackInferTitle(sourceText || "");

    if (titleWord && titleWord !== "일정") {
      prompt += ` [TITLE:${titleWord}]`;
    }

    // 원래 질문에 "매주"가 들어있으면 반복 태그 추가
    if (sourceText && /매주/.test(sourceText)) {
      prompt += " [REPEAT:WEEKLY]";
    }

    return prompt;
  };


  // ───────── 메시지 전송 ─────────
  const send = async () => {
    const userText = input.trim();
    if (!userText || loading) return;

    if (taRef.current) {
      taRef.current.value = "";
      taRef.current.style.height = BASE_TEXTAREA_HEIGHT + "px";
    }
    setInput("");

    setList((prev) => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    try {
      let promptToSend = userText;

      // 날짜 확인 모드(clarify-date)에서 들어온 답변이면 → 최종 문장 조합
      if (pendingClarify && pendingClarify.baseTitle) {
        const titleWord = pendingClarify.baseTitle;
        let baseText = userText;
        if (!/(추가|등록|잡아|생성)/.test(baseText)) {
          baseText += " 일정 추가해줘";
        }
        if (titleWord && titleWord !== "일정") {
          baseText += ` [TITLE:${titleWord}]`;
        }
        promptToSend = baseText;
        setPendingClarify(null);
      }

      // 추천 모드 이후 "1번" 등 선택
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

      const res = await askAssistant(promptToSend);
      console.log("[assistant] response", res);

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

      const mode = res.mode || null;

      // ───── 날짜/시간 다시 물어보기 ─────
      if (mode === "clarify-date" && res.answer) {
        setPendingSuggest(null);
        setPendingClarify({
          baseTitle: res.baseTitle || "일정",
        });
        setList((prev) => [...prev, { role: "bot", text: res.answer }]);
        return;
      }

      // ───── 일정 추천 ─────
      if (mode === "suggest-time" && typeof res.answer === "string") {
        setPendingClarify(null);
        setPendingSuggest({
          answer: res.answer,
          baseTitle: res.baseTitle || null,
          sourceText: userText,
        });
        setList((prev) => [...prev, { role: "bot", text: res.answer }]);
        return;
      }

      // ───── 일정 삭제 ─────
      if (mode === "delete" && res.answer) {
        setList((prev) => [...prev, { role: "bot", text: res.answer }]);

        // 스토어에서 해당 이벤트들 제거 + 서버에서 최신 목록 재로딩
        if (Array.isArray(res.deletedIds) && res.deletedIds.length > 0) {
          deleteEventsByIds(res.deletedIds);
        }

        if (startLoadingEvents) {
          try {
            await startLoadingEvents();
          } catch (e) {
            console.error("[assistant] reload events after delete failed", e);
          }
        }

        setPendingSuggest(null);
        setPendingClarify(null);
        return;
      }

      // ───── 캘린더 생성 ─────
      if (mode === "create-calendar" && res.answer) {
        setList((prev) => [...prev, { role: "bot", text: res.answer }]);

        if (startLoadingCalendars) {
          try {
            await startLoadingCalendars();
          } catch (e) {
            console.error(
              "[assistant] reload calendars after create-calendar failed",
              e
            );
          }
        }

        setPendingSuggest(null);
        setPendingClarify(null);
        return;
      }

      // ───── 캘린더 삭제 ─────
      if (mode === "delete-calendar" && res.answer) {
        setList((prev) => [...prev, { role: "bot", text: res.answer }]);

        // 캘린더 목록과 이벤트 목록을 모두 재로딩
        if (startLoadingCalendars) {
          try {
            await startLoadingCalendars();
          } catch (e) {
            console.error(
              "[assistant] reload calendars after delete-calendar failed",
              e
            );
          }
        }
        if (startLoadingEvents) {
          try {
            await startLoadingEvents();
          } catch (e) {
            console.error(
              "[assistant] reload events after delete-calendar failed",
              e
            );
          }
        }

        setPendingSuggest(null);
        setPendingClarify(null);
        return;
      }

      // ───── 일정 생성 ─────
      if (
        (mode === "create" || typeof res.inserted === "number") &&
        res.inserted > 0
      ) {
        const { year, month, day, weekday, time, calendarName, title } = res;

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
          time && time.start && time.end ? ` ${time.start} ~ ${time.end}` : "";

        const calText = calendarName ? `${calendarName} 캘린더에 ` : "";
        const titleText = title || "일정";

        const msg = `${when}${timeText}에 ${calText}'${titleText}' 일정 ${res.inserted}개를 추가했어요.`;

        setList((prev) => [...prev, { role: "bot", text: msg }]);

        if (startLoadingEvents) {
          try {
            await startLoadingEvents();
          } catch (e) {
            console.error("[assistant] reload events after create failed", e);
          }
        }

        setPendingSuggest(null);
        setPendingClarify(null);
        return;
      }

      // ───── 일반 텍스트 답변(일반 대화 / 기타) ─────
      if (res.answer) {
        setList((prev) => [...prev, { role: "bot", text: res.answer }]);
        setPendingSuggest(null);
        setPendingClarify(null);
        return;
      }

      // ───── 그 외 애매한 케이스 ─────
      setList((prev) => [
        ...prev,
        { role: "bot", text: "요청하신 내용을 처리했어요." },
      ]);
      setPendingSuggest(null);
      setPendingClarify(null);
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
    <div className="assistant-overlay" role="dialog" aria-modal="true">
      <div
        className="assistant-modal"
        style={{
          top: windowRect.top,
          left: windowRect.left,
          width: windowRect.width,
          height: windowRect.height,
        }}
      >
        {/* 헤더 = 드래그 영역 */}
        <div className="assistant-header" onMouseDown={beginDrag}>
          <span>AI 도우미</span>
          <button
            type="button"
            className="assistant-close"
            onClick={onClose}
            aria-label="close"
            onMouseDown={(e) => e.stopPropagation()}
          >
            ×
          </button>
        </div>

        {/* 메시지 영역 */}
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

        {/* 입력 영역 */}
        <div className="assistant-input">
          <textarea
            ref={taRef}
            className="assistant-textarea"
            placeholder="메시지 입력..."
            defaultValue=""
            onInput={onInput}
            onKeyDown={onKeyDown}
            rows={1}
          />
          <button className="assistant-send" onClick={send}>
            보내기
          </button>
        </div>

        {/* ───── 리사이즈 핸들(4변 + 4모서리) ───── */}
        <div
          className="assistant-resize-handle edge top"
          onMouseDown={(e) => beginResize(e, { top: true })}
        />
        <div
          className="assistant-resize-handle edge bottom"
          onMouseDown={(e) => beginResize(e, { bottom: true })}
        />
        <div
          className="assistant-resize-handle edge left"
          onMouseDown={(e) => beginResize(e, { left: true })}
        />
        <div
          className="assistant-resize-handle edge right"
          onMouseDown={(e) => beginResize(e, { right: true })}
        />

        <div
          className="assistant-resize-handle corner tl"
          onMouseDown={(e) => beginResize(e, { top: true, left: true })}
        />
        <div
          className="assistant-resize-handle corner tr"
          onMouseDown={(e) => beginResize(e, { top: true, right: true })}
        />
        <div
          className="assistant-resize-handle corner bl"
          onMouseDown={(e) => beginResize(e, { bottom: true, left: true })}
        />
        <div
          className="assistant-resize-handle corner br"
          onMouseDown={(e) => beginResize(e, { bottom: true, right: true })}
        />
      </div>
    </div>
  );
}
