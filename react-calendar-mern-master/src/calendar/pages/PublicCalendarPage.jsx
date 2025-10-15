// src/pages/PublicCalendarPage.jsx

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar } from 'react-big-calendar';
import { localizer, convertEventsToDateEvents } from '../../helpers';
import { calendarApi } from '../../api';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarPage.css';

// ❗️ 1. (핵심) react-big-calendar의 모든 텍스트를 한국어로 번역하는 객체를 만듭니다.
const koreanMessages = {
  allDay: '하루 종일',
  previous: '이전',
  next: '다음',
  today: '오늘',
  month: '월',
  week: '주',
  day: '일',
  agenda: '목록',
  date: '날짜',
  time: '시간',
  event: '일정',
  noEventsInRange: '해당 기간에 일정이 없습니다.',
  showMore: total => `+${total} 더보기`,
};


export const PublicCalendarPage = () => {
    const { token } = useParams(); 
    const [calendar, setCalendar] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSharedData = async () => {
            if (!token) return;
            try {
                setLoading(true);
                const { data } = await calendarApi.get(`/calendars/share/${token}`);
                
                if (data.ok) {
                    setCalendar(data.calendar);
                    const convertedEvents = convertEventsToDateEvents(data.events);
                    setEvents(convertedEvents);
                } else {
                    setError(data.msg || '캘린더를 불러올 수 없습니다.');
                }
            } catch (err) {
                setError('캘린더를 불러올 수 없습니다. 링크가 정확한지 확인해주세요.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSharedData();
    }, [token]);

    if (loading) return <div style={{ padding: '20px' }}>로딩 중...</div>;
    if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

    const eventStyleGetter = (event) => ({
        style: { 
            backgroundColor: calendar?.color || '#347CF7',
            color: 'white',
            borderRadius: '0px',
            border: 'none'
        }
    });

    return (
        <div className="calendar-screen">
            <h1 style={{ padding: '20px', fontSize: '24px' }}>{calendar?.name || '공유 캘린더'}</h1>
            <main className="main-content" style={{ height: 'calc(100vh - 80px)', width: '100vw' }}>
                <Calendar
                    culture='ko'
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    eventPropGetter={eventStyleGetter}
                    views={['month', 'week', 'day']}
                    // ❗️ 2. 위에서 만든 한국어 번역 객체를 messages 속성으로 전달합니다.
                    messages={koreanMessages}
                />
            </main>
        </div>
    );
};
