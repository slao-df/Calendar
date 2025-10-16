// src/components/AddCalendarModal.jsx

import React, { useState, useEffect, useRef } from 'react';
// 👇 1. useCalendarStore에서 startDeletingCalendar를 추가로 가져옵니다.
import { useUiStore, useCalendarStore } from '../../hooks';
import './AddCalendarModal.css';

const defaultColors = ['#b9d5f2ff', '#f0cfe3ff', '#cbe5d3ff', '#D3DAEA', '#c4ace6ff'];

export const AddCalendarModal = () => {
    const { isAddCalendarModalOpen, closeAddCalendarModal } = useUiStore();
    // 👇 2. 스토어에서 삭제 함수를 가져옵니다.
    const { activeCalendar, startSavingCalendar, startUpdatingCalendar, startDeletingCalendar } = useCalendarStore();

    const [formValues, setFormValues] = useState({ name: '', description: '' });
    const [selectedColor, setSelectedColor] = useState(defaultColors[0]);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const modalContentRef = useRef(null);

    useEffect(() => {
        if (isAddCalendarModalOpen) {
            if (activeCalendar) {
                setFormValues({ name: activeCalendar.name, description: activeCalendar.description || '' });
                setSelectedColor(activeCalendar.color || defaultColors[0]);
            } else {
                setFormValues({ name: '', description: '' });
                setSelectedColor(defaultColors[0]);
            }
        }
    }, [activeCalendar, isAddCalendarModalOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalContentRef.current && !modalContentRef.current.contains(event.target)) {
                closeAddCalendarModal();
            }
        };
        if (isAddCalendarModalOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
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

    // 👇 3. [핵심] 삭제 버튼을 눌렀을 때 실행될 함수를 만듭니다.
    const handleDelete = () => {
        startDeletingCalendar(activeCalendar);
        handleClose(); // 모달 닫기
    }

    if (!isAddCalendarModalOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content add-calendar-modal" ref={modalContentRef}>
                <h3>{ activeCalendar ? '캘린더 수정' : '새 캘린더' }</h3>
                <hr />
                <form onSubmit={handleSubmit}>
                    {/* ... (캘린더명, 색상, 메모 등 폼의 다른 부분은 그대로) ... */}
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

                    {/* 👇 4. [핵심] 모달 하단 버튼들을 수정합니다. */}
                    <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        {
                            // "수정 모드"일 때만 삭제 버튼이 보이도록 합니다.
                            activeCalendar && (
                                <button
                                    type="button"
                                    className="btn-danger" // 빨간색 버튼
                                    onClick={handleDelete}
                                    style={{ marginRight: 'auto' }} // 왼쪽 끝으로 정렬
                                >
                                    삭제
                                </button>
                            )
                        }
                        <button type="submit" className="btn-primary">저장</button>
                        <button type="button" className="btn-secondary" onClick={handleClose}>취소</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
