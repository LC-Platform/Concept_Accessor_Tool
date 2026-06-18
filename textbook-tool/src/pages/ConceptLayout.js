import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, X } from "lucide-react";
import PdfViewer from "./PdfViewer";
import ReadingPanel from "./ReadingPanel";
import AnalysisPanel from "./AnalysisPanel";
import MobileLayout from "./Mobilelayout";
import { useParams } from "react-router-dom";
import "../styles/ModernLayout.css";

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

  // Render the mobile layout directly — it handles its own state
  if (isMobile) {
    return <MobileLayout />;
  }

  // Desktop layout below
  return <DesktopLayout />;
}

/* ══════════════════════════════════════════════════════════
   DESKTOP LAYOUT  (original ConceptLayout logic, unchanged)
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

  const [hasConceptMap, setHasConceptMap] = useState(false);
  const [isCheckingConceptMap, setIsCheckingConceptMap] = useState(false);

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

  const checkConceptMapAvailability = async (term) => {
    if (!term || !chapterId) { setHasConceptMap(false); return; }
    setIsCheckingConceptMap(true);
    try {
      const res = await fetch(`${BASE_URL}/taxonomy-image/${chapterId}/${term.domain_id}`);
      setHasConceptMap(res.ok);
    } catch {
      setHasConceptMap(false);
    } finally {
      setIsCheckingConceptMap(false);
    }
  };

  useEffect(() => {
    if (selectedTerm && selectedView === "Word") checkConceptMapAvailability(selectedTerm);
    else setHasConceptMap(false);
  }, [selectedTerm, selectedView, chapterId]);

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
              externalConceptMapTrigger={hasConceptMap}
            />
          </div>
        </div>

      </div>
    </div>
  );
} 

// // src/pages/ConceptLayout.js
// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { useNavigate } from "react-router-dom";
// import { ArrowLeft, MapPin, X } from "lucide-react";
// import PdfViewer from "./PdfViewer";
// import ReadingPanel from "./ReadingPanel";
// import AnalysisPanel from "./AnalysisPanel";
// import { useParams } from "react-router-dom";
// import "../styles/ModernLayout.css";
// import "../styles/OnboardingCSS.css";

// // Onboarding Components
// import OnboardingTour from "../components/OnboardingTour";
// import WelcomeModal from "../components/WelcomeModal";
// import QuickStartGuide from "../components/QuickStartGuide";
// import { useAchievements, AchievementNotification } from "../components/AchievementSystem";

// const BASE_URL = "http://10.2.8.12:8500";

// /* ===== Helpers ===== */
// function normalizeStringForMatch(s = "") {
//   return s
//     .normalize("NFD")
//     .replace(/[\u0300-\u036f]/g, "")
//     .replace(/[^a-zA-Z0-9]/g, "")
//     .toLowerCase();
// }

// const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

// const snapToNearest = (valuePct, presets = [30, 50, 70]) => {
//   let closest = presets[0];
//   let minDiff = Math.abs(valuePct - presets[0]);
//   for (let i = 1; i < presets.length; i++) {
//     const diff = Math.abs(valuePct - presets[i]);
//     if (diff < minDiff) { closest = presets[i]; minDiff = diff; }
//   }
//   return closest;
// };

// export default function ConceptLayout() {
//   const [terms, setTerms] = useState([]);
//   const [selectedTerm, setSelectedTerm] = useState(null);
//   const [selectedSentence, setSelectedSentence] = useState(null);
//   const [summary, setSummary] = useState("");
//   const [selectedView, setSelectedView] = useState("Word");
//   const [pdfUrl, setPdfUrl] = useState(null);
//   const [chapterTitle, setChapterTitle] = useState("");
//   const [sectionIds, setSectionIds] = useState([]);
//   const [selectedSectionId, setSelectedSectionId] = useState(null);
//   const [selectedWordText, setSelectedWordText] = useState("");
//   const [qaPairs, setQaPairs] = useState([]);
//   const [isReadMode, setIsReadMode] = useState(true);

