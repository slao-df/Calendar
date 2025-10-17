import React, { useState, useEffect, useRef } from 'react';
import { useUiStore, useCalendarStore } from '../../hooks';
import { calendarApi } from '../../api';
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

    const [activeTab, setActiveTab] = useState('details'); // 'details' 또는 'participants'
    const [participants, setParticipants] = useState([]);
    const [owner, setOwner] = useState(null);


    // [핵심] 모달이 열리고, 수정할 캘린더(activeCalendar)가 정해지면 참여자 목록을 불러옵니다.
    useEffect(() => {
        if (activeCalendar?.id) {
            // 참여자 목록을 불러오는 함수 호출
            const fetchParticipants = async () => {
                try {
                    const { data } = await calendarApi.get(`/calendars/${activeCalendar.id}/participants`);
                    setOwner(data.owner);
                    setParticipants(data.participants);
                } catch (error) {
                    console.error("참여자 목록 로딩 실패", error);
                }
            };
            fetchParticipants();
        } else {
            // 새 캘린더 모드일 때는 목록을 비웁니다.
            setOwner(null);
            setParticipants([]);
        }
    }, [activeCalendar]);


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

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            ...formValues,
            color: selectedColor, // ✅ 색상 포함
        };

        await startSavingCalendar(payload, !activeCalendar || !activeCalendar.id);
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
            <h3>{activeCalendar ? '캘린더 수정' : '새 캘린더'}</h3>
            <hr />

            {/* ✅ 바깥쪽 form만 유지 */}
            <form onSubmit={handleSubmit}>
                {/* --- 기본 입력 영역 --- */}
                <div className="form-group">
                <label>캘린더명</label>
                <input
                    type="text"
                    name="name"
                    value={formValues.name}
                    onChange={onInputChange}
                    required
                />
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
                    <div
                    className="color-swatch add-color-btn"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    >
                    +
                    </div>
                </div>
                {showColorPicker && (
                    <input
                    type="color"
                    className="custom-color-picker"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    />
                )}
                </div>

                <div className="form-group">
                <label>메모</label>
                <textarea
                    name="description"
                    value={formValues.description}
                    onChange={onInputChange}
                />
                </div>

                {/* ✅ 내부 form 제거, div로 변경 */}
                <div className="modal-inner">
                    <div className="participants-list">
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>소유자</h4>
                        {owner && (
                            <ul style={{ marginTop: '0', marginBottom: '8px' }}>
                                <li style={{ fontSize: '13px' }}>
                                {owner.name} ({owner.email})
                                </li>
                            </ul>
                        )}

                        <hr style={{ margin: '8px 0' }} />

                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>참여자</h4>
                        <ul style={{ marginTop: '0' }}>
                        {participants.length > 0 ? (
                            participants.map(p => (
                            <li key={p._id} style={{ fontSize: '13px' }}>
                                {p.name} ({p.email})
                            </li>
                            ))
                        ) : (
                            <li style={{ fontSize: '13px', color: '#888' }}>참여자 없음</li>
                        )}
                        </ul>
                    </div>
                    </div>

                {/* --- 하단 버튼 영역 --- */}
                <div
                className="modal-actions"
                style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}
                >
                {activeCalendar && (
                    <button
                    type="button"
                    className="btn-danger"
                    onClick={handleDelete}
                    style={{ marginRight: 'auto' }}
                    >
                    삭제
                    </button>
                )}
                <button type="submit" className="btn-primary">
                    저장
                </button>
                <button type="button" className="btn-secondary" onClick={handleClose}>
                    취소
                </button>
                </div>
            </form>
            </div>
        </div>
    );
};
