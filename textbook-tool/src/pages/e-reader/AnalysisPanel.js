import React, { useState, useEffect, useRef } from 'react';
import USRGraphVisualizer from '../../components/USRGraphVisualizer';
import { fetchAndParseUSR } from '../../utils/usrParser';

const BASE_URL = "http://10.1.88.14:8500";

/* ─────────────────────────────────────────
   Mobile detection
───────────────────────────────────────── */
const isMobileDevice = () => window.innerWidth < 768;

/* ─────────────────────────────────────────
   Shared mobile style tokens
───────────────────────────────────────── */
const M = {
  primary:   "#4a90e2",
  green:     "#4caf50",
  purple:    "#764ba2",
  purpleGrad:"linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  greenGrad: "linear-gradient(135deg, #43a047, #388e3c)",
  bgGray:    "#f7f8fa",
  bgBlue:    "#eef4ff",
  bgGreen:   "#f1f8e9",
  border:    "#e8eaed",


  pad:  "14px 16px",
  padS: "10px 14px",

  r:  "12px",
  rS: "8px",

  // text
  label: { fontSize: 11, fontWeight: 700, color: "#8a95a3",
           textTransform: "uppercase", letterSpacing: "0.06em" },
};

/* ─────────────────────────────────────────
   Compact section label
───────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <div style={{ ...M.label, marginBottom: 6 }}>{children}</div>
  );
}

/* ─────────────────────────────────────────
   Pill tab bar
───────────────────────────────────────── */
function PillTabs({ tabs, active, onChange }) {
  return (
    <div style={{
      display: "flex", gap: 6, marginBottom: 14,
      background: "#f0f2f5", borderRadius: 10, padding: 4,
    }}>
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            flex: 1, padding: "8px 4px",
            borderRadius: 8, border: "none",
            background: active === key ? "#fff" : "transparent",
            color: active === key ? M.primary : "#777",
            fontWeight: active === key ? 700 : 500,
            fontSize: 12,
            cursor: "pointer",
            boxShadow: active === key ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
            transition: "all 0.15s",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   Audio play button
───────────────────────────────────────── */
function AudioBtn({ loading, url, playing, onToggle }) {
  if (loading) return (
    <div style={{
      width: 28, height: 28, borderRadius: "50%",
      background: "#e8eaed", flexShrink: 0,
    }} />
  );
  if (!url) return null;
  return (
    <button
      onClick={onToggle}
      style={{
        width: 28, height: 28, borderRadius: "50%", border: "none",
        background: playing ? M.primary : "#e8eaed",
        color: playing ? "#fff" : M.primary,
        fontSize: 11, cursor: "pointer", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {playing ? "⏸" : "▶"}
    </button>
  );
}

/* ─────────────────────────────────────────
   Language selector
───────────────────────────────────────── */
function LangSelect({ onChange, placeholder = "Translate…" }) {
  return (
    <select
      onChange={e => { if (e.target.value) onChange(e.target.value); }}
      style={{
        width: "100%", padding: "10px 12px",
        borderRadius: M.rS, border: `1.5px solid ${M.border}`,
        background: "#fff", fontSize: 14, color: "#333",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
      }}
    >
      <option value="">{placeholder}</option>
      <option value="hin">हिन्दी (Hindi)</option>
      <option value="tel">తెలుగు (Telugu)</option>
      <option value="ben">বাংলা (Bengali)</option>
      <option value="gon">𑴎𑴱𑴝𑴲 / Gondi</option>
    </select>
  );
}

/* ─────────────────────────────────────────
   OccurrencePages
───────────────────────────────────────── */
function OccurrencePages({ selectedTerm, termOccurrences, displayToFileMap = {} }) {
  const [expandedPage, setExpandedPage] = useState(null);

  if (!selectedTerm || !termOccurrences) return null;

  const termKey = (selectedTerm.name || selectedTerm.rawName || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/^\W+|\W+$/g, "");

  const entries = termOccurrences[termKey];
  if (!entries || entries.length === 0) return null;

  const items = entries.map(e =>
    typeof e === "object" && e !== null ? e : { page: e, sentence: "" }
  );
  const termName = selectedTerm.name || selectedTerm.rawName || "";

  const scrollToPage = (displayPage) => {
    const pdfScroll = document.querySelector(".pdf-viewer-scroll");
    if (!pdfScroll) return;
    const filePageIndex = displayToFileMap[String(displayPage)] ?? displayPage;
    const pageEl = pdfScroll.querySelector(`[data-page-number="${filePageIndex}"]`);
    if (pageEl) pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const highlightTerm = (text, term) => {
    if (!text || !term) return text;
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${safe})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase()
        ? <mark key={i} style={{ background: "rgba(255,210,0,0.55)", borderRadius: 2, padding: "0 2px", fontWeight: 700 }}>{part}</mark>
        : part
    );
  };

  return (
    <div style={{ marginTop: 16 }}>
      <SectionLabel>📍 Found on {items.length} page{items.length !== 1 ? "s" : ""}</SectionLabel>
      <div style={{ borderRadius: M.r, border: `1px solid ${M.border}`, overflow: "hidden", background: "#fff" }}>
        {items.map(({ page, sentence }, idx) => {
          const isExpanded = expandedPage === page;
          const hasSentence = Boolean(sentence);
          const preview = sentence && sentence.length > 110 ? sentence.slice(0, 107) + "…" : sentence;

          return (
            <div key={page} style={{ borderBottom: idx < items.length - 1 ? `1px solid ${M.border}` : "none" }}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px",
                  cursor: hasSentence ? "pointer" : "default",
                  background: isExpanded ? M.bgBlue : "#fff",
                }}
                onClick={() => hasSentence && setExpandedPage(isExpanded ? null : page)}
              >
                <button
                  onClick={e => { e.stopPropagation(); scrollToPage(page); }}
                  style={{
                    flexShrink: 0, padding: "4px 10px", borderRadius: 6,
                    border: `1.5px solid ${M.primary}`, background: "#fff",
                    color: M.primary, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  Pg {page}
                </button>

                {hasSentence && (
                  <span style={{ flex: 1, fontSize: 12, color: "#555", lineHeight: 1.4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {highlightTerm(preview, termName)}
                  </span>
                )}

                {hasSentence && (
                  <span style={{ color: "#bbb", fontSize: 10, flexShrink: 0, display: "inline-block", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▼</span>
                )}
              </div>

              {isExpanded && hasSentence && (
                <div style={{ padding: "10px 12px 12px", fontSize: 13, color: "#333", lineHeight: 1.65, background: "#f7faff", borderTop: `1px dashed ${M.border}` }}>
                  {highlightTerm(sentence, termName)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   COREF helpers 
───────────────────────────────────────── */
function wrapSegment(segmentId, rawText) {
  if (rawText.includes(`<segment_id=${segmentId}>`)) return rawText.trim();
  return `<segment_id=${segmentId}>\n${rawText.trim()}\n</segment_id=${segmentId}>`;
}

function findMissingCorefSegments(usrText, alreadyIncluded) {
  const COREF_PATTERN = /\b([A-Za-z0-9_]+)\.\d+:coref/g;
  const missing = new Set();
  let match;
  while ((match = COREF_PATTERN.exec(usrText)) !== null) {
    const refId = match[1];
    if (!alreadyIncluded.has(refId)) missing.add(refId);
  }
  return missing;
}

function buildSegmentMap(cachedParagraph) {
  const map = new Map();
  if (!cachedParagraph?.sentences) return map;
  for (const sentence of cachedParagraph.sentences) {
    const segments = sentence.usr_segments || sentence.segments || [];
    for (const seg of segments) {
      const segId = seg.segment_id || seg.segId;
      if (segId) map.set(segId, { ...seg, segment_id: segId });
    }
  }
  return map;
}


/* ─────────────────────────────────────────
   Feature usage tracking + feedback
───────────────────────────────────────── */
function useFeatureTracking(feature, chapterId, domainId, active) {
  const startRef = useRef(null);

  useEffect(() => {
    if (!active || !chapterId) return;
    startRef.current = Date.now();

    return () => {
      const elapsed = startRef.current ? (Date.now() - startRef.current) / 1000 : 0;
      const user = JSON.parse(localStorage.getItem("user"));
      const userId = user?.user_id;
      if (!userId || elapsed < 0.5) return; // ignore accidental flicker views
      fetch(`${BASE_URL}/api/feature-usage/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          chapter_id: chapterId,
          feature,
          domain_id: domainId || null,
          time_spent_seconds: elapsed,
        }),
        keepalive: true, // survives tab switch/unmount
      }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature, chapterId, domainId, active]);
}

function FeedbackIcons({ feature }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.user_id;
  const [status, setStatus] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  useEffect(() => {
    if (!userId) { setLoaded(true); return; }
    fetch(`${BASE_URL}/api/feature-feedback/${userId}`)
      .then(r => r.json())
      .then(data => setStatus(data.feedback?.[feature]?.status || null))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [userId, feature]);

  const send = async (fb) => {
    if (!userId) {
      console.warn("FeedbackIcons: no user_id found in localStorage — feedback not sent");
      return;
    }
    setStatus(fb);
    setShowThanks(true);
    setTimeout(() => setShowThanks(false), 2600);
    try {
      const res = await fetch(`${BASE_URL}/api/feature-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, feature, feedback: fb }),
      });
      const data = await res.json();
      setStatus(data.status);
    } catch {}
  };

  if (!loaded) return null;
  if (status === "up" && !showThanks) return null;

  return (
    <div style={{ marginTop: 8, position: "relative" }}>
      <style>{`
        @keyframes feedbackPop {
          0%   { opacity: 0; transform: translateY(6px) scale(0.9); }
          60%  { opacity: 1; transform: translateY(-2px) scale(1.03); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes feedbackFade {
          0%   { opacity: 1; }
          80%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes feedbackCheckPop {
          0%   { transform: scale(0); }
          50%  { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `}</style>

      {status !== "up" && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#999" }}>Useful?</span>
          <button onClick={() => send("up")} title="Useful"
            style={{ border: `1px solid ${M.border}`, background: "#fff", borderRadius: M.rS, padding: "4px 10px", cursor: "pointer", fontSize: 13 }}>
            👍
          </button>
          <button onClick={() => send("down")} title="Not useful"
            style={{ border: `1px solid ${M.border}`, background: "#fff", borderRadius: M.rS, padding: "4px 10px", cursor: "pointer", fontSize: 13 }}>
            👎
          </button>
        </div>
      )}

      {showThanks && (
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8,
            marginTop: status !== "up" ? 8 : 0,
            padding: "8px 14px",
            borderRadius: 999,
            background: M.greenGrad,
            color: "#fff",
            fontSize: 13, fontWeight: 700,
            width: "fit-content",
            boxShadow: "0 4px 14px rgba(76,175,80,0.35)",
            animation: "feedbackPop 0.35s ease-out, feedbackFade 2.6s ease-out forwards",
          }}
        >
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 18, height: 18, borderRadius: "50%",
            background: "rgba(255,255,255,0.25)",
            fontSize: 11,
            animation: "feedbackCheckPop 0.4s ease-out 0.15s both",
          }}>
            ✓
          </span>
          <span>Thanks! Your feedback helps improve this 🎉</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN ANALYSIS PANEL
═══════════════════════════════════════════ */
export default function AnalysisPanel({
  selectedTerm,
  selectedWordText,
  selectedSentence,
  summary,
  chapterId,
  selectedView,
  selectedSectionId,
  qaPairs,
  termOccurrences = {},
  displayToFileMap = {},
  pdfViewerRef = null,
  externalConceptMapTrigger = false,
}) {
  const mobile = isMobileDevice();

  const [activeTab, setActiveTab] = useState("Define");
  const [definition, setDefinition] = useState("");
  const [translatedDef, setTranslatedDef] = useState("");
  const [zoom, setZoom] = useState(1);
  const [labelledImg, setLabelledImg] = useState(null);
  const [video, setVideo] = useState(null);
  const [translatedSentence, setTranslatedSentence] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sectionSummary, setSectionSummary] = useState("");
  const [translatedSections, setTranslatedSections] = useState({});
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showSummaryHint, setShowSummaryHint] = useState(true);
  const [hasImage, setHasImage] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [activeSentenceSubTab, setActiveSentenceSubTab] = useState("sentenceTranslation");
  const [showGraphFullscreen, setShowGraphFullscreen] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [paragraphData, setParagraphData] = useState(null);
  const [paragraphLoading, setParagraphLoading] = useState(false);
  const [selectedParagraphSentence, setSelectedParagraphSentence] = useState(null);
  const [usrLoading, setUsrLoading] = useState(false);
  const [usrText, setUsrText] = useState("");
  const [cachedParagraphUSR, setCachedParagraphUSR] = useState(null);

  // Concept map (taxonomy) state
  const [conceptMapUrl, setConceptMapUrl] = useState(null);
  const [conceptMapLoading, setConceptMapLoading] = useState(false);
  const [conceptMapError, setConceptMapError] = useState(false);
  const [conceptMapZoom, setConceptMapZoom] = useState(1);

  // Audio state
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const [defAudioUrl, setDefAudioUrl] = useState(null);
  const [defAudioLoading, setDefAudioLoading] = useState(false);
  const [defIsPlaying, setDefIsPlaying] = useState(false);
  const defAudioRef = useRef(null);

  const [transAudioUrl, setTransAudioUrl] = useState(null);
  const [transAudioLoading, setTransAudioLoading] = useState(false);
  const [transIsPlaying, setTransIsPlaying] = useState(false);
  const transAudioRef = useRef(null);

  const [secAudioUrl, setSecAudioUrl] = useState(null);
  const [secAudioLoading, setSecAudioLoading] = useState(false);
  const [secIsPlaying, setSecIsPlaying] = useState(false);
  const secAudioRef = useRef(null);

  const [secTransAudioUrl, setSecTransAudioUrl] = useState(null);
  const [secTransAudioLoading, setSecTransAudioLoading] = useState(false);
  const [secTransIsPlaying, setSecTransIsPlaying] = useState(false);
  const secTransAudioRef = useRef(null);

  // Image popup
  const [popupImg, setPopupImg] = useState(null);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [initialTranslate, setInitialTranslate] = useState({ x: 0, y: 0 });
  const [initialPinchDistance, setInitialPinchDistance] = useState(null);
  const [initialPinchZoom, setInitialPinchZoom] = useState(1);

  const getDynamicFontSize = (text = "") => {
    const len = text?.length || 0;
    if (len < 200) return mobile ? "16px" : "18px";
    if (len < 500) return mobile ? "15px" : "16px";
    if (len < 1000) return "15px";
    return mobile ? "14px" : "13px";
  };

  useFeatureTracking("definition", chapterId, selectedTerm?.domain_id, activeTab === "Define" && !!selectedTerm);
  useFeatureTracking("labelled_image", chapterId, selectedTerm?.domain_id, activeTab === "Media" && !!labelledImg);
  useFeatureTracking("taxonomy", chapterId, selectedTerm?.domain_id, activeTab === "ConceptMap" && !!conceptMapUrl);

  /* ── Audio helpers ── */
  const clearAudio = () => {
    setIsPlaying(false); setAudioLoading(false);
    if (audioRef.current) { try { audioRef.current.pause(); audioRef.current.src = ""; } catch (_) {} audioRef.current = null; }
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
  };
  const clearDefAudio = () => {
    setDefIsPlaying(false); setDefAudioLoading(false);
    if (defAudioRef.current) { try { defAudioRef.current.pause(); defAudioRef.current.src = ""; } catch (_) {} defAudioRef.current = null; }
    if (defAudioUrl) { URL.revokeObjectURL(defAudioUrl); setDefAudioUrl(null); }
  };
  const clearTransAudio = () => {
    setTransIsPlaying(false); setTransAudioLoading(false);
    if (transAudioRef.current) { try { transAudioRef.current.pause(); transAudioRef.current.src = ""; } catch (_) {} transAudioRef.current = null; }
    if (transAudioUrl) { URL.revokeObjectURL(transAudioUrl); setTransAudioUrl(null); }
  };
  const clearSecAudio = () => {
    setSecIsPlaying(false); setSecAudioLoading(false);
    if (secAudioRef.current) { try { secAudioRef.current.pause(); secAudioRef.current.src = ""; } catch (_) {} secAudioRef.current = null; }
    if (secAudioUrl) { URL.revokeObjectURL(secAudioUrl); setSecAudioUrl(null); }
  };
  const clearSecTransAudio = () => {
    setSecTransIsPlaying(false); setSecTransAudioLoading(false);
    if (secTransAudioRef.current) { try { secTransAudioRef.current.pause(); secTransAudioRef.current.src = ""; } catch (_) {} secTransAudioRef.current = null; }
    if (secTransAudioUrl) { URL.revokeObjectURL(secTransAudioUrl); setSecTransAudioUrl(null); }
  };

  const makeAudioToggle = (ref, url, setUrl, playing, setPlaying) => () => {
    if (!ref.current) {
      if (url) { ref.current = new Audio(url); ref.current.onended = () => setPlaying(false); }
      else return;
    }
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play().then(() => setPlaying(true)).catch(console.error); }
  };

  const togglePlay      = makeAudioToggle(audioRef,     audioUrl,     setAudioUrl,     isPlaying,     setIsPlaying);
  const toggleDefPlay   = makeAudioToggle(defAudioRef,  defAudioUrl,  setDefAudioUrl,  defIsPlaying,  setDefIsPlaying);
  const toggleTransPlay = makeAudioToggle(transAudioRef,transAudioUrl,setTransAudioUrl,transIsPlaying,setTransIsPlaying);
  const toggleSecPlay      = makeAudioToggle(secAudioRef,     secAudioUrl,     setSecAudioUrl,     secIsPlaying,     setSecIsPlaying);
  const toggleSecTransPlay = makeAudioToggle(secTransAudioRef,secTransAudioUrl,setSecTransAudioUrl,secTransIsPlaying,setSecTransIsPlaying);

  const base64ToUrl = (b64, mime = "audio/mpeg") => {
    const idx = b64.indexOf("base64,");
    if (idx !== -1) b64 = b64.slice(idx + 7);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes.buffer], { type: mime }));
  };

  const loadDefinitionAudio = async (term) => {
    clearDefAudio();
    if (!term?.domain_id || !chapterId) return;
    try {
      setDefAudioLoading(true);
      const res = await fetch(`${BASE_URL}/api/get-definition-audio?chapter_id=${chapterId}&domain_id=${term.domain_id}`);
      if (!res.ok) return;
      const url = URL.createObjectURL(await res.blob());
      setDefAudioUrl(url);
      defAudioRef.current = new Audio(url);
      defAudioRef.current.onended = () => setDefIsPlaying(false);
    } catch (err) { console.warn("Def audio:", err); } finally { setDefAudioLoading(false); }
  };

  const loadTranslationAudio = async (lang, term) => {
    clearTransAudio();
    if (!term?.domain_id || !chapterId || !lang) return;
    try {
      setTransAudioLoading(true);
      const res = await fetch(`${BASE_URL}/api/get-definition-audio-translation?chapter_id=${chapterId}&domain_id=${term.domain_id}&language=${lang}`);
      if (!res.ok) return;
      const url = URL.createObjectURL(await res.blob());
      setTransAudioUrl(url);
      transAudioRef.current = new Audio(url);
      transAudioRef.current.onended = () => setTransIsPlaying(false);
    } catch (err) { console.warn("Trans audio:", err); } finally { setTransAudioLoading(false); }
  };

  const prepareAudioFromTerm = async (term) => {
    clearAudio();
    if (!term) return;
    if (term.audio_binary) {
      try {
        setAudioLoading(true);
        const url = base64ToUrl(term.audio_binary, term.audio_mime || "audio/mpeg");
        setAudioUrl(url);
        audioRef.current = new Audio(url);
        audioRef.current.onended = () => setIsPlaying(false);
      } catch (err) { console.error("Audio decode:", err); } finally { setAudioLoading(false); }
      return;
    }
    try {
      setAudioLoading(true);
      const res = await fetch(`${BASE_URL}/audio/${term.domain_id}`);
      if (!res.ok) return;
      const url = URL.createObjectURL(await res.blob());
      setAudioUrl(url);
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setIsPlaying(false);
    } catch (err) { console.warn("Audio:", err); } finally { setAudioLoading(false); }
  };

  const loadSectionSummaryAudio = async (sectionId) => {
    clearSecAudio();
    if (!sectionId || !chapterId) return;
    try {
      setSecAudioLoading(true);
      const res = await fetch(`${BASE_URL}/api/get-section-summary-audio?chapter_id=${chapterId}&section_id=${sectionId}`);
      if (!res.ok) return;
      const url = URL.createObjectURL(await res.blob());
      setSecAudioUrl(url);
      secAudioRef.current = new Audio(url);
      secAudioRef.current.onended = () => setSecIsPlaying(false);
    } catch (err) { console.warn("Sec audio:", err); } finally { setSecAudioLoading(false); }
  };

  const loadSectionTranslationAudio = async (sectionId, lang) => {
    clearSecTransAudio();
    if (!sectionId || !chapterId || !lang) return;
    try {
      setSecTransAudioLoading(true);
      const res = await fetch(`${BASE_URL}/api/get-section-summary-audio-translation?chapter_id=${chapterId}&section_id=${sectionId}&language=${lang}`);
      if (!res.ok) return;
      const url = URL.createObjectURL(await res.blob());
      setSecTransAudioUrl(url);
      secTransAudioRef.current = new Audio(url);
      secTransAudioRef.current.onended = () => setSecTransIsPlaying(false);
    } catch (err) { console.warn("Sec trans audio:", err); } finally { setSecTransAudioLoading(false); }
  };

  /* ── Concept map (taxonomy) ── */
  const clearConceptMap = () => {
    setConceptMapZoom(1);
    setConceptMapError(false);
    setConceptMapLoading(false);
    setConceptMapUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const loadConceptMap = async (term) => {
    clearConceptMap();
    if (!term?.domain_id || !chapterId) { setConceptMapError(true); return; }
    try {
      setConceptMapLoading(true);
      const res = await fetch(`${BASE_URL}/taxonomy-image/${chapterId}/${term.domain_id}`);
      if (!res.ok) { setConceptMapError(true); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setConceptMapUrl(url);
    } catch (err) {
      console.warn("Concept map:", err);
      setConceptMapError(true);
    } finally {
      setConceptMapLoading(false);
    }
  };

  /* ── Effects ── */
  useEffect(() => {
    if (selectedTerm && chapterId) {
      setDefinition(selectedTerm.definition || "");
      setTranslatedDef("");
      setImageError(false); setVideoError(false); setHasImage(false); setHasVideo(false);
      setActiveTab("Define");
      prepareAudioFromTerm(selectedTerm);
      loadDefinitionAudio(selectedTerm);
      clearTransAudio();
      clearConceptMap();
    } else {
      setDefinition(""); setTranslatedDef("");
      setImageError(false); setVideoError(false); setHasImage(false); setHasVideo(false);
      clearAudio(); clearDefAudio(); clearTransAudio();
      clearConceptMap();
    }
  }, [selectedTerm, chapterId]);

  useEffect(() => () => { clearAudio(); clearDefAudio(); clearTransAudio(); clearSecAudio(); clearSecTransAudio(); clearConceptMap(); }, []);

  useEffect(() => {
    if (activeTab !== "Media" || !selectedTerm) return;
    const check = async () => {
      try { const r = await fetch(`${BASE_URL}/image/${selectedTerm.domain_id}`, { headers: { Range: "bytes=0-0" } }); setHasImage(r.ok); } catch { setHasImage(false); }
      try { const r = await fetch(`${BASE_URL}/video/${selectedTerm.domain_id}`, { headers: { Range: "bytes=0-0" } }); setHasVideo(r.ok); } catch { setHasVideo(false); }
    };
    check();
  }, [activeTab, selectedTerm]);

  useEffect(() => {
    if (activeTab === "ConceptMap" && selectedTerm && chapterId && !conceptMapUrl && !conceptMapLoading) {
      loadConceptMap(selectedTerm);
    }
  }, [activeTab, selectedTerm, chapterId]);

  useEffect(() => {
    if (externalConceptMapTrigger && selectedTerm) {
      setActiveTab("ConceptMap");
    }
  }, [externalConceptMapTrigger]);


  useEffect(() => {
    if (selectedView === "Summary" && selectedSectionId && chapterId) {
      fetchSingleSection(selectedSectionId);
      loadSectionSummaryAudio(selectedSectionId);
      clearSecTransAudio();
    } else {
      setSectionSummary(""); setTranslatedSections({});
      clearSecAudio(); clearSecTransAudio();
    }
  }, [selectedSectionId, selectedView, chapterId]);

  useEffect(() => {
    if (selectedSentence && selectedView === "Sentence") {
      const load = async () => {
        setParagraphData(null); setSelectedParagraphSentence(null);
        setUsrText(""); setShowGraph(false);
        const data = await fetchParagraphWithUSRStatus(selectedSentence);
        if (data?.success) setParagraphData(data);
        else setParagraphData(null);
      };
      load();
    }
  }, [selectedSentence, selectedView, chapterId]);

  useEffect(() => {
    if (selectedParagraphSentence && selectedView === "Sentence") loadUSRForSentence(selectedParagraphSentence);
  }, [selectedParagraphSentence, selectedView, chapterId]);

  useEffect(() => { if (popupImg) { setZoom(1); setTranslateX(0); setTranslateY(0); } }, [popupImg]);

  /* ── API calls ── */
  const fetchSingleSection = async (sectionId) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${BASE_URL}/section-summary/?chapter_id=${chapterId}&section_id=${sectionId}`);
      const data = await res.json();
      setSectionSummary(data.section_summary || "No summary available.");
    } catch { setSectionSummary("Error fetching summary."); } finally { setIsLoading(false); }
  };

  const translateDefinition = async (lang) => {
    if (!selectedTerm || !lang) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${BASE_URL}/translate/definition/?chapter_id=${chapterId}&domain_id=${selectedTerm.domain_id}&target_language=${lang}`);
      const data = await res.json();
      setTranslatedDef(data.translated_definition?.data || data.translated_definition || "Translation unavailable.");
    } catch {} finally { setIsLoading(false); }
    loadTranslationAudio(lang, selectedTerm);
  };

  const translateSentence = async (lang) => {
    if (!selectedSentence) return;
    try {
      setIsLoading(true); setTranslatedSentence("");
      const res = await fetch(`${BASE_URL}/translate/sentence/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_id: chapterId, sentence: selectedSentence, target_language: lang }),
      });
      const data = await res.json();
      setTranslatedSentence(typeof data.translated_sentence === "string" ? data.translated_sentence : data.translated_sentence?.data || "Translation unavailable.");
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const translateSectionSummary = async (sectionId, lang) => {
    if (!lang) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${BASE_URL}/translate/section-summary/?chapter_id=${chapterId}&section_id=${sectionId}&target_language=${lang}`);
      const data = await res.json();
      setTranslatedSections(prev => ({ ...prev, [sectionId]: data.translated_section_summary?.data || data.translated_section_summary || "Translation unavailable." }));
    } catch {} finally { setIsLoading(false); }
    loadSectionTranslationAudio(sectionId, lang);
  };

  const loadImages = async () => {
    if (!selectedTerm) return;
    setImageError(false);
    try {
      setIsLoading(true);
      const res = await fetch(`${BASE_URL}/image/${selectedTerm.domain_id}`);
      if (!res.ok) { setLabelledImg(null); setImageError(true); return; }
      setLabelledImg(`${BASE_URL}/image/${selectedTerm.domain_id}`);
    } catch { setImageError(true); } finally { setIsLoading(false); }
  };

   

    const loadVideo = async () => {
    if (!selectedTerm) return;
    try {
      setIsLoading(true);
      setVideoError(false);
      
      let url = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch(`${BASE_URL}/video/${selectedTerm.domain_id}`);
        if (res.ok) { url = `${BASE_URL}/video/${selectedTerm.domain_id}`; break; }
        if (attempt < 2) await new Promise(r => setTimeout(r, 800));
      }
      
      if (url) setVideo(url);
      else { setVideo(null); setVideoError(true); setHasVideo(false); }
    } catch {
      setVideo(null); setVideoError(true); setHasVideo(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchParagraphWithUSRStatus = async (sentence) => {
    if (!sentence || !chapterId) return null;
    try {
      setParagraphLoading(true);
      const response = await fetch(`${BASE_URL}/get-paragraph-with-usr-status/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_id: chapterId, sentence_text: sentence }),
      });
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      if (data.success && data.hasSimplified) {
        const batchRequest = {
          chapter_id: chapterId,
          original_paragraph: data.original_paragraph || sentence,
          simplified_paragraph: data.paragraph,
          sentences: data.sentences.map(s => ({ sentence: s.text })),
        };
        const usrResponse = await fetch(`${BASE_URL}/get-sentence-usrs-batch/`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batchRequest),
        });
        const usrData = await usrResponse.json();
        if (usrData.success) {
          const enrichedSentences = data.sentences.map((sent, idx) => ({
            ...sent,
            parsed_usrs: usrData.sentences[idx]?.parsed_usrs || [],
            usr_segments: usrData.sentences[idx]?.usr_segments || [],
          }));
          const enrichedData = { ...data, sentences: enrichedSentences, usrData };
          setCachedParagraphUSR(enrichedData);
          return enrichedData;
        }
        return data;
      }
      return data;
    } catch (error) { console.error("Error fetching paragraph:", error); return null; }
    finally { setParagraphLoading(false); }
  };

  const loadUSRForSentence = async (sentence) => {
    if (!sentence || !chapterId) return;
    setUsrLoading(true); setUsrText(""); setShowGraph(false);
    try {
      if (cachedParagraphUSR?.sentences) {
        const foundSentence = cachedParagraphUSR.sentences.find(s => s.text === sentence);
        const hasSegments = (foundSentence?.parsed_usrs?.length > 0) || (foundSentence?.usr_segments?.length > 0);
        if (foundSentence && hasSegments) {
          const segmentMap = buildSegmentMap(cachedParagraphUSR);
          const alreadyIncluded = new Set();
          const parts = [];
          for (const seg of (foundSentence.usr_segments ?? [])) {
            let segId = seg.segment_id || seg.segId;
            if (!segId) { segId = seg.id || seg._id || seg.seg_id; if (!segId) continue; }
            const segText = seg.text || seg.content || "";
            parts.push(wrapSegment(segId, segText));
            alreadyIncluded.add(segId);
          }
          let combinedUSR = parts.join("\n\n");
          let depth = 0;
          while (depth < 5) {
            const missing = findMissingCorefSegments(combinedUSR, alreadyIncluded);
            if (missing.size === 0) break;
            let anyPulled = false;
            for (const refId of missing) {
              const referencedSeg = segmentMap.get(refId);
              if (!referencedSeg) { alreadyIncluded.add(refId); continue; }
              const refText = referencedSeg.text || referencedSeg.content || "";
              combinedUSR += "\n\n" + wrapSegment(referencedSeg.segment_id, refText);
              alreadyIncluded.add(refId); anyPulled = true;
            }
            if (!anyPulled) break;
            depth++;
          }
          if (combinedUSR?.trim()) { setUsrText(combinedUSR); setShowGraph(true); }
          setUsrLoading(false);
          return;
        }
      }
      const result = await fetchAndParseUSR(chapterId, sentence, BASE_URL);
      if (result?.usrText) { setUsrText(result.usrText); setShowGraph(true); }
    } catch (error) { console.error("Error loading USR:", error); }
    finally { setUsrLoading(false); }
  };

  // Image popup
  const openImagePopup = (url) => { setPopupImg(null); requestAnimationFrame(() => { setZoom(1); setTranslateX(0); setTranslateY(0); setPopupImg(url); }); };
  const closeImagePopup = () => setPopupImg(null);
  const startPan = (e) => { e.preventDefault(); setPanning(true); setPanStart({ x: e.clientX, y: e.clientY }); setInitialTranslate({ x: translateX, y: translateY }); };
  const panImage = (e) => { if (!panning) return; setTranslateX(initialTranslate.x + e.clientX - panStart.x); setTranslateY(initialTranslate.y + e.clientY - panStart.y); };
  const endPan = () => setPanning(false);
  const getDistance = (touches) => { const [a, b] = touches; return Math.sqrt((a.clientX - b.clientX) ** 2 + (a.clientY - b.clientY) ** 2); };
  const startPinch = (e) => { if (e.touches.length === 2) { setInitialPinchDistance(getDistance(e.touches)); setInitialPinchZoom(zoom); } };
  const handlePinch = (e) => { if (e.touches.length === 2) { const scale = getDistance(e.touches) / initialPinchDistance; setZoom(Math.min(4, Math.max(1, initialPinchZoom * scale))); } };
  const endPinch = () => setInitialPinchDistance(null);
  const toggleDoubleTapZoom = () => { setZoom(z => z === 1 ? 2 : 1); setTranslateX(0); setTranslateY(0); };

  const panelPad = mobile ? "12px 14px" : "20px";

  /* ══════════════════════════════════════════
     SENTENCE VIEW
  ══════════════════════════════════════════ */
  if (selectedView === "Sentence") return (
    <div style={{ padding: panelPad, overflowY: "auto", height: "100%" }}>

      <PillTabs
        tabs={[
          { key: "sentenceTranslation", label: "🌐 Translate" },
          { key: "sentenceAnalysis", label: "🔬 Analysis" },
        ]}
        active={activeSentenceSubTab}
        onChange={setActiveSentenceSubTab}
      />

      {/* Simplified Paragraph — only for Analysis */}
      {activeSentenceSubTab === "sentenceAnalysis" && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px",
            background: M.greenGrad,
            borderRadius: `${M.r} ${M.r} 0 0`,
            color: "#fff",
          }}>
            <span style={{ fontSize: 13 }}>📖</span>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Simplified Paragraph</span>
            {paragraphData?.from_cache && (
              <span style={{ marginLeft: "auto", fontSize: 10, background: "rgba(255,255,255,0.2)", padding: "2px 7px", borderRadius: 10 }}>Cached</span>
            )}
          </div>
          <div style={{ background: M.bgGreen, borderRadius: `0 0 ${M.r} ${M.r}`, padding: "12px 14px", border: `1px solid #c8e6c9`, borderTop: "none" }}>
            {paragraphLoading ? (
              <div style={{ textAlign: "center", color: "#888", padding: "20px 0" }}>
                <div className="spinner" style={{ margin: "0 auto 8px" }} />
                <div style={{ fontSize: 13 }}>Loading paragraph…</div>
              </div>
            ) : paragraphData?.sentences?.length > 0 ? (
              <div style={{ lineHeight: 1.85, fontSize: 14 }}>
                {paragraphData.sentences.map((sentence, idx) => {
                  const isCurrent = sentence.text === selectedParagraphSentence;
                  const hasUSR = sentence.hasUSR;
                  return (
                    <span
                      key={idx}
                      onClick={() => {
                        if (hasUSR) setSelectedParagraphSentence(sentence.text);
                        else alert("No semantic analysis available for this sentence yet.");
                      }}
                      style={{
                        cursor: hasUSR ? "pointer" : "not-allowed",
                        backgroundColor: isCurrent ? "#fff3e0" : "transparent",
                        borderBottom: hasUSR ? "2px solid #4caf50" : "1px solid #ccc",
                        borderRadius: 3, padding: "1px 3px", margin: "0 1px",
                        display: "inline",
                        fontWeight: isCurrent ? 600 : 400,
                        opacity: hasUSR ? 1 : 0.55,
                      }}
                      title={hasUSR ? "Tap to view analysis" : "No analysis available"}
                    >
                      {sentence.text}{idx < paragraphData.sentences.length - 1 ? " " : ""}
                    </span>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "#888", fontSize: 13, padding: "12px 0" }}>
                {paragraphData?.error || "No paragraph available"}
              </div>
            )}
          </div>
        </div>
      )}

      
      {/* Translation sub-tab */}
      {activeSentenceSubTab === "sentenceTranslation" && (
        selectedSentence ? (
          <div>
            <div style={{
              background: M.bgBlue,
              borderRadius: M.rS,
              padding: "10px 12px",
              marginBottom: 14,
              border: "1px solid #c5d9f7"
            }}>
              <div style={{ ...M.label, marginBottom: 4 }}>
                🌐 Translating
              </div>

              <div style={{
                fontSize: 13,
                color: "#444"
              }}>
                "{selectedSentence.length > 80
                  ? selectedSentence.slice(0, 80) + "…"
                  : selectedSentence}"
              </div>
            </div>

            <LangSelect
              onChange={translateSentence}
              placeholder="Select language…"
            />

            {isLoading && (
              <div style={{
                marginTop: 12,
                textAlign: "center",
                fontSize: 13,
                color: "#888"
              }}>
                Translating…
              </div>
            )}

            {translatedSentence && !isLoading && (
              <div style={{
                marginTop: 12,
                background: "#eef9f5",
                border: "1px solid #b2dfdb",
                borderRadius: M.rS,
                padding: "12px 14px",
                fontSize: 15,
                lineHeight: 1.7
              }}>
                {translatedSentence}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            textAlign: "center",
            padding: "30px 0",
            color: "#aaa",
            background: M.bgGray,
            borderRadius: M.r
          }}>
            <div style={{ fontSize: 13 }}>
              Select a sentence in the PDF first
            </div>
          </div>
        )
      )}

      {/* Fullscreen graph */}
      {showGraphFullscreen && usrText && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <button onClick={() => setShowGraphFullscreen(false)} style={{ position: "absolute", top: 20, right: 20, padding: "10px 18px", background: "#d9534f", color: "#fff", border: "none", borderRadius: M.rS, cursor: "pointer", fontWeight: 700 }}>✕ Close</button>
          <div style={{ width: "95%", height: "90%", background: "#fff", borderRadius: M.r, overflow: "auto", padding: 16 }}>
            <USRGraphVisualizer initialText={usrText} />
          </div>
        </div>
      )}
    </div>
  );

  /* ══════════════════════════════════════════
     SUMMARY VIEW
  ══════════════════════════════════════════ */
  if (selectedView === "Summary") return (
    <div style={{ padding: panelPad, overflowY: "auto", height: "100%" }}>

      {!selectedSectionId && showSummaryHint && (
        <div onClick={() => setShowSummaryHint(false)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#fff3cd", borderRadius: M.r, marginBottom: 14, cursor: "pointer", border: "1px solid #ffc107" }}>
          <span style={{ fontSize: 20 }}>👉</span>
          <span style={{ fontSize: 13, color: "#7a5c00" }}>Tap a section marker in the PDF to load its summary</span>
        </div>
      )}

      {sectionSummary && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <SectionLabel>📝 Section Summary</SectionLabel>
            <AudioBtn loading={secAudioLoading} url={secAudioUrl} playing={secIsPlaying} onToggle={toggleSecPlay} />
          </div>
          <div style={{ background: M.bgGray, borderRadius: M.r, padding: "14px 16px", fontSize: getDynamicFontSize(sectionSummary), lineHeight: 1.75, color: "#222", border: `1px solid ${M.border}` }}>
            {sectionSummary}
          </div>
        </div>
      )}

      {selectedSectionId && (
        <div>
          <SectionLabel>🌐 Translate Summary</SectionLabel>
          <LangSelect onChange={(lang) => translateSectionSummary(selectedSectionId, lang)} />
          {isLoading && <div style={{ marginTop: 10, textAlign: "center", fontSize: 13, color: "#888" }}>Translating…</div>}
          {translatedSections[selectedSectionId] && !isLoading && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <SectionLabel>Translated</SectionLabel>
                <AudioBtn loading={secTransAudioLoading} url={secTransAudioUrl} playing={secTransIsPlaying} onToggle={toggleSecTransPlay} />
              </div>
              <div style={{ background: "#eef9f5", border: "1px solid #b2dfdb", borderRadius: M.r, padding: "14px 16px", fontSize: getDynamicFontSize(translatedSections[selectedSectionId]), lineHeight: 1.75 }}>
                {translatedSections[selectedSectionId]}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  /* ══════════════════════════════════════════
     Q/A VIEW
  ══════════════════════════════════════════ */
  if (selectedView === "Q/A") return (
    <div style={{ padding: panelPad, overflowY: "auto", height: "100%" }}>
      {qaPairs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
          <div style={{ fontSize: 14 }}>No Q&A pairs for this chapter</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {qaPairs.map((item, index) => (
            <div key={index} style={{ borderRadius: M.r, border: `1px solid ${M.border}`, overflow: "hidden", background: "#fff" }}>
              <div style={{ padding: "10px 14px", background: M.bgBlue, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontWeight: 800, color: M.primary, fontSize: 13, flexShrink: 0 }}>Q{index + 1}</span>
                <span style={{ fontSize: 14, color: "#222", lineHeight: 1.5, fontWeight: 500 }}>{item.question}</span>
              </div>
              <div style={{ padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontWeight: 700, color: M.green, fontSize: 13, flexShrink: 0 }}>A</span>
                <p style={{ margin: 0, fontSize: 14, color: "#444", lineHeight: 1.6 }}>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ══════════════════════════════════════════
     WORD VIEW
  ══════════════════════════════════════════ */
  return (
  <div style={{ padding: panelPad, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Word header chip */}
      {selectedWordText && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px",
          background: M.purpleGrad,
          borderRadius: M.r, color: "#fff", marginBottom: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🔍</span>
            <strong style={{ fontSize: 17, letterSpacing: "-0.2px" }}>{selectedWordText}</strong>
          </div>
          <AudioBtn loading={audioLoading} url={audioUrl} playing={isPlaying} onToggle={togglePlay} />
        </div>
      )}

      {/* Tab bar */}
      <PillTabs
        tabs={[
          { key: "Define",      label: "📖 Define" },
          { key: "Media",       label: "🎬 Media" },
          { key: "ConceptMap",  label: "🗺️ Concept Map" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* ── DEFINE ── */}
      {activeTab === "Define" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <SectionLabel>Definition</SectionLabel>
            <AudioBtn loading={defAudioLoading} url={defAudioUrl} playing={defIsPlaying} onToggle={toggleDefPlay} />
          </div>

          <div style={{
            fontSize: getDynamicFontSize(definition),
            lineHeight: 1.75, color: "#1a1a1a",
            background: M.bgGray, borderRadius: M.r,
            padding: "14px 16px", marginBottom: 16,
            border: `1px solid ${M.border}`,
          }}>
            {definition || "No definition available."}
          </div>

          <SectionLabel>🌐 Translate Definition</SectionLabel>
          <LangSelect onChange={translateDefinition} />

          {isLoading && <div style={{ marginTop: 10, textAlign: "center", fontSize: 13, color: "#888" }}>Translating…</div>}

          {translatedDef && !isLoading && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <SectionLabel>Translated</SectionLabel>
                <AudioBtn loading={transAudioLoading} url={transAudioUrl} playing={transIsPlaying} onToggle={toggleTransPlay} />
              </div>
              <div style={{
                fontSize: getDynamicFontSize(translatedDef),
                lineHeight: 1.75, background: "#eef9f5",
                border: "1px solid #b2dfdb", borderRadius: M.r,
                padding: "14px 16px",
              }}>
                {translatedDef}
              </div>
            </div>
          )}
          <FeedbackIcons feature="definition" />

          <OccurrencePages selectedTerm={selectedTerm} termOccurrences={termOccurrences} displayToFileMap={displayToFileMap} />
        </div>
      )}

      {/* ── MEDIA ── */}
      {activeTab === "Media" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button
              onClick={loadImages}
              disabled={!hasImage || isLoading}
              style={{
                flex: 1, padding: "11px 8px", borderRadius: M.rS, border: "none",
                background: hasImage ? M.primary : "#e0e0e0",
                color: hasImage ? "#fff" : "#aaa",
                fontWeight: 600, fontSize: 13, cursor: hasImage ? "pointer" : "not-allowed",
              }}
            >
              📷 Labelled Image
            </button>
            <button
              onClick={loadVideo}
              disabled={!hasVideo || isLoading}
              style={{
                flex: 1, padding: "11px 8px", borderRadius: M.rS, border: "none",
                background: hasVideo ? M.primary : "#e0e0e0",
                color: hasVideo ? "#fff" : "#aaa",
                fontWeight: 600, fontSize: 13, cursor: hasVideo ? "pointer" : "not-allowed",
              }}
            >
              🎞 Process Video
            </button>
          </div>

          {isLoading && <div style={{ padding: "30px 0", textAlign: "center", color: "#888", fontSize: 13 }}>Loading…</div>}
          {!isLoading && imageError && <div style={{ color: "#d9534f", fontSize: 13, marginBottom: 8 }}>⚠️ No labelled image available.</div>}
          {!isLoading && videoError && <div style={{ color: "#d9534f", fontSize: 13 }}>⚠️ No process video available.</div>}

          {labelledImg && !imageError && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} style={{ padding: "6px 12px", borderRadius: M.rS, border: `1px solid ${M.border}`, background: "#fff", cursor: "pointer" }}>＋</button>
                <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} style={{ padding: "6px 12px", borderRadius: M.rS, border: `1px solid ${M.border}`, background: "#fff", cursor: "pointer" }}>－</button>
                <button onClick={() => openImagePopup(labelledImg)} style={{ padding: "6px 14px", borderRadius: M.rS, border: `1px solid ${M.border}`, background: "#fff", cursor: "pointer", fontSize: 13 }}>⛶ Full</button>
                <FeedbackIcons feature="labelled_image" />
              </div>
              <img src={labelledImg} alt="Labelled" style={{ transform: `scale(${zoom})`, maxWidth: "100%", borderRadius: M.rS, transformOrigin: "top left" }} />
            </div>
          )}

          {video && <video src={video} controls style={{ width: "100%", borderRadius: M.rS }} />}
        </div>
      )}

      {/* ── CONCEPT MAP ── */}
      {activeTab === "ConceptMap" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {!selectedTerm ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#aaa", background: M.bgGray, borderRadius: M.r }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🗺️</div>
              <div style={{ fontSize: 13 }}>Select a term first to view its concept map</div>
            </div>
          ) : conceptMapLoading ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#888" }}>
              <div className="spinner" style={{ margin: "0 auto 8px" }} />
              <div style={{ fontSize: 13 }}>Generating concept map…</div>
            </div>
          ) : conceptMapError ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#d9534f", background: M.bgGray, borderRadius: M.r }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
              <div style={{ fontSize: 13 }}>No concept map available for this term.</div>
              <button
                onClick={() => loadConceptMap(selectedTerm)}
                style={{ marginTop: 12, padding: "8px 16px", borderRadius: M.rS, border: `1.5px solid ${M.primary}`, background: "#fff", color: M.primary, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                Retry
              </button>
            </div>
          ) : conceptMapUrl ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexShrink: 0 }}>
                <button onClick={() => setConceptMapZoom(z => Math.min(3, z + 0.2))} style={{ padding: "6px 12px", borderRadius: M.rS, border: `1px solid ${M.border}`, background: "#fff", cursor: "pointer" }}>＋</button>
                <button onClick={() => setConceptMapZoom(z => Math.max(1, z - 0.2))} style={{ padding: "6px 12px", borderRadius: M.rS, border: `1px solid ${M.border}`, background: "#fff", cursor: "pointer" }}>－</button>
                <button onClick={() => openImagePopup(conceptMapUrl)} style={{ padding: "6px 14px", borderRadius: M.rS, border: `1px solid ${M.border}`, background: "#fff", cursor: "pointer", fontSize: 13 }}>⛶ Full</button>
              </div>
              <div style={{ flex: 1, width: "100%", overflow: "auto", border: `1px solid ${M.border}`, borderRadius: M.rS, background: "#fff", minHeight: 0 }}>
                <img
                  src={conceptMapUrl}
                  alt={`Concept map for ${selectedWordText || selectedTerm.name || ""}`}
                  style={{ transform: `scale(${conceptMapZoom})`, transformOrigin: "top left", maxWidth: "100%", display: "block" }}
                />
                <FeedbackIcons feature="taxonomy" />
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#aaa", background: M.bgGray, borderRadius: M.r }}>
              <div style={{ fontSize: 13 }}>No concept map loaded</div>
            </div>
          )}
        </div>
      )}

      {/* Image popup */}
      {popupImg && (
        <div onClick={closeImagePopup} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "94%", maxHeight: "90%", background: "#fff", borderRadius: M.r, padding: 16 }}>
            <button onClick={closeImagePopup} style={{ position: "absolute", top: 10, right: 10, padding: "5px 10px", background: "#d9534f", color: "#fff", border: "none", borderRadius: M.rS, cursor: "pointer" }}>✕</button>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={() => setZoom(z => Math.min(4, z + 0.2))} style={{ padding: "6px 12px", borderRadius: M.rS, border: `1px solid ${M.border}`, background: "#fff", cursor: "pointer" }}>＋</button>
              <button onClick={() => setZoom(z => Math.max(1, z - 0.2))} style={{ padding: "6px 12px", borderRadius: M.rS, border: `1px solid ${M.border}`, background: "#fff", cursor: "pointer" }}>－</button>
              <button onClick={() => { setZoom(1); setTranslateX(0); setTranslateY(0); }} style={{ padding: "6px 12px", borderRadius: M.rS, border: `1px solid ${M.border}`, background: "#fff", cursor: "pointer", fontSize: 12 }}>Reset</button>
            </div>
            <div
              onMouseDown={startPan} onMouseMove={panImage} onMouseUp={endPan} onMouseLeave={endPan}
              onTouchStart={startPinch} onTouchMove={handlePinch} onTouchEnd={endPinch}
              onDoubleClick={toggleDoubleTapZoom}
              style={{ overflow: "hidden", cursor: "grab" }}
            >
              <img src={popupImg} alt="Zoomable" style={{ transform: `scale(${zoom}) translate(${translateX}px, ${translateY}px)`, maxWidth: "100%", maxHeight: "65vh", display: "block" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}