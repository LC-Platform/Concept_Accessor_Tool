import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, X } from "lucide-react";
import PdfViewer from "./PdfViewer";
import ReadingPanel from "./ReadingPanel";
import AnalysisPanel from "./AnalysisPanel";
import MobileLayout from "./Mobilelayout";
import { useParams } from "react-router-dom";
import "../../styles/ModernLayout.css";

const BASE_URL = "http://10.2.8.12:8500";

/* ── Mobile detection hook ── */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

/* ===== Helpers ===== */
function normalizeStringForMatch(s = "") {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

const snapToNearest = (valuePct, presets = [30, 50, 70]) => {
  let closest = presets[0];
  let minDiff = Math.abs(valuePct - presets[0]);
  for (let i = 1; i < presets.length; i++) {
    const diff = Math.abs(valuePct - presets[i]);
    if (diff < minDiff) { closest = presets[i]; minDiff = diff; }
  }
  return closest;
};

export default function ConceptLayout() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileLayout />;
  }

  return <DesktopLayout />;
}

/* ══════════════════════════════════════════════════════════
   DESKTOP LAYOUT
══════════════════════════════════════════════════════════ */
function DesktopLayout() {
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
  const [isReadMode, setIsReadMode] = useState(true);

  const [termOccurrences, setTermOccurrences] = useState({});
  const [displayToFileMap, setDisplayToFileMap] = useState({});

  const [pinPosition, setPinPosition] = useState(null);
  const [isPinMode, setIsPinMode] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);

  const navigate = useNavigate();
  const { chapterId } = useParams();
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.user_id;
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  useEffect(() => {
    if (pdfUrl) setIsPdfLoading(true);
  }, [pdfUrl]);

  /* ── Resize state ── */
  const [leftWidth, setLeftWidth] = useState("50%");
  const [rightWidth, setRightWidth] = useState("50%");
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const startDragging = (e) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.classList.add("dragging");
  };

  useEffect(() => {
    if (!userId) navigate("/login");
  }, [userId, navigate]);

  useEffect(() => {
    if (selectedView !== "Word") {
      setSelectedTerm(null);
      setSelectedWordText("");
    }
  }, [selectedView]);

  useEffect(() => {
    const handlePointerMove = (clientX) => {
      if (!isDragging || !containerRef.current) return;
      const totalWidth = containerRef.current.offsetWidth;
      const newLeft = (clientX / totalWidth) * 100;
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
      console.log("onPdfTermClick fired for:", term?.domain_id, Date.now());
      setSelectedTerm(prev => {
        // avoid replacing reference if it's the same term
        if (prev?.domain_id === term?.domain_id) return prev;
        return term;
      });
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
        const res = await fetch(`${BASE_URL}/chapters/${chapterId}`);
        if (!res.ok) throw new Error("Failed to fetch chapter");
        const data = await res.json();
        setChapterTitle(data.chapter_name || "Untitled Chapter");
        setSectionIds(data.section_ids || []);
        setPdfUrl(`${BASE_URL}${data.pdf_url}`);
        await fetchTerms(chapterId);
        await fetchQAPairs(chapterId);
        await fetchReadingProgress(chapterId);
      } catch (err) {
        console.error("Error loading chapter:", err);
      }
    };
    loadChapter();
  }, [chapterId]);

  useEffect(() => {
    window.onTermMediaAction = ({ term, action }) => {
      setSelectedTerm(term);
      setSelectedWordText(term?.name || term?.rawName || "");
      setSelectedView("Word");
      window.__analysisIntent = action;
    };
    return () => { window.onTermMediaAction = null; };
  }, []);

  const fetchQAPairs = async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/get-qa/?chapter_id=${id}`);
      const data = await res.json();
      setQaPairs(data.qa_pairs || []);
    } catch (err) {
      console.error("Error fetching Q/A:", err);
    }
  };

  const fetchTerms = async (id) => {
    try {
      const res = await fetch(
        `${BASE_URL}/extract-domain-terms/?chapter_id=${id}`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
      );
      const data = await res.json();
      const processed = (data.terms || []).map((t) => {
        const rawName = t.name || (t.tokens_with_pos && t.tokens_with_pos.join(" ")) || "";
        return {
          ...t,
          rawName,
          normalized: normalizeStringForMatch(rawName),
          tokensNormalized: (t.tokens_with_pos || [])
            .map((tk) => normalizeStringForMatch(String(tk)))
            .filter(Boolean),
        };
      });
      setTerms(processed);
    } catch (err) {
      console.error("Error fetching terms:", err);
    }
  };

  const fetchReadingProgress = async (id) => {
    if (!userId) return;
    try {
      const res = await fetch(`${BASE_URL}/reading-progress/${id}?user_id=${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.pin_position) setPinPosition(data.pin_position);
    } catch (err) {
      console.error("Error fetching reading progress:", err);
    }
  };

  const saveReadingProgress = async (position) => {
    if (!chapterId || !userId) return;
    setIsSavingPin(true);
    try {
      await fetch(`${BASE_URL}/reading-progress/${chapterId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, pin_position: position }),
      });
    } catch (err) {
      console.error("Error saving reading progress:", err);
    } finally {
      setIsSavingPin(false);
    }
  };

  const handlePinPlace = (position) => {
    setPinPosition(position);
    setIsPinMode(false);
    saveReadingProgress(position);
  };

  const handleRemovePin = async () => {
    if (!chapterId || !userId) return;
    setPinPosition(null);
    await fetch(`${BASE_URL}/reading-progress/${chapterId}?user_id=${userId}`, { method: "DELETE" });
  };

  const handleJumpToPin = () => {
    if (!pinPosition) return;
    const pdfViewer = document.querySelector(".pdf-viewer-scroll");
    if (!pdfViewer) return;
    pdfViewer.scrollTo({ top: pinPosition.yOffset, behavior: "smooth" });
  };

  const handleOccurrencesFound = useCallback((occurrences, displayToFile = {}) => {
    setTermOccurrences(occurrences);
    setDisplayToFileMap(displayToFile);
  }, []);

  return (
    <div className="concept-layout">
      <div className="concept-main" ref={containerRef}>

        {/* LEFT: PDF Viewer + Reading Panel */}
        <div
          className={`concept-left ${isDragging ? "no-pointer-events" : ""}`}
          style={{ width: leftWidth }}
        >
          <div className="reading-card">

            <div className="chapter-header-row">
              <button className="inline-back-btn" onClick={() => navigate(-1)}>
                <ArrowLeft size={20} />
              </button>

              <h2 className="chapter-name">
                {chapterTitle || "Untitled Chapter"}
              </h2>

              {selectedView === "Word" && (
                <button
                  className={`read-mode-toggle ${isReadMode ? "active" : ""}`}
                  onClick={() => setIsReadMode(!isReadMode)}
                  title={isReadMode ? "Switch to Highlight Mode" : "Switch to Read Mode"}
                >
                  {isReadMode ? "🔍 Highlight" : "📖 Read"}
                </button>
              )}

              <div className="pin-controls">
                {pinPosition && !isPinMode && (
                  <>
                    <button className="pin-control-btn jump-to-pin" onClick={handleJumpToPin} title="Jump to reading marker">
                      <MapPin size={18} />
                      Go to Pin
                    </button>
                    <button className="pin-control-btn remove-pin" onClick={handleRemovePin} title="Remove reading marker">
                      <X size={16} />
                    </button>
                  </>
                )}
                {!pinPosition && !isPinMode && (
                  <button className="pin-control-btn place-pin" onClick={() => setIsPinMode(true)} title="Mark your reading progress">
                    <MapPin size={18} />
                    Place Pin
                  </button>
                )}
                {isPinMode && (
                  <button className="pin-control-btn cancel-pin" onClick={() => setIsPinMode(false)}>
                    Cancel
                  </button>
                )}
                {isSavingPin && <span className="pin-saving-indicator">Saving...</span>}
              </div>
            </div>

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
                <div className="pdf-viewer-container" style={{ position: "relative" }}>
                  {isPdfLoading && (
                    <div className="pdf-loading-overlay">
                      <div className="pdf-loading-card">
                        <div className="pdf-spinner" />
                        <p className="pdf-loading-text">Loading PDF…</p>
                      </div>
                    </div>
                  )}
                  <PdfViewer
                    file={pdfUrl}
                    terms={selectedView === "Word" ? terms : []}
                    sectionIds={selectedView === "Summary" ? sectionIds : []}
                    selectedView={selectedView}
                    isReadMode={isReadMode}
                    pinPosition={pinPosition}
                    onPinPlace={handlePinPlace}
                    isPinMode={isPinMode}
                    onOccurrencesFound={handleOccurrencesFound}
                    highlightedTermText={selectedWordText || null}
                    onLoadSuccess={() => setIsPdfLoading(false)}
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

        {/* DRAGGABLE DIVIDER */}
        <div
          className={`drag-divider ${isDragging ? "active" : ""}`}
          onMouseDown={startDragging}
          onTouchStart={startDragging}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
        >
          <span className="drag-grip" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
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
              termOccurrences={termOccurrences}
              displayToFileMap={displayToFileMap}
              pdfViewerRef={containerRef}
            />
          </div>
        </div>

      </div>
    </div>
  );
}