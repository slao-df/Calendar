import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';

import { LoginPage } from '../auth/pages/LoginPage';
import { RegisterPage } from '../auth/pages/RegisterPage';
import { CalendarPage } from '../calendar/pages/CalendarPage';
import { useAuthStore } from '../hooks/useAuthStore';
// 1. SharedCalendarAccessPage 임포트를 확인합니다.
import { SharedCalendarAccessPage } from '../calendar/pages/SharedCalendarAccessPage';
// (SharedCalendarPage 임포트는 여기서 필요 없을 수 있습니다)
import AccountSettingsPage from "../account/AccountSettingsPage";

export const AppRouter = () => {
  const { status, checkAuthToken } = useAuthStore();
  // (useLocation은 이 구조에서 필요 없습니다)

  useEffect(() => {
    checkAuthToken();
  }, []);

  if (status === 'checking') {
    return <h3>로딩 중...</h3>;
  }

  return (
    <Routes>
      {/* 2. 공유 접근 페이지 라우트를 최상단으로 이동시킵니다. */}
      {/* 이렇게 하면 로그인 상태와 관계없이 이 경로가 가장 먼저 확인됩니다. */}
      <Route path="/share-calendar/:shareId" element={<SharedCalendarAccessPage />} />

      {/* 3. 로그인 상태에 따라 나머지 페이지 라우트를 분기합니다. */}
      {status === 'not-authenticated' ? (
        // --- 로그인하지 않은 사용자 ---
        <>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          {/* 그 외 모든 경로는 로그인 페이지로 리디렉션 */}
          <Route path="/*" element={<Navigate to="/auth/login" />} />
        </>
      ) : (
        // --- 로그인한 사용자 ---
        <>
          <Route path="/" element={<CalendarPage />} />
          {/* 그 외 모든 경로는 메인 캘린더 페이지로 리디렉션 */}
          <Route path="/*" element={<Navigate to="/" />} />
        </>
      )}
      <Route path="/account" element={<AccountSettingsPage />} />
    </Routes>
  );
};