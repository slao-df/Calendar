import { createSlice } from '@reduxjs/toolkit'; 

export const calendarSlice = createSlice({
  name: 'calendar',
  initialState: {
    // ✅ 이벤트 관련
    isLoadingEvents: true,
    events: [],
    activeEvent: null,

    // ✅ 캘린더 관련
    calendars: [],         // 내 캘린더 목록
    activeCalendar: null,  // 선택된 캘린더
  },

  reducers: {
    // ----------------------------
    // 🔹 이벤트 관련 리듀서
    // ----------------------------

    onSetActiveEvent: (state, { payload }) => {
      state.activeEvent = payload;
    },

    onAddNewEvent: (state, { payload }) => {
      state.events.push(payload);
      state.activeEvent = null;
    },

    // ✅ 기존 이벤트 교체 (드래그/리사이즈 시 즉시 반영 가능)
    onUpdateEvent: (state, { payload }) => {
      state.events = state.events.map((event) =>
        (event.id || event._id) === (payload.id || payload._id)
          ? { ...event, ...payload }
          : event
      );
    },

    onDeleteEvent: (state, { payload }) => {
      if (payload) {
        state.events = state.events.filter(
          (event) => (event.id || event._id) !== payload
        );

        if (
          state.activeEvent &&
          (state.activeEvent.id || state.activeEvent._id) === payload
        ) {
          state.activeEvent = null;
        }
      }
    },

    onLoadEvents: (state, { payload = [] }) => {
      state.isLoadingEvents = false;
      payload.forEach((event) => {
        const exists = state.events.some(
          (dbEvent) => dbEvent.id === event.id
        );
        if (!exists) {
          state.events.push(event);
        }
      });
    },

    onLogoutCalendar: (state) => {
      state.isLoadingEvents = true;
      state.events = [];
      state.activeEvent = null;
      state.calendars = [];
      state.activeCalendar = null;
    },

    // ----------------------------
    // 🔹 캘린더 관련 리듀서
    // ----------------------------

    onAddCalendar: (state, { payload }) => {
      state.calendars.push(payload);
    },

    onDeleteCalendar: (state, { payload: calendarIdToDelete }) => {
      state.calendars = state.calendars.filter(
        (c) => (c.id || c._id) !== calendarIdToDelete
      );

      state.events = state.events.filter(
        (event) => (event.calendar.id || event.calendar._id) !== calendarIdToDelete
      );

      if ((state.activeCalendar?.id || state.activeCalendar?._id) === calendarIdToDelete) {
        state.activeCalendar = null;
      }
    },

    onSetActiveCalendar: (state, { payload }) => {
      state.activeCalendar = payload;
    },

    onLoadCalendars: (state, { payload = [] }) => {
      state.calendars = payload;
    },

    onUpdateCalendar: (state, { payload: updatedCalendar }) => {
      const calendarId = updatedCalendar.id || updatedCalendar._id;

      state.calendars = state.calendars.map((calendar) =>
        (calendar.id || calendar._id) === calendarId ? updatedCalendar : calendar
      );

      state.events = state.events.map((event) => {
        if ((event.calendar.id || event.calendar._id) === calendarId) {
          return { ...event, calendar: updatedCalendar };
        }
        return event;
      });

      if ((state.activeCalendar?.id || state.activeCalendar?._id) === calendarId) {
        state.activeCalendar = updatedCalendar;
      }
    },
    onAddNewCalendar: (state, { payload }) => {
      const exists = state.calendars.some((c) => c.id === payload.id);
      if (!exists) state.calendars.push(payload);
    },
  },
});

export const {
  // 🔹 이벤트 관련
  onSetActiveEvent,
  onAddNewEvent,
  onUpdateEvent,
  onDeleteEvent,
  onLoadEvents,
  onLogoutCalendar,

  // 🔹 캘린더 관련
  onAddCalendar,
  onDeleteCalendar,
  onSetActiveCalendar,
  onLoadCalendars,
  onUpdateCalendar,
  onAddNewCalendar
} = calendarSlice.actions;

export default calendarSlice.reducer;