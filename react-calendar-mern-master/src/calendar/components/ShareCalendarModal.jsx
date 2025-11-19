import { useState, useEffect } from "react";
import calendarApi from "../../api/calendarApi";
import "./ShareCalendarModal.css";

export const ShareCalendarModal = ({ calendarId, onClose }) => {
  const [shareLink, setShareLink] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 공유 정보 자동 생성 및 불러오기
  const fetchOrCreateShareInfo = async () => {
    try {
      // POST 요청: 비밀번호 없이도 링크 생성
      const { data } = await calendarApi.post(`/calendars/${calendarId}/share`, {});

      if (data.ok) {
        setShareLink(data.shareUrl || "");
        setPassword(data.sharePassword || "");
      } else {
        alert("공유 링크를 생성하지 못했습니다.");
      }
    } catch (error) {
      console.error("❌ 공유 정보 생성/조회 오류:", error);
      alert("공유 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 모달 열릴 때 실행
  useEffect(() => {
    if (calendarId) {
      fetchOrCreateShareInfo();
    }
  }, [calendarId]);

  // 비밀번호 저장
  const handleSave = async () => {
    if (!password || password.trim().length < 4) {
      alert("비밀번호를 4자 이상 입력해주세요.");
      return;
    }

    try {
      setSaving(true);
      const { data } = await calendarApi.post(`/calendars/${calendarId}/share`, { password });

      if (data.ok) {
        setPassword(data.sharePassword);
        setShareLink(data.shareUrl);
        alert("✅ 비밀번호가 저장되었습니다.");
      } else {
        alert("비밀번호 저장 실패: " + (data.msg || ""));
      }
    } catch (error) {
      console.error("❌ 비밀번호 저장 오류:", error);
      alert("비밀번호 저장 실패: " + (error.response?.data?.msg || error.message));
    } finally {
      setSaving(false);
    }
  };

  // 복사 기능
  const handleCopy = () => {
    if (!shareLink) {
      alert("공유 링크가 없습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    navigator.clipboard.writeText(`링크: ${shareLink}\n비밀번호: ${password}`);
    alert("공유 링크와 비밀번호가 복사되었습니다.");
  };

  // 오버레이 클릭 시 닫기 (배경 클릭 감지)
  const handleOverlayClick = (e) => {
    if (e.target.classList.contains("share-modal-overlay")) {
      onClose();
    }
  };

  if (loading) {
    return (
      <div className="share-modal-overlay" onClick={handleOverlayClick}>
        <div className="share-modal" onClick={(e) => e.stopPropagation()}>
          <h3 className="share-modal-title">📅 캘린더 공유</h3>
          <p style={{ textAlign: "center" }}>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="share-modal-overlay" onClick={handleOverlayClick}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="share-modal-title">캘린더 공유</h3>

        <div className="share-result">
          <label>공유 링크</label>
          <input
            type="text"
            value={shareLink}
            readOnly
            className="share-input"
            placeholder="공유 링크가 자동으로 생성됩니다."
          />

          <label>비밀번호</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="share-input"
            placeholder="비밀번호 입력"
          />
        </div>

        <div className="share-btn-container">
          <button className="share-copy-btn" onClick={handleCopy}>
            복사
          </button>
          <button
            className="share-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "저장 중..." : "저장"}
          </button>
          <button className="share-close-btn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
