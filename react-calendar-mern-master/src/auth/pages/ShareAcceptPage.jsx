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

    // [핵심] 로그인하고 돌아왔을 때 자동으로 수락을 실행하는 로직
    useEffect(() => {
        // 1. 로그인된 상태이고, 2. 캘린더 정보 로딩이 끝났을 때만 실행
        if (status === 'authenticated' && sharedInfo) {
            handleAccept();
        }
    }, [status, sharedInfo]); // status나 sharedInfo가 변경될 때마다 이 효과를 재실행

    useEffect(() => {
        // 기존의 공유 캘린더 정보 로딩 로직
        const fetchCalendarByToken = async () => {
          setIsLoading(true);
          try {
            const response = await fetch(`/api/calendar/share-calendar/${shareToken}`);
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

    const handleAccept = async () => {
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
            const response = await fetch(`/api/calendar/share-calendar/${shareToken}/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-token': localStorage.getItem('token'),
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || '공유 수락에 실패했습니다.');
            }

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
                    <p><strong>"{sharedInfo.calendar.title}"</strong> 캘린더를 당신의 목록에 추가하시겠습니까?</p>
                    <button onClick={handleAccept}>수락하고 내 캘린더에 추가</button>
                    <button onClick={() => navigate('/')}>거절</button>
                </>
            ) : (
                <p>공유 정보를 표시할 수 없습니다.</p>
            )}
        </div>
    );
}

export default ShareAcceptPage;
