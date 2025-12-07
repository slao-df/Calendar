// src/hooks/useRealtimeCalendarSync.js
import { useEffect } from "react";
import { useCalendarStore } from "./useCalendarStore";

/**
 * 일정/캘린더를 주기적으로 서버와 동기화하는 훅
 * - intervalMs: 동기화 간격 (기본 15초)
 */
export const useRealtimeCalendarSync = (intervalMs = 15000) => {
  const { startLoadingEvents, startLoadingCalendars } = useCalendarStore();

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      try {
        // 탭이 숨겨져 있을 땐 굳이 안 불러와도 됨 (선택사항)
        if (document.hidden) return;

        await startLoadingCalendars();
        await startLoadingEvents();
      } catch (e) {
        console.error("[realtime-sync] error:", e);
      }
    };

    // 1) 첫 진입 시 한 번 동기화
    sync();

    // 2) 주기적으로 반복
    const id = setInterval(() => {
      if (!cancelled) {
        sync();
      }
    }, intervalMs);

    // 탭이 다시 보일 때 한 번 더 동기화
    const onVisibilityChange = () => {
      if (!document.hidden) {
        sync();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [intervalMs]); // ⬅ 여기! startLoadingEvents/Calendars 절대 넣지 말기
};
