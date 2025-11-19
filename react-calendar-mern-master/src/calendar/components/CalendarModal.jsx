import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import ko from 'date-fns/locale/ko';
import 'react-datepicker/dist/react-datepicker.css';
import './CalendarModal.css';
import Swal from 'sweetalert2';
import { useCalendarStore } from '../../hooks/useCalendarStore';

const koMondayStart = {
  ...ko,
  options: {
    ...ko.options,
    weekStartsOn: 1, // 0=Sunday, 1=Monday
  },
};

registerLocale('ko', koMondayStart);

export const CalendarModal = ({ onClose, canModify, calendars = [], userId }) => {
  const {
    startLoadingCalendars,
    startSavingEvent,
    activeEvent,
    setActiveEvent,
    startDeletingEvent,
  } = useCalendarStore();

  const [formValues, setFormValues] = useState({
    title: '',
    notes: '',
    start: new Date(),
    end: new Date(new Date().getTime() + 60 * 60 * 1000),
    calendarId: '',
  });

  const [isTitleValid, setIsTitleValid] = useState(true);

  const toId = (v) => (typeof v === 'object' && v ? v._id || v.id : v);
  const sameId = (a, b) => (a && b ? String(a) === String(b) : false);

  const roundTo10Minutes = (date = new Date()) => {
    const ms = 1000 * 60 * 10;
    return new Date(Math.ceil(date.getTime() / ms) * ms);
  };

  // 소유자 또는 편집자 캘린더만 새 일정용 후보
  const writableCalendars = useMemo(() => {
    const me = String(userId || '');
    return calendars.filter((c) => {
      const ownerId = String(toId(c.user));
      const editorIds = Array.isArray(c.editors) ? c.editors.map((e) => String(toId(e))) : [];
      return ownerId === me || editorIds.includes(me);
    });
  }, [calendars, userId]);

  // 초기화 (activeEvent 여부에 따라 생성/수정 구분)
  useEffect(() => {
    if (activeEvent) {
      const eventCalId =
        toId(activeEvent.calendar?._id) ||
        toId(activeEvent.calendar?.id) ||
        toId(activeEvent.calendar) ||
        activeEvent.calendar;

      const mapped =
        calendars.find(
          (c) =>
            sameId(toId(c._id || c.id), eventCalId) ||
            sameId(c.originalCalendarId, eventCalId)
        ) || null;

      const finalCalendarId = toId(mapped?._id || mapped?.id) || eventCalId;

      setFormValues({
        title: activeEvent.title || '',
        notes: activeEvent.notes || '',
        start: new Date(activeEvent.start),
        end: new Date(activeEvent.end),
        calendarId: finalCalendarId,
      });
    } else {
      const now = new Date();
      const defaultStart = roundTo10Minutes(now);
      const defaultEnd = roundTo10Minutes(new Date(now.getTime() + 60 * 60 * 1000));

      const defaultCalendarId =
        writableCalendars.length > 0
          ? toId(writableCalendars[0]._id || writableCalendars[0].id)
          : '';

      setFormValues({
        title: '',
        notes: '',
        start: defaultStart,
        end: defaultEnd,
        calendarId: defaultCalendarId,
      });
    }
    setIsTitleValid(true);
  }, [activeEvent, calendars, writableCalendars]);

  // 캘린더 없으면 자동 로딩
  useEffect(() => {
    if (!calendars || calendars.length === 0) startLoadingCalendars();
  }, [startLoadingCalendars, calendars]);

  const safeClose = useCallback(() => {
    if (typeof onClose === 'function') onClose();
    setActiveEvent(null);
  }, [onClose, setActiveEvent]);

  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && safeClose();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [safeClose]);

  const onInputChange = ({ target }) => {
    setFormValues((prev) => ({
      ...prev,
      [target.name]: target.value,
    }));
    if (target.name === 'title') {
      setIsTitleValid(target.value.trim().length > 0);
    }
  };

  const onDateChange = (value, changing) => {
    setFormValues((prev) => ({
      ...prev,
      [changing]: value,
    }));
  };

  // viewer 방지 + 기본적으로 새 일정은 작성 가능하도록 변경
  const effectiveCanModify = useMemo(() => {
    // activeEvent가 없으면 (새 일정 모달) → 항상 true
    if (!activeEvent) return true;
    // 기존 일정이면 props에서 받은 권한값 사용
    return !!canModify;
  }, [activeEvent, canModify]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!effectiveCanModify) return; // viewer 안전망

    const diff = formValues.end.getTime() - formValues.start.getTime();
    if (isNaN(diff) || diff < 0) {
      Swal.fire('오류', '종료 날짜는 시작 날짜보다 이후여야 합니다.', 'error');
      return;
    }
    if (formValues.title.trim().length === 0) {
      setIsTitleValid(false);
      Swal.fire('오류', '제목을 입력해주세요.', 'error');
      return;
    }
    if (!formValues.calendarId) {
      Swal.fire('오류', '캘린더를 선택해주세요.', 'error');
      return;
    }

    startSavingEvent({
      ...activeEvent,
      title: formValues.title,
      notes: formValues.notes,
      start: formValues.start,
      end: formValues.end,
      calendarId: formValues.calendarId,
    });

    safeClose();
  };

  const handleDelete = () => {
    if (!effectiveCanModify) return;
    Swal.fire({
      title: '삭제 확인',
      text: '이 일정을 삭제하시겠습니까?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
    }).then((result) => {
      if (result.isConfirmed) {
        startDeletingEvent();
        safeClose();
      }
    });
  };

  const titleClass = useMemo(() => (!isTitleValid ? 'is-invalid' : ''), [isTitleValid]);

  return (
    <div className="modal-overlay" onClick={safeClose}>
      <div className="modal-container wide" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{activeEvent ? '일정 수정' : '새 일정'}</h2>
        <hr className="modal-divider" />

        <form onSubmit={handleSubmit} className="modal-form">
          {/* 제목 */}
          <label className="modal-label">제목</label>
          <input
            type="text"
            name="title"
            className={`modal-input ${titleClass}`}
            placeholder="일정 제목을 입력하세요"
            value={formValues.title}
            onChange={onInputChange}
            disabled={!effectiveCanModify}
          />
          {!isTitleValid && <small className="text-danger">제목은 필수 입력 항목입니다.</small>}

          {/* 캘린더 */}
          <label className="modal-label">캘린더</label>
          <select
            className="modal-input"
            name="calendarId"
            value={formValues.calendarId}
            onChange={onInputChange}
            disabled={!effectiveCanModify && !activeEvent}
          >
            {calendars.length === 0 ? (
              <option value="">캘린더 없음</option>
            ) : (
              calendars.map((cal) => {
                const isShared = cal.name?.includes('[공유]');
                const isOwner = String(toId(cal.user)) === String(userId);
                const isEditor = Array.isArray(cal.editors)
                  ? cal.editors.some((e) => String(toId(e)) === String(userId))
                  : false;

                // viewer는 공유캘린더 선택 불가
                const disabled = isShared && !isOwner && !isEditor;
                return (
                  <option
                    key={toId(cal.id || cal._id)}
                    value={toId(cal.id || cal._id)}
                    disabled={disabled}
                  >
                    {cal.name}
                  </option>
                );
              })
            )}
          </select>

          {/* 날짜 */}
          <div className="datetime-row">
            <div className="datetime-group">
              <label className="modal-label">시작</label>
              <DatePicker
                locale="ko"
                selected={formValues.start}
                onChange={(date) => onDateChange(date, 'start')}
                showTimeSelect
                timeIntervals={10}
                dateFormat="yyyy. MM. dd. aa hh:mm"
                dateFormatCalendar="yyyy년 MMMM"
                className="modal-input"
                timeCaption="시간"
                disabled={!effectiveCanModify}
              />
            </div>
            <div className="datetime-group">
              <label className="modal-label">종료</label>
              <DatePicker
                locale="ko"
                selected={formValues.end}
                onChange={(date) => onDateChange(date, 'end')}
                showTimeSelect
                timeIntervals={10}
                dateFormat="yyyy. MM. dd. aa hh:mm"
                dateFormatCalendar="yyyy년 MMMM"
                className="modal-input"
                timeCaption="시간"
                minDate={formValues.start}
                disabled={!effectiveCanModify}
              />
            </div>
          </div>

          {/* 메모 */}
          <label className="modal-label">메모</label>
          <textarea
            className="modal-textarea"
            name="notes"
            placeholder="메모를 입력하세요"
            value={formValues.notes}
            onChange={onInputChange}
            disabled={!effectiveCanModify}
          ></textarea>

          {/* 읽기 전용 안내 */}
          {!effectiveCanModify && activeEvent && (
            <p className="text-muted" style={{ marginTop: '10px' }}>
              🔒 이 일정은 읽기 전용입니다.
            </p>
          )}

          {/* 버튼 */}
          <div className="modal-actions">
            {activeEvent && effectiveCanModify && (
              <button
                type="button"
                className="modal-btn danger"
                onClick={handleDelete}
                style={{ marginRight: 'auto' }}
              >
                삭제
              </button>
            )}
            <button type="button" className="modal-btn ghost" onClick={safeClose}>
              취소
            </button>
            {effectiveCanModify && (
              <button type="submit" className="modal-btn primary">
                저장
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
