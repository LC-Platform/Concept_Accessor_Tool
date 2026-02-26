import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppNavbar from "../components/AppNavbar";
import "../styles/ChapterList.css";

const BASE_URL = "http://10.2.8.12:8400";

export default function ChapterListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subject = searchParams.get("subject");

  const [chapters, setChapters] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => {
    fetch(`${BASE_URL}/chapters/`)
      .then((res) => res.json())
      .then((data) => {
        const sorted = (data.chapters || []).sort(
          (a, b) => Number(a.chapter_no) - Number(b.chapter_no)
        );
        setChapters(sorted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = subject
      ? chapters.filter((c) => c.subject === subject)
      : chapters;
    if (searchQuery) {
      result = result.filter((c) =>
        c.chapter_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFiltered(result);
  }, [subject, chapters, searchQuery]);

  const getChapterIcon = (chapterNo) => {
    const icons = ["📘", "📗", "📙", "📕", "📔", "📓", "📒", "📖"];
    return icons[(chapterNo - 1) % icons.length] || "📖";
  };

  const normalizeChapterName = (name) => {
    if (!name) return "";
    return name
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <>
      <AppNavbar />

      {/* STICKY COMPACT HEADER */}
      <section className="chapter-hero">
        <div className="hero-container">

          {/* Breadcrumb */}
          <nav className="breadcrumb">
            <button onClick={() => navigate("/subjects")} className="breadcrumb-link">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M2 6L8 2l6 4v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              All Subjects
            </button>
            <svg className="breadcrumb-separator" width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="breadcrumb-current">{subject || "Chapters"}</span>
          </nav>

          {/* Title */}
          <div className="hero-title-section">
            <div className="title-wrapper">
              <h1 className="hero-title">{subject || "All Chapters"}</h1>
              <div className="title-badge">
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1L8.5 4.5L12 6L8.5 7.5L7 12L5.5 7.5L2 6L5.5 4.5L7 1Z" fill="currentColor"/>
                </svg>
                {filtered.length} {filtered.length === 1 ? "Chapter" : "Chapters"}
              </div>
            </div>
            <p className="hero-subtitle">Explore comprehensive learning materials and interactive content</p>
          </div>

          {/* Controls */}
          <div className="hero-controls">
            <div className="search-box">
              <svg className="search-icon" width="15" height="15" viewBox="0 0 18 18" fill="none">
                <path d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zM16 16l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search chapters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button className="clear-search" onClick={() => setSearchQuery("")}>
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                    <path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>

            <div className="view-switcher">
              <button
                className={viewMode === "grid" ? "active" : ""}
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect width="6" height="6" rx="1" fill="currentColor"/>
                  <rect x="10" width="6" height="6" rx="1" fill="currentColor"/>
                  <rect y="10" width="6" height="6" rx="1" fill="currentColor"/>
                  <rect x="10" y="10" width="6" height="6" rx="1" fill="currentColor"/>
                </svg>
              </button>
              <button
                className={viewMode === "compact" ? "active" : ""}
                onClick={() => setViewMode("compact")}
                aria-label="Compact view"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect width="16" height="2.5" rx="1" fill="currentColor"/>
                  <rect y="6.5" width="16" height="2.5" rx="1" fill="currentColor"/>
                  <rect y="13" width="16" height="2.5" rx="1" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <main className="chapter-main">
        {loading ? (
          <div className={`chapter-skeleton-grid ${viewMode}`}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="chapter-skeleton">
                <div className="skeleton-header"></div>
                <div className="skeleton-title"></div>
                <div className="skeleton-title short"></div>
                <div className="skeleton-footer"></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="chapter-empty-state">
            <div className="empty-icon">{searchQuery ? "🔍" : "📚"}</div>
            <h3>{searchQuery ? "No chapters found" : "No chapters available"}</h3>
            <p>
              {searchQuery
                ? "Try adjusting your search terms"
                : "This subject doesn't have chapters yet."}
            </p>
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className={`chapter-grid ${viewMode}`}>
            {filtered.map((ch, index) => (
              <div
                key={ch.chapter_id}
                className="chapter-card"
                onClick={() => navigate(`/analyze/${ch.chapter_id}`)}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="card-decoration"></div>

                <div className="chapter-icon-wrapper">
                  <div className="chapter-icon">{getChapterIcon(ch.chapter_no)}</div>
                  <span className="chapter-number">Ch. {ch.chapter_no}</span>
                </div>

                <div className="chapter-content">
                  <h3 className="chapter-title">{normalizeChapterName(ch.chapter_name)}</h3>
                </div>

                <div className="chapter-footer">
                  <span className="start-learning">
                    Start Learning
                    <svg className="footer-arrow" width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>

                <div className="card-glow"></div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}