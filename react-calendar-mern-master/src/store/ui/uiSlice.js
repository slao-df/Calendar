import { createSlice } from '@reduxjs/toolkit';

export const uiSlice = createSlice({
    name: 'ui',
    initialState: {
        isDateModalOpen: false,
        isAddCalendarModalOpen: false,
        isAddSharedEventModalOpen: false, // 👈 '공유 일정 추가 모달' 상태 추가
    },
    reducers: {
        onOpenDateModal: ( state ) => {
            state.isDateModalOpen = true;
        },
        onCloseDateModal: ( state ) => {
            state.isDateModalOpen = false;
        },
        onOpenAddCalendarModal: ( state ) => {
            state.isAddCalendarModalOpen = true;
        },
        onCloseAddCalendarModal: ( state ) => {
            state.isAddCalendarModalOpen = false;
        },
        // 👇 '공유 일정 추가 모달' 리듀서 추가
        onOpenAddSharedEventModal: ( state ) => {
            state.isAddSharedEventModalOpen = true;
        },
        onCloseAddSharedEventModal: ( state ) => {
            state.isAddSharedEventModalOpen = false;
        },
    }
});


// Action creators are generated for each case reducer function
export const { 
    onOpenDateModal, 
    onCloseDateModal,
    onOpenAddCalendarModal,
    onCloseAddCalendarModal,
    onOpenAddSharedEventModal,  // 👈 액션 내보내기 추가
    onCloseAddSharedEventModal, // 👈 액션 내보내기 추가
} = uiSlice.actions;