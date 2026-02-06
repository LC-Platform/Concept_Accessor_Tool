import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppNavbar from "../components/AppNavbar";
import "../styles/ChapterList.css";

const BASE_URL = "http://localhost:8000";

export default function ChapterListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const subject = searchParams.get("subject");

  const [chapters, setChapters] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/chapters/`)
      .then((res) => res.json())
      .then((data) => {
        setChapters(data.chapters || []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (subject) {
      setFiltered(chapters.filter((c) => c.subject === subject));
    }
  }, [subject, chapters]);

  return (
    <>
      <AppNavbar />

      {/* HERO HEADER */}
      <section className="chapter-hero">
        <div className="hero-content">
          <span
            className="hero-back"
            onClick={() => setSearchParams({})}
          >
            ← Back to Subjects
          </span>

          <h1>{subject}</h1>
          <p>Select a chapter to begin focused learning</p>
        </div>
      </section>

      {/* CONTENT */}
      <main className="chapter-main">
        {loading ? (
          <div className="chapter-skeleton-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="chapter-skeleton" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="chapter-empty-state">
            <h3>No chapters available</h3>
            <p>This subject doesn’t have chapters yet.</p>
          </div>
        ) : (
          <div className="chapter-grid">
            {filtered.map((ch) => (
              <div
                key={ch.chapter_id}
                className="chapter-card"
                onClick={() =>
                  navigate(`/analyze/${ch.chapter_id}`, { replace: true })
                }
              >
                <div className="chapter-card-header">
                  <span>Chapter {ch.chapter_no}</span>
                </div>

                <h3>{ch.chapter_name}</h3>

                <div className="chapter-card-footer">
                  <span>Open Chapter</span>
                  <span className="arrow">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
