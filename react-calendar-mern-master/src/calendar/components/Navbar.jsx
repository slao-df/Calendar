import { useAuthStore } from "../../hooks/useAuthStore";

// Navbar.css 파일을 import 합니다. (다음 단계에서 생성)
import './Navbar.css';

export const Navbar = () => {

  const { startLogout, user } = useAuthStore();

  return (
    <div className="navbar-container">
        <div className="navbar-left">
            <i className="fas fa-calendar-alt navbar-icon"></i>
            <span className="navbar-title">캘린더</span>
        </div>

        <div className="navbar-right">
            <span className="navbar-user-name">{ user.name }</span>
            <button
                className="navbar-logout-button"
                onClick={ startLogout }
            >
                <i className="fas fa-sign-out-alt"></i>
                <span>로그아웃</span>
            </button>
        </div>
    </div>
  )
}