//   const [termOccurrences, setTermOccurrences] = useState({});
//   const [displayToFileMap, setDisplayToFileMap] = useState({});

//   // Pin marker states
//   const [pinPosition, setPinPosition] = useState(null);
//   const [isPinMode, setIsPinMode] = useState(false);
//   const [isSavingPin, setIsSavingPin] = useState(false);
  
//   // Concept map availability state
//   const [hasConceptMap, setHasConceptMap] = useState(false);
//   const [isCheckingConceptMap, setIsCheckingConceptMap] = useState(false);

//   // Onboarding states
//   const [showWelcome, setShowWelcome] = useState(false);
//   const [showOnboarding, setShowOnboarding] = useState(false);
//   const [showQuickStart, setShowQuickStart] = useState(false);
//   const [showLearningModeSelector, setShowLearningModeSelector] = useState(false);
//   const [learningMode, setLearningMode] = useState('reading');

//   const navigate = useNavigate();
//   const { chapterId } = useParams();
//   const user = JSON.parse(localStorage.getItem("user"));
//   const userId = user?.user_id;
//   const [isPdfLoading, setIsPdfLoading] = useState(false);

//   // Achievements system
//   const { currentAchievement, checkAndUnlock, totalXP } = useAchievements(userId);

//   useEffect(() => {
//     if (pdfUrl) setIsPdfLoading(true);
//   }, [pdfUrl]);

//   /* ========== RESIZE STATE ========== */
//   const [leftWidth, setLeftWidth] = useState("50%");
//   const [rightWidth, setRightWidth] = useState("50%");
//   const [isDragging, setIsDragging] = useState(false);
//   const containerRef = useRef(null);

//   const startDragging = (e) => {
//     e.preventDefault();
//     setIsDragging(true);
//     document.body.classList.add("dragging");
//   };

//   /* ========== AUTH CHECK ========== */
//   useEffect(() => {
//     if (!userId) navigate("/login");
//   }, [userId, navigate]);

//   /* ========== ONBOARDING CHECK ========== */
//   useEffect(() => {
//     if (!userId || !chapterId) return;
    
//     const hasSeenOnboarding = localStorage.getItem(`onboarding_seen_${userId}`);
//     const hasCompletedForChapter = localStorage.getItem(`onboarding_complete_${userId}_${chapterId}`);
//     const chaptersViewed = localStorage.getItem(`chapters_viewed_${userId}`) || 0;
    
//     if (!hasSeenOnboarding) {
//       setShowWelcome(true);
//     } else if (!hasCompletedForChapter && parseInt(chaptersViewed) === 0) {
//       setShowOnboarding(true);
//     } else if (!hasCompletedForChapter && parseInt(chaptersViewed) > 0) {
//       setShowQuickStart(true);
//     }
    
//     // Show learning mode selector after a few sessions
//     const sessions = parseInt(localStorage.getItem(`sessions_${userId}`) || 0);
//     if (sessions >= 2 && !localStorage.getItem(`learning_mode_shown_${userId}`)) {
//       setShowLearningModeSelector(true);
//       localStorage.setItem(`learning_mode_shown_${userId}`, 'true');
//     }
    
//     // Track chapters viewed
//     localStorage.setItem(`chapters_viewed_${userId}`, (parseInt(chaptersViewed) + 1).toString());
//   }, [userId, chapterId]);

//   /* ========== CLEAR TERM ON VIEW CHANGE ========== */
//   useEffect(() => {
//     if (selectedView !== "Word") {
//       setSelectedTerm(null);
//       setSelectedWordText("");
//     }
//   }, [selectedView]);

//   /* ========== DRAG RESIZE ========== */
//   useEffect(() => {
//     const handlePointerMove = (clientX) => {
//       if (!isDragging || !containerRef.current) return;
//       const totalWidth = containerRef.current.offsetWidth;
//       const newLeft = (clientX / totalWidth) * 100;
//       const bounded = clamp(newLeft, 20, 80);
//       setLeftWidth(bounded.toFixed(3) + "%");
//       setRightWidth((100 - bounded).toFixed(3) + "%");
//     };

