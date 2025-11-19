import { useDispatch, useSelector } from 'react-redux';
import { onCloseDateModal, onOpenDateModal } from '../store';

// 🔹 UI 상태 관리 커스텀 훅
export const useUiStore = () => {
  const dispatch = useDispatch();

  const { isDateModalOpen } = useSelector((state) => state.ui);

  // 🔹 모달 열기
  const openDateModal = () => {
    dispatch(onOpenDateModal());
  };

  // 🔹 모달 닫기
  const closeDateModal = () => {
    dispatch(onCloseDateModal());
  };

  // 🔹 모달 상태 토글
  const toggleDateModal = () => {
    isDateModalOpen ? closeDateModal() : openDateModal();
  };

  return {
    // 상태값
    isDateModalOpen,

    // 메서드
    closeDateModal,
    openDateModal,
    toggleDateModal,
  };
};
