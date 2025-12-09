// CalendarPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { Calendar } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import AssistantFab from "../components/AssistantFab";
import AssistantChatModal from "../components/AssistantChatModal";

// DND
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import { localizer } from '../../helpers/calendarLocalizer';
import { Navbar, CalendarModal } from '../';
import { Sidebar } from '../components/Sidebar';
import { getMessagesKO, convertEventsToDateEvents } from '../../helpers';
import { useCalendarStore, useAuthStore } from '../../hooks';
import { useRealtimeCalendarSync } from '../../hooks/useRealtimeCalendarSync';

const DragAndDropCalendar = withDragAndDrop(Calendar);

// ----- 유틸 -----
const toId = (v) => (typeof v === 'object' && v ? (v._id || v.id) : v);
const sameId = (a, b) => (a && b ? String(a) === String(b) : false);
const idsFrom = (arr) => (Array.isArray(arr) ? arr.map((x) => String(toId(x))) : []);

export const CalendarPage = () => {
  // 1. Store hooks
  const { status, user } = useAuthStore();
  const {
    events,
    calendars,
    activeCalendar,
    activeEvent,
    setActiveEvent,
    startLoadingEvents,
    startLoadingCalendars,
    startSavingEvent,
  } = useCalendarStore();

  useRealtimeCalendarSync(15000); // 최대 15초 안에 자동으로 변경 내용 반영

  // 2. Local State
  const [lastView, setLastView] = useState(localStorage.getItem('lastView') || 'month');
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [checkedState, setCheckedState] = useState({});
  const [openAssistant, setOpenAssistant] = useState(false);

  // 3. useEffects
  useEffect(() => {
    const saved = localStorage.getItem('calendarVisibility');
    if (saved) {
      try {
        setCheckedState(JSON.parse(saved));
      } catch {
        setCheckedState({});
      }
    }
  }, []);

  useEffect(() => {
    if (calendars.length > 0) {
      setCheckedState((prev) => {
        const updated = { ...prev };
        calendars.forEach((c) => {
          const id = toId(c._id || c.id);
          if (updated[id] === undefined) updated[id] = true; // 새로 추가된 캘린더는 기본으로 표시
        });
        return updated;
      });
    }
  }, [calendars]);

  useEffect(() => {
    if (Object.keys(checkedState).length > 0) {
      localStorage.setItem('calendarVisibility', JSON.stringify(checkedState));
    }
  }, [checkedState]);

  useEffect(() => {
    if (status === 'authenticated') {
      startLoadingCalendars();
      startLoadingEvents();
    }
  }, [status]);

  // 4. 권한 계산 공용 함수
  const getRoleForCalendar = (cal) => {
    if (!cal) return 'viewer';
    const me = String(user.uid);
    const ownerId = String(toId(cal.user));
    const editorIds = idsFrom(cal.editors);
    const participantIds = idsFrom(cal.participants);

    if (ownerId === me) return 'owner';
    if (editorIds.includes(me)) return 'editor';
    if (participantIds.includes(me)) return 'viewer';
    return 'viewer';
  };

  // 새 일정 버튼/모달에서 “쓰기가능” 판단용
  const canEditActiveCalendar = useMemo(() => {
    if (!activeCalendar || calendars.length === 0) return false;
    const fullActiveCal = calendars.find(
      (c) =>
        String(toId(c._id || c.id)) === String(toId(activeCalendar._id || activeCalendar.id))
    );
    if (!fullActiveCal) return false;
    const role = getRoleForCalendar(fullActiveCal);
    return role === 'owner' || role === 'editor';
  }, [activeCalendar, calendars, user.uid]);

  // 이벤트 기반 권한 (Drag/Resize)
  const checkEventPermission = (event) => {
    const eventOriginalId =
      toId(event.calendar?._id) || toId(event.calendar?.id) || toId(event.calendar);
    if (!eventOriginalId) return false;
    const calendarStub = calendars.find((c) => {
      const isOriginal = String(toId(c._id || c.id)) === String(eventOriginalId);
      const isShared = String(c.originalCalendarId || '') === String(eventOriginalId);
      return isOriginal || isShared;
    });
    if (!calendarStub) return false;
    const role = getRoleForCalendar(calendarStub);
    return role === 'owner' || role === 'editor';
  };

  // 모달 권한 계산
  const canModifyInModal = useMemo(() => {
    if (!user || !calendars || calendars.length === 0) return false;
    const me = String(user.uid);
    const eventCalId =
      activeEvent?.calendar?._id ||
      activeEvent?.calendar?.id ||
      activeEvent?.calendar ||
      null;
    if (!eventCalId) return false;
    const targetCal = calendars.find(
      (c) =>
        String(c._id) === String(eventCalId) ||
        String(c.id) === String(eventCalId) ||
        String(c.originalCalendarId) === String(eventCalId)
    );
    if (!targetCal) return false;

    const ownerId =
      typeof targetCal.user === 'object'
        ? String(targetCal.user._id)
        : String(targetCal.user);

    const editors = Array.isArray(targetCal.editors)
      ? targetCal.editors.map((e) => (typeof e === 'object' ? String(e._id) : String(e)))
      : [];
    const participants = Array.isArray(targetCal.participants)
      ? targetCal.participants.map((p) =>
          typeof p === 'object' ? String(p._id) : String(p)
        )
      : [];

    const isOwner = ownerId === me;
    const isEditor = editors.includes(me);
    const isParticipant = participants.includes(me);
    if (isParticipant && !isOwner && !isEditor) return false;
    return isOwner || isEditor;
  }, [user, calendars, activeEvent]);

  // 핸들러
  const handleCheckboxChange = (calendarId) => {
    setCheckedState((prevState) => ({
      ...prevState,
      [calendarId]: !prevState[calendarId],
    }));
  };

  const handleSelectEvent = (event) => {
    setActiveEvent(event);
    setIsEventModalOpen(true);
  };

  const handleCloseModal = () => setIsEventModalOpen(false);

  const handleEventDrop = ({ event, start, end }) => {
    if (!checkEventPermission(event)) return;
    startSavingEvent({ ...event, start, end });
  };

  const handleEventResize = ({ event, start, end }) => {
    if (!checkEventPermission(event)) return;
    startSavingEvent({ ...event, start, end });
  };

  const eventCanBeModified = (event) => checkEventPermission(event);

  const eventStyleGetter = (event) => {
    const eventCalId = event.calendar?._id || event.calendar?.id || event.calendar;
    const matchedCal = calendars.find(
      (c) =>
        String(c._id) === String(eventCalId) ||
        String(c.id) === String(eventCalId) ||
        String(c.originalCalendarId) === String(eventCalId)
    );
    const color = matchedCal?.color || event.calendar?.color || '#367CF7';
    return {
      style: {
        backgroundColor: color,
        borderRadius: '2px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
      },
    };
  };

  const onViewChanged = (event) => {
    localStorage.setItem('lastView', event);
    setLastView(event);
  };

  // 6. 필터링 (원본/공유 캘린더 모두 고려)
  const filteredEvents = useMemo(() => {
    if (!Array.isArray(events) || !Array.isArray(calendars)) return [];

    return events.filter((event) => {
      const evCalId = String(
        toId(event.calendar?._id) ||
        toId(event.calendar?.id) ||
        toId(event.calendar)
      );

      if (!evCalId) return false;

      // 이 이벤트가 속한 캘린더(원본 또는 공유)를 찾는다.
      const relatedCalendar = calendars.find((c) => {
        const id = String(toId(c._id || c.id));
        const originalId = c.originalCalendarId
          ? String(c.originalCalendarId)
          : null;

        return (
          evCalId === id ||             // 이벤트가 이 캘린더 id를 직접 사용
          (originalId && evCalId === originalId) // 이벤트는 원본 id, c는 공유 캘린더
        );
      });

      if (!relatedCalendar) return false;

      const relatedId = String(toId(relatedCalendar._id || relatedCalendar.id));

      // 체크박스에 true 이거나, 아예 항목이 없으면 기본으로 보이게
      return checkedState[relatedId] !== false;
    });
  }, [events, calendars, checkedState]);

  const parsedEvents = useMemo(
    () => convertEventsToDateEvents(filteredEvents),
    [filteredEvents]
  );

  // 공유 캘린더일 때만 작성자 이름 표시
  const CustomEvent = ({ event }) => {
    const evCalId = String(
      toId(event.calendar?._id) ||
      toId(event.calendar?.id) ||
      toId(event.calendar)
    );

    const cal = calendars.find((c) => {
      const id = String(toId(c._id || c.id));
      const originalId = c.originalCalendarId ? String(c.originalCalendarId) : null;
      return evCalId === id || (originalId && evCalId === originalId);
    });

    const isShared =
      cal &&
      (cal.originalCalendarId ||
        (Array.isArray(cal.participants) && cal.participants.length > 0));

    return (
      <span>
        <strong>{event.title}</strong>
        {isShared && event.user?.name && ` - ${event.user.name}`}
      </span>
    );
  };

  // 8. 렌더링
  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className="container-fluid p-0"
        style={{ height: '100vh', overflow: 'hidden' }}
      >
        <Navbar />
        <div className="d-flex" style={{ height: 'calc(100vh - 60px)' }}>
          <Sidebar
            setIsEventModalOpen={setIsEventModalOpen}
            checkedState={checkedState}
            handleCheckboxChange={handleCheckboxChange}
          />
          <div className="flex-grow-1 bg-white">
            <DragAndDropCalendar
              culture="ko"
              localizer={localizer}
              events={parsedEvents}
              defaultView={lastView}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%', padding: '10px' }}
              messages={getMessagesKO()}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleSelectEvent}
              components={{ event: CustomEvent }}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              resizableAccessor={eventCanBeModified}
              draggableAccessor={eventCanBeModified}
              onView={onViewChanged}
            />
          </div>
        </div>

        {isEventModalOpen && (
          <CalendarModal
            onClose={handleCloseModal}
            canModify={canModifyInModal}
            calendars={calendars}
            userId={String(user.uid)}
          />
        )}

        <AssistantFab onClick={() => setOpenAssistant(true)} />
        <AssistantChatModal
          open={openAssistant}
          onClose={() => setOpenAssistant(false)}
        />
      </div>
    </DndProvider>
  );
};
