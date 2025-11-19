import { createSlice } from '@reduxjs/toolkit';

export const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    isDateModalOpen: false, // 일정 등록/수정 모달 열림 여부
  },
  reducers: {
    // 🔹 모달 열기
    onOpenDateModal: (state) => {
      state.isDateModalOpen = true;
    },

    // 🔹 모달 닫기
    onCloseDateModal: (state) => {
      state.isDateModalOpen = false;
    },
  },
});

export const { onOpenDateModal, onCloseDateModal } = uiSlice.actions;
