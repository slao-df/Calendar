// src/components/AddCalendarModal.jsx

import React, { useState, useEffect, useRef } from 'react'; // ❗️ 1. useRef를 import 합니다.
import { useUiStore, useCalendarStore } from '../../hooks';
import './AddCalendarModal.css';

const defaultColors = ['#D8E9FB', '#F1DBE8', '#DDEAE1', '#D3DAEA', '#B9D3EE'];

export const AddCalendarModal = () => {
    const { isAddCalendarModalOpen, closeAddCalendarModal } = useUiStore();
    const { activeCalendar, startSavingCalendar, startUpdatingCalendar } = useCalendarStore();

    const [formValues, setFormValues] = useState({ name: '', description: '' });
    const [selectedColor, setSelectedColor] = useState(defaultColors[0]);
    const [showColorPicker, setShowColorPicker] = useState(false);

    // ❗️ 2. 모달 컨텐츠 영역을 참조할 ref를 생성합니다.
    const modalContentRef = useRef(null);

    // ❗️ 3. (핵심) activeCalendar가 변경되거나 모달이 열릴 때 폼 데이터를 채웁니다.
    useEffect(() => {
        if (isAddCalendarModalOpen) {
            if (activeCalendar) {
                // "수정 모드": activeCalendar의 내용으로 폼을 채웁니다.
                setFormValues({ name: activeCalendar.name, description: activeCalendar.description || '' });
                setSelectedColor(activeCalendar.color || defaultColors[0]);
            } else {
                // "추가 모드": 폼을 깨끗하게 비웁니다.
                setFormValues({ name: '', description: '' });
                setSelectedColor(defaultColors[0]);
            }
        }
    }, [activeCalendar, isAddCalendarModalOpen]);

    // ❗️ 4. (핵심) 모달 외부 클릭을 감지하는 로직을 추가합니다.
    useEffect(() => {
        const handleClickOutside = (event) => {
            // ref가 존재하고, 클릭한 영역이 모달 컨텐츠의 바깥쪽일 경우
            if (modalContentRef.current && !modalContentRef.current.contains(event.target)) {
                closeAddCalendarModal();
            }
        };

        // 모달이 열려있을 때만 이벤트 리스너를 추가합니다.
        if (isAddCalendarModalOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        // 컴포넌트가 사라지거나, 모달이 닫힐 때 이벤트 리스너를 정리합니다 (메모리 누수 방지).
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isAddCalendarModalOpen, closeAddCalendarModal]);


    const onInputChange = ({ target }) => {
        setFormValues({ ...formValues, [target.name]: target.value });
    };

    const handleClose = () => {
        closeAddCalendarModal();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const calendarData = { ...formValues, color: selectedColor };
        if (activeCalendar) {
            await startUpdatingCalendar({ ...calendarData, id: activeCalendar.id });
        } else {
            await startSavingCalendar(calendarData);
        }
        handleClose();
    };

    if (!isAddCalendarModalOpen) return null;

    return (
        <div className="modal-overlay">
            {/* ❗️ 5. 모달 컨텐츠 div에 ref를 연결합니다. */}
            <div className="modal-content add-calendar-modal" ref={modalContentRef}>
                <h3>{ activeCalendar ? '캘린더 수정' : '새 캘린더' }</h3>
                <hr />
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>캘린더명</label>
                        <input type="text" name="name" value={formValues.name} onChange={onInputChange} required />
                    </div>
                    <div className="form-group">
                        <label>색상</label>
                        <div className="color-palette">
                            {defaultColors.map(color => (
                                <div
                                    key={color}
                                    className={`color-swatch ${selectedColor === color ? 'selected' : ''}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => {
                                        setSelectedColor(color);
                                        setShowColorPicker(false);
                                    }}
                                />
                            ))}
                            <div className="color-swatch add-color-btn" onClick={() => setShowColorPicker(!showColorPicker)}>+</div>
                        </div>
                        {showColorPicker && (
                            <input type="color" className="custom-color-picker" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} />
                        )}
                    </div>
                    <div className="form-group">
                        <label>메모</label>
                        <textarea name="description" value={formValues.description} onChange={onInputChange} />
                    </div>
                    <div className="modal-actions">
                        <button type="submit" className="btn-primary">저장</button>
                        <button type="button" className="btn-secondary" onClick={handleClose}>취소</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
