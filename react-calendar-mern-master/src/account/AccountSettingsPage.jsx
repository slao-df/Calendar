// src/account/AccountSettingsPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../hooks/useAuthStore";

const AccountSettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore(); // { uid, name, email }가 들어 있다고 가정

  // 프로필 상태
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [isProfileEditing, setIsProfileEditing] = useState(false);

  // 비밀번호 변경 카드 표시 여부
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // 비밀번호 변경 입력값
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 단순 메시지/상태
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // 로그인한 사용자 정보 반영
  useEffect(() => {
    if (!user) return;
    setProfileName(user.name || "");
    setProfileEmail(user.email || ""); // 로그인 계정 이메일 반영
  }, [user]);

  const handleBack = () => {
    navigate(-1);
  };

  // 프로필 변경 시작
  const handleStartEditProfile = () => {
    setIsProfileEditing(true);
    setMessage(null);
  };

  // 비밀번호 변경 카드 열기
  const handleShowPasswordForm = () => {
    setShowPasswordForm(true);
    setMessage(null);
  };

  // 전체 저장
  const handleSaveAll = async () => {
    if (!isProfileEditing && !showPasswordForm) return;

    setSaving(true);
    setMessage(null);

    try {
      // TODO: 실제 API 호출을 이 위치에 추가
      // 예:
      // await calendarApi.put("/auth/profile", {
      //   name: profileName,
      //   email: profileEmail,
      //   currentPassword,
      //   newPassword,
      // });

      console.log("[AccountSettings] save", {
        profileName,
        profileEmail,
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setIsProfileEditing(false);
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("변경 사항이 저장되었습니다.");
    } catch (e) {
      console.error(e);
      setMessage("변경 사항 저장 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = isProfileEditing || showPasswordForm;

  return (
    <div
      className="container py-4"
      style={{ maxWidth: "960px", margin: "0 auto" }}
    >
      {/* 상단 헤더 + 뒤로가기 */}
      <div className="d-flex align-items-center mb-4">
        <button
          type="button"
          onClick={handleBack}
          className="btn btn-link p-0 me-2"
          style={{ textDecoration: "none", color: "#4b5563" }}
        >
          ← 뒤로
        </button>
        <h3 className="m-0 fw-bold">계정 관리</h3>
      </div>

      {/* 내 계정 정보 카드 */}
      <div className="card mb-4 shadow-sm border-0">
        <div className="card-body">
          <h5 className="card-title fw-bold mb-3">내 계정 정보</h5>
          <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
            캘린더에서 사용하는 계정 정보입니다.
            <br />
            이름과 이메일은 로그인/공유 기능에 사용됩니다.
          </p>
        </div>
      </div>

      {/* 프로필 정보 카드 */}
      <div className="card mb-4 shadow-sm border-0">
        <div className="card-body">
          <h5 className="card-title fw-bold mb-3">프로필 정보</h5>

          {/* 이름 */}
          <div className="mb-3">
            <label className="form-label">이름</label>
            <input
              type="text"
              className="form-control"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              disabled={!isProfileEditing}
            />
          </div>

          {/* 이메일 */}
          <div className="mb-2">
            <label className="form-label">이메일</label>
            <input
              type="email"
              className="form-control"
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              disabled={!isProfileEditing}
            />
          </div>

          <p className="text-muted mb-3" style={{ fontSize: "13px" }}>
            로그인에 사용되는 이메일입니다. 필요하다면 이 화면에서 수정할 수 있습니다.
          </p>

          {/* 카드 안 왼쪽 아래: 비밀번호 변경 버튼 (편집 중 + 아직 카드 안 열렸을 때만) */}
          {isProfileEditing && !showPasswordForm && (
            <div className="mt-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={handleShowPasswordForm}
              >
                비밀번호 변경
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 비밀번호 변경 카드 */}
      {showPasswordForm && (
        <div className="card mb-4 shadow-sm border-0">
          <div className="card-body">
            <h5 className="card-title fw-bold mb-3">비밀번호 변경</h5>

            <div className="mb-3">
              <label className="form-label">현재 비밀번호</label>
              <input
                type="password"
                className="form-control"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">새 비밀번호</label>
              <input
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호"
              />
            </div>

            <div className="mb-2">
              <label className="form-label">새 비밀번호 확인</label>
              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호 다시 입력"
              />
            </div>

            <p className="text-muted mb-0" style={{ fontSize: "13px" }}>
              8자 이상, 문자/숫자/특수문자를 조합해서 사용하시는 것을 추천드립니다.
            </p>
          </div>
        </div>
      )}

      {/* 메시지 */}
      {message && (
        <div className="alert alert-info py-2 px-3" role="alert">
          {message}
        </div>
      )}

      {/* 페이지 맨 아래 오른쪽 버튼 영역 */}
      <div className="d-flex justify-content-end mt-3 mb-2">
        {/* 편집 전: 프로필 변경 버튼만 노출 */}
        {!canSave && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ backgroundColor: "#637bff", borderColor: "#637bff" }}
            onClick={handleStartEditProfile}
          >
            프로필 변경
          </button>
        )}

        {/* 편집 중/비밀번호 카드 열려 있을 때: 변경 사항 저장 버튼만 노출 */}
        {canSave && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ backgroundColor: "#637bff", borderColor: "#637bff" }}
            onClick={handleSaveAll}
            disabled={saving}
          >
            {saving ? "저장 중..." : "변경 사항 저장"}
          </button>
        )}
      </div>
    </div>
  );
};

export default AccountSettingsPage;
