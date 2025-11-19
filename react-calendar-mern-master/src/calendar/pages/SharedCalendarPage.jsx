import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import calendarApi from '../../api/calendarApi';

export const SharedCalendarPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await calendarApi.post(`/calendars/shared/${token}/verify`, { password });
      if (data.ok) {
        alert('공유 캘린더가 내 목록에 추가되었습니다.');
        navigate('/calendar'); // 캘린더 페이지로 이동 → 목록/이벤트 재로딩
      }
    } catch (error) {
      setErr('비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: 420 }}>
      <h3>공유 캘린더 접근</h3>
      <form onSubmit={onSubmit}>
        <label className="form-label mt-3">비밀번호</label>
        <input
          className="form-control"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="공유 비밀번호 입력"
          required
        />
        {err && <div className="text-danger mt-2">{err}</div>}
        <button className="btn btn-primary mt-3" type="submit">추가하기</button>
      </form>
    </div>
  );
};
