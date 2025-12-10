// src/ui/components/Navbar.jsx
import { useAuthStore } from "../../hooks/useAuthStore";
import UserProfileMenu from "./UserProfileMenu";
import SchedyLogo from "../../assets/SchedyLogo.png";

export const Navbar = () => {
  const { user } = useAuthStore();

  return (
    <nav
      className="navbar navbar-light bg-white border-bottom shadow-sm px-4 d-flex justify-content-between align-items-center"
      style={{ height: "60px" }}
    >
      {/* 왼쪽 영역 */}
      <div className="d-flex align-items-center">
        <img
          src={SchedyLogo}
          alt="Schedy Logo"
          style={{ width: "32px", height: "32px", marginRight: "8px" }}
        />
        <span className="fw-bold" style={{ fontSize: "18px" }}>
          Schedy
        </span>
      </div>

      {/* 오른쪽 영역 – 프로필 원 + 메뉴 */}
      <div className="d-flex align-items-center">
        <UserProfileMenu user={user} />
      </div>
    </nav>
  );
};
