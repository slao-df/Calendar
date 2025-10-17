// src/calendar/pages/ShareAcceptPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuthStore';

function ShareAcceptPage() {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { status, user, startLogout } = useAuthStore();

  const [sharedInfo, setSharedInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState(''); // 🔹 비밀번호 입력 지원

  useEffect(() => {
    if (status === 'authenticated' && sharedInfo) {
      handleAccessSharedCalendar();
    }
  }, [status, sharedInfo]);

  useEffect(() => {
    const fetchCalendarByToken = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/calendars/share-info/${shareToken}`);
        if (!response.ok) throw new Error('만료되었거나 잘못된 공유 링크입니다.');
        const data = await response.json();
        setSharedInfo(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    if (shareToken) fetchCalendarByToken();
  }, [shareToken]);

  // ✅ 새로운 공유 수락 로직 (참여자 자동 추가 포함)
  const handleAccessSharedCalendar = async () => {
    if (status !== 'authenticated') {
      alert("공유를 수락하려면 로그인이 필요합니다.");
      navigate(`/auth/login?redirectTo=${location.pathname}`);
      return;
    }

    if (sharedInfo && user.uid === sharedInfo.owner.uid) {
      alert("자신의 캘린더는 공유받을 수 없습니다. 다른 계정으로 로그인해주세요.");
      startLogout();
      navigate('/auth/login');
      return;
    }

    try {
      const response = await fetch(
        `/api/calendars/shared/access/${sharedInfo.calendarId}/${shareToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-token': localStorage.getItem('token'),
          },
          body: JSON.stringify({ password }),
        }
      );

      const data = await response.json();
      if (!data.ok) throw new Error(data.msg || '공유 수락 실패');

      alert('캘린더가 내 목록에 추가되었습니다.');
      navigate('/');

    } catch (err) {
      alert(err.message);
    }
  };

  if (isLoading) return <div>공유 정보를 불러오는 중입니다...</div>;
  if (error) return <div style={{ color: 'red' }}>오류: {error}</div>;

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      {sharedInfo ? (
        <>
          <h1>'{sharedInfo.owner.name}'님의 캘린더 공유 초대</h1>
          <p>
            <strong>"{sharedInfo.calendar.title}"</strong> 캘린더를
            당신의 목록에 추가하시겠습니까?
          </p>
          <input
            type="password"
            placeholder="공유 비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <br />
          <button onClick={handleAccessSharedCalendar}>
            수락하고 내 캘린더에 추가
          </button>
          <button onClick={() => navigate('/')}>거절</button>
        </>
      ) : (
        <p>공유 정보를 표시할 수 없습니다.</p>
      )}
    </div>
  );
}

export default ShareAcceptPage;
