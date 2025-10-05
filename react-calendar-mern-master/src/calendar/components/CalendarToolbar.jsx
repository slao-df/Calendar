// src/calendar/components/CalendarToolbar.jsx

import './CalendarToolbar.css';

export const CalendarToolbar = ({ label, onNavigate, onView, view }) => {
  return (
    <div className="rbc-toolbar">
      <div className="rbc-btn-group">
        <button type="button" onClick={() => onNavigate('TODAY')}>오늘</button>
        <button type="button" onClick={() => onNavigate('PREV')}>&lt;</button>
        <button type="button" onClick={() => onNavigate('NEXT')}>&gt;</button>
      </div>

      <span className="rbc-toolbar-label">{label}</span>

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