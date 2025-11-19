import { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import ko from 'date-fns/locale/ko';
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

const DragAndDropCalendar = withDragAndDrop(Calendar);

// ✅ 커스텀 localizer (상단 월/년 형식 변경 포함)
const locales = { ko };
const customLocalizer = dateFnsLocalizer({
  format: (date, formatStr, options) => {
    if (formatStr === 'MMMM yyyy') {
      const year = date.getFullYear();
      const month = date.toLocaleString('ko-KR', { month: 'long' });
      return `${year}년 ${month}`; // ✅ 년-월 순서로 표시
    }
    return format(date, formatStr, { locale: ko });
  },
  parse,
  startOfWeek,
  getDay,
  locales,
});

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
          if (updated[id] === undefined) updated[id] = true;
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
      startLoadingEvents();
      startLoadingCalendars();
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

  // 6. 필터링
  const visibleOriginalIds = useMemo(() => {
    const idSet = new Set();
    const calendarMap = new Map(calendars.map((c) => [String(toId(c._id || c.id)), c]));
    Object.keys(checkedState).forEach((calendarId) => {
      if (checkedState[calendarId]) {
        const cal = calendarMap.get(String(calendarId));
        if (cal) {
          if (cal.originalCalendarId) idSet.add(String(cal.originalCalendarId));
          else idSet.add(String(toId(cal._id || cal.id)));
        }
      }
    });
    return idSet;
  }, [calendars, checkedState]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const eventCalendarId = String(
        toId(event.calendar?._id) ||
          toId(event.calendar?.id) ||
          toId(event.calendar)
      );
      return visibleOriginalIds.has(eventCalendarId);
    });
  }, [events, visibleOriginalIds]);

  const parsedEvents = useMemo(
    () => convertEventsToDateEvents(filteredEvents),
    [filteredEvents]
  );

  const CustomEvent = ({ event }) => (
    <span>
      <strong>{event.title}</strong>
      {event.user?.name && ` - ${event.user.name}`}
    </span>
  );

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
              // localizer={customLocalizer} // 수정된 localizer 사용
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
              resizable={undefined}
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
