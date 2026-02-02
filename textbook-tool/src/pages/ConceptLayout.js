import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PdfViewer from "./PdfViewer";
import ReadingPanel from "./ReadingPanel";
import AnalysisPanel from "./AnalysisPanel";
import { useParams } from "react-router-dom";
import "../styles/ModernLayout.css";

const BASE_URL = "http://10.2.8.12:8100";

/* ===== Helpers ===== */
function normalizeStringForMatch(s = "") {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

/** Clamp a number between min and max */
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

/** Snap to nearest preset from a list of percentages */
const snapToNearest = (valuePct, presets = [30, 50, 70]) => {
  let closest = presets[0];
  let minDiff = Math.abs(valuePct - presets[0]);
  for (let i = 1; i < presets.length; i++) {
    const diff = Math.abs(valuePct - presets[i]);
    if (diff < minDiff) {
      closest = presets[i];
      minDiff = diff;
    }
  }
  return closest;
};

export default function ConceptLayout() {
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [selectedSentence, setSelectedSentence] = useState(null);
  const [summary, setSummary] = useState("");
  const [selectedView, setSelectedView] = useState("Word");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [chapterTitle, setChapterTitle] = useState("");
  const [sectionIds, setSectionIds] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedWordText, setSelectedWordText] = useState("");
  const [qaPairs, setQaPairs] = useState([]);
  const navigate = useNavigate();
  const { chapterId } = useParams();


  /* ========== RESIZE STATE ========== */
  const [leftWidth, setLeftWidth] = useState("50%");
  const [rightWidth, setRightWidth] = useState("50%");
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Start drag (mouse + touch)
  const startDragging = (e) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.classList.add("dragging"); // prevents text selection + shows grabbing cursor
  };

  useEffect(() => {
    const handlePointerMove = (clientX) => {
      if (!isDragging || !containerRef.current) return;
      const totalWidth = containerRef.current.offsetWidth;
      const newLeft = (clientX / totalWidth) * 100;
      // Keep in 20–80% bounds while dragging
      const bounded = clamp(newLeft, 20, 80);
      setLeftWidth(bounded.toFixed(3) + "%");
      setRightWidth((100 - bounded).toFixed(3) + "%");
    };

    const onMouseMove = (e) => handlePointerMove(e.clientX);
    const onTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      handlePointerMove(e.touches[0].clientX);
    };

    const stopDragging = () => {
      if (!isDragging) return;
      // Snap to presets when released
      const currentLeft = parseFloat(leftWidth);
      const snapped = clamp(snapToNearest(currentLeft, [30, 50, 70]), 20, 80);
      setLeftWidth(snapped + "%");
      setRightWidth(100 - snapped + "%");
      setIsDragging(false);
      document.body.classList.remove("dragging");
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseup", stopDragging, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", stopDragging, { passive: true });
    window.addEventListener("touchcancel", stopDragging, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", stopDragging);
      window.removeEventListener("touchcancel", stopDragging);
    };
  }, [isDragging, leftWidth]);

 

  useEffect(() => {
    window.onPdfTermClick = (term) => {
      setSelectedTerm(term);
      setSelectedWordText(term?.name || term?.rawName || "");
      setSelectedView("Word");
    };
    window.onSectionIdClick = (sectionId) => {
      setSelectedSectionId(sectionId);
      setSelectedView("Summary");
    };
    return () => {
      window.onPdfTermClick = null;
      window.onSectionIdClick = null;
    };
  }, []);

  useEffect(() => {
    if (selectedView === "Q/A") {
      setSelectedTerm(null);
      setSelectedSentence(null);
      setSelectedSectionId(null);
    }
  }, [selectedView]);

  useEffect(() => {
    if (!chapterId) return;

    const loadChapter = async () => {
      try {
        // 1️⃣ Fetch chapter metadata
        const res = await fetch(`${BASE_URL}/chapters/${chapterId}`);
        if (!res.ok) throw new Error("Failed to fetch chapter");

        const data = await res.json();
        setChapterTitle(data.chapter_name || "Untitled Chapter");
        setSectionIds(data.section_ids || []);
        setPdfUrl(`${BASE_URL}${data.pdf_url}`);

        // 3️⃣ Load dependent data (same APIs as before)
        await fetchTerms(chapterId);
        await fetchQAPairs(chapterId);

      } catch (err) {
        console.error("❌ Error loading chapter:", err);
      }
    };

    loadChapter();
  }, [chapterId]);

  useEffect(() => {
  window.onTermMediaAction = ({ term, action }) => {
    setSelectedTerm(term);
    setSelectedWordText(term?.name || term?.rawName || "");
    setSelectedView("Word");

    // forward intent to AnalysisPanel
    window.__analysisIntent = action;
  };

  return () => {
    window.onTermMediaAction = null;
  };
  }, []);

  const fetchQAPairs = async (chapterId) => {
    try {
      const res = await fetch(`${BASE_URL}/get-qa/?chapter_id=${chapterId}`, {
        method: "GET",
      });
      const data = await res.json();
      setQaPairs(data.qa_pairs || []);
    } catch (err) {
      console.error("❌ Error fetching Q/A pairs:", err);
    }
  };

  /** Fetch extracted domain terms and normalize them for robust matching */
  const fetchTerms = async (chapterId) => {
    try {
      const res = await fetch(
      `${BASE_URL}/extract-domain-terms/?chapter_id=${chapterId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
      );

      const data = await res.json();

      const processed = (data.terms || []).map((t) => {
        const rawName =
          t.name || (t.tokens_with_pos && t.tokens_with_pos.join(" ")) || "";
        const normalized = normalizeStringForMatch(rawName);
        const tokensNormalized = (t.tokens_with_pos || [])
          .map((tk) => normalizeStringForMatch(String(tk)))
          .filter(Boolean);

        return {
          ...t,
          rawName,
          normalized,
          tokensNormalized,
        };
      });

      setTerms(processed);
    } catch (err) {
      console.error("❌ Error fetching terms:", err);
    }
  };

  

  return (
    <div className="concept-layout">
      <div className="floating-back-btn" onClick={() => navigate("/chapters")}>
        <ArrowLeft size={22} />
      </div>

      <div className="concept-main" ref={containerRef}>
        {/* LEFT: PDF Viewer + Reading Panel */}
        <div
          className={`concept-left ${isDragging ? "no-pointer-events" : ""}`}
          style={{ width: leftWidth }}
        >
          <div className="reading-card">
            {/* Top tabs */}
            <h2 className="chapter-name">
              {chapterTitle ? chapterTitle : "Untitled Chapter"}
            </h2>

            <div className="view-toggle top-tabs">
              {["Word", "Sentence", "Summary", "Q/A"].map((v) => (
                <button
                  key={v}
                  className={`toggle-btn ${selectedView === v ? "active" : ""}`}
                  onClick={() => setSelectedView(v)}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="pdf-viewer-wrapper">
              {pdfUrl ? (
                <div className="pdf-viewer-container">
                  <PdfViewer
                    file={pdfUrl}
                    terms={selectedView === "Word" ? terms : []}
                    sectionIds={selectedView === "Summary" ? sectionIds : []}
                    selectedView={selectedView}
                  />
                </div>
              ) : (
                <div className="pdf-placeholder">Upload a PDF to view</div>
              )}
            </div>

            <ReadingPanel
              text=""
              terms={terms}
              selectedView={selectedView}
              onTermClick={setSelectedTerm}
              onSentenceSelect={setSelectedSentence}
            />
          </div>
        </div>

        {/* DRAGGABLE DIVIDER with GRIP */}
        <div
          className={`drag-divider ${isDragging ? "active" : ""}`}
          onMouseDown={startDragging}
          onTouchStart={startDragging}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
        >
          <span className="drag-grip" aria-hidden="true">
            <span></span><span></span><span></span>
          </span>
        </div>

        {/* RIGHT: Analysis Panel */}
        <div
          className={`concept-right ${isDragging ? "no-pointer-events" : ""}`}
          style={{ width: rightWidth }}
        >
          <div className="analysis-card">
            <AnalysisPanel
              selectedTerm={selectedTerm}
              selectedWordText={selectedWordText}
              selectedSentence={selectedSentence}
              summary={summary}
              chapterId={chapterId}
              selectedView={selectedView}
              selectedSectionId={selectedSectionId}
              qaPairs={qaPairs}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
