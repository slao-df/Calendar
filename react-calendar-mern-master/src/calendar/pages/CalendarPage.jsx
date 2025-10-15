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
  ShareCalendarModal, // ❗️ 1. ShareCalendarModal 컴포넌트 import 추가
} from '../';

import { localizer } from '../../helpers';
import { useUiStore, useCalendarStore, useAuthStore } from '../../hooks';
import './CalendarPage.css';

const DnDCalendar = withDragAndDrop(Calendar);

export const CalendarPage = () => {
  const { user } = useAuthStore();
  const { openDateModal } = useUiStore();
  const { events, calendars, setActiveEvent, startLoadingEvents, startSavingEvent, visibleCalendarIds, startSavingCalendar } = useCalendarStore();
  const [lastView, setLastView] = useState(localStorage.getItem('lastView') || 'month');

  // ❗️ 2. 공유 모달의 상태와 데이터를 관리할 useState 추가
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareData, setShareData] = useState(null);

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
  
  const colorPatchedEvents = useMemo(() => {
    const colorById = new Map();
    calendars.forEach(c => {
      const cid = c.id || c._id;
      if (cid) colorById.set(String(cid), c.color);
    });

    return events.map(ev => {
      const evCalId =
        typeof ev.calendar === 'string'
          ? ev.calendar
          : ev.calendar?.id || ev.calendar?._id;

      if (!evCalId) return ev;

      const latestColor = colorById.get(String(evCalId));
      if (!latestColor || ev.calendar?.color === latestColor) return ev;

      const patchedCalendar =
        typeof ev.calendar === 'string'
          ? { id: evCalId, color: latestColor }
          : { ...ev.calendar, color: latestColor };

      return { ...ev, calendar: patchedCalendar };
    });
  }, [events, calendars]);

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
  
  const handleOpenShareModal = (calendarId, link, sharePassword) => { // password -> sharePassword
      setShareData({ 
          calendarId, 
          link, 
          sharePassword // password -> sharePassword
      });
      setIsShareModalOpen(true);
  };

  useEffect(() => {
    startLoadingEvents();
  }, []);

  const onEventDrop = ({ event, start, end }) => {
    const updatedEvent = { ...event, start, end };
    startSavingEvent(updatedEvent);
    setActiveEvent(updatedEvent);
  }

  const handlePasswordSave = async (calendarToSave) => {
      try {
          await startSavingCalendar(calendarToSave);
          // alert('비밀번호가 저장되었습니다.'); // 사용자에게 알려주고 싶다면 추가
      } catch (error) {
          console.error('비밀번호 저장 실패:', error);
          // Swal.fire('오류', '비밀번호 저장에 실패했습니다.', 'error'); // 에러 알림
      }
  };

  return (
    <div className="calendar-screen">
      <Navbar />
      <div className="calendar-layout-container">
        {/* ❗️ 4. Sidebar 컴포넌트에 onShare prop으로 함수 전달 */}
        <Sidebar onShare={handleOpenShareModal} />
        <main className="main-content">
          <DndProvider backend={HTML5Backend}>
            <DnDCalendar
              culture='ko'
              localizer={localizer}
              events={filteredEvents}
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
              resizable
              onEventDrop={onEventDrop}
            />
          </DndProvider>
        </main>
      </div>
      <CalendarModal />
      <AddCalendarModal />
      <AddSharedEventModal />
      
      {/* ❗️ 5. ShareCalendarModal을 렌더링하고 상태와 함수를 props로 전달 */}
      <ShareCalendarModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareData={shareData}
        onSave={handlePasswordSave}
      />
    </div>
  );
};
