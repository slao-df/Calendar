import { createSlice } from '@reduxjs/toolkit';

export const calendarSlice = createSlice({
    name: 'calendar',
    initialState: {
        events: [],              // 모든 일정 목록
        activeEvent: null,        // 현재 선택된 일정
        calendars: [],            // 사용자 캘린더 목록
        activeCalendar: null,     // 현재 선택된 캘린더
        visibleCalendarIds: [],   // 화면에 표시 중인 캘린더 ID 배열
    },
    reducers: {
        // ✅ 일정 관련 -----------------------------------------------------
        onSetActiveEvent: (state, { payload }) => {
            state.activeEvent = payload;
        },

        onAddNewEvent: (state, { payload }) => {
            state.events.push(payload);
        },

        onUpdateEvent: (state, { payload }) => {
            state.events = state.events.map(event =>
                event.id === payload.id ? payload : event
            );
        },

        onDeleteEvent: (state) => {
            if (state.activeEvent) {
                state.events = state.events.filter(
                    event => event.id !== state.activeEvent.id
                );
                state.activeEvent = null;
            }
        },

        onClearActiveEvent: (state) => {
            state.activeEvent = null;
        },

        onLoadEvents: (state, { payload = [] }) => {
            state.events = payload;
        },

        // ✅ 캘린더 관련 -----------------------------------------------------
        onLoadCalendars: (state, { payload = [] }) => {
            state.calendars = payload;
            state.visibleCalendarIds = payload
                .filter(c => c.visible !== false)
                .map(c => c.id);
        },

        onAddNewCalendar: (state, { payload }) => {
            state.calendars.push(payload);
            // 새로 추가된 캘린더는 자동으로 보이도록 체크됨
            state.visibleCalendarIds.push(payload.id);
        },

        onUpdateCalendar: (state, { payload }) => {
            state.calendars = state.calendars.map(c =>
                c.id === payload.id ? { ...c, ...payload } : c
            );
        },

        onDeleteCalendar: (state) => {
            if (state.activeCalendar) {
                state.calendars = state.calendars.filter(
                    c => c.id !== state.activeCalendar.id
                );
                state.visibleCalendarIds = state.visibleCalendarIds.filter(
                    id => id !== state.activeCalendar.id
                );
                state.activeCalendar = null;
            }
        },

        onSetActiveCalendar: (state, { payload }) => {
            state.activeCalendar = payload;
        },

        onClearActiveCalendar: (state) => {
            state.activeCalendar = null;
        },

        onToggleCalendarVisibility: (state, { payload }) => {
            if (state.visibleCalendarIds.includes(payload)) {
                state.visibleCalendarIds = state.visibleCalendarIds.filter(id => id !== payload);
            } else {
                state.visibleCalendarIds.push(payload);
            }
        },

        // ✅ 일정 색상 업데이트 (캘린더 색상 변경 시 동기화)
        updateEventsCalendarColor: (state, { payload }) => {
            const { id, color } = payload;
            state.events = state.events.map(event =>
                event.calendar?.id === id
                    ? { ...event, calendar: { ...event.calendar, color } }
                    : event
            );
        },

        // ✅ 로그아웃 시 초기화 -----------------------------------------------
        onLogoutCalendar: (state) => {
            state.events = [];
            state.activeEvent = null;
            state.calendars = [];
            state.activeCalendar = null;
            state.visibleCalendarIds = [];
        },
    },
});


// ✅ 액션 export
export const {
    onSetActiveEvent,
    onAddNewEvent,
    onUpdateEvent,
    onDeleteEvent,
    onClearActiveEvent,
    onLoadEvents,
    onLoadCalendars,
    onAddNewCalendar,
    onUpdateCalendar,
    onDeleteCalendar,
    onSetActiveCalendar,
    onClearActiveCalendar,
    onToggleCalendarVisibility,
    updateEventsCalendarColor,
    onLogoutCalendar,
} = calendarSlice.actions;

// ✅ 리듀서 export
export default calendarSlice.reducer;
