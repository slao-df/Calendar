import React, { useState, useEffect } from 'react';
import './ShareCalendarModal.css';

const ShareCalendarModal = ({ isOpen, onClose, shareData, onShare }) => {
  const [password, setPassword] = useState('');

  
  useEffect(() => {
    if (isOpen && shareData?.password) {
      setPassword(shareData.password);
    }
  }, [isOpen, shareData]);

   // 모달 열릴 때 자동 비밀번호 입력
  useEffect(() => {
    if (shareData) {
      setPassword(shareData.password || '');
    }
  }, [shareData]);

  if (!isOpen) return null;

   // 🔹 링크+비밀번호 복사
  const handleCopyAll = () => {
    const textToCopy = `공유 캘린더 링크: ${shareData.link}\n비밀번호: ${password}`;
    navigator.clipboard.writeText(textToCopy)
      .then(() => alert('링크, 비밀번호가 복사되었습니다.'))
      .catch(err => console.error('복사 실패', err));
  };

  const handleShareClick = () => {
    onShare({ ...shareData, password });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>캘린더 공유</h3>
        <hr />
        <div className="modal-field">
          <label>공유 링크</label>
          <input type="text" value={shareData?.link || ''} readOnly />
        </div>

        <div className="modal-field">
          <label>비밀번호</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button className="btn-share" onClick={handleCopyAll}>
            링크, 비밀번호 복사
          </button>
          <button
            className="btn-share"
            onClick={() => onShare({ ...shareData, password })}
          >
            공유
          </button>
          <button className="btn-cancel" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareCalendarModal;
