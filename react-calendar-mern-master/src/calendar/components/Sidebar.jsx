import { useState, useEffect, useMemo, useRef } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './Sidebar.css';
import { useUiStore, useCalendarStore } from '../../hooks';
//import ShareCalendarModal from './ShareCalendarModal.jsx';
import { updateCalendar } from "../../api/calendarApi";

export const Sidebar = ({onShare}) => {
  const { startSavingCalendar } = useCalendarStore(); 

  const [date, setDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  const { openDateModal, openAddCalendarModal } = useUiStore();
  const { calendars, startLoadingCalendars, clearActiveEvent, visibleCalendarIds, toggleCalendarVisibility, setActiveCalendar } = useCalendarStore();
  
  const [checkedState, setCheckedState] = useState({});

  //const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  //const [shareData, setShareData] = useState(null);


  // 👇 2. 스토어의 visibleCalendarIds가 변경될 때마다 로컬 상태를 업데이트
  useEffect(() => {
      const newState = {};
      calendars.forEach(calendar => {
          newState[calendar.id] = visibleCalendarIds.includes(calendar.id);
      });
      setCheckedState(newState);
  }, [visibleCalendarIds, calendars]);

  useEffect(() => {
    startLoadingCalendars();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // dropdown-menu 안쪽 클릭은 무시
      if (event.target.closest('.dropdown-menu')) return;

      // 메뉴 영역 밖 클릭 시에만 닫기
      if (openMenuId !== null && menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const filteredCalendars = useMemo(() => {
    if (searchTerm.trim() === '') {
      return []; 
    }
    return calendars.filter(calendar => 
      calendar.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, calendars]);

  const handleCreateNewEvent = () => {
    clearActiveEvent();
    openDateModal();
  };
  
  const handleExitSearch = () => {
    setIsSearching(false);
    setSearchTerm('');
    setOpenMenuId(null);
  };

  const handleClearSearch = () => { 
    setSearchTerm('');
    setOpenMenuId(null);
  };

 const handleToggleMenu = (calendarId) => {
    setOpenMenuId(openMenuId === calendarId ? null : calendarId);
  };

  const handleEditClick = (calendar) => {
    setActiveCalendar(calendar);
    openAddCalendarModal();
    setOpenMenuId(null); 
  };

  const handleCheckboxChange = (calendarId) => {
        // UI를 즉시 업데이트, Redux 스토어에도 변경을 알림
        setCheckedState(prevState => ({
            ...prevState,
            [calendarId]: !prevState[calendarId]
        }));
        toggleCalendarVisibility(calendarId);
  };
  // src/components/Sidebar.jsx

const handleShareClick = async (calendar) => {
      let calendarData = { ...calendar };

      // 1. DB 필드명인 'sharePassword'가 있는지 확인합니다.
      if (!calendarData.sharePassword) {
          try {
              console.log("최초 공유: sharePassword와 shareToken을 생성하고 DB에 저장합니다.");
              
              // API 호출을 통해 백엔드가 비밀번호와 토큰을 모두 생성하고 저장하게 합니다.
              // calendarData에는 name, color 등 기존 정보만 보냅니다.
              const savedCalendar = await startSavingCalendar(calendarData);
              
              // 서버로부터 받은 최신 데이터로 변수를 교체합니다.
              calendarData = savedCalendar; 

          } catch (error) {
              console.error("공유 정보 저장 중 에러 발생:", error);
              return; // 에러 발생 시 함수를 종료합니다.
          }
      }

      // ❗️ 2. (핵심) 링크를 만들 때 'id' 대신 'shareToken'을 사용합니다.
      const shareLink = `${window.location.origin}/share-calendar/${calendarData.shareToken}`;

      // ❗️ 3. (핵심) 모달을 열 때 DB 필드명과 일치하는 'sharePassword'를 전달합니다.
      onShare(
          calendarData.id, 
          shareLink, // 방금 만든 올바른 링크
          calendarData.sharePassword
      );
  };



  return (
    <aside className="sidebar-container">
      <button 
        className="new-event-button"
        onClick={handleCreateNewEvent}
      >
        <i className="fas fa-plus"></i>
        일정 쓰기
      </button>

      <div className="mini-calendar-container">
        <Calendar
          onChange={setDate}
          value={date}
          locale="ko-KR"
          formatDay={(locale, date) => date.getDate()}
        />
      </div>

      {/* 🔍 검색창 */}
      <div className="search-container"> 
        <i className="fas fa-search search-icon"></i> {/* 돋보기 아이콘 */}
        <input 
          type="text" 
          placeholder="캘린더 검색"
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsSearching(true)}
          onBlur={handleExitSearch}
        />
        {searchTerm && ( // 검색어가 있을 때만 X 아이콘 표시
          <i 
            className="fas fa-times clear-search-icon" 
            onClick={handleClearSearch}
            onMouseDown={e => e.preventDefault()} // X 아이콘 클릭 시 onBlur 방지
          ></i>
        )}
      </div>

      {/* 내 캘린더 목록 */}
      { !isSearching && (
        <div className="calendar-list-section">
          <div className="calendar-list-header">
            <h5 className="calendar-list-heading">내 캘린더</h5>
            <div className="header-icons">
              <button onClick={openAddCalendarModal}>+</button>
              <button>⚙️</button>
            </div>
          </div>

          <ul className="calendar-list">
            {calendars.map(calendar => (
              <li key={calendar.id} className="calendar-list-item">
                {/* 캘린더 이름과 체크박스 */}
                <div className="calendar-info">
                  <input 
                    type="checkbox" 
                    id={calendar.id} 
                    style={{ accentColor: calendar.color }} 
                    checked={checkedState[calendar.id] || false}
                    onChange={() => toggleCalendarVisibility(calendar.id)}
                  />
                  <label htmlFor={calendar.id}>{ calendar.name }</label>
                </div>

                {/* 더보기 버튼과 드롭다운 */}
                <div className="menu-container" ref={menuRef}>
                  <button 
                    className="more-options-btn"
                    onClick={() => handleToggleMenu(calendar.id)} 
                  >
                    <i className="fas fa-ellipsis-h"></i>
                  </button>

                  {openMenuId === calendar.id && (
                    <div className="dropdown-menu">
                      <ul>
                        <li onClick={() => handleShareClick(calendar)}>캘린더 공유하기</li>
                        <li onClick={() => handleEditClick(calendar)}>수정/삭제</li>
                      </ul>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 🔎 검색 결과 목록 */}
      { isSearching && searchTerm.length > 0 && (
        <div 
          className="search-results-section"
          onMouseDown={e => e.preventDefault()}
        >
          <ul className="calendar-list">
            {filteredCalendars.length > 0 ? (
              filteredCalendars.map(calendar => (
                <li key={calendar.id} className="calendar-list-item">
                  {/* 캘린더 이름과 체크박스 */}
                  <div className="calendar-info">
                    <input 
                      type="checkbox" 
                      id={`search-${calendar.id}`}
                      style={{ accentColor: calendar.color }} 
                      checked={visibleCalendarIds.includes(calendar.id)}
                      onChange={() => toggleCalendarVisibility(calendar.id)}
                    />
                    <label htmlFor={`search-${calendar.id}`}>{ calendar.name }</label>
                  </div>

                  {/* 더보기 버튼과 드롭다운 */}
                  <div className="menu-container">
                    <button 
                      className="more-options-btn"
                      onClick={() => handleToggleMenu(calendar.id)}
                    >
                      <i className="fas fa-ellipsis-h"></i>
                    </button>

                    {openMenuId === calendar.id && (
                      <div className="dropdown-menu">
                        <ul>
                          <li onClick={() => handleShareClick(calendar)}>공유하기</li>
                          <li onClick={() => handleEditClick(calendar)}>수정/삭제</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </li>
              ))
            ) : (
              <li className="no-results">검색 결과가 없습니다.</li>
            )}
          </ul>
        </div>
      )}
      
      {/* <ShareCalendarModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        shareData={shareData} 
      /> */}
      
    </aside>
  );
};
