import { useState, useMemo, useEffect } from 'react';
import { addHours } from 'date-fns';
import Modal from 'react-modal';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ko from 'date-fns/locale/ko';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { useCalendarStore, useUiStore } from '../../hooks';
import './CalendarModal.css';

registerLocale('ko', ko);
Modal.setAppElement('#root');

const initialFormState = {
    title: '',
    notes: '',
    location: '',
    start: new Date(),
    end: addHours(new Date(), 2),
    isAllDay: false,
    calendar: '',
    attachments: [] //파일 배열
};

export const CalendarModal = () => {
    const { isDateModalOpen, closeDateModal } = useUiStore();
    const { activeEvent, startSavingEvent, startDeletingEvent, calendars } = useCalendarStore(); 
    
    const [formValues, setFormValues] = useState(initialFormState);

    useEffect(() => {
        if (activeEvent) {
            // activeEvent.calendar가 객체일 수 있으므로 ID를 추출
            const selectedCalendarId =
            typeof activeEvent.calendar === 'string'
                ? activeEvent.calendar
                : activeEvent.calendar?.id || activeEvent.calendar?._id || '';

            setFormValues({
            ...initialFormState,
            ...activeEvent,
            calendar: selectedCalendarId,    // 문자열 ID로 저장
            });
        } else {
            const defaultCalendarId = calendars.length > 0 ? calendars[0].id : '';
            setFormValues({ ...initialFormState, calendar: defaultCalendarId });
        }
    }, [activeEvent, isDateModalOpen, calendars]);

    const onInputChange = ({ target }) => {
        setFormValues({ ...formValues, [target.name]: target.value });
    };

    const onDateChange = (event, changing) => {
        setFormValues({ ...formValues, [changing]: event });
    };

    const onCloseModal = () => {
        closeDateModal();
    };


     
    const onSubmit = async (e) => {
        e.preventDefault();

        const data = {
            ...formValues,
            start: new Date(formValues.start).toISOString(),
            end: new Date(formValues.end).toISOString(),
        };

        console.log('📤 저장 요청 데이터:', data);

        try {
            await startSavingEvent(data); // axios.post('/api/events', data)
            closeDateModal();
        } catch (error) {
            console.error('❌ 이벤트 저장 실패:', error);
        }
    };


    const handleDeleteEvent = () => {
        startDeletingEvent();
        closeDateModal();
    }
    

    return (
        <Modal
            isOpen={isDateModalOpen}
            onRequestClose={onCloseModal}
            className="modal"
            overlayClassName="modal-fondo"
            closeTimeoutMS={200}
        >
            <div className="modal-container">
                <form className="form-container" onSubmit={onSubmit}>
                    
                    <div className="form-group">
                        <label>제목</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="일정 제목"
                            name="title"
                            autoComplete="off"
                            value={formValues.title || ''}
                            onChange={onInputChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>장소</label>
                        <div className="input-with-button">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="장소"
                                name="location"
                                value={formValues.location || ''}
                                onChange={onInputChange}
                            />
                            <button type="button" className="btn-secondary">지도첨부</button>
                        </div>
                    </div>

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
                            <div className="checkbox-group">
                                <input type="checkbox" id="all-day" name="isAllDay" checked={formValues.isAllDay} onChange={onInputChange} />
                                <label htmlFor="all-day">종일</label>
                            </div>
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label>참석자</label>
                        <div className="input-with-button">
                            <input type="text" className="form-control" placeholder="이름 또는 이메일 주소, 아이디를 입력하세요." />
                            <button type="button" className="btn-secondary">네이버 주소록</button>
                        </div>
                    </div>

                    <div className="form-group inline-group">
                        <label>공개</label>
                        <input type="radio" id="public" name="visibility" value="public" defaultChecked />
                        <label htmlFor="public">기본</label>
                        <input type="radio" id="private" name="visibility" value="private" />
                        <label htmlFor="private">비공개</label>
                    </div>
                    
                    <div className="form-group">
                        <label>캘린더</label>
                        <select 
                            name="calendar" 
                            className="form-control" 
                            //value={formValues.calendar || ''}
                            value={formValues.calendar} 
                            onChange={onInputChange}
                        >
                            {
                                calendars.map( cal => (
                                    <option key={cal.id} value={cal.id}>
                                        {cal.name}
                                    </option>
                                ))
                            }
                        </select>
                    </div>

                    <div className="form-group">
                        <label>설명</label>
                        <textarea
                            type="text"
                            className="form-control"
                            placeholder="일정에 필요한 설명을 남기세요."
                            rows="3"
                            name="notes"
                            value={formValues.notes || ''}
                            onChange={onInputChange}
                        ></textarea>
                    </div>

                    <div className="form-group">
                        <label>파일 첨부</label>
                        <input
                            type="file"
                            className="form-control"
                            name="attachments"
                            multiple 
                            accept=".pdf,image/*"
                            onChange={(e) =>
                            setFormValues({
                                ...formValues,
                                attachments: Array.from(e.target.files),  // 파일 배열 저장
                            })
                            }
                        />
                    </div>

                    <div className="form-group">
                         <label>알림</label>
                         <div className="notification-group">
                            <select className="form-control">
                                <option>10분 전</option>
                                <option>30분 전</option>
                                <option>1시간 전</option>
                            </select>
                            <button type="button" className="btn-secondary">알림추가</button>
                         </div>
                    </div>

                    <hr/>
                    
                    <div className="form-actions">
                        { activeEvent && (
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={handleDeleteEvent}
                          >
                            <i className="fas fa-trash"></i>
                            <span> 삭제</span>
                          </button>
                        )}
                        <button type="submit" className="btn btn-primary">
                          <i className="far fa-save"></i>
                          <span> 저장</span>
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={onCloseModal}>
                          <span>취소</span>
                        </button>
                    </div>

                </form>
            </div>
        </Modal>
    );
};
