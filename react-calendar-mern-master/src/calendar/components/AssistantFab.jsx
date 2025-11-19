import { useState } from "react";
import AssistantChatModal from "./AssistantChatModal";
import "./assistant.css";

export default function AssistantFab({ onClick }) {
  return (
    <button
      aria-label="AI 채팅 열기"
      onClick={onClick}
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: "50%",
        border: "none",
        background: "#5b8ef3",
        color: "#fff",
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        cursor: "pointer",
        zIndex: 1300,          /* ✅ 모달(1001)보다 위 */
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      🤖
    </button>
  );
}
