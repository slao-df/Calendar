import { useState, useEffect, useRef, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './Sidebar.css';
import { AddCalendarModal } from './AddCalendarModal'; // 탭 기능이 병합된 모달
import { useCalendarStore } from '../../hooks/useCalendarStore';
import { ShareCalendarModal } from '../components/ShareCalendarModal';
import { ParticipantModal } from './ParticipantModal';

// props: setIsEventModalOpen (상위), checkedState (상위), handleCheckboxChange (상위)
export const Sidebar = ({ setIsEventModalOpen, checkedState, handleCheckboxChange }) => {
  // 1. Local State
  const [date, setDate] = useState(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false); // AddCalendarModal 제어
  const [menuOpenState, setMenuOpenState] = useState(null); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false); // ShareCalendarModal 제어
  const [selectedCalendarId, setSelectedCalendarId] = useState(null); // 공유 대상 ID
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false); // ParticipantModal 제어
  const [selectedCalendar, setSelectedCalendar] = useState(null); // 참여자 목록 대상
  const menuRef = useRef(null);

  // 2. Store Hook
  const { calendars, setActiveEvent, setActiveCalendar } = useCalendarStore();

  // 3. useEffect (팝업 외부 클릭 시 닫기)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenState(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 4. 핸들러 함수
  // '+' 버튼 핸들러 (AddCalendarModal 열기 - 탭 모드)
  const handleAddCalendarClick = () => {
    // activeCalendar를 null로 설정 -> AddCalendarModal이 탭 모드로 열림
    setActiveCalendar(null); 
    setIsAddModalOpen(true);
  };

  // '+ 일정쓰기' 버튼 핸들러 (CalendarModal 열기)
  const handleNewEventClick = () => {
    setActiveEvent(null); // 새 일정 모드
    setIsEventModalOpen(true); // 상위 컴포넌트(CalendarPage)에 요청
  };

  // '...' 메뉴 버튼 클릭 핸들러 (팝업 열기/닫기)
  const handleMenuClick = (e, id) => {
    const sidebarRect = e.currentTarget.closest('.sidebar-container').getBoundingClientRect();
    const buttonRect = e.currentTarget.getBoundingClientRect();
    const top = buttonRect.top - sidebarRect.top;
    setMenuOpenState(prevState => (prevState?.id === id ? null : { id, top }));
  };

  // '수정 / 삭제' 팝업 버튼 클릭 핸들러 (AddCalendarModal 열기 - 수정 모드)
  const handleEditCalendarClick = (calendar) => {
    // 수정할 캘린더를 activeCalendar로 설정 -> AddCalendarModal이 수정 모드로 열림
    setActiveCalendar(calendar); 
    setIsAddModalOpen(true); 
    setMenuOpenState(null); // 메뉴 팝업 닫기
  };

  // '공유하기' 팝업 버튼 클릭 핸들러 (ShareCalendarModal 열기)
  const handleShareClick = (calendarId) => {
    setSelectedCalendarId(calendarId);
    setIsShareModalOpen(true);
    setMenuOpenState(null); // 메뉴 팝업 닫기
  };
  
  // '참여자 목록' 팝업 버튼 클릭 핸들러 (ParticipantModal 열기)
  const handleParticipantClick = (calendar) => {
    setSelectedCalendar(calendar); 
    setIsParticipantModalOpen(true);
    setMenuOpenState(null); // 메뉴 팝업 닫기
  };

  // 5. 필터링된 캘린더 목록 (useMemo)
  const filteredCalendars = useMemo(
    () =>
      calendars.filter((cal) =>
        cal.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [calendars, searchTerm]
  );

  // 6. 렌더링
  return (
    <aside className="sidebar-container">
      {/* 일정쓰기 버튼 */}
      <button className="new-event-button" onClick={handleNewEventClick}>
        + 일정쓰기
      </button>

      {/* 미니 캘린더 */}
      <div className="mini-calendar-container">
        <Calendar
          onChange={setDate}
          value={date}
          locale="ko-KR"
          formatDay={(locale, date) => date.getDate()}
          next2Label="»" prev2Label="«" nextLabel="›" prevLabel="‹"
        />
      </div>

      {/* 캘린더 검색창 */}
      <div className="calendar-search-container">
        <i className="fas fa-search"></i>
        <input
          type="text"
          className="calendar-search-input"
          placeholder="캘린더 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            type="button"
            className="calendar-search-clear"
            onClick={() => setSearchTerm('')}
          >
            ✕
          </button>
        )}
      </div>

      {/* 내 캘린더 헤더 */}
      <div className="calendar-header">
        <h5 className="calendar-title">내 캘린더</h5>
        <div className="calendar-actions">
          {/* '+' 버튼이 AddCalendarModal (탭 모드) 열도록 수정됨 */}
          <button className="add-calendar" onClick={handleAddCalendarClick}>+</button>
          <button className="settings-calendar"><i className="fas fa-cog"></i></button>
        </div>
      </div>

      {/* 캘린더 목록 */}
      <div className="calendar-list">
        {filteredCalendars.length === 0 ? (
          <p className="empty-text">
            {searchTerm ? '일치하는 캘린더가 없습니다.' : '등록된 캘린더가 없습니다.'}
          </p>
        ) : (
          filteredCalendars.map((cal) => {
            const id = cal.id || cal._id; // ID 추출
            const isChecked = checkedState[id] !== undefined ? checkedState[id] : true;

            return (
              <div key={id} className="calendar-item">
                <label className="calendar-label">
                  <input
                    type="checkbox"
                    className="calendar-checkbox"
                    style={{ accentColor: cal.color }}
                    checked={isChecked}
                    // checkedState 관리는 상위 컴포넌트(CalendarPage)에서 함
                    onChange={() => handleCheckboxChange(id)}
                  />
                  <span className="calendar-name">{cal.name}</span>
                </label>
                <span
                  className="calendar-menu"
                  onClick={(e) => handleMenuClick(e, id)}
                >
                  <i className="fas fa-ellipsis-h"></i>
                </span>
                {menuOpenState?.id === id && (
                  <div
                    className="calendar-menu-popup"
                    ref={menuRef}
                    style={{ top: `${menuOpenState.top}px` }}
                  >
                    <button 
                      className="menu-item share-button"
                      onClick={() => handleShareClick(id)}
                    >
                      공유하기
                    </button>
                    <hr />
                    <button className="menu-item" onClick={() => handleParticipantClick(cal)}>
                      참여자 목록
                    </button>
                    <hr />
                    <button
                      className="menu-item"
                      onClick={() => handleEditCalendarClick(cal)}
                    >
                      수정 / 삭제
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 7. 모달 렌더링 */}
      {/* AddCalendarModal: 생성/수정/참여 모달 */}
      {isAddModalOpen && (
        <AddCalendarModal
          onClose={() => {
            setIsAddModalOpen(false);
            setActiveCalendar(null); // 모달 닫을 때 active 비우기 (중요)
          }}
        />
      )}
      {/* ShareCalendarModal: 공유 모달 */}
      {isShareModalOpen && (
        <ShareCalendarModal
          calendarId={selectedCalendarId}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
      {/* ParticipantModal: 참여자 목록 모달 */}
      {isParticipantModalOpen && (
        <ParticipantModal
          calendar={selectedCalendar}
          onClose={() => setIsParticipantModalOpen(false)}
        />
      )}
        
    </aside>
  );
};