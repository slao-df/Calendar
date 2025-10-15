import { useDispatch, useSelector } from 'react-redux';
import Swal from 'sweetalert2';
import { calendarApi } from '../api';
import { convertEventsToDateEvents } from '../helpers';
import { 
    onAddNewEvent, 
    onDeleteEvent, 
    onSetActiveEvent, 
    onUpdateEvent, 
    onLoadEvents,
    onAddNewCalendar,
    onLoadCalendars,
    onClearActiveEvent,
    onToggleCalendarVisibility,
    onSetActiveCalendar,
    onClearActiveCalendar,
    onUpdateCalendar,
    onDeleteCalendar,
    updateEventsCalendarColor
} from '../store';

export const useCalendarStore = () => {
  
    const dispatch = useDispatch();
    const { events, activeEvent, calendars, visibleCalendarIds, activeCalendar } = useSelector( state => state.calendar );
    const { user } = useSelector( state => state.auth );

    const setActiveEvent = ( calendarEvent ) => {
        dispatch( onSetActiveEvent( calendarEvent ) )
    } 

    const clearActiveEvent = () => { 
        dispatch( onClearActiveEvent() );
    }

    const startSavingEvent = async (calendarEvent) => {
        try {
            // 수정 모드
            if (calendarEvent.id) {
                // 1. 백엔드로 수정 요청을 보냅니다.
                const { data } = await calendarApi.put(`/events/${calendarEvent.id}`, calendarEvent);
                // 2. 백엔드로부터 받은 최신 데이터(data.evento)를 날짜 형식으로 변환합니다.
                const convertedEvent = convertEventsToDateEvents([data.evento])[0];
                // 3. 변환된 데이터를 사용하여 Redux 스토어를 업데이트합니다.
                dispatch(onUpdateEvent(convertedEvent));
                return;
            }

            // 생성 모드 (기존 코드와 동일)
            const { data } = await calendarApi.post('/events', calendarEvent);
            const convertedEvent = convertEventsToDateEvents([data.evento])[0];
            dispatch(onAddNewEvent({ ...convertedEvent, user }));

        } catch (error) {
            console.log(error);
            Swal.fire('저장 오류', error.response.data.msg, 'error');
        }
    }

    const startDeletingEvent = async () => {
        try {
            await calendarApi.delete(`/events/${ activeEvent.id }` );
            dispatch( onDeleteEvent() );
        } catch (error)
        {
            console.log(error);
            Swal.fire('삭제 오류', error.response.data.msg, 'error');
        }
    }

    const startLoadingEvents = async() => {
        try {
            const { data } = await calendarApi.get('/events');
            const events = convertEventsToDateEvents( data.eventos );            
            dispatch( onLoadEvents( events ) );
        } catch (error) {
            console.log(error)

        }
    }

    const startLoadingCalendars = async() => {
        try {
            const { data } = await calendarApi.get('/calendars');
            if ( Array.isArray(data.calendars) ) {
                dispatch( onLoadCalendars( data.calendars ) );
            } else {
                console.error("응답 데이터에 calendars 배열이 없습니다.", data);
            }
        } catch (error) {
            console.log('캘린더를 불러오는 중 오류 발생', error);
        }
    }

    const setActiveCalendar = ( calendar ) => {
        dispatch( onSetActiveCalendar(calendar) );
    }

    const clearActiveCalendar = () => {
        dispatch( onClearActiveCalendar() );
    }
/*
    const startSavingCalendar = async( calendarData ) => {
        try {
            const { data } = await calendarApi.post('/calendars/new', calendarData);
            dispatch( onAddNewCalendar( data.calendar ) );
            Swal.fire('저장됨', '새 캘린더가 저장되었습니다.', 'success');
        } catch (error) {
            console.log(error);
            Swal.fire('저장 오류', error.response?.data?.msg || '캘린더를 저장할 수 없습니다', 'error');
        }
    } */
   const startSavingCalendar = async (calendarToSave) => {
        try {
            // ❗️ 1. 서버로 보내는 데이터를 확인하기 위한 로그
            console.log('📡 서버로 보내는 데이터:', calendarToSave);

            const { data } = await calendarApi.put(`/calendars/${calendarToSave.id}`, calendarToSave);
            
            // ❗️ 2. 서버로부터 받은 응답 데이터를 확인하기 위한 로그
            console.log('✅ 서버로부터 받은 응답 데이터:', data); 
            
            const updatedCalendar = data.calendar || data;
            dispatch(onUpdateCalendar(updatedCalendar));
            
            return updatedCalendar;
        } catch (error) {
            console.log('Error saving calendar', error);
            throw error;
        }
    };
    
    const toggleCalendarVisibility = ( calendarId ) => {
        dispatch( onToggleCalendarVisibility(calendarId) );
    }

    const startUpdatingCalendar = async (calendarData) => {
        try {
            // 1. 백엔드에 캘린더 수정 요청
            const { data } = await calendarApi.put(`/calendars/${calendarData.id}`, calendarData);

            // 2. Redux의 calendars 상태 업데이트
            dispatch(onUpdateCalendar(data.calendar));

            // 3. ✅ 일정(events)의 캘린더 색상도 즉시 업데이트
            dispatch(updateEventsCalendarColor(data.calendar));

            Swal.fire('수정됨', '캘린더 정보가 수정되었습니다.', 'success');
        } catch (error) {
            console.error('❌ 캘린더 수정 실패:', error);
            Swal.fire('수정 오류', error.response?.data?.msg || '캘린더 수정 중 오류 발생', 'error');
        }
    };


    const startDeletingCalendar = async (calendarId) => {
        try {
            // 백엔드 캘린더 삭제
            await calendarApi.delete(`/calendars/${calendarId}`);

            // Redux의 캘린더 삭제
            dispatch(onDeleteCalendar(calendarId));

            // ✅ 현재 events에서 해당 캘린더에 속한 이벤트 제거
            dispatch(onLoadEvents(events.filter(event => {
            const id = event.calendar?.id || event.calendar?._id;
            return id !== calendarId;
            })));

            Swal.fire('삭제 완료', '캘린더와 해당 일정이 모두 삭제되었습니다.', 'success');
        } catch (error) {
            console.error('❌ 캘린더 삭제 실패:', error);
        }
    };




    return {
        //* 속성/특성
        activeEvent,
        events,
        calendars,
        visibleCalendarIds,
        toggleCalendarVisibility,
        activeCalendar,
        hasEventSelected: !!activeEvent,

        //* 메서드
        setActiveEvent,
        clearActiveEvent,
        startDeletingEvent,
        startSavingEvent,
        startLoadingEvents,
        startLoadingCalendars,
        startSavingCalendar,
        setActiveCalendar,
        clearActiveCalendar,
        startUpdatingCalendar,
        startDeletingCalendar,

    }
}