//     const onMouseMove = (e) => handlePointerMove(e.clientX);
//     const onTouchMove = (e) => {
//       if (!e.touches || e.touches.length === 0) return;
//       handlePointerMove(e.touches[0].clientX);
//     };
//     const stopDragging = () => {
//       if (!isDragging) return;
//       const currentLeft = parseFloat(leftWidth);
//       const snapped = clamp(snapToNearest(currentLeft, [30, 50, 70]), 20, 80);
//       setLeftWidth(snapped + "%");
//       setRightWidth(100 - snapped + "%");
//       setIsDragging(false);
//       document.body.classList.remove("dragging");
//     };

//     window.addEventListener("mousemove", onMouseMove, { passive: true });
//     window.addEventListener("mouseup", stopDragging, { passive: true });
//     window.addEventListener("touchmove", onTouchMove, { passive: false });
//     window.addEventListener("touchend", stopDragging, { passive: true });
//     window.addEventListener("touchcancel", stopDragging, { passive: true });
//     return () => {
//       window.removeEventListener("mousemove", onMouseMove);
//       window.removeEventListener("mouseup", stopDragging);
//       window.removeEventListener("touchmove", onTouchMove);
//       window.removeEventListener("touchend", stopDragging);
//       window.removeEventListener("touchcancel", stopDragging);
//     };
//   }, [isDragging, leftWidth]);

//   /* ========== PDF CLICK HANDLERS ========== */
//   const handleTermClickWithAchievement = (term) => {
//     setSelectedTerm(term);
//     setSelectedWordText(term?.name || term?.rawName || "");
//     setSelectedView("Word");
//     checkAndUnlock('term_click');
//   };

//   useEffect(() => {
//     window.onPdfTermClick = (term) => {
//       handleTermClickWithAchievement(term);
//     };
//     window.onSectionIdClick = (sectionId) => {
//       setSelectedSectionId(sectionId);
//       setSelectedView("Summary");
//       checkAndUnlock('summary_view');
//     };
//     return () => {
//       window.onPdfTermClick = null;
//       window.onSectionIdClick = null;
//     };
//   }, []);

//   useEffect(() => {
//     if (selectedView === "Q/A") {
//       setSelectedTerm(null);
//       setSelectedSentence(null);
//       setSelectedSectionId(null);
//     }
//   }, [selectedView]);

//   /* ========== LOAD CHAPTER ========== */
//   useEffect(() => {
//     if (!chapterId) return;
//     const loadChapter = async () => {
//       try {
//         const res = await fetch(`${BASE_URL}/chapters/${chapterId}`);
//         if (!res.ok) throw new Error("Failed to fetch chapter");
//         const data = await res.json();
//         setChapterTitle(data.chapter_name || "Untitled Chapter");
//         setSectionIds(data.section_ids || []);
//         setPdfUrl(`${BASE_URL}${data.pdf_url}`);
//         await fetchTerms(chapterId);
//         await fetchQAPairs(chapterId);
//         await fetchReadingProgress(chapterId);
//       } catch (err) {
//         console.error("❌ Error loading chapter:", err);
//       }
//     };
//     loadChapter();
//   }, [chapterId]);

//   useEffect(() => {
//     window.onTermMediaAction = ({ term, action }) => {
//       setSelectedTerm(term);
//       setSelectedWordText(term?.name || term?.rawName || "");
//       setSelectedView("Word");
//       window.__analysisIntent = action;
//     };
//     return () => { window.onTermMediaAction = null; };
//   }, []);

//   /* ========== FETCHERS ========== */
//   const fetchQAPairs = async (chapterId) => {
//     try {
//       const res = await fetch(`${BASE_URL}/get-qa/?chapter_id=${chapterId}`);
//       const data = await res.json();
//       setQaPairs(data.qa_pairs || []);
//     } catch (err) {
//       console.error("❌ Error fetching Q/A pairs:", err);
//     }
//   };

