import { useNavigate } from "react-router-dom";
import iiithLogo from "../assets/iiith_logo.png";

export default function AppNavbar() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const username = user.username || "User";

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
      <div style={{ cursor: "pointer" }} onClick={() => navigate("/subjects", { replace: true })}>
        <img src={iiithLogo} alt="Logo" style={{ height: "36px" }} />
      </div>

      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <span style={{ color: "#374151", fontSize: "14px" }}>{username}</span>

        <button
          onClick={() => navigate("/profile")}
          title="View profile"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "1px solid #e5e7eb",
            background: "#f3f4f6",
            cursor: "pointer",
            padding: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#f3f4f6")}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#374151"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>

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