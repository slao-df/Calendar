import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar } from 'react-big-calendar';
import { localizer, convertEventsToDateEvents } from '../../helpers';
import { calendarApi } from '../../api';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarPage.css'; // 기존 스타일 재활용

export const PublicCalendarPage = () => {
    // 1. URL 경로에서 :token 부분을 가져옵니다. (예: /share-calendar/abcdef123)
    const { token } = useParams(); 
    
    // 2. 이 페이지에서만 사용할 독립적인 상태를 만듭니다.
    const [calendar, setCalendar] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 3. token 값이 바뀔 때마다 실행되는 데이터 요청 로직
    useEffect(() => {
        const fetchSharedData = async () => {
            if (!token) return;
            try {
                setLoading(true);
                // ❗️ 백엔드의 공유 데이터 전용 API를 호출합니다.
                const { data } = await calendarApi.get(`/calendars/share/${token}`);
                
                if (data.ok) {
                    setCalendar(data.calendar);
                    // ❗️ 서버에서 받은 이벤트들의 날짜 형식을 BigCalendar가 인식할 수 있도록 변환합니다.
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

    // 로딩 중이거나 에러가 발생했을 때 보여줄 화면
    if (loading) return <div style={{ padding: '20px' }}>로딩 중...</div>;
    if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

    // 캘린더 이벤트의 색상을 지정하는 함수
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
            {/* Navbar 없이 캘린더 이름만 표시 */}
            <h1 style={{ padding: '20px', fontSize: '24px' }}>{calendar?.name || '공유 캘린더'}</h1>
            
            {/* Sidebar 없이 main-content가 전체 너비를 차지하도록 수정 */}
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
                />
            </main>
        </div>
    );
};
