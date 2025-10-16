// src/calendar/components/AddSharedEventModal.jsx

import { useState } from 'react';
import Modal from 'react-modal';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ko from 'date-fns/locale/ko';
import { addHours } from 'date-fns';
import { useUiStore } from '../../hooks';
// import './CalendarModal.css'; // 기존 모달 CSS 재사용
import './AddCalendarModal.css';

registerLocale('ko', ko);

// Modal.setAppElement('#root'); // 다른 모달 파일에서 이미 설정했다면 생략 가능

export const AddSharedEventModal = () => {
    const { isAddSharedEventModalOpen, closeAddSharedEventModal } = useUiStore();
    
    const [formValues, setFormValues] = useState({
        title: '',
        start: new Date(),
        end: addHours(new Date(), 1),
        notes: '',
    });

    const onInputChange = ({ target }) => {
        setFormValues({ ...formValues, [target.name]: target.value });
    };

    const onDateChange = (event, changing) => {
        setFormValues({ ...formValues, [changing]: event });
    };

    const onSubmit = (event) => {
        event.preventDefault();
        console.log('공유 캘린더 새 일정:', formValues);
        // TODO: 여기서 백엔드로 새 공유 일정 저장 로직 호출
        closeAddSharedEventModal();
    };

    return (
        <Modal
            isOpen={isAddSharedEventModalOpen}
            onRequestClose={closeAddSharedEventModal}
            className="modal"
            overlayClassName="modal-fondo"
        >
            <div className="modal-container">
                <h3>새 일정 만들기</h3> {/* 👈 제목 수정 */}
                <hr />
                <form className="form-container" onSubmit={onSubmit}>
                    
                    <div className="form-group">
                        <label>제목</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="일정 제목"
                            name="title"
                            value={formValues.title}
                            onChange={onInputChange}
                        />
                    </div>
                    
                    {/* '장소' 입력란 제거 */}

                    <div className="form-group">
                        <label>일시</label>
                        <div className="date-picker-group">
                            <DatePicker
                                selected={formValues.start}
                                onChange={(event) => onDateChange(event, 'start')}
                                className="form-control"
                                dateFormat="yyyy.MM.dd aa h:mm"
                                showTimeSelect
                                locale="ko"
                            />
                            <span className="date-separator">-</span>
                            <DatePicker
                                minDate={formValues.start}
                                selected={formValues.end}
                                onChange={(event) => onDateChange(event, 'end')}
                                className="form-control"
                                dateFormat="yyyy.MM.dd aa h:mm"
                                showTimeSelect
                                locale="ko"
                            />
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label>참석자ㅇㅇ</label>
                        <input type="text" className="form-control" placeholder="이름 또는 이메일 주소, 아이디를 입력하세요." />
                    </div>

                    <div className="form-group">
                        <label>설명</label>
                        <textarea
                            className="form-control"
                            placeholder="설명을 입력하세요."
                            rows="3"
                            name="notes"
                            value={formValues.notes}
                            onChange={onInputChange}
                        ></textarea>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">저장</button>
                        <button type="button" className="btn btn-secondary" onClick={closeAddSharedEventModal}>취소</button>
                    </div>

                </form>
            </div>
        </Modal>
    );
};
