import { createSlice } from '@reduxjs/toolkit';

export const calendarSlice = createSlice({
    name: 'calendar',
    initialState: {
        isLoadingEvents: true,
        events: [],
        calendars: [], 
        activeEvent: null,
        visibleCalendarIds: JSON.parse(localStorage.getItem('visibleCalendarIds')) || null,
        //activeCalendar: null,
    },
    reducers: {
        onSetActiveEvent: ( state, { payload }) => {
            state.activeEvent = payload;
        },
        onClearActiveEvent: ( state ) => {
            state.activeEvent = null;
        },
        onAddNewEvent: ( state, { payload }) => {
            state.events.push( payload );
            state.activeEvent = null;
        },
        onUpdateEvent: ( state, { payload } ) => {
            state.events = state.events.map( event => {
                if ( event.id === payload.id ) {
                    return payload;
                }
                return event;
            });
        },
        onDeleteEvent: ( state ) => {
            if ( state.activeEvent ) {
                state.events = state.events.filter( event => event.id !== state.activeEvent.id );
                state.activeEvent = null;
            }
        },
        /*onLoadEvents: (state, { payload = [] }) => {
            state.isLoadingEvents = false;
            payload.forEach( event => {
                const exists = state.events.some( dbEvent => dbEvent.id === event.id );
                if ( !exists ) {
                    state.events.push( event )
                }
            })
        },*/
        onLoadEvents: (state, { payload = [] }) => {
            state.isLoadingEvents = false;
            state.events = [...payload];   // ✅ 새 배열로 덮어써 삭제된 이벤트 반영
        },

        onLogoutCalendar: ( state ) => {
            state.isLoadingEvents = true;
            state.events      = [];
            state.activeEvent = null;
            state.calendars   = [];
            state.visibleCalendarIds = null;
            localStorage.removeItem('visibleCalendarIds');
        },
        onAddNewCalendar: ( state, { payload } ) => {
            state.calendars.push( payload );
            state.visibleCalendarIds.push(payload.id);
            localStorage.setItem('visibleCalendarIds', JSON.stringify(state.visibleCalendarIds));
        },
        onLoadCalendars: ( state, { payload = [] } ) => {
            state.calendars = payload;
            //state.visibleCalendarIds = payload.map(cal => cal.id); 
            if (state.visibleCalendarIds === null) {
                state.visibleCalendarIds = payload.map(c => c.id);
                localStorage.setItem('visibleCalendarIds', JSON.stringify(state.visibleCalendarIds));
            }
        },
        onToggleCalendarVisibility: ( state, { payload: calendarId } ) => {
            const isVisible = state.visibleCalendarIds.includes(calendarId);
            if (isVisible) {
                state.visibleCalendarIds = state.visibleCalendarIds.filter(id => id !== calendarId);
            } else {
                state.visibleCalendarIds.push(calendarId);
            }
            localStorage.setItem('visibleCalendarIds', JSON.stringify(state.visibleCalendarIds));
        },
        onSetActiveCalendar: (state, { payload }) => { // 👈 활성 캘린더 설정 리듀서
            state.activeCalendar = payload;
        },
        onClearActiveCalendar: (state) => { // 👈 활성 캘린더 초기화 리듀서
            state.activeCalendar = null;
        },
        onUpdateCalendar: ( state, { payload: updatedCalendar } ) => {
            // calendars 배열 업데이트
            state.calendars = state.calendars.map(
                calendar => calendar.id === updatedCalendar.id ? updatedCalendar : calendar
            );
            // events 배열에 있는 관련 캘린더 정보도 업데이트
            state.events = state.events.map( event => {
                if ( event.calendar.id === updatedCalendar.id ) {
                    return {
                        ...event,
                        calendar: updatedCalendar
                    }
                }
                return event;
            });
        },
        onDeleteCalendar: (state, { payload: calendarId }) => { // 👈 삭제 리듀서 추가
            state.calendars = state.calendars.filter(calendar => calendar._id !== calendarId);
            state.events = state.events.filter(event => event.calendar._id !== calendarId);
        },
        onDeleteCalendar: (state, { payload }) => {
            state.calendars = state.calendars.filter(
                cal => cal.id !== payload
            );
            if (state.activeCalendar?.id === payload) {
                state.activeCalendar = null;
            }
        },
        updateEventsCalendarColor: (state, { payload: updatedCalendar }) => {
            const updatedEvents = state.events.map(event =>
                event.calendar?.id === updatedCalendar.id
                ? {
                    ...event,
                    calendar: {
                        ...event.calendar,
                        color: updatedCalendar.color
                    }
                    }
                : event
            );

            // ✅ 완전히 새 배열로 교체
            state.events = [...updatedEvents];
        }



    }
});


export const { 
    onSetActiveEvent,
    onClearActiveEvent,
    onAddNewEvent, 
    onUpdateEvent, 
    onDeleteEvent,
    onLoadEvents,
    onLogoutCalendar,
    onAddNewCalendar, 
    onLoadCalendars,  
    onToggleCalendarVisibility,
    onSetActiveCalendar,
    onClearActiveCalendar,
    onUpdateCalendar, 
    onDeleteCalendar,
    updateEventsCalendarColor, 
} = calendarSlice.actions;
