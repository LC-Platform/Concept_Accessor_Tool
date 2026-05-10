// components/Toast.js
import React, { useEffect } from "react";

export default function Toast({ message, type = "error", onClose }) {
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "30px",
      right: "30px",
      zIndex: 9999,
      minWidth: "280px",
      maxWidth: "400px",
      padding: "12px 16px",
      borderRadius: "8px",
      background: type === "error" ? "#ff4d4f" : "#4caf50",
      color: "#fff",
      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      fontSize: "14px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      animation: "slideIn 0.3s ease"
    }}>
      <span>{message}</span>

      <button
        onClick={onClose}
        style={{
          marginLeft: "10px",
          background: "transparent",
          border: "none",
          color: "#fff",
          fontSize: "16px",
          cursor: "pointer"
        }}
      >
        ✕
      </button>

      {/* Animation */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}