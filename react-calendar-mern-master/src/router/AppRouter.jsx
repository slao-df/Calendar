import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { LoginPage, RegisterPage } from '../auth';
import { CalendarPage } from '../calendar';
import { useAuthStore } from '../hooks';

// 1. ShareAcceptPage를 import 합니다. (경로를 꼭 확인해주세요!)
import ShareAcceptPage from '../calendar/pages/ShareAcceptPage'; 

export const AppRouter = () => {
  const { status, checkAuthToken } = useAuthStore();

  useEffect(() => {
    checkAuthToken();
  }, []);

  // 인증 상태를 확인하는 동안에는 로딩 화면을 보여줍니다.
  // ShareAcceptPage는 이 로직의 영향을 받지 않도록 아래 Routes에서 처리합니다.
  if (status === 'checking') {
    return <h3>로딩 중...</h3>;
  }

  return (
    <Routes>
      {/* 2. 공유 페이지 라우트를 인증 로직 "바깥" 최상단에 배치합니다. */}
      {/* 이렇게 하면 로그인 상태와 상관없이 이 경로로 직접 접근할 수 있습니다. */}
      <Route 
        path="/share-calendar/:shareToken" 
        element={<ShareAcceptPage />} 
      />

      {/* 3. 기존의 인증 상태에 따른 분기 로직은 그대로 유지합니다. */}
      {status === 'not-authenticated' ? (
        // --- 로그아웃 상태일 때의 라우트 ---
        <>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          {/* 다른 모든 경로는 로그인 페이지로 보냅니다. */}
          <Route path="/*" element={<Navigate to="/auth/login" />} />
        </>
      ) : (
        // --- 로그인 상태일 때의 라우트 ---
        <>
          <Route path="/" element={<CalendarPage />} />
          {/* 다른 모든 경로는 메인 캘린더 페이지로 보냅니다. */}
          <Route path="/*" element={<Navigate to="/" />} />
        </>
      )}
    </Routes>
  );
};
