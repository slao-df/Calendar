// src/ui/components/UserProfileMenu.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../hooks/useAuthStore";

export default function UserProfileMenu({ user: userProp }) {
  const { startLogout, user: storeUser } = useAuthStore();
  const user = userProp || storeUser;

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  // 이니셜 (이름 or 이메일 앞 2글자)
  const baseText = user?.name || user?.email || "";
  const initials =
    baseText.trim().length >= 2
      ? baseText.trim().slice(0, 2)
      : baseText.trim().charAt(0) || "?";

  // 메뉴 바깥 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setOpen((prev) => !prev);
  };

  const handleAccountSettings = () => {
    setOpen(false);
    navigate("/account"); // AppRouter에서 /account 라우트로 연결해둔 경로
  };

  const handleLogout = () => {
    setOpen(false);
    startLogout();
  };

  const avatarStyle = {
    width: 40,
    height: 40,
    borderRadius: "50%",
    backgroundColor: "#637bff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 600,
    fontSize: 15,
    textTransform: "lowercase",
    border: "none",
  };

  return (
    <div
      ref={wrapperRef}
      className="position-relative d-flex align-items-center"
    >
      {/* 프로필 원 버튼 */}
      <button
        type="button"
        onClick={handleProfileClick}
        className="border-0 bg-transparent p-0"
        style={{ lineHeight: 0 }}
      >
        <div style={avatarStyle}>{initials}</div>
      </button>

      {/* 드롭다운 카드 */}
      {open && (
        <div
          className="position-absolute shadow-sm bg-white rounded-3"
          style={{
            top: "52px",
            right: 0,
            width: "220px",
            zIndex: 1500,
            border: "1px solid #e5e7eb",
            borderRadius: "12px", 
            overflow: "hidden",  
          }}
        >
          <div className="px-3 pt-3 pb-2 border-bottom">
            <div className="fw-semibold" style={{ fontSize: "15px" }}>
              {user?.name || "사용자"}
            </div>
            {user?.email && (
              <div
                className="text-muted"
                style={{ fontSize: "12px", marginTop: "2px" }}
              >
                {user.email}
              </div>
            )}
          </div>

          <button
            type="button"
            className="w-100 text-start px-3 py-2 bg-white border-0"
            style={{ fontSize: "14px" }}
            onClick={handleAccountSettings}
          >
            계정 관리
          </button>

          <button
            type="button"
            className="w-100 text-start px-3 py-2 bg-white border-0"
            style={{ fontSize: "14px", color: "#e11d48" }}
            onClick={handleLogout}
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
