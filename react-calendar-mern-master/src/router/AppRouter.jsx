import { Navigate, Route, Routes } from 'react-router-dom';

import { LoginPage } from '../auth';
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
                        <Route path="/auth/*" element={<LoginPage />} />
                        {/* ❗️ 2. 누구나 접근 가능한 공유 페이지 라우트 추가 */}
                        <Route path="/share-calendar/:token" element={<PublicCalendarPage />} />
                        <Route path="/*" element={<Navigate to="/auth/login" />} />
                    </>
                )
                : (
                    <>
                        <Route path="/" element={<CalendarPage />} />
                        {/* ❗️ 3. 로그인한 사용자도 접근 가능하도록 추가 */}
                        <Route path="/share-calendar/:token" element={<PublicCalendarPage />} />
                        <Route path="/*" element={<Navigate to="/" />} />
                    </>
                )
        }
    </Routes>
  )
}
