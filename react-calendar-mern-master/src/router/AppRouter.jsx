import { Navigate, Route, Routes } from 'react-router-dom';

import { LoginPage } from '../auth';
import { RegisterPage } from '../auth/pages/RegisterPage';
import { CalendarPage } from '../calendar';

import { useAuthStore } from '../hooks';
import { useEffect } from 'react';

import { PublicCalendarPage } from "../calendar/pages/PublicCalendarPage";

export const AppRouter = () => {


  

  const { status, checkAuthToken } = useAuthStore();
    // const authStatus = 'not-authenticated'; // 'authenticated'; // 'not-authenticated';

    useEffect(() => {
        checkAuthToken();
    }, [])


    if ( status === 'checking' ) {
      return (
          <h3>로딩 중...</h3>
      )
  }
  

  return (
    <Routes>
      {
        (status === 'not-authenticated')
          ? (
            <>
              <Route path="/auth/login" element={<LoginPage />} />
              {/* ❗️ 2. /auth/register 경로에 RegisterPage를 연결합니다. */}
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/*" element={<Navigate to="/auth/login" />} />
            </>
          )
          : (
            <>
              <Route path="/" element={<CalendarPage />} />
              <Route path="/*" element={<Navigate to="/" />} />
            </>
          )
      }
    </Routes>
  )
}
