import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://10.2.8.12:8500";

export default function ChapterListPage() {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${BASE_URL}/chapters/`)
      .then(res => res.json())
      .then(data => {
        setChapters(data.chapters || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <p style={{ textAlign: "center", marginTop: "40px", color: "#666" }}>
        Loading chapters...
      </p>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px",
        background: "#f7f9fc",
        fontFamily: "Inter, sans-serif"
      }}
    >
      <h1
        style={{
          textAlign: "center",
          marginBottom: "30px",
          fontSize: "28px",
          fontWeight: 600,
          color: "#1f2937"
        }}
      >
        Select a Chapter
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "20px",
          maxWidth: "1100px",
          margin: "0 auto"
        }}
      >
        {chapters.map(ch => (
          <div
            key={ch.chapter_id}
            onClick={() => navigate(`/analyze/${ch.chapter_id}`)}
            style={{
              cursor: "pointer",
              background: "#ffffff",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow =
                "0 10px 24px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 6px 18px rgba(0,0,0,0.08)";
            }}
          >
            <h3
              style={{
                marginBottom: "8px",
                fontSize: "18px",
                fontWeight: 600,
                color: "#111827"
              }}
            >
              {ch.chapter_name || "Untitled Chapter"}
            </h3>

            <p style={{ margin: "4px 0", color: "#4b5563" }}>
              Chapter {ch.chapter_no ?? "-"}
            </p>

            <p style={{ margin: "4px 0", color: "#6b7280", fontSize: "14px" }}>
              {ch.subject || "—"} • Class {ch.standard || "—"}
            </p>

            <p
              style={{
                marginTop: "10px",
                fontSize: "13px",
                color: "#2563eb",
                fontWeight: 500
              }}
            >
              {ch.total_sections} sections
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
