import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useForm } from '../../hooks/useForm';
import { useAuthStore } from '../../hooks/useAuthStore';
import './LoginPage.css';

export const LoginPage = () => {
  // ❗️ 2. 스토어에서 필요한 함수와 상태를 가져옵니다.
  const { startLogin, errorMessage } = useAuthStore();

  // ❗️ 3. useForm 훅으로 폼 상태를 관리합니다.
  const { loginEmail, loginPassword, onInputChange: onLoginInputChange } = useForm({
    loginEmail: '',
    loginPassword: '',
  });

  // ❗️ 4. 폼 제출 시 실행될 함수를 만듭니다.
  const loginSubmit = (event) => {
    event.preventDefault();
    startLogin({ email: loginEmail, password: loginPassword });
  };
  
  // ❗️ 5. 에러 메시지가 있을 경우 SweetAlert2로 표시합니다.
  useEffect(() => {
    if (errorMessage !== undefined) {
      Swal.fire('로그인 오류', errorMessage, 'error');
    }
  }, [errorMessage]);


  return (
    <div className="login-background">
      <div className="login-container">
        {/* 로고를 넣을 공간 (이미지나 텍스트) */}
        <div className="logo-container">
          {/* <img src="/path/to/your/logo.png" alt="로고" /> */}
          <h1>Calender</h1>
        </div>

        <form className="login-form" onSubmit={loginSubmit}>
          <div className="input-group">
            <i className="fas fa-user"></i>
            {/* ❗️ 7. input에 name, value, onChange를 연결합니다. */}
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
              <i className="fab fa-google"></i> Google 계정으로 로그인
            </button>
            {/* 다른 소셜 로그인 버튼 추가 가능 */}
          </div>
        </form>

        <div className="signup-link">
          {/* ❗️ 8. <a> 태그를 <Link> 컴포넌트로 변경합니다. */}
          <p>계정이 없으신가요? <Link to="/auth/register">회원가입</Link></p>
        </div>
      </div>
    </div>
  );
};
