import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { calendarApi } from "../../api";
import Swal from "sweetalert2";
import { useDispatch, useSelector } from "react-redux";
import { onAddNewCalendar } from "../../store/calendar/calendarSlice";

export const SharedCalendarAccessPage = () => {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // 로그인된 사용자 정보
  const { user } = useSelector((state) => state.auth);

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 공유 캘린더 접근 처리
  const handleJoin = async (e) => {
    e.preventDefault();

    // 로그인 여부 확인
    if (!user?.uid) {
      Swal.fire("로그인이 필요합니다", "공유 캘린더 접근은 로그인 후 가능합니다.", "warning");
      navigate("/auth/login");
      return;
    }

    setLoading(true);

    try {
      // 백엔드로 비밀번호 및 로그인 사용자 정보 전달
      const { data } = await calendarApi.post(`/calendars/join/${shareId}`, {
        password,
      });

      if (data.ok) {
        // 내 캘린더 목록에 추가
        dispatch(onAddNewCalendar(data.calendar));

        Swal.fire(
          "캘린더 추가 완료 🎉",
          data.msg || `캘린더가 내 목록에 추가되었습니다.`, // data.calendar.name 대신 일반 메시지 사용
          "success"
        );

        navigate("/");
      } else {
        Swal.fire("오류", data.msg || "캘린더 접근 실패", "error");
      }
    } catch (error) {
      console.error("공유 캘린더 접근 오류:", error);
      Swal.fire(
        "접근 실패",
        error.response?.data?.msg || "캘린더 비밀번호가 일치하지 않거나 공유 정보를 찾을 수 없습니다.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "100px auto",
        padding: "30px",
        border: "1px solid #ddd",
        borderRadius: "10px",
        textAlign: "center",
        backgroundColor: "#fff",
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ marginBottom: "12px", color: "#333" }}>공유된 캘린더 접근</h2>
      <p style={{ color: "#666", fontSize: "15px", marginBottom: "20px" }}>
        공유받은 캘린더의 비밀번호를 입력하세요.
      </p>

      <form onSubmit={handleJoin}>
        <input
          type="password"
          placeholder="비밀번호 입력"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            marginBottom: "16px",
            fontSize: "15px",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: loading ? "#aaa" : "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: loading ? "default" : "pointer",
            fontSize: "16px",
          }}
        >
          {loading ? "확인 중..." : "캘린더 추가"}
        </button>
      </form>
    </div>
  );
};