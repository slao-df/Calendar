import { useDispatch, useSelector } from 'react-redux';
import { calendarApi } from '../api';
import {
  clearErrorMessage,
  onChecking,
  onLogin,
  onLogout,
  onLogoutCalendar,
} from '../store';

export const useAuthStore = () => {
  const { status, user, errorMessage } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // 로그인
  const startLogin = async ({ email, password, redirectTo }) => {
    dispatch(onChecking());
    try {
      const { data } = await calendarApi.post('/auth', { email, password });

      localStorage.setItem('token', data.token);
      localStorage.setItem('token-init-date', new Date().getTime());

      //email 추가
      dispatch(onLogin({ name: data.name, uid: data.uid, email: data.email }));

      if (redirectTo) window.location.href = redirectTo;
    } catch (error) {
      dispatch(onLogout('로그인 실패'));
    }
  };

  // 🔹 회원가입
  const startRegister = async ({ email, password, name }) => {
    dispatch(onChecking());

    try {
      const { data } = await calendarApi.post('/auth/new', {
        email,
        password,
        name,
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('token-init-date', new Date().getTime());

      // email 포함
      dispatch(onLogin({ name: data.name, uid: data.uid, email: data.email }));
    } catch (error) {
      dispatch(onLogout(error.response.data?.msg || '회원가입 실패'));
      setTimeout(() => {
        dispatch(clearErrorMessage());
      }, 10);
    }
  };

  // 토큰 확인 및 자동 로그인 유지
  const checkAuthToken = async () => {
    const token = localStorage.getItem('token');
    if (!token) return dispatch(onLogout());

    try {
      const { data } = await calendarApi.get('auth/renew');

      localStorage.setItem('token', data.token);
      localStorage.setItem('token-init-date', new Date().getTime());

      // 서버가 반환하는 값에 email이 있어야 함
      dispatch(onLogin({ name: data.name, uid: data.uid, email: data.email }));
    } catch (error) {
      localStorage.clear();
      dispatch(onLogout());
    }
  };

  // 로그아웃
  const startLogout = () => {
    localStorage.clear();
    dispatch(onLogoutCalendar());
    dispatch(onLogout());
  };

  return {
    // 상태값
    errorMessage,
    status,
    user,

    // 메서드
    checkAuthToken,
    startLogin,
    startRegister,
    startLogout,
  };
};
