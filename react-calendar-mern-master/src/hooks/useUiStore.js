import { useDispatch, useSelector } from 'react-redux';
import { 
    onCloseDateModal, 
    onOpenDateModal,
    onOpenAddCalendarModal,
    onCloseAddCalendarModal,
    onOpenAddSharedEventModal,  // 👈 1. 추가
    onCloseAddSharedEventModal, // 👈 1. 추가
} from '../store';


export const useUiStore = () => {

    const dispatch = useDispatch();

    const { 
        isDateModalOpen,
        isAddCalendarModalOpen,
        isAddSharedEventModalOpen // 👈 2. 추가
    } = useSelector( state => state.ui );

    const openDateModal = () => {
        dispatch( onOpenDateModal() )
    }

    const closeDateModal = () => {
        dispatch( onCloseDateModal() )
    }

    // 새 캘린더 모달을 여고 닫는 함수
    const openAddCalendarModal = () => {
        dispatch( onOpenAddCalendarModal() );
    }

    const closeAddCalendarModal = () => {
        dispatch( onCloseAddCalendarModal() );
    }

    // 공유 일정 추가 모달을 여고 닫는 함수
    const openAddSharedEventModal = () => { // 👈 3. 추가
        dispatch( onOpenAddSharedEventModal() );
    }

    const closeAddSharedEventModal = () => { // 👈 3. 추가
        dispatch( onCloseAddSharedEventModal() );
    }


    return {
        //* 속성/특성
        isDateModalOpen,
        isAddCalendarModalOpen,
        isAddSharedEventModalOpen, // 👈 4. 추가

        //* 메서드
        closeDateModal,
        openDateModal,
        openAddCalendarModal,
        closeAddCalendarModal,
        openAddSharedEventModal,    // 👈 4. 추가
        closeAddSharedEventModal,   // 👈 4. 추가
    }
}