import { useAuthStore } from "../../hooks/useAuthStore";

export const Navbar = () => {
  const { startLogout, user } = useAuthStore();

  return (
    <nav 
      className="navbar navbar-light bg-white border-bottom shadow-sm px-4 d-flex justify-content-between align-items-center"
      style={{ height: '60px' }}
    >
      {/* 왼쪽 영역 */}
      <div className="d-flex align-items-center">
        <i 
          className="fas fa-calendar-alt me-2"
          style={{ color: '#4e73df', fontSize: '22px' }}
        ></i>
        <span className="fw-bold" style={{ fontSize: '18px' }}>캘린더</span>
      </div>

      {/* 오른쪽 영역 */}
      <div className="d-flex align-items-center">
        <span className="me-3 text-secondary" style={{ fontSize: '15px' }}>
          {user?.name}
        </span>

        <button 
          className="btn btn-outline-secondary btn-sm d-flex align-items-center"
          onClick={startLogout}
        >
          <i className="fas fa-sign-out-alt me-1"></i>
          <span>로그아웃</span>
        </button>
      </div>
    </nav>
  );
};
