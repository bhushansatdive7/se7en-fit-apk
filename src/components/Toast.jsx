import React, { useEffect } from "react";

export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        top: 18,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: type === "error" ? "#7f1d1d" : "#14532d",
        color: "#fff",
        padding: "10px 14px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 700,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}
    >
      {message}
    </div>
  );
}