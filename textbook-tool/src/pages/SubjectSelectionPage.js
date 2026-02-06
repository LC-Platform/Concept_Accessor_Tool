import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppNavbar from "../components/AppNavbar";
import "../styles/SubjectSelectionPage.css";

const BASE_URL = "http://localhost:8000";

export default function SubjectSelectionPage() {
  const [subjects, setSubjects] = useState([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${BASE_URL}/chapters/`)
      .then(res => res.json())
      .then(data => {
        const grouped = {};
        (data.chapters || []).forEach(ch => {
          if (!grouped[ch.subject]) grouped[ch.subject] = [];
          grouped[ch.subject].push(ch);
        });
        setSubjects(Object.entries(grouped));
      });
  }, []);

  const filtered = subjects.filter(([s]) =>
    s.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <AppNavbar />

      <div className="subject-explorer">
        <div className="explorer-header">
          <h1>Subject Explorer</h1>
          <p>Select a subject to dive into structured learning</p>

          <input
            className="explorer-search"
            placeholder="Search subjects…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="subject-list">
          {filtered.map(([subject, chapters]) => (
            <div
              key={subject}
              className="subject-row"
              onClick={() =>
                navigate(`/chapters?subject=${encodeURIComponent(subject)}`)
              }
            >
              <div className="subject-main">
                <h3>{subject}</h3>
                <span>{chapters.length} chapters</span>
              </div>

              <div className="subject-meta">
                <span className="pill">AI-assisted</span>
                <span className="pill outline">Interactive PDF</span>
                <span className="arrow">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
