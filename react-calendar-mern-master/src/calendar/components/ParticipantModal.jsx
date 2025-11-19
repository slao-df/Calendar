import React, { useState, useEffect, useCallback } from 'react'; 
import { calendarApi } from '../../api'; 
import { useAuthStore } from '../../hooks'; 
import './ParticipantModal.css'; 

export const ParticipantModal = ({ calendar, onClose }) => {
  const { user } = useAuthStore(); 
  
  const [owner, setOwner] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [editors, setEditors] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 편집 모드 상태
  const [isEditMode, setIsEditMode] = useState(false);
  // 편집 모드에서의 권한 상태 (체크박스 상태 관리)
  const [editablePermissions, setEditablePermissions] = useState({});

  // API 호출 함수 (fetchParticipants)
  const fetchParticipants = useCallback(async () => {
    if (!calendar) return;
    setIsLoading(true);
    setError(null);
    try {
      const calendarId = calendar._id || calendar.id;
      const { data } = await calendarApi.get(`/calendars/${calendarId}/participants`);
      if (data.ok) {
        setOwner(data.owner); 
        setParticipants(data.participants);
        const currentEditors = data.editors || [];
        setEditors(currentEditors); 
        
        const initialPermissions = {};
        data.participants.forEach(p => {
          initialPermissions[p._id] = currentEditors.includes(p._id);
        });
        setEditablePermissions(initialPermissions);
        setIsEditMode(false);
      } else {
        setError(data.msg || '정보 로딩 실패');
      }
    } catch (err) {
      setError('서버 통신 오류');
      console.error(err);
    }
    setIsLoading(false);
  }, [calendar]);
  
  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const iAmOwner = owner?._id === user.uid;

  const handleEnterEditMode = () => {
    const initialPermissions = {};
    participants.forEach(p => {
      initialPermissions[p._id] = editors.includes(p._id);
    });
    setEditablePermissions(initialPermissions);
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  const handlePermissionCheckboxChange = (participantId) => {
    setEditablePermissions(prev => ({
      ...prev,
      [participantId]: !prev[participantId]
    }));
  };

  const handleSaveChanges = async () => {
    const originalCalendarId = calendar.originalCalendarId || calendar._id || calendar.id;
    
    const changes = {};
    participants.forEach(p => {
      const initialPermission = editors.includes(p._id);
      const currentPermission = editablePermissions[p._id];
      if (initialPermission !== currentPermission) {
        changes[p._id] = currentPermission;
      }
    });

    if (Object.keys(changes).length === 0) {
      setIsEditMode(false);
      return;
    }

    try {
      await calendarApi.put(`/calendars/${originalCalendarId}/permissions/bulk`, { changes });
      await fetchParticipants(); 
      alert('권한이 성공적으로 저장되었습니다.');
    } catch (error) {
      console.error('권한 저장 실패:', error);
      alert(error.response?.data?.msg || '권한 저장에 실패했습니다.');
    }
  };

  // 오버레이 클릭 시 닫기
  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('participant-modal-overlay')) {
      onClose();
    }
  };

  return (
    <div className="participant-modal-overlay" onClick={handleOverlayClick}>
      <div className="participant-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="participant-modal-title">
          참여자 목록: {calendar.name}
        </h3>

        {/* === 참여자 목록 === */}
        <div className="participant-list">
          {isLoading && <p>참여자 정보를 불러오는 중...</p>}
          {error && <p className="participant-error">{error}</p>}

          {!isLoading && !error && (
            <>
              {/* 소유자 표시 */}
              {owner && (
                <div className="participant-item owner">
                  <span>👑 {owner.name}</span>
                  <span className="role-tag">소유자</span>
                </div>
              )}
              
              {/* 참여자 목록 */}
              {participants.length > 0 ? (
                participants.map((participant) => {
                  const isEditor = editors.includes(participant._id);
                  const isCheckedInEditMode = editablePermissions[participant._id] || false; 

                  return (
                    <div key={participant._id} className="participant-item">
                      {isEditMode && iAmOwner && (
                        <input 
                          type="checkbox"
                          checked={isCheckedInEditMode}
                          onChange={() => handlePermissionCheckboxChange(participant._id)}
                          className="participant-checkbox"
                        />
                      )}
                      {(!isEditMode || !iAmOwner) && <div className="checkbox-placeholder"></div>}

                      <span>👤 {participant.name}</span>
                      <span className="role-tag">{isEditor ? '편집자' : '참여자'}</span>
                    </div>
                  );
                })
              ) : (
                <p className="no-participants">아직 참여자가 없습니다.</p>
              )}
            </>
          )}
        </div>

        {/* === 버튼 영역 === */}
        <div className="modal-footer-buttons">
          {!isEditMode ? (
            <>
              {iAmOwner && participants.length > 0 && (
                <button 
                  className="participant-edit-btn" 
                  onClick={handleEnterEditMode}
                >
                  편집 권한 설정
                </button>
              )}
              <button className="participant-close-btn" onClick={onClose}>
                닫기
              </button>
            </>
          ) : (
            <>
              <button className="participant-cancel-btn" onClick={handleCancelEdit}>
                취소
              </button>
              <button className="participant-save-btn" onClick={handleSaveChanges}>
                저장
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