//   const fetchTerms = async (chapterId) => {
//     try {
//       const res = await fetch(
//         `${BASE_URL}/extract-domain-terms/?chapter_id=${chapterId}`,
//         { method: "GET", headers: { "Content-Type": "application/json" } }
//       );
//       const data = await res.json();
//       const processed = (data.terms || []).map((t) => {
//         const rawName = t.name || (t.tokens_with_pos && t.tokens_with_pos.join(" ")) || "";
//         return {
//           ...t,
//           rawName,
//           normalized: normalizeStringForMatch(rawName),
//           tokensNormalized: (t.tokens_with_pos || [])
//             .map((tk) => normalizeStringForMatch(String(tk)))
//             .filter(Boolean),
//         };
//       });
//       setTerms(processed);
//     } catch (err) {
//       console.error("❌ Error fetching terms:", err);
//     }
//   };

//   /* ========== CHECK IF CONCEPT MAP EXISTS ========== */
//   const checkConceptMapAvailability = async (term) => {
//     if (!term || !chapterId) {
//       setHasConceptMap(false);
//       return;
//     }
    
//     setIsCheckingConceptMap(true);
//     try {
//       const res = await fetch(`${BASE_URL}/taxonomy-image/${chapterId}/${term.domain_id}`);
//       setHasConceptMap(res.ok);
//       if (res.ok) {
//         checkAndUnlock('concept_map_view');
//       }
//     } catch (err) {
//       console.error("Error checking concept map:", err);
//       setHasConceptMap(false);
//     } finally {
//       setIsCheckingConceptMap(false);
//     }
//   };

//   // Check concept map availability whenever selected term changes
//   useEffect(() => {
//     if (selectedTerm && selectedView === "Word") {
//       checkConceptMapAvailability(selectedTerm);
//     } else {
//       setHasConceptMap(false);
//     }
//   }, [selectedTerm, selectedView, chapterId]);

//   /* ========== PIN FUNCTIONS ========== */
//   const fetchReadingProgress = async (chapterId) => {
//     if (!userId) return;
//     try {
//       const res = await fetch(`${BASE_URL}/reading-progress/${chapterId}?user_id=${userId}`);
//       if (!res.ok) return;
//       const data = await res.json();
//       if (data.pin_position) setPinPosition(data.pin_position);
//     } catch (err) {
//       console.error("❌ Error fetching reading progress:", err);
//     }
//   };

//   const saveReadingProgress = async (position) => {
//     if (!chapterId || !userId) return;
//     setIsSavingPin(true);
//     try {
//       const res = await fetch(`${BASE_URL}/reading-progress/${chapterId}`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ user_id: userId, pin_position: position }),
//       });
//       if (!res.ok) console.error("❌ Failed to save progress");
//     } catch (err) {
//       console.error("❌ Error saving reading progress:", err);
//     } finally {
//       setIsSavingPin(false);
//     }
//   };

//   const handlePinPlace = (position) => {
//     setPinPosition(position);
//     setIsPinMode(false);
//     saveReadingProgress(position);
//   };

//   const handleRemovePin = async () => {
//     if (!chapterId || !userId) return;
//     setPinPosition(null);
//     await fetch(`${BASE_URL}/reading-progress/${chapterId}?user_id=${userId}`, { method: "DELETE" });
//   };

//   const handleJumpToPin = () => {
//     if (!pinPosition) return;
//     const pdfViewer = document.querySelector(".pdf-viewer-scroll");
//     if (!pdfViewer) return;
//     pdfViewer.scrollTo({ top: pinPosition.yOffset, behavior: "smooth" });
//   };

//   /* ========== OCCURRENCE HANDLER ========== */
//   const handleOccurrencesFound = useCallback((occurrences, displayToFile = {}) => {
//     setTermOccurrences(occurrences);
//     setDisplayToFileMap(displayToFile);
//   }, []);

