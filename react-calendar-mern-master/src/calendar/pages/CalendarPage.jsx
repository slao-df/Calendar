import { useState, useEffect, useMemo } from 'react';
import { Calendar } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import {
  Navbar,
  CalendarEvent,
  CalendarModal,
  Sidebar,
  CalendarToolbar,
  AddCalendarModal,
  AddSharedEventModal,
} from '../';

import { localizer } from '../../helpers';
import { useUiStore, useCalendarStore, useAuthStore } from '../../hooks';
import './CalendarPage.css';

const DnDCalendar = withDragAndDrop(Calendar);

export const CalendarPage = () => {
  const { user } = useAuthStore();
  const { openDateModal } = useUiStore();
  const { events, calendars, setActiveEvent, startLoadingEvents, startSavingEvent, visibleCalendarIds } = useCalendarStore();
  const [lastView, setLastView] = useState(localStorage.getItem('lastView') || 'month');

  const eventStyleGetter = (event, start, end, isSelected) => {
    const isMyEvent = (user.uid === event.user._id) || (user.uid === event.user.uid);
    const style = {
      backgroundColor: event.calendar?.color || '#347CF7',
      borderRadius: '0px',
      opacity: 0.8,
      color: 'white',
      border: 'none'
    };
    return { style };
  };
  
  // 현재 캘린더 색을 기준으로 이벤트 색을 “패치”한 배열 만들기
  const colorPatchedEvents = useMemo(() => {
    // id 매칭을 빠르게 하려고 Map 구성 (id와 _id 모두 대비)
    const colorById = new Map();
    calendars.forEach(c => {
      const cid = c.id || c._id;
      if (cid) colorById.set(String(cid), c.color);
    });

    return events.map(ev => {
      // event.calendar가 문자열(id)일 수도, 객체일 수도 있으니 모두 처리
      const evCalId =
        typeof ev.calendar === 'string'
          ? ev.calendar
          : ev.calendar?.id || ev.calendar?._id;

      if (!evCalId) return ev;

      const latestColor = colorById.get(String(evCalId));
      // 색이 같으면 원본 반환(불필요한 새 객체 생성 방지)
      if (!latestColor || ev.calendar?.color === latestColor) return ev;

      // ✅ 최신 색으로 덮어씌운 새 이벤트 객체 반환
      const patchedCalendar =
        typeof ev.calendar === 'string'
          ? { id: evCalId, color: latestColor } // 문자열이던 케이스를 객체로 정규화
          : { ...ev.calendar, color: latestColor };

      return { ...ev, calendar: patchedCalendar };
    });
  }, [events, calendars]);

  /*
  const filteredEvents = useMemo(() => {
      if (!visibleCalendarIds || !Array.isArray(visibleCalendarIds)) {
          // visibleCalendarIds가 배열이 아니면 필터링하지 않음
          return events; 
      }
      
      // event.calendar가 존재하는지 반드시 확인
      return events.filter(event => event.calendar && visibleCalendarIds.includes(event.calendar.id));

  }, [events, visibleCalendarIds]);
  */

  const filteredEvents = useMemo(() => {
    if (!visibleCalendarIds || !Array.isArray(visibleCalendarIds)) {
      return colorPatchedEvents;
    }
    return colorPatchedEvents.filter(ev => {
      const calId =
        typeof ev.calendar === 'string'
          ? ev.calendar
          : ev.calendar?.id || ev.calendar?._id;
      return calId && visibleCalendarIds.includes(calId);
    });
  }, [colorPatchedEvents, visibleCalendarIds]);



  const onDoubleClick = (event) => {
    openDateModal();
  };

  const onSelect = (event) => {
    setActiveEvent(event);
    openDateModal();
  };

  const onViewChanged = (event) => {
    localStorage.setItem('lastView', event);
    setLastView(event);
  };

  useEffect(() => {
    startLoadingEvents();
  }, []);

  const onEventDrop = ({ event, start, end }) => {
    // 드래그 앤 드롭으로 변경된 날짜 정보를 기존 이벤트 객체에 업데이트
    const updatedEvent = { ...event, start, end };
    startSavingEvent(updatedEvent); // 수정 API 호출
    setActiveEvent(updatedEvent);
  }

  return (
    <div className="calendar-screen">
      <Navbar />
      <div className="calendar-layout-container">
        <Sidebar />
        <main className="main-content">
          <DndProvider backend={HTML5Backend}>
            <DnDCalendar
              //key={filteredEvents.length}
              culture='ko'
              localizer={localizer}
              events={filteredEvents}
              //events={events}
              defaultView={lastView}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              messages={{ /* ... */ }}
              eventPropGetter={eventStyleGetter} 
              components={{
                event: CalendarEvent,
                toolbar: CalendarToolbar 
              }}
              onDoubleClickEvent={onDoubleClick}
              onSelectEvent={onSelect} 
              onView={onViewChanged}
              // 👇 드래그 앤 드롭 관련 속성
              resizable
              onEventDrop={onEventDrop}
            />
          </DndProvider>
        </main>
      </div>
      <CalendarModal />
      <AddCalendarModal />
      <AddSharedEventModal />
    </div>
  );
};
