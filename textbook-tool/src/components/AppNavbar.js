import { useNavigate } from "react-router-dom";
import iiithLogo from "../assets/iiith_logo.png";

export default function AppNavbar() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");

  const logout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <div
      style={{
        height: "64px",
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
      }}
    >
      <div
        style={{ cursor: "pointer" }}
        onClick={() => navigate("/chapters", { replace: true })}
      >
        <img src={iiithLogo} alt="Logo" style={{ height: "36px" }} />
      </div>

      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <span>👋 {username}</span>
        <button
          onClick={logout}
          style={{
            padding: "6px 14px",
            borderRadius: "6px",
            border: "none",
            background: "#ef4444",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