//   /* ========== LEARNING MODE ========== */
//   const LearningModeSelector = () => {
//     if (!showLearningModeSelector) return null;
    
//     return (
//       <div className="welcome-modal-overlay" onClick={() => setShowLearningModeSelector(false)}>
//         <div className="welcome-modal-content" onClick={(e) => e.stopPropagation()}>
//           <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎯</div>
//           <h3 style={{ marginBottom: '10px' }}>Choose Your Learning Mode</h3>
//           <p style={{ marginBottom: '20px', color: '#666' }}>
//             How would you like to learn today?
//           </p>
          
//           <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
//             <button
//               onClick={() => {
//                 setLearningMode('reading');
//                 localStorage.setItem(`learning_mode_${userId}`, 'reading');
//                 setShowLearningModeSelector(false);
//               }}
//               style={{
//                 padding: '15px',
//                 background: learningMode === 'reading' ? '#4a90e2' : '#f5f5f5',
//                 border: `2px solid ${learningMode === 'reading' ? '#4a90e2' : '#e0e0e0'}`,
//                 borderRadius: '10px',
//                 cursor: 'pointer',
//                 textAlign: 'left'
//               }}
//             >
//               <div style={{ fontSize: '24px', marginBottom: '5px' }}>📖</div>
//               <strong>Reading Mode</strong>
//               <p style={{ fontSize: '12px', marginTop: '5px', color: '#666' }}>
//                 Focus on reading with minimal distractions
//               </p>
//             </button>
            
//             <button
//               onClick={() => {
//                 setLearningMode('explore');
//                 localStorage.setItem(`learning_mode_${userId}`, 'explore');
//                 setShowLearningModeSelector(false);
//               }}
//               style={{
//                 padding: '15px',
//                 background: learningMode === 'explore' ? '#4a90e2' : '#f5f5f5',
//                 border: `2px solid ${learningMode === 'explore' ? '#4a90e2' : '#e0e0e0'}`,
//                 borderRadius: '10px',
//                 cursor: 'pointer',
//                 textAlign: 'left'
//               }}
//             >
//               <div style={{ fontSize: '24px', marginBottom: '5px' }}>🗺️</div>
//               <strong>Concept Exploration Mode</strong>
//               <p style={{ fontSize: '12px', marginTop: '5px', color: '#666' }}>
//                 Discover connections between ideas
//               </p>
//             </button>
            
//             <button
//               onClick={() => {
//                 setLearningMode('deep');
//                 localStorage.setItem(`learning_mode_${userId}`, 'deep');
//                 setShowLearningModeSelector(false);
//               }}
//               style={{
//                 padding: '15px',
//                 background: learningMode === 'deep' ? '#4a90e2' : '#f5f5f5',
//                 border: `2px solid ${learningMode === 'deep' ? '#4a90e2' : '#e0e0e0'}`,
//                 borderRadius: '10px',
//                 cursor: 'pointer',
//                 textAlign: 'left'
//               }}
//             >
//               <div style={{ fontSize: '24px', marginBottom: '5px' }}>🔬</div>
//               <strong>Deep Learning Mode</strong>
//               <p style={{ fontSize: '12px', marginTop: '5px', color: '#666' }}>
//                 Analyze sentences and processes in detail
//               </p>
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   /* ========== RENDER ========== */
//   return (
//     <div className="concept-layout">
//       {/* Onboarding Components */}
//       {showWelcome && (
//         <WelcomeModal
//           onStartTour={() => {
//             setShowWelcome(false);
//             setShowOnboarding(true);
//           }}
//           onSkip={() => {
//             setShowWelcome(false);
//             setShowQuickStart(true);
//             localStorage.setItem(`onboarding_seen_${userId}`, 'true');
//           }}
//         />
//       )}
      
