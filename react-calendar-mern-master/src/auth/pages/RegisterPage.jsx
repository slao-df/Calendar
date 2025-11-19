// src/pages/RegisterPage.jsx (또는 auth/pages/RegisterPage.jsx)
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useForm } from '../../hooks/useForm';
import { useAuthStore } from '../../hooks/useAuthStore';
import './RegisterPage.css';

export const RegisterPage = () => {
  const { startRegister, errorMessage } = useAuthStore();

  const { registerName, registerEmail, registerPassword, registerPassword2, onInputChange: onRegisterInputChange } = useForm({
    registerName: '',
    registerEmail: '',
    registerPassword: '',
    registerPassword2: '',
  });

  const registerSubmit = (event) => {
    event.preventDefault();
    if (registerPassword !== registerPassword2) {
      Swal.fire('회원가입 오류', '비밀번호가 일치하지 않습니다.', 'error');
      return;
    }
    startRegister({ name: registerName, email: registerEmail, password: registerPassword });
  };

  useEffect(() => {
    if (errorMessage !== undefined) {
      Swal.fire('회원가입 오류', errorMessage, 'error');
    }
  }, [errorMessage]);

  return (
    <div className="register-background">
      <div className="register-container">
        <div className="logo-container">
          <h1>회원가입</h1>
          <p>Calender 계정을 만들어 시작해보세요.</p>
        </div>

        <form className="register-form" onSubmit={registerSubmit}>
          <div className="input-group">
            <i className="fas fa-user"></i>
            <input type="text" placeholder="이름" name="registerName" value={registerName} onChange={onRegisterInputChange} required />
          </div>
          <div className="input-group">
            <i className="fas fa-envelope"></i>
            <input type="email" placeholder="이메일" name="registerEmail" value={registerEmail} onChange={onRegisterInputChange} required />
          </div>
          <div className="input-group">
            <i className="fas fa-lock"></i>
            <input type="password" placeholder="비밀번호" name="registerPassword" value={registerPassword} onChange={onRegisterInputChange} required />
          </div>
          <div className="input-group">
            <i className="fas fa-check-circle"></i>
            <input type="password" placeholder="비밀번호 확인" name="registerPassword2" value={registerPassword2} onChange={onRegisterInputChange} required />
          </div>
          <button type="submit" className="register-button">
            계정 만들기
          </button>
        </form>

        <div className="login-link">
          <p>이미 계정이 있으신가요? <Link to="/auth/login">로그인</Link></p>
        </div>
      </div>
    </div>
  );
};