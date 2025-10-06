import React, { useState, useEffect } from 'react';
import './ShareCalendarModal.css';

const ShareCalendarModal = ({ isOpen, onClose, shareData, onShare }) => {
  const [password, setPassword] = useState('');

  
  useEffect(() => {
    if (isOpen && shareData?.password) {
      setPassword(shareData.password);
    }
  }, [isOpen, shareData]);

  if (!isOpen) return null;

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