//       {showOnboarding && (
//         <OnboardingTour
//           userId={userId}
//           chapterId={chapterId}
//           isFirstChapter={true}
//           onComplete={() => {
//             setShowOnboarding(false);
//             localStorage.setItem(`onboarding_seen_${userId}`, 'true');
//             localStorage.setItem(`onboarding_complete_${userId}_${chapterId}`, 'true');
//           }}
//         />
//       )}
      
//       {showQuickStart && (
//         <QuickStartGuide
//           userId={userId}
//           chapterId={chapterId}
//           onComplete={() => {
//             setShowQuickStart(false);
//             localStorage.setItem(`onboarding_complete_${userId}_${chapterId}`, 'true');
//           }}
//         />
//       )}
      
//       <LearningModeSelector />
      
//       {/* Achievement Notifications */}
//       {currentAchievement && (
//         <AchievementNotification
//           achievement={currentAchievement}
//           onClose={() => {}}
//         />
//       )}
      
//       {/* XP Progress Bar (shown after achievements unlocked) */}
//       {totalXP > 0 && (
//         <div style={{
//           position: 'fixed',
//           top: '10px',
//           right: '10px',
//           background: 'white',
//           padding: '8px 15px',
//           borderRadius: '20px',
//           boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
//           zIndex: 100,
//           fontSize: '12px'
//         }}>
//           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//             <span>🏆</span>
//             <span>{totalXP} XP</span>
//           </div>
//         </div>
//       )}
      
//       <div className="concept-main" ref={containerRef}>

//         {/* LEFT: PDF Viewer + Reading Panel */}
//         <div
//           className={`concept-left ${isDragging ? "no-pointer-events" : ""}`}
//           style={{ width: leftWidth }}
//         >
//           <div className="reading-card">

//             {/* Top header */}
//             <div className="chapter-header-row">
//               <button className="inline-back-btn" onClick={() => navigate(-1)}>
//                 <ArrowLeft size={20} />
//               </button>

//               <h2 className="chapter-name">
//                 {chapterTitle || "Untitled Chapter"}
//               </h2>

//               {/* Learning Mode Badge */}
//               {learningMode && (
//                 <div className={`learning-mode-badge ${learningMode === 'reading' ? 'active' : 'inactive'}`}
//                      style={{ marginRight: '10px' }}>
//                   {learningMode === 'reading' && '📖 Reading'}
//                   {learningMode === 'explore' && '🗺️ Explore'}
//                   {learningMode === 'deep' && '🔬 Deep'}
//                 </div>
//               )}

//               {/* Read Mode Toggle */}
//               {selectedView === "Word" && (
//                 <button
//                   className={`read-mode-toggle ${isReadMode ? "active" : ""}`}
//                   onClick={() => setIsReadMode(!isReadMode)}
//                   title={isReadMode ? "Switch to Highlight Mode" : "Switch to Read Mode"}
//                 >
//                   {isReadMode ? "🔍 Highlight" : "📖 Read"}
//                 </button>
//               )}

//               {/* Pin Controls */}
//               <div className="pin-controls">
//                 {pinPosition && !isPinMode && (
//                   <>
//                     <button
//                       className="pin-control-btn jump-to-pin"
//                       onClick={handleJumpToPin}
//                       title="Jump to reading marker"
//                     >
//                       <MapPin size={18} />
//                       Go to Pin
//                     </button>
//                     <button
//                       className="pin-control-btn remove-pin"
//                       onClick={handleRemovePin}
//                       title="Remove reading marker"
//                     >
//                       <X size={16} />
//                     </button>
//                   </>
//                 )}
//                 {!pinPosition && !isPinMode && (
//                   <button
//                     className="pin-control-btn place-pin"
//                     onClick={() => setIsPinMode(true)}
//                     title="Mark your reading progress"
//                   >
//                     <MapPin size={18} />
//                     Place Pin
//                   </button>
//                 )}
//                 {isPinMode && (
//                   <button
//                     className="pin-control-btn cancel-pin"
//                     onClick={() => setIsPinMode(false)}
//                   >
//                     Cancel
//                   </button>
//                 )}
//                 {isSavingPin && (
//                   <span className="pin-saving-indicator">Saving...</span>
//                 )}
//               </div>
//             </div>

//             {/* View tabs with tooltips */}
//             <div className="view-toggle top-tabs">
//               {["Word", "Sentence", "Summary", "Q/A"].map((v) => (
//                 <button
//                   key={v}
//                   className={`toggle-btn ${selectedView === v ? "active" : ""}`}
//                   onClick={() => {
//                     setSelectedView(v);
//                     if (v === "Sentence") checkAndUnlock('sentence_analysis');
//                   }}
//                   title={v === "Word" ? "🔍 Click any word to see definition and concept map" :
//                          v === "Sentence" ? "🔬 Click any sentence to analyze its structure" :
//                          v === "Summary" ? "📝 Click section markers for quick summaries" :
//                          "❓ Test your knowledge with Q&A"}
//                 >
//                   {v === "Word" && "🔍 "}
//                   {v === "Sentence" && "🔬 "}
//                   {v === "Summary" && "📝 "}
//                   {v === "Q/A" && "❓ "}
//                   {v}
//                 </button>
//               ))}
//             </div>

//             {/* PDF Viewer */}
//             <div className="pdf-viewer-wrapper">
//               {pdfUrl ? (
//                 <div className="pdf-viewer-container" style={{ position: "relative" }}>

//                   {/* Loading overlay */}
//                   {isPdfLoading && (
//                     <div className="pdf-loading-overlay">
//                       <div className="pdf-loading-card">
//                         <div className="pdf-spinner" />
//                         <p className="pdf-loading-text">Loading PDF…</p>
//                       </div>
//                     </div>
//                   )}

//                   <PdfViewer
//                     file={pdfUrl}
//                     terms={selectedView === "Word" ? terms : []}
//                     sectionIds={selectedView === "Summary" ? sectionIds : []}
//                     selectedView={selectedView}
//                     isReadMode={isReadMode}
//                     pinPosition={pinPosition}
//                     onPinPlace={handlePinPlace}
//                     isPinMode={isPinMode}
//                     onOccurrencesFound={handleOccurrencesFound}
//                     highlightedTermText={selectedWordText || null}
//                     onLoadSuccess={() => setIsPdfLoading(false)}
//                   />
//                 </div>
//               ) : (
//                 <div className="pdf-placeholder">Upload a PDF to view</div>
//               )}
//             </div>

//             <ReadingPanel
//               text=""
//               terms={terms}
//               selectedView={selectedView}
//               onTermClick={setSelectedTerm}
//               onSentenceSelect={setSelectedSentence}
//             />
//           </div>
//         </div>

//         {/* DRAGGABLE DIVIDER */}
//         <div
//           className={`drag-divider ${isDragging ? "active" : ""}`}
//           onMouseDown={startDragging}
//           onTouchStart={startDragging}
//           role="separator"
//           aria-orientation="vertical"
//           aria-label="Resize panels"
//         >
//           <span className="drag-grip" aria-hidden="true">
//             <span></span>
//             <span></span>
//             <span></span>
//           </span>
//         </div>

//         {/* RIGHT: Analysis Panel */}
//         <div
//           className={`concept-right ${isDragging ? "no-pointer-events" : ""}`}
//           style={{ width: rightWidth }}
//         >
//           <div className="analysis-card">
//             <AnalysisPanel
//               selectedTerm={selectedTerm}
//               selectedWordText={selectedWordText}
//               selectedSentence={selectedSentence}
//               summary={summary}
//               chapterId={chapterId}
//               selectedView={selectedView}
//               selectedSectionId={selectedSectionId}
//               qaPairs={qaPairs}
//               termOccurrences={termOccurrences}
//               displayToFileMap={displayToFileMap}
//               pdfViewerRef={containerRef}
//               externalConceptMapTrigger={hasConceptMap}
//               userId={userId}
//               checkAndUnlock={checkAndUnlock}
//               learningMode={learningMode}
//             />
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// }