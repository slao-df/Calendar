// useCalendarStore.js
import { useDispatch, useSelector } from 'react-redux';
import Swal from 'sweetalert2';
import { calendarApi } from '../api';
import {
  onAddNewEvent,
  onDeleteEvent,
  onSetActiveEvent,
  onUpdateEvent,
  onLoadEvents,
  onAddCalendar,
  onDeleteCalendar,
  onSetActiveCalendar,
  onLoadCalendars,
  onUpdateCalendar,
  onAddNewCalendar, // (slice에 있을 수 있어 유지)
} from '../store';
import { useAuthStore } from './useAuthStore';

export const useCalendarStore = () => {
  const dispatch = useDispatch();
  const { events, activeEvent, calendars, activeCalendar } = useSelector(
    (state) => state.calendar
  );
  const { user } = useAuthStore();

  // ---------- helpers ----------
  const toId = (v) => (typeof v === 'object' && v ? v._id || v.id : v);
  const sameId = (a, b) => (a && b ? String(a) === String(b) : false);

  // events 배열의 각 event에 최신 calendars 기준의 calendar 객체를 덧붙여서 리턴
  const attachCalendarsToEvents = (rawEvents, calendarsList) => {
    if (!Array.isArray(rawEvents)) return [];
    return rawEvents.map((ev) => {
      const calId =
        toId(ev.calendar?._id) ||
        toId(ev.calendar?.id) ||
        toId(ev.calendar) ||
        ev.calendarId;

      const fullCal =
        calendarsList?.find(
          (c) =>
            sameId(toId(c._id || c.id), calId) ||
            sameId(c.originalCalendarId, calId)
        ) || ev.calendar;

      return { ...ev, calendar: fullCal };
    });
  };

  const setActiveEvent = (calendarEvent) => {
    dispatch(onSetActiveEvent(calendarEvent));
  };

  const startSavingEvent = async (calendarEvent) => {
    try {
      // 이벤트가 속한 원본 캘린더 id 추출
      const calendarId =
        calendarEvent.calendarId ||
        toId(calendarEvent.calendar?._id) ||
        toId(calendarEvent.calendar?.id) ||
        calendarEvent.calendar;

      // 현재 보유한 캘린더 목록에서 원본/공유 상관없이 매칭
      const fullCalendar =
        calendars.find(
          (c) =>
            sameId(toId(c.id || c._id), calendarId) ||
            sameId(c.originalCalendarId, calendarId)
        ) || null;

      if (calendarEvent.id) {
        // 수정
        await calendarApi.put(`/events/${calendarEvent.id}`, {
          ...calendarEvent,
          calendar: calendarId,
        });

        dispatch(
          onUpdateEvent({
            ...calendarEvent,
            start: calendarEvent.start.toISOString(),
            end: calendarEvent.end.toISOString(),
            user: user,
            calendar: fullCalendar,
          })
        );
        return;
      }

      // 생성
      const { data } = await calendarApi.post('/events', {
        ...calendarEvent,
        calendar: calendarId,
      });

      dispatch(
        onAddNewEvent({
          ...calendarEvent,
          id: data.event.id,
          start: calendarEvent.start.toISOString(),
          end: calendarEvent.end.toISOString(),
          user: user,
          calendar: fullCalendar,
        })
      );
    } catch (error) {
      console.error('이벤트 저장 오류:', error);
      Swal.fire(
        '저장 실패',
        error.response?.data?.msg || '이벤트 저장에 실패했습니다.',
        'error'
      );
    }
  };

  // 삭제 (메인 캘린더에서 직접 삭제할 때)
  const startDeletingEvent = async () => {
    if (!activeEvent) return;

    try {
      const eventId = activeEvent.id || activeEvent._id;
      await calendarApi.delete(`/events/${eventId}`);
      dispatch(onDeleteEvent(eventId));
      Swal.fire('삭제 완료', '일정이 삭제되었습니다.', 'success');
    } catch (error) {
      console.error('이벤트 삭제 오류:', error);
      Swal.fire(
        '삭제 실패',
        error.response?.data?.msg || '이벤트 삭제에 실패했습니다.',
        'error'
      );
    }
  };

  // AI 도우미 삭제 결과를 프론트 상태에 즉시 반영하는 함수
  // deletedIds: 백엔드에서 내려준 삭제된 이벤트 _id 배열
  const deleteEventsByIds = (deletedIds = []) => {
    if (!Array.isArray(deletedIds) || deletedIds.length === 0) return;

    const idSet = new Set(deletedIds.map((id) => String(id)));

    const filteredEvents = (events || []).filter((ev) => {
      const evId =
        toId(ev.id) ||
        toId(ev._id) ||
        toId(ev.eventId) ||
        toId(ev);
      if (!evId) return true;
      return !idSet.has(String(evId));
    });

    const merged = attachCalendarsToEvents(filteredEvents, calendars);
    dispatch(onLoadEvents(merged));
  };

  // 이벤트 로드 (로드 후 최신 캘린더 객체와 매칭)
  const startLoadingEvents = async () => {
    try {
      const { data } = await calendarApi.get('/events');
      const merged = attachCalendarsToEvents(data.events, calendars);

      // 여기서 한번 전체 events를 싹 비우고, 서버 값으로 다시 채운다.
      // onLoadEvents 가 "append only" 방식이어도, 먼저 전부 onDeleteEvent로 지워버리면
      // 최종적으로는 서버에서 받은 이벤트만 남게 됨.
      if (events && events.length) {
        for (const ev of events) {
          const id = ev.id || ev._id || toId(ev);
          if (id) {
            dispatch(onDeleteEvent(id));
          }
        }
      }

      // 그리고 서버에서 받은 최신 목록으로 덮어쓰기
      dispatch(onLoadEvents(merged));
    } catch (error) {
      console.error('❗️ 이벤트 로딩 중 오류 발생:', error);
    }
  };

  // --- 캘린더 관련 ---
  const startAddingCalendar = async (calendarData) => {
    try {
      const { data } = await calendarApi.post('/calendars', calendarData);
      dispatch(onAddCalendar(data.calendar));
      // 최신 상태 보장
      await startLoadingCalendars();
      await startLoadingEvents();
      Swal.fire('성공', '새 캘린더가 생성되었습니다.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire(
        '생성 실패',
        error.response?.data?.msg || '캘린더 생성에 실패했습니다.',
        'error'
      );
    }
  };

  // 공유 캘린더 참여
  const startJoiningCalendar = async (shareId, password) => {
    try {
      const { data } = await calendarApi.post(`/calendars/share/${shareId}`, {
        password,
      });

      if (data.ok) {
        // 전체 새로 로드하여 동기화
        await startLoadingCalendars();
        await startLoadingEvents();
        Swal.fire('성공', '공유 캘린더가 추가되었습니다.', 'success');
      } else {
        Swal.fire('오류', data.msg || '캘린더 참여에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error(error);
      Swal.fire(
        '참여 실패',
        error.response?.data?.msg || '캘린더에 참여할 수 없습니다.',
        'error'
      );
    }
  };

  const startLoadingCalendars = async () => {
    try {
      const { data } = await calendarApi.get('/calendars');
      dispatch(onLoadCalendars(data.calendars));
      // 캘린더가 바뀌면 이벤트의 참조도 최신 캘린더로 붙여서 스토어 갱신
      if (events?.length) {
        const merged = attachCalendarsToEvents(events, data.calendars);
        dispatch(onLoadEvents(merged));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const startUpdatingCalendar = async (calendarData) => {
    try {
      const calendarId = calendarData.id || calendarData._id;
      if (!calendarId) throw new Error('수정할 캘린더 ID가 없습니다.');

      await calendarApi.put(`/calendars/${calendarId}`, calendarData);

      // 낙관적 업데이트 (간단 반영)
      dispatch(onUpdateCalendar(calendarData));

      // 원본/공유 전파 및 이벤트 색상 반영을 위해 서버 데이터 재로딩
      await startLoadingCalendars();
      await startLoadingEvents();

      Swal.fire('수정 완료', '캘린더가 수정되었습니다.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire(
        '수정 오류',
        error.response?.data?.msg || '캘린더 수정 중 오류가 발생했습니다.',
        'error'
      );
    }
  };

  const startDeletingCalendar = async (id) => {
    try {
      await calendarApi.delete(`/calendars/${id}`);
      dispatch(onDeleteCalendar(id));
      // 삭제 후 전체 동기화
      await startLoadingCalendars();
      await startLoadingEvents();
      //Swal.fire('삭제 완료', '캘린더 및 관련 일정이 삭제되었습니다.', 'success');
    } catch (error) {
      console.log(error);
      Swal.fire(
        '삭제 오류',
        error.response?.data?.msg || '캘린더 삭제 중 오류가 발생했습니다.',
        'error'
      );
    }
  };

  const setActiveCalendar = (calendar) => {
    dispatch(onSetActiveCalendar(calendar));
  };

  return {
    events,
    activeEvent,
    hasEventSelected: !!activeEvent,
    calendars,
    activeCalendar,
    hasCalendarSelected: !!activeCalendar,

    setActiveEvent,
    startSavingEvent,
    startDeletingEvent,
    startLoadingEvents,

    startAddingCalendar,
    startLoadingCalendars,
    startUpdatingCalendar,
    startDeletingCalendar,
    setActiveCalendar,

    startJoiningCalendar,

    // AI 도우미용: deletedIds 기준으로 프론트에서 바로 일정 제거
    deleteEventsByIds,
  };
};
