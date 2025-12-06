// src/ui/components/Navbar.jsx
import { useAuthStore } from "../../hooks/useAuthStore";
import UserProfileMenu from "./UserProfileMenu";

export const Navbar = () => {
  const { user } = useAuthStore();

  return (
    <nav
      className="navbar navbar-light bg-white border-bottom shadow-sm px-4 d-flex justify-content-between align-items-center"
      style={{ height: "60px" }}
    >
      {/* 왼쪽 영역 */}
      <div className="d-flex align-items-center">
        <i
          className="fas fa-calendar-alt me-2"
          style={{ color: "#4e73df", fontSize: "22px" }}
        ></i>
        <span className="fw-bold" style={{ fontSize: "18px" }}>
          캘린더
        </span>
      </div>

      {/* 오른쪽 영역 – 프로필 원 + 메뉴 */}
      <div className="d-flex align-items-center">
        <UserProfileMenu user={user} />
      </div>
    </nav>
  );
};
