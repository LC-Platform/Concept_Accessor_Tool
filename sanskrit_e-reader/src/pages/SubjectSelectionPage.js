import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppNavbar from "../components/AppNavbar";
import "../styles/SubjectSelectionPage.css";

const BASE_URL = "http://10.2.8.12:8400";

// Subject icons mapping (you can customize these)
const getSubjectIcon = (subject) => {
  const icons = {
    'Mathematics': '∑',
    'Physics': '⚛',
    'Chemistry': '⚗',
    'Biology': '🧬',
    'Computer Science': '⌘',
    'History': '📜',
    'Literature': '📚',
    'Geography': '🌍',
    'Economics': '📊',
    'Art': '🎨',
    'default': '📖'
  };
  
  const found = Object.keys(icons).find(key => 
    subject.toLowerCase().includes(key.toLowerCase())
  );
  
  return icons[found] || icons.default;
};

export default function SubjectSelectionPage() {
  const [subjects, setSubjects] = useState([]);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true);
    fetch(`${BASE_URL}/chapters/`)
      .then(res => res.json())
      .then(data => {
        const grouped = {};
        (data.chapters || []).forEach(ch => {
          if (!grouped[ch.subject]) grouped[ch.subject] = [];
          grouped[ch.subject].push(ch);
        });
        setSubjects(Object.entries(grouped));
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const filtered = subjects.filter(([s]) =>
    s.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <AppNavbar />

      <div className="subject-explorer">
        {/* Hero Section */}
        <div className="explorer-hero">
          <div className="hero-badge">Learning Platform</div>
          <h1 className="hero-title">
            Explore Your <span className="gradient-text">Learning Journey</span>
          </h1>
          <p className="hero-subtitle">
            Dive deep into structured courses with AI-powered guidance and interactive content
          </p>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-item">
              <div className="stat-number">{subjects.length}</div>
              <div className="stat-label">Subjects</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number">
                {subjects.reduce((acc, [, chs]) => acc + chs.length, 0)}
              </div>
              <div className="stat-label">Total Chapters</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number">AI</div>
              <div className="stat-label">Powered</div>
            </div>
          </div>
        </div>

        {/* Search & Controls */}
        <div className="explorer-controls">
          <div className="search-wrapper">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM18 18l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              className="explorer-search"
              placeholder="Search subjects by name..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button className="clear-btn" onClick={() => setQuery("")}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          <div className="view-toggle">
            <button 
              className={viewMode === "grid" ? "active" : ""}
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect width="7" height="7" rx="1.5" fill="currentColor"/>
                <rect x="11" width="7" height="7" rx="1.5" fill="currentColor"/>
                <rect y="11" width="7" height="7" rx="1.5" fill="currentColor"/>
                <rect x="11" y="11" width="7" height="7" rx="1.5" fill="currentColor"/>
              </svg>
            </button>
            <button 
              className={viewMode === "list" ? "active" : ""}
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect width="18" height="3" rx="1.5" fill="currentColor"/>
                <rect y="7" width="18" height="3" rx="1.5" fill="currentColor"/>
                <rect y="14" width="18" height="3" rx="1.5" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Results Count */}
        {query && (
          <div className="results-info">
            Found <strong>{filtered.length}</strong> {filtered.length === 1 ? 'subject' : 'subjects'}
          </div>
        )}

        {/* Subject Cards */}
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading subjects...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No subjects found</h3>
            <p>Try adjusting your search terms</p>
          </div>
        ) : (
          <div className={`subject-grid ${viewMode}`}>
            {filtered.map(([subject, chapters], index) => (
              <div
                key={subject}
                className="subject-card"
                onClick={() =>
                  navigate(`/chapters?subject=${encodeURIComponent(subject)}`)
                }
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="card-header">
                  <div className="subject-icon">
                    {getSubjectIcon(subject)}
                  </div>
                  <div className="card-badges">
                    <span className="badge-ai">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 1L7.5 4.5L11 6L7.5 7.5L6 11L4.5 7.5L1 6L4.5 4.5L6 1Z" fill="currentColor"/>
                      </svg>
                      AI
                    </span>
                  </div>
                </div>

                <div className="card-content">
                  <h3 className="subject-title">{subject}</h3>
                  <div className="subject-meta">
                    <span className="chapter-count">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 3.5C2 2.67 2.67 2 3.5 2h7c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5h-7A1.5 1.5 0 0 1 2 10.5v-7z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M5 5.5h4M5 8h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      {chapters.length} chapters
                    </span>
                    <span className="interactive-tag">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M5 7l1.5 1.5L9.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Interactive
                    </span>
                  </div>
                </div>

                <div className="card-footer">
                  <span className="explore-link">
                    Explore
                    <svg className="arrow-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>

                <div className="card-glow"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}