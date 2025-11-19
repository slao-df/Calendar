import React, { useRef, useState, useEffect } from 'react';
import { useCalendarStore } from '../../hooks/useCalendarStore';
import { useAuthStore } from '../../hooks';
import './AddCalendarModal.css';
import Swal from 'sweetalert2';

const defaultColors = ['#b9d5f2ff', '#f0cfe3ff', '#cbe5d3ff', '#D3DAEA', '#c4ace6ff'];

// 캘린더 생성/수정 폼 필드 (코드 중복 제거용)
const CalendarFormFields = ({ formState, onFormChange, colors, setColors, defaultColors }) => {
  const [name, setName] = formState.name;
  const [color, setColor] = formState.color;
  const [memo, setMemo] = formState.memo;

  // (컬러 피커 관련 state 및 핸들러 ... 기존 코드와 동일)
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const addButtonRef = useRef(null);
  const colorInputRef = useRef(null); // ref 추가

 

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (document.querySelector('.color-picker-popup')?.contains(e.target)) return;
      if (addButtonRef.current?.contains(e.target)) return;
      setShowColorPicker(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleAddColorClick = (e) => {
    e.stopPropagation();
    const rect = addButtonRef.current.getBoundingClientRect();
    const gap = 10; const pickerWidth = 180;
    let left = rect.right + gap; let top = rect.top;
    if (rect.right + pickerWidth > window.innerWidth) {
      left = rect.left - pickerWidth - gap;
    }
    setPickerPosition({ top, left });
    setShowColorPicker((prev) => !prev);
  };

  const handleColorSelect = (e) => {
    const newColor = e.target.value;
    if (!colors.includes(newColor)) {
      setColors((prev) => [...prev, newColor]);
    }
    setColor(newColor);
    setShowColorPicker(false);
  };

  const handleDeleteColor = (targetColor) => {
    if (defaultColors.includes(targetColor)) return;
    setColors((prev) => prev.filter((c) => c !== targetColor));
    if (color === targetColor) setColor(defaultColors[0]);
  };

  return (
    <>
      <label className="modal-label">캘린더명</label>
      <input
        type="text" className="modal-input" value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="캘린더 이름을 입력하세요"
        autoFocus
      />
      <label className="modal-label">색상</label>
      <div className="color-options">
        {colors.map((c, i) => (
          <div key={i} className="color-wrapper">
            <div
              className={`color-circle ${color === c ? 'selected' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
            {!defaultColors.includes(c) && (
              <button
                type="button" className="delete-btn"
                onClick={() => handleDeleteColor(c)} title="삭제"
              >✕</button>
            )}
          </div>
        ))}
        <div ref={addButtonRef} className="color-circle add" onClick={handleAddColorClick}>
          <span>＋</span>
        </div>
        {showColorPicker && (
          <div
            className="color-picker-popup"
            style={{ position: 'fixed', top: `${pickerPosition.top}px`, left: `${pickerPosition.left}px`, zIndex: 2000 }}
            onClick={(e) => e.stopPropagation()}
          >
            <input ref={colorInputRef} type="color" onChange={handleColorSelect} />
          </div>
        )}
      </div>
      <label className="modal-label">메모</label>
      <textarea
        className="modal-textarea" value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="메모를 입력하세요"
      ></textarea>
    </>
  );
};

// 메인 모달 컴포넌트
export const AddCalendarModal = ({ onClose }) => {
  const { user } = useAuthStore();
  
  const {
    activeCalendar,
    startAddingCalendar,
    startUpdatingCalendar, 
    startDeletingCalendar, 
    startJoiningCalendar,
  } = useCalendarStore();

  //탭 모드 state ('create' 또는 'join')
  const [mode, setMode] = useState('create');

  // "생성/수정" 폼 state
  const [name, setName] = useState('');
  const [color, setColor] = useState(defaultColors[0]);
  const [memo, setMemo] = useState('');
  const [colors, setColors] = useState(defaultColors);

  // "공유 참여" 폼 state
  const [joinForm, setJoinForm] = useState({
    shareUrl: '',
    password: '',
  });

   // 현재 내가 수정 중인 캘린더의 소유자인지 확인
  const isOwnerOfActiveCalendar = activeCalendar && (activeCalendar.user?._id || activeCalendar.user) === user.uid;
  //  activeCalendar가 있으면 (수정 모드) 폼을 채움
  useEffect(() => {
    if (activeCalendar) {
      setName(activeCalendar.name);
      setColor(activeCalendar.color);
      setMemo(activeCalendar.memo || '');
      if (!colors.includes(activeCalendar.color)) {
        setColors((prev) => [...prev, activeCalendar.color]);
      }
    } 
    // (activeCalendar가 null일 때 폼을 비우는 로직은
    // '생성' 탭이 제출될 때로 이동)
  }, [activeCalendar]);

  // "생성/수정" 제출 핸들러 (기존 handleSubmit)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return Swal.fire('오류', '캘린더명을 입력하세요.', 'error');

    const calendarData = { name, color, memo };

    if (activeCalendar) {
      // 수정 모드
      startUpdatingCalendar({ ...activeCalendar, ...calendarData }); 
    } else {
      // 생성 모드
      startAddingCalendar(calendarData);
    }
    onClose();
  };

  // "삭제" 핸들러 (기존 handleDelete)
  const handleDelete = async () => { /* ... (기존 코드와 동일, 생략 없음) ... */ 
    if (!activeCalendar) return;
    const result = await Swal.fire({
      title: '캘린더를 삭제하시겠습니까?',
      text: '캘린더에 속한 모든 일정이 함께 삭제됩니다!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6e7881',
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
    });
    if (result.isConfirmed) {
      startDeletingCalendar(activeCalendar.id || activeCalendar._id);
      onClose();
    }
  };

  //"공유 참여" 폼 핸들러
  const onJoinInputChange = ({ target }) => {
    setJoinForm({
      ...joinForm,
      [target.name]: target.value,
    });
  };

  // "공유 참여" 제출 핸들러
  const onJoinSubmit = async (event) => {
    event.preventDefault();
    
    let shareId = '';
    try {
      const urlParts = joinForm.shareUrl.split('/');
      shareId = urlParts[urlParts.length - 1].split('?')[0]; 
    } catch (e) {
      shareId = joinForm.shareUrl; 
    }

    if (shareId.trim().length <= 0 || joinForm.password.trim().length <= 0) {
      Swal.fire('오류', '공유 ID(링크)와 비밀번호를 모두 입력해주세요.', 'error');
      return;
    }

    // useCalendarStore에 구현해야 할 함수 호출
    await startJoiningCalendar(shareId, joinForm.password); 
    onClose(); 
  };


  const handleOverlayClick = () => {
    // (기존 코드의 컬러피커 닫는 로직은 CalendarFormFields 내부로 이동)
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
      >

        {!activeCalendar ? (
          // "생성 / 참여" 모드 (activeCalendar가 null일 때)
          <>
            <div className="modal-tabs">
              <button
                className={`modal-tab-btn ${mode === 'create' ? 'active' : ''}`}
                onClick={() => setMode('create')}
              >
                새 캘린더 생성
              </button>
              <button
                className={`modal-tab-btn ${mode === 'join' ? 'active' : ''}`}
                onClick={() => setMode('join')}
              >
                공유 캘린더 참여
              </button>
            </div>
            <hr className="modal-divider" style={{ marginTop: 0 }} />

            {/* --- "생성" 탭 --- */}
            {mode === 'create' && (
              <form onSubmit={handleSubmit}>
                <CalendarFormFields
                  formState={{ name: [name, setName], color: [color, setColor], memo: [memo, setMemo] }}
                  colors={colors}
                  setColors={setColors}
                  defaultColors={defaultColors}
                  // 소유자가 아닐 경우 필드 비활성화
                  disabled={!isOwnerOfActiveCalendar}
                />
                <div className="modal-buttons">
                  <button type="button" className="modal-btn ghost" onClick={onClose}>
                    취소
                  </button>
                  
                  {/* <button type="button" className="save-btn" disabled={!isOwnerOfActiveCalendar}> */}
                  <button
                    type="button"
                    className="save-btn"
                    onClick={handleSubmit}
                    disabled={false}                     // 새 캘린더 생성은 항상 가능
                  >
                    저장
                  </button>
                </div>
              </form>
            )}

            {/* --- "참여" 탭 --- */}
            {mode === 'join' && (
              <form onSubmit={onJoinSubmit}>
                <label className="modal-label">공유 링크 또는 ID</label>
                <input
                  type="text"
                  name="shareUrl"
                  className="modal-input"
                  placeholder="http://.../share-calendar/68f..."
                  value={joinForm.shareUrl}
                  onChange={onJoinInputChange}
                  autoFocus
                />
                <label className="modal-label">비밀번호</label>
                <input
                  type="password"
                  name="password"
                  className="modal-input"
                  value={joinForm.password}
                  onChange={onJoinInputChange}
                />
                <div className="modal-buttons">
                  <button type="button" className="modal-btn ghost" onClick={onClose}>
                    취소
                  </button>
                  <button type="submit" className="save-btn">
                    캘린더 추가
                  </button>
                </div>
              </form>
            )}
          </>

        ) : (
          //  "수정 / 삭제" 모드 (activeCalendar가 있을 때)
          <>
            <h2 className="modal-title">캘린더 수정</h2>
            <hr className="modal-divider" />
            <form onSubmit={handleSubmit}>
              <CalendarFormFields
                formState={{ name: [name, setName], color: [color, setColor], memo: [memo, setMemo] }}
                colors={colors}
                setColors={setColors}
                defaultColors={defaultColors}
              />
              <div className="modal-buttons">
                <button
                  type="button"
                  className="modal-btn danger" 
                  onClick={handleDelete}
                  style={{ marginRight: 'auto' }} 
                >
                  삭제
                </button>
                <button type="button" className="modal-btn ghost" onClick={onClose}>
                  취소
                </button>
                <button type="submit" className="save-btn">
                  저장
                </button>
              </div>
            </form>
          </>
        )}
        
      </div>
    </div>
  );
};