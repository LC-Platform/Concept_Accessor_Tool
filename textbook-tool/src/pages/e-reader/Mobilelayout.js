import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, X, Highlighter } from "lucide-react";
import PdfViewer from "./PdfViewer";
import ReadingPanel from "./ReadingPanel";
import AnalysisPanel from "./AnalysisPanel";
import BottomSheet from "./Bottomsheet";
import "../../styles/Mobilelayout.css";

const BASE_URL = "http://10.2.8.12:8500";

export default function MobileLayout() {
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [selectedSentence, setSelectedSentence] = useState(null);
  const [selectedView, setSelectedView] = useState("Word");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [chapterTitle, setChapterTitle] = useState("");
  const [sectionIds, setSectionIds] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedWordText, setSelectedWordText] = useState("");
  const [qaPairs, setQaPairs] = useState([]);
  const [isReadMode, setIsReadMode] = useState(true);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const [termOccurrences, setTermOccurrences] = useState({});
  const [displayToFileMap, setDisplayToFileMap] = useState({});

  const [pinPosition, setPinPosition] = useState(null);
  const [isPinMode, setIsPinMode] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);

  const [hasConceptMap, setHasConceptMap] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const navigate = useNavigate();
  const { chapterId } = useParams();
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.user_id;

  /* ── Auth ── */
  useEffect(() => {
    if (!userId) navigate("/login");
  }, [userId, navigate]);

  /* ── PDF loading ── */
  useEffect(() => {
    if (pdfUrl) setIsPdfLoading(true);
  }, [pdfUrl]);

  /* ── Clear term on view change ── */
  useEffect(() => {
    if (selectedView !== "Word") {
      setSelectedTerm(null);
      setSelectedWordText("");
    }
    setSheetOpen(false);
    setSelectedSentence(null);
    setSelectedSectionId(null);
  }, [selectedView]);

  /* ── Q/A: auto-open sheet ── */
  useEffect(() => {
    if (selectedView === "Q/A" && qaPairs.length > 0) {
      setSheetOpen(true);
    }
  }, [selectedView, qaPairs]);

  /* ── PDF global handlers ── */
  useEffect(() => {
    window.onPdfTermClick = (term) => {
      setSelectedTerm(term);
      setSelectedWordText(term?.name || term?.rawName || "");
      setSheetOpen(true);
    };
    window.onSectionIdClick = (sectionId) => {
      setSelectedSectionId(sectionId);
      setSelectedView("Summary");
      setSheetOpen(true);
    };
    return () => {
      window.onPdfTermClick = null;
      window.onSectionIdClick = null;
    };
  }, []);

  useEffect(() => {
    window.onTermMediaAction = ({ term, action }) => {
      setSelectedTerm(term);
      setSelectedWordText(term?.name || term?.rawName || "");
      setSelectedView("Word");
      window.__analysisIntent = action;
      setSheetOpen(true);
    };
    return () => {
      window.onTermMediaAction = null;
    };
  }, []);

  /* ── Load chapter ── */
  useEffect(() => {
    if (!chapterId) return;
    const load = async () => {
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
    load();
  }, [chapterId]);

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
        `${BASE_URL}/extract-domain-terms/?chapter_id=${id}`
      );
      const data = await res.json();
      const processed = (data.terms || []).map((t) => {
        const rawName =
          t.name ||
          (t.tokens_with_pos && t.tokens_with_pos.join(" ")) ||
          "";
        return {
          ...t,
          rawName,
          normalized: rawName
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toLowerCase(),
          tokensNormalized: (t.tokens_with_pos || [])
            .map((tk) =>
              String(tk)
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-zA-Z0-9]/g, "")
                .toLowerCase()
            )
            .filter(Boolean),
        };
      });
      setTerms(processed);
    } catch (err) {
      console.error("Error fetching terms:", err);
    }
  };

  /* ── Concept map check ── */
  useEffect(() => {
    if (!selectedTerm || selectedView !== "Word" || !chapterId) {
      setHasConceptMap(false);
      return;
    }
    const check = async () => {
      try {
        const res = await fetch(
          `${BASE_URL}/taxonomy-image/${chapterId}/${selectedTerm.domain_id}`
        );
        setHasConceptMap(res.ok);
      } catch {
        setHasConceptMap(false);
      }
    };
    check();
  }, [selectedTerm, selectedView, chapterId]);

  /* ── Pin functions ── */
  const fetchReadingProgress = async (id) => {
    if (!userId) return;
    try {
      const res = await fetch(
        `${BASE_URL}/reading-progress/${id}?user_id=${userId}`
      );
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
    await fetch(
      `${BASE_URL}/reading-progress/${chapterId}?user_id=${userId}`,
      { method: "DELETE" }
    );
  };

  const handleJumpToPin = () => {
    if (!pinPosition) return;
    const pdfViewer = document.querySelector(".pdf-viewer-scroll");
    if (!pdfViewer) return;
    pdfViewer.scrollTo({ top: pinPosition.yOffset, behavior: "smooth" });
  };

  const handleOccurrencesFound = useCallback(
    (occurrences, displayToFile = {}) => {
      setTermOccurrences(occurrences);
      setDisplayToFileMap(displayToFile);
    },
    []
  );

  const handleSentenceSelect = useCallback((sentence) => {
    setSelectedSentence(sentence);
    setSheetOpen(true);
  }, []);

  const getSheetMeta = () => {
    switch (selectedView) {
      case "Word":
        return {
          icon: "📚",
          title: selectedWordText ? `"${selectedWordText}"` : "Word analysis",
        };
      case "Sentence":
        return { icon: "🔬", title: "Sentence analysis" };
      case "Summary":
        return {
          icon: "📝",
          title: selectedSectionId
            ? `Section ${selectedSectionId}`
            : "Summary",
        };
      case "Q/A":
        return { icon: "❓", title: "Questions & Answers" };
      default:
        return { icon: "📖", title: "Analysis" };
    }
  };

  const handleCloseSheet = useCallback(() => setSheetOpen(false), []);
  const { icon: sheetIcon, title: sheetTitle } = getSheetMeta();
  const highlightLabel = isReadMode ? "Highlight" : "Reading";

  return (
    <div className="mobile-layout">

      {/* ── Top bar ── */}
      <div className="mobile-top-bar">
        <button
          className="mobile-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>

        <h2 className="mobile-chapter-title">
          {chapterTitle || "Untitled Chapter"}
        </h2>

        <div className="mobile-action-btns">
          {selectedView === "Word" && (
            <button
              className={`mobile-action-btn ${!isReadMode ? "active" : ""}`}
              onClick={() => setIsReadMode((r) => !r)}
              title={
                isReadMode
                  ? "Switch to Highlight Mode"
                  : "Switch to Read Mode"
              }
            >
              <Highlighter size={13} />
              {highlightLabel}
            </button>
          )}

          {!isPinMode && !pinPosition && (
            <button
              className="mobile-action-btn"
              onClick={() => setIsPinMode(true)}
            >
              <MapPin size={13} /> Pin
            </button>
          )}
          {!isPinMode && pinPosition && (
            <button
              className="mobile-action-btn pin-active"
              onClick={handleJumpToPin}
            >
              <MapPin size={13} /> Go to pin
            </button>
          )}
          {isPinMode && (
            <button
              className="mobile-action-btn active"
              onClick={() => setIsPinMode(false)}
            >
              <X size={13} /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mobile-tab-row" role="tablist">
        {["Word", "Sentence", "Summary", "Q/A"].map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={selectedView === v}
            className={`mobile-tab-btn ${selectedView === v ? "active" : ""}`}
            onClick={() => setSelectedView(v)}
          >
            {v}
          </button>
        ))}
      </div>

      {/* ── Full-screen PDF ── */}
      <div className="mobile-pdf-wrapper">
        {pdfUrl ? (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>

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

            {isPinMode && (
              <div className="mobile-pin-mode-hint">
                📌 Tap anywhere on the PDF
                <br />
                to place your reading pin
              </div>
            )}

            {isSavingPin && (
              <div className="mobile-pin-saving">Saving pin…</div>
            )}

            {pinPosition && !isPinMode && (
              <div className="mobile-pin-controls">
                <button
                  className="mobile-pin-btn remove"
                  onClick={handleRemovePin}
                >
                  <X size={14} /> Remove pin
                </button>
              </div>
            )}

            {selectedView === "Sentence" && !sheetOpen && (
              <div className="mobile-sentence-hint">
                Select a complete sentence to analyse
              </div>
            )}

            {selectedView === "Q/A" && qaPairs.length === 0 && (
              <div className="mobile-qa-hint">
                No Q&A pairs for this chapter
              </div>
            )}

            {selectedView === "Q/A" &&
              qaPairs.length > 0 &&
              !sheetOpen && (
                <div className="mobile-pin-controls">
                  <button
                    className="mobile-pin-btn jump"
                    onClick={() => setSheetOpen(true)}
                  >
                    ❓ View Q&A pairs
                  </button>
                </div>
              )}

            {selectedView === "Summary" && !sheetOpen && (
              <div
                className="mobile-sentence-hint"
                style={{ background: "rgba(74, 144, 226, 0.92)" }}
              >
                Tap a section marker in the PDF
              </div>
            )}

            {selectedView === "Word" && !isReadMode && (
              <div className="mobile-highlight-badge">
                ✦ Highlight mode — tap any coloured word
              </div>
            )}
          </div>
        ) : (
          <div className="pdf-placeholder">Loading…</div>
        )}

        <ReadingPanel
          text=""
          terms={terms}
          selectedView={selectedView}
          onTermClick={(term) => {
            setSelectedTerm(term);
            setSelectedWordText(term?.name || term?.rawName || "");
            setSheetOpen(true);
          }}
          onSentenceSelect={handleSentenceSelect}
        />
      </div>

      {/* ── Bottom sheet ── */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={handleCloseSheet}
        title={sheetTitle}
        icon={sheetIcon}
        maxHeight="82vh"
      >
        <AnalysisPanel
          selectedTerm={selectedTerm}
          selectedWordText={selectedWordText}
          selectedSentence={selectedSentence}
          summary=""
          chapterId={chapterId}
          selectedView={selectedView}
          selectedSectionId={selectedSectionId}
          qaPairs={qaPairs}
          termOccurrences={termOccurrences}
          displayToFileMap={displayToFileMap}
          pdfViewerRef={null}
          externalConceptMapTrigger={hasConceptMap}
        />
      </BottomSheet>
    </div>
  );
}