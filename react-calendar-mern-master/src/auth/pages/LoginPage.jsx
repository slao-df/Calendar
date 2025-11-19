// src/auth/pages/LoginPage.jsx

import React, { useEffect } from 'react';
// 👇 1. useLocation, useNavigate, Link를 import 합니다.
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useForm } from '../../hooks/useForm';
import { useAuthStore } from '../../hooks/useAuthStore';
import './LoginPage.css';

export const LoginPage = () => {
  // 👇 2. 스토어에서 status를 추가로 가져옵니다.
  const { startLogin, errorMessage, status } = useAuthStore();
  const { loginEmail, loginPassword, onInputChange: onLoginInputChange } = useForm({
    loginEmail: '',
    loginPassword: '',
  });

  // 👇 3. 훅을 실행합니다.
  const navigate = useNavigate();
  const location = useLocation();

  const loginSubmit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get('redirectTo') || '/';
    startLogin({ email: loginEmail, password: loginPassword, redirectTo });
  };

  
  useEffect(() => {
    if (errorMessage !== undefined) {
      Swal.fire('로그인 오류', errorMessage, 'error');
    }
  }, [errorMessage]);

  // 👇 4. [핵심] 로그인 상태가 변경될 때 실행되는 로직을 추가합니다.
  useEffect(() => {
    if (status === 'authenticated') {
      // URL에서 'redirectTo' 파라미터를 읽어옵니다.
      const params = new URLSearchParams(location.search);
      const redirectTo = params.get('redirectTo');

      // redirectTo가 있으면 그곳으로, 없으면 메인 페이지('/')로 이동합니다.
      navigate(redirectTo || '/', { replace: true });
    }
  }, [status, navigate, location.search]);


  return (
    // 👇 5. 기존의 JSX 구조는 그대로 유지됩니다.
    <div className="login-background">
      <div className="login-container">
        <div className="logo-container">
          <h1>Calender</h1>
        </div>
        <form className="login-form" onSubmit={loginSubmit}>
          <div className="input-group">
            <i className="fas fa-user"></i>
            <input
              type="email"
              placeholder="이메일"
              name="loginEmail"
              value={loginEmail}
              onChange={onLoginInputChange}
              required
            />
          </div>
          <div className="input-group">
            <i className="fas fa-lock"></i>
            <input
              type="password"
              placeholder="비밀번호"
              name="loginPassword"
              value={loginPassword}
              onChange={onLoginInputChange}
              required
            />
          </div>
          <div className="options-group">
            <label>
              <input type="checkbox" /> 자동 로그인
            </label>
            <a href="/forgot-password">비밀번호를 잊으셨나요?</a>
          </div>
          <button type="submit" className="login-button">
            로그인
          </button>
          <div className="separator">
            <span>또는</span>
          </div>
          <div className="social-login">
            <button type="button" className="social-button google">
               Google 계정으로 로그인
            </button>
          </div>
        </form>
        <div className="signup-link">
          <p>계정이 없으신가요? <Link to="/auth/register">회원가입</Link></p>
        </div>
      </div>
    </div>
  );
};