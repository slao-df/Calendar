import { useEffect, useState } from 'react';
import Modal from 'react-modal';
import Swal from 'sweetalert2';
import { useUiStore, useCalendarStore } from '../../hooks';
import './AddCalendarModal.css';

Modal.setAppElement('#root');
const initialFormValues = { name: '', description: '', color: '#6d52ec' };

export const AddCalendarModal = () => {
    const { isAddCalendarModalOpen, closeAddCalendarModal } = useUiStore();
    const { startSavingCalendar, activeCalendar, clearActiveCalendar, startUpdatingCalendar, startDeletingCalendar } = useCalendarStore();

    const [formValues, setFormValues] = useState(initialFormValues);
    const title = activeCalendar ? '캘린더 수정' : '새 캘린더';

    useEffect(() => {
        if (activeCalendar) {
            setFormValues({ ...activeCalendar });
        } else {
            setFormValues(initialFormValues);
        }
    }, [activeCalendar, isAddCalendarModalOpen]);

    const onInputChange = ({ target }) => {
        setFormValues({ ...formValues, [target.name]: target.value });
    };
    
    const onCloseModal = () => {
        closeAddCalendarModal();
        clearActiveCalendar();
    }

    const onSubmit = (event) => {
        event.preventDefault();
        if (formValues.name.trim().length <= 0) {
            return Swal.fire('오류', '캘린더 이름은 필수입니다.', 'error');
        }

        if (activeCalendar) {
            // 수정 시에는 formValues에 id가 포함되어 있는지 확인
            startUpdatingCalendar({ ...formValues, id: activeCalendar.id });
        } else {
            startSavingCalendar(formValues);
        }
        onCloseModal(); // 폼 제출 후 모달 닫기
    }

    const handleDelete = () => {
        startDeletingCalendar(activeCalendar.id); // 👈 id 대신 _id가 아닌 id를 사용
        onCloseModal(); // 삭제 후 모달 닫기
    }

    return (
        <Modal
            isOpen={isAddCalendarModalOpen}
            onRequestClose={onCloseModal} // 👈 닫기 함수를 onCloseModal로 통일
            className="modal"
            overlayClassName="modal-fondo"
        >
            <div className="add-calendar-modal-container">
                <h3>{title}</h3>
                <hr />
                <form className="form-container" onSubmit={onSubmit}>
                    <div className="form-group">
                        <label>캘린더명</label>
                        <div className="input-with-button">
                            <input
                                type="text"
                                className="form-control"
                                name="name"
                                value={formValues.name || ''}
                                onChange={onInputChange}
                            />
                            <input 
                                type="color" 
                                name="color" 
                                value={formValues.color || '#6d52ec'}
                                onChange={onInputChange} 
                                className="color-picker"
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>메모</label>
                        <textarea
                            className="form-control"
                            rows="4"
                            name="description"
                            value={formValues.description || ''}
                            onChange={onInputChange}
                        ></textarea>
                    </div>
                    <div className="form-actions">
                        { activeCalendar && (
                            <button type="button" className="btn btn-danger" onClick={handleDelete}>
                                삭제
                            </button>
                        )}
                        <button type="submit" className="btn btn-primary">저장</button>
                        <button type="button" className="btn btn-secondary" onClick={onCloseModal}>취소</button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}