import './CalendarToolbar.css';

export const CalendarToolbar = ({ label, onNavigate, onView, view }) => {
   const formatLabel = (label) => {
      const parts = label.split(' '); // "10월 2025"를 공백 기준으로 나눔 -> ["10월", "2025"]
      if (parts.length === 2) {
        // 순서를 바꿔서 "2025년 10월" 형태로 반환
        return `${parts[1]}년 ${parts[0]}`; 
      }
      return label; // 형식이 다를 경우 원래 label 반환
    };

  return (
    <div className="rbc-toolbar">
      <div className="rbc-btn-group">
        <button type="button" onClick={() => onNavigate('TODAY')}>오늘</button>
        <button type="button" onClick={() => onNavigate('PREV')}>&lt;</button>
        <button type="button" onClick={() => onNavigate('NEXT')}>&gt;</button>
      </div>

      <span className="rbc-toolbar-label">{formatLabel(label)}</span>

      <div className="rbc-btn-group">
        <button
          type="button"
          className={view === 'month' ? 'rbc-active' : ''}
          onClick={() => onView('month')}
        >
          월
        </button>
        <button
          type="button"
          className={view === 'week' ? 'rbc-active' : ''}
          onClick={() => onView('week')}
        >
          주
        </button>
        <button
          type="button"
          className={view === 'day' ? 'rbc-active' : ''}
          onClick={() => onView('day')}
        >
          일
        </button>
        <button
          type="button"
          className={view === 'agenda' ? 'rbc-active' : ''}
          onClick={() => onView('agenda')}
        >
          일정
        </button>
      </div>
    </div>
  );
};
