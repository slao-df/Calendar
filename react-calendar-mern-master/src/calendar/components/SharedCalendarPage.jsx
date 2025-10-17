import { useParams } from "react-router-dom";
import { useState } from "react";
import axios from "axios";

export default function SharedCalendarPage() {
  const { calendarId, token } = useParams();
  const [password, setPassword] = useState("");
  const [calendar, setCalendar] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAccess = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/calendar/share/${calendarId}`,
        { password }
      );
      alert(`공유 링크: ${res.data.shareLink}`);

      if (res.data.ok) {
        setCalendar(res.data.calendar);
      } else {
        setError(res.data.msg || "캘린더를 불러오지 못했습니다.");
      }
    } catch (err) {
      setError("비밀번호가 틀리거나 링크가 잘못되었습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>로딩 중...</p>;

  return (
    <div className="p-4 max-w-lg mx-auto">
      {!calendar ? (
        <form onSubmit={handleAccess}>
          <h2 className="text-xl font-bold mb-2 text-center">공유 캘린더 접근</h2>
          <input
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded w-full"
          >
            접근하기
          </button>
          {error && <p className="text-red-500 mt-2 text-center">{error}</p>}
        </form>
      ) : (
        <div>
          <h2 className="text-2xl font-bold mb-4 text-center">{calendar.title}</h2>
          {calendar.events?.length > 0 ? (
            <ul>
              {calendar.events.map((ev) => (
                <li key={ev._id} className="border-b py-2">
                  <strong>{ev.title}</strong> — {ev.start} ~ {ev.end}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-600">등록된 일정이 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
