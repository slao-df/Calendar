import { useDispatch, useSelector } from 'react-redux';
import Swal from 'sweetalert2';
import { calendarApi } from '../api';
import { convertEventsToDateEvents } from '../helpers';
import {
  onAddNewEvent,
  onDeleteEvent,
  onSetActiveEvent,
  onClearActiveEvent,
  onUpdateEvent,
  onLoadEvents,
  onLoadCalendars,
  onAddNewCalendar,
  onUpdateCalendar,
  onDeleteCalendar,
  onSetActiveCalendar,
  onClearActiveCalendar,
  onToggleCalendarVisibility,
  updateEventsCalendarColor,
} from '../store';

export const useCalendarStore = () => {
  const dispatch = useDispatch();
  const { events, activeEvent, calendars, visibleCalendarIds, activeCalendar } =
    useSelector((state) => state.calendar);
  const { user } = useSelector((state) => state.auth);

  // ✅ ID 정규화
  const normalizeId = (obj) => {
    if (!obj) return obj;
    return { ...obj, id: obj.id || obj._id };
  };

  // ✅ 일정 로드
  const startLoadingEvents = async () => {
    try {
      const { data } = await calendarApi.get('/events');
      const events = convertEventsToDateEvents(data.eventos);
      dispatch(onLoadEvents(events));
    } catch (error) {
      console.error('❌ 일정 불러오기 오류:', error);
    }
  };

  // ✅ 일정 저장
  const startSavingEvent = async (calendarEvent) => {
    try {
      if (calendarEvent.id) {
        const { data } = await calendarApi.put(
          `/events/${calendarEvent.id}`,
          calendarEvent
        );
        const updated = convertEventsToDateEvents([data.evento])[0];
        dispatch(onUpdateEvent(updated));
      } else {
        const { data } = await calendarApi.post('/events', calendarEvent);
        const created = convertEventsToDateEvents([data.evento])[0];
        dispatch(onAddNewEvent({ ...created, user }));
      }
    } catch (error) {
      console.error('❌ 일정 저장 오류:', error);
      Swal.fire(
        '저장 오류',
        error.response?.data?.msg || '일정을 저장할 수 없습니다.',
        'error'
      );
    }
  };

  // ✅ 일정 삭제
  const startDeletingEvent = async () => {
    try {
      await calendarApi.delete(`/events/${activeEvent.id}`);
      dispatch(onDeleteEvent());
    } catch (error) {
      console.error('❌ 일정 삭제 오류:', error);
      Swal.fire(
        '삭제 오류',
        error.response?.data?.msg || '일정을 삭제할 수 없습니다.',
        'error'
      );
    }
  };

  // ✅ 캘린더 불러오기
  const startLoadingCalendars = async () => {
    try {
      const { data } = await calendarApi.get('/calendars');
      if (Array.isArray(data.calendars)) {
        const normalized = data.calendars.map(normalizeId);
        dispatch(onLoadCalendars(normalized));
      }
    } catch (error) {
      console.error('❌ 캘린더 불러오기 오류:', error);
    }
  };

  // ✅ 캘린더 저장 (생성 / 수정)
  const startSavingCalendar = async (calendarData) => {
  try {
    // 1️⃣ id 정규화 (_id → id 변환)
    const calendarId = calendarData.id || calendarData._id;
    const isNew = !calendarId; // id 없으면 신규 생성
    let resp;

    // 2️⃣ 새 캘린더 생성
    if (isNew) {
      resp = await calendarApi.post('/calendars/new', calendarData);
      const newCalendar = {
        ...resp.data.calendar,
        id: resp.data.calendar.id || resp.data.calendar._id,
        color: resp.data.calendar?.color || calendarData.color || '#347CF7',
        visible: true, // 생성 시 자동으로 체크됨
      };

      dispatch(onAddNewCalendar(newCalendar));
      Swal.fire('저장됨', '새 캘린더가 저장되었습니다.', 'success');
      console.log('📘 새 캘린더 생성:', newCalendar);
    }
    // 3️⃣ 기존 캘린더 수정
    else {
      resp = await calendarApi.put(`/calendars/${calendarId}`, calendarData);
      const updatedCalendar = {
        ...resp.data.calendar,
        id: resp.data.calendar.id || resp.data.calendar._id,
        color: resp.data.calendar?.color || calendarData.color || '#347CF7',
        visible: true, // 기존 상태 유지
      };

      dispatch(onUpdateCalendar(updatedCalendar));
      dispatch(updateEventsCalendarColor({ id: updatedCalendar.id, color: updatedCalendar.color }));
      Swal.fire('수정됨', '캘린더가 수정되었습니다.', 'success');
      console.log('✏️ 기존 캘린더 수정:', updatedCalendar);
    }

    return true;
  } catch (error) {
    console.error('❌ 캘린더 저장 중 오류:', error);
    Swal.fire('저장 오류', error.response?.data?.msg || '캘린더 저장 중 오류 발생', 'error');
    return false;
  }
};


  // ✅ 캘린더 삭제
  const startDeletingCalendar = async () => {
    const result = await Swal.fire({
      title: '캘린더를 삭제하시겠습니까?',
      text: '이 캘린더와 관련된 일정도 함께 삭제됩니다.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: '취소',
      confirmButtonText: '삭제',
    });

    if (!result.isConfirmed) return;

    try {
      await calendarApi.delete(`/calendars/${activeCalendar.id}`);
      dispatch(onDeleteCalendar());
      Swal.fire('삭제됨', '캘린더가 삭제되었습니다.', 'success');
    } catch (error) {
      console.error('❌ 캘린더 삭제 오류:', error);
      Swal.fire(
        '삭제 실패',
        error.response?.data?.msg || '캘린더 삭제 중 오류 발생',
        'error'
      );
    }
  };

  // ✅ 표시/숨기기 토글
  const toggleCalendarVisibility = (calendarId) => {
    dispatch(onToggleCalendarVisibility(calendarId));
  };

  // ✅ 공통 핸들러
  const setActiveEvent = (calendarEvent) => dispatch(onSetActiveEvent(calendarEvent));
  const clearActiveEvent = () => dispatch(onClearActiveEvent());
  const setActiveCalendar = (calendar) => dispatch(onSetActiveCalendar(normalizeId(calendar)));
  const clearActiveCalendar = () => dispatch(onClearActiveCalendar());

  // ✅ 반환 (전부 포함)
  return {
    events,
    activeEvent,
    calendars,
    activeCalendar,
    visibleCalendarIds,
    hasEventSelected: !!activeEvent,

    setActiveEvent,
    clearActiveEvent,
    startSavingEvent,
    startDeletingEvent,
    startLoadingEvents,
    startLoadingCalendars,
    startSavingCalendar,
    startDeletingCalendar,
    setActiveCalendar,
    clearActiveCalendar,
    toggleCalendarVisibility,
  };
};
