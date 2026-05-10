import React, { useState, useEffect, useRef } from 'react';
import USRGraphVisualizer from '../components/USRGraphVisualizer';
import { fetchAndParseUSR } from '../utils/usrParser';

const BASE_URL = "https://canvas.iiit.ac.in/bioereaderbe";

function OccurrencePages({ selectedTerm, termOccurrences, displayToFileMap = {} }) {
  const [expandedPage, setExpandedPage] = useState(null);

  if (!selectedTerm || !termOccurrences) return null;

  const termKey = (selectedTerm.name || selectedTerm.rawName || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/^\W+|\W+$/g, "");

  const entries = termOccurrences[termKey];
  if (!entries || entries.length === 0) return null;

  const items = entries.map((e) =>
    typeof e === "object" && e !== null ? e : { page: e, sentence: "" }
  );

  const termName = selectedTerm.name || selectedTerm.rawName || "";

  const scrollToPage = (displayPage) => {
    const pdfScroll = document.querySelector(".pdf-viewer-scroll");
    if (!pdfScroll) return;
    const filePageIndex = displayToFileMap[String(displayPage)] ?? displayPage;
    const pageEl = pdfScroll.querySelector(`[data-page-number="${filePageIndex}"]`);
    if (!pageEl) return;
    pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const highlightTerm = (text, term) => {
    if (!text || !term) return text;
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${safe})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase()
        ? <mark key={i} style={{ background: "rgba(255,210,0,0.6)", borderRadius: 2, padding: "0 2px", fontWeight: 700 }}>{part}</mark>
        : part
    );
  };

  return (
    <div style={{ marginTop: 16, borderRadius: 10, border: "1px solid #d0e4ff", overflow: "hidden" }}>
      <div style={{
        padding: "9px 14px",
        background: "linear-gradient(135deg, #eef4ff, #f5f0ff)",
        fontSize: 11, fontWeight: 700, color: "#5a7abf",
        textTransform: "uppercase", letterSpacing: "0.06em",
        display: "flex", alignItems: "center", gap: 6,
        borderBottom: "1px solid #d0e4ff",
      }}>
        <span>📍</span>
        <span>Found on {items.length} page{items.length > 1 ? "s" : ""}</span>
      </div>

      {items.map(({ page, sentence }, idx) => {
        const isExpanded = expandedPage === page;
        const hasSentence = Boolean(sentence);
        const preview = sentence && sentence.length > 130
          ? sentence.slice(0, 127) + "…"
          : sentence;

        return (
          <div key={page} style={{ borderBottom: idx < items.length - 1 ? "1px solid #eef2ff" : "none" }}>
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 10px",
                cursor: hasSentence ? "pointer" : "default",
                background: isExpanded ? "#f0f6ff" : "#fff",
                transition: "background 0.12s",
              }}
              onClick={() => hasSentence && setExpandedPage(isExpanded ? null : page)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); scrollToPage(page); }}
                style={{
                  flexShrink: 0, padding: "3px 10px", borderRadius: 5,
                  border: "1.5px solid #4a90e2", background: "#fff", color: "#4a90e2",
                  fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                  transition: "all 0.12s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#4a90e2"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#4a90e2"; }}
              >
                Pg {page}
              </button>

              {hasSentence && (
                <span style={{ flex: 1, fontSize: 12, color: "#555", lineHeight: 1.4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                  {highlightTerm(preview, termName)}
                </span>
              )}

              {hasSentence && (
                <span style={{ color: "#bbb", fontSize: 9, flexShrink: 0, transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                  ▼
                </span>
              )}
            </div>

            {isExpanded && hasSentence && (
              <div style={{
                padding: "8px 12px 10px 12px",
                fontSize: 13, color: "#333", lineHeight: 1.65,
                background: "#f7faff",
                borderTop: "1px dashed #d0e4ff",
              }}>
                {highlightTerm(sentence, termName)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   COREF RESOLUTION HELPERS
═══════════════════════════════════════════ */

/**
 * Wraps a raw USR segment text in the <segment_id=…> tags the visualizer expects.
 */
function wrapSegment(segmentId, rawText) {
  // If the text already contains its own wrapper, don't double-wrap.
  if (rawText.includes(`<segment_id=${segmentId}>`)) return rawText.trim();
  return `<segment_id=${segmentId}>\n${rawText.trim()}\n</segment_id=${segmentId}>`;
}

/**
 * Scans a USR string for cross-segment coref references and returns the set
 * of referenced segment IDs that are NOT already present in alreadyIncluded.
 *
 * Matches patterns like:  biology_chapter3_plantkingdom_0001.13:coref
 * Ignores intra-segment corefs (no dot / no segment prefix).
 */
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

/**
 * Builds a flat Map from segment_id → segment object across every sentence
 * in the cached paragraph. Handles both 'segment_id' and 'segId' field names.
 */
function buildSegmentMap(cachedParagraph) {
  const map = new Map();
  
  if (!cachedParagraph || !cachedParagraph.sentences) {
    console.warn("buildSegmentMap: No cached paragraph or sentences found");
    return map;
  }
  
  for (const sentence of cachedParagraph.sentences) {
    // Try both possible field names
    const segments = sentence.usr_segments || sentence.segments || [];
    
    for (const seg of segments) {
      // Handle both field names: 'segment_id' (what we expect) and 'segId' (what backend sends)
      const segId = seg.segment_id || seg.segId;
      if (segId) {
        if (map.has(segId)) {
          console.log(`⚠️ Duplicate segment ID found: ${segId}`);
        }
        // Normalize to use segment_id field
        const normalizedSeg = { ...seg, segment_id: segId };
        map.set(segId, normalizedSeg);
      } else {
        console.warn("Segment missing ID:", seg);
      }
    }
  }
  
  console.log(`📊 buildSegmentMap: Found ${map.size} unique segments with IDs: [${[...map.keys()].join(", ")}]`);
  return map;
}


/* ═══════════════════════════════════════════
   MAIN ANALYSIS PANEL COMPONENT
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
  const [activeTab, setActiveTab] = useState("Define");
  const [definition, setDefinition] = useState("");
  const [translatedDef, setTranslatedDef] = useState("");
  const [taxonomyImg, setTaxonomyImg] = useState(null);
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
  const [conceptFullscreen, setConceptFullscreen] = useState(false);
  const [activeSentenceSubTab, setActiveSentenceSubTab] = useState("sentenceAnalysis");
  const [showGraphFullscreen, setShowGraphFullscreen] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  // Paragraph-based sentence display states
  const [paragraphData, setParagraphData] = useState(null);
  const [paragraphLoading, setParagraphLoading] = useState(false);
  const [selectedParagraphSentence, setSelectedParagraphSentence] = useState(null);

  const [usrLoading, setUsrLoading] = useState(false);
  const [usrText, setUsrText] = useState("");

  // Audio states
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

  const [popupImg, setPopupImg] = useState(null);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [initialTranslate, setInitialTranslate] = useState({ x: 0, y: 0 });
  const [initialPinchDistance, setInitialPinchDistance] = useState(null);
  const [initialPinchZoom, setInitialPinchZoom] = useState(1);
  const [cachedParagraphUSR, setCachedParagraphUSR] = useState(null);

  const [conceptCache, setConceptCache] = useState({});

  const getDynamicFontSize = (text = "") => {
    const len = text?.length || 0;
    if (len < 200) return "18px";
    if (len < 500) return "16px";
    if (len < 1000) return "15px";
    if (len < 2000) return "14px";
    return "13px";
  };

  /* ─────────────────────────────────────────
     fetchParagraphWithUSRStatus
  ───────────────────────────────────────── */
  const fetchParagraphWithUSRStatus = async (sentence) => {
    if (!sentence || !chapterId) return null;

    try {
      setParagraphLoading(true);

      const response = await fetch(`${BASE_URL}/get-paragraph-with-usr-status/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_id: chapterId, sentence_text: sentence })
      });

      if (!response.ok) throw new Error('Failed to fetch paragraph data');

      const data = await response.json();
      console.log("📦 Backend Response:", data);

      if (data.success && data.hasSimplified) {
        console.log("✅ Found simplified paragraph!");
        console.log(`📊 Has ${data.sentences.length} sentences`);

        const batchRequest = {
          chapter_id: chapterId,
          original_paragraph: data.original_paragraph || sentence,
          simplified_paragraph: data.paragraph,
          sentences: data.sentences.map(s => ({ sentence: s.text }))
        };

        console.log("🚀 Fetching USRs for all sentences...");
        const usrResponse = await fetch(`${BASE_URL}/get-sentence-usrs-batch/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batchRequest)
        });

        const usrData = await usrResponse.json();

        if (usrData.success) {
          console.log("✅ USRs fetched successfully!");

          const enrichedSentences = data.sentences.map((sent, idx) => ({
            ...sent,
            parsed_usrs: usrData.sentences[idx]?.parsed_usrs || [],
            usr_segments: usrData.sentences[idx]?.usr_segments || []
          }));

          const enrichedData = {
            ...data,
            sentences: enrichedSentences,
            usrData: usrData
          };

          setCachedParagraphUSR(enrichedData);

          enrichedSentences.forEach((s, idx) => {
            if (s.hasUSR) {
              console.log(`   Sentence ${idx + 1}: ✅ HAS USR - ${s.text.substring(0, 50)}...`);
            }
          });

          return enrichedData;
        } else {
          console.log("⚠️ No USR data available for these sentences");
          return data;
        }
      } else {
        console.log("❌ No simplified paragraph found:", data.error);
        return data;
      }

    } catch (error) {
      console.error('Error fetching paragraph:', error);
      return null;
    } finally {
      setParagraphLoading(false);
    }
  };

  const loadUSRForSentence = async (sentence) => {
  if (!sentence || !chapterId) return;

  setUsrLoading(true);
  setUsrText("");
  setShowGraph(false);

  try {
    console.log("🔍 loadUSRForSentence called for:", sentence.substring(0, 80));

    // ── 1. Try cache first ──────────────────────────────────────────────
    if (cachedParagraphUSR && cachedParagraphUSR.sentences) {
      const foundSentence = cachedParagraphUSR.sentences.find(
        s => s.text === sentence
      );
      console.log("📦 Found in cache:", foundSentence ? "YES" : "NO");

      const hasSegments =
        (foundSentence?.parsed_usrs?.length > 0) ||
        (foundSentence?.usr_segments?.length > 0);

      if (foundSentence && hasSegments) {
        console.log("✅ Found USR data in cached paragraph");
        
        // Debug: Log the structure of the first segment
        if (foundSentence.usr_segments && foundSentence.usr_segments.length > 0) {
          console.log("🔍 First segment structure:", foundSentence.usr_segments[0]);
          console.log("🔍 Segment keys:", Object.keys(foundSentence.usr_segments[0]));
        }

        // Build a segment map covering ALL sentences in the paragraph
        const segmentMap = buildSegmentMap(cachedParagraphUSR);
        
        // Debug: Log all available segment IDs
        console.log("📊 Available segment IDs:", [...segmentMap.keys()]);

        // Wrap the clicked sentence's own segments first.
        const alreadyIncluded = new Set();
        const parts = [];

        for (const seg of (foundSentence.usr_segments ?? [])) {
          // Handle both field names
          let segId = seg.segment_id || seg.segId;
          
          if (!segId) {
            console.error("❌ Segment missing ID! Full segment object:", seg);
            // Try to find ID in other possible fields
            const possibleId = seg.id || seg._id || seg.seg_id;
            if (possibleId) {
              console.log(`   Found alternative ID field: ${possibleId}`);
              segId = possibleId;
            } else {
              console.warn("   Skipping segment without ID");
              continue;
            }
          }
          
          // Get the text - could be in 'text' field or directly in the segment
          const segText = seg.text || seg.content || "";
          
          parts.push(wrapSegment(segId, segText));
          alreadyIncluded.add(segId);
          console.log(`✅ Primary segment included: ${segId}`);
        }
        let combinedUSR = parts.join("\n\n");

        // ── 2. Recursively pull in coref dependencies ─────────────────
        const MAX_DEPTH = 5;
        let depth = 0;

        while (depth < MAX_DEPTH) {
          const missing = findMissingCorefSegments(combinedUSR, alreadyIncluded);
          if (missing.size === 0) break;

          console.log(`🔍 Depth ${depth + 1}: Missing coref segments:`, [...missing]);
          let anyPulled = false;

          for (const refId of missing) {
            const referencedSeg = segmentMap.get(refId);

            if (!referencedSeg) {
              console.warn(
                `⚠️ Coref references '${refId}' but it's not in the ` +
                `cached paragraph. Available: [${[...segmentMap.keys()].join(", ")}]`
              );
              // Mark as handled so we don't warn repeatedly.
              alreadyIncluded.add(refId);
              continue;
            }

            const refText = referencedSeg.text || referencedSeg.content || "";
            combinedUSR += "\n\n" + wrapSegment(referencedSeg.segment_id, refText);
            alreadyIncluded.add(refId);
            anyPulled = true;
            console.log(`✅ Coref dependency pulled (depth ${depth + 1}): ${refId}`);
          }

          if (!anyPulled) break;
          depth++;
        }

        if (depth >= MAX_DEPTH) {
          console.warn(`⚠️ Hit coref resolution depth limit (${MAX_DEPTH}). Some references may still be unresolved.`);
        }

        console.log(`📝 Combined USR length: ${combinedUSR.length}`);
        console.log(`📝 Segments included: [${[...alreadyIncluded].join(", ")}]`);
        console.log("📝 USR preview:", combinedUSR.substring(0, 200));

        if (combinedUSR && combinedUSR.trim()) {
          setUsrText(combinedUSR);
          setShowGraph(true);
        } else {
          console.error("❌ Combined USR is empty!");
          setUsrText("");
          setShowGraph(false);
        }
        setUsrLoading(false);
        return;
      }
    }

    // ── 3. Fallback: fetch directly from API ───────────────────────────
    console.log("Fetching USR from API for:", sentence.substring(0, 50));
    const result = await fetchAndParseUSR(chapterId, sentence, BASE_URL);

    if (result && result.usrText) {
      console.log("✅ USR fetched from API, length:", result.usrText.length);
      setUsrText(result.usrText);
      setShowGraph(true);
    } else {
      console.log("❌ No USR found for this sentence");
      setUsrText("");
      setShowGraph(false);
    }

  } catch (error) {
    console.error("Error loading USR:", error);
    setUsrText("");
    setShowGraph(false);
  } finally {
    setUsrLoading(false);
  }
};

  /* ─────────────────────────────────────────
     Effects
  ───────────────────────────────────────── */
  useEffect(() => {
    if (selectedSentence && selectedView === "Sentence") {
      const loadData = async () => {
        setParagraphData(null);
        setSelectedParagraphSentence(null);
        setUsrText("");
        setShowGraph(false);

        const data = await fetchParagraphWithUSRStatus(selectedSentence);
        if (data && data.success) {
          setParagraphData(data);
        } else {
          setParagraphData(null);
        }
      };
      loadData();
    }
  }, [selectedSentence, selectedView, chapterId]);

  useEffect(() => {
    if (selectedParagraphSentence && selectedView === "Sentence") {
      loadUSRForSentence(selectedParagraphSentence);
    }
  }, [selectedParagraphSentence, selectedView, chapterId]);

  const openImagePopup = (url) => {
    setPopupImg(null);
    requestAnimationFrame(() => { setZoom(1); setTranslateX(0); setTranslateY(0); setPopupImg(url); });
  };

  const closeImagePopup = () => setPopupImg(null);

  useEffect(() => { if (popupImg) { setZoom(1); setTranslateX(0); setTranslateY(0); } }, [popupImg]);
  useEffect(() => { if (activeTab === "ConceptMap") { setZoom(1); setTranslateX(0); setTranslateY(0); } }, [activeTab]);

  const startPan = (e) => { e.preventDefault(); setPanning(true); setPanStart({ x: e.clientX, y: e.clientY }); setInitialTranslate({ x: translateX, y: translateY }); };
  const panImage = (e) => { if (!panning) return; setTranslateX(initialTranslate.x + e.clientX - panStart.x); setTranslateY(initialTranslate.y + e.clientY - panStart.y); };
  const endPan = () => setPanning(false);
  const getDistance = (touches) => { const [a, b] = touches; return Math.sqrt((a.clientX - b.clientX) ** 2 + (a.clientY - b.clientY) ** 2); };
  const startPinch = (e) => { if (e.touches.length === 2) { setInitialPinchDistance(getDistance(e.touches)); setInitialPinchZoom(zoom); } };
  const handlePinch = (e) => { if (e.touches.length === 2) { const scale = getDistance(e.touches) / initialPinchDistance; setZoom(Math.min(4, Math.max(1, initialPinchZoom * scale))); } };
  const endPinch = () => setInitialPinchDistance(null);
  const toggleDoubleTapZoom = () => { setZoom((z) => (z === 1 ? 2 : 1)); setTranslateX(0); setTranslateY(0); };

  const base64ToUrl = (b64, mime = "audio/mpeg") => {
    const idx = b64.indexOf("base64,");
    if (idx !== -1) b64 = b64.slice(idx + 7);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes.buffer], { type: mime }));
  };

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
    } catch (err) { console.warn("Def audio fetch failed:", err); } finally { setDefAudioLoading(false); }
  };

  const toggleDefPlay = () => {
    if (!defAudioRef.current) {
      if (defAudioUrl) { defAudioRef.current = new Audio(defAudioUrl); defAudioRef.current.onended = () => setDefIsPlaying(false); }
      else return;
    }
    if (defIsPlaying) { defAudioRef.current.pause(); setDefIsPlaying(false); }
    else { defAudioRef.current.play().then(() => setDefIsPlaying(true)).catch(console.error); }
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
    } catch (err) { console.warn("Trans audio fetch failed:", err); } finally { setTransAudioLoading(false); }
  };

  const toggleTransPlay = () => {
    if (!transAudioRef.current) {
      if (transAudioUrl) { transAudioRef.current = new Audio(transAudioUrl); transAudioRef.current.onended = () => setTransIsPlaying(false); }
      else return;
    }
    if (transIsPlaying) { transAudioRef.current.pause(); setTransIsPlaying(false); }
    else { transAudioRef.current.play().then(() => setTransIsPlaying(true)).catch(console.error); }
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
      } catch (err) {
        console.error("Audio decode error:", err);
      } finally {
        setAudioLoading(false);
      }
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
    } catch (err) {
      console.warn("No audio available:", err);
    } finally {
      setAudioLoading(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) {
      if (audioUrl) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => setIsPlaying(false);
      } else return;
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error("Audio play failed:", err));
    }
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
    } catch (err) { console.warn("Section summary audio failed:", err); } finally { setSecAudioLoading(false); }
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
    } catch (err) { console.warn("Section trans audio failed:", err); } finally { setSecTransAudioLoading(false); }
  };

  const toggleSecPlay = () => {
    if (!secAudioRef.current) {
      if (secAudioUrl) { secAudioRef.current = new Audio(secAudioUrl); secAudioRef.current.onended = () => setSecIsPlaying(false); }
      else return;
    }
    if (secIsPlaying) { secAudioRef.current.pause(); setSecIsPlaying(false); }
    else { secAudioRef.current.play().then(() => setSecIsPlaying(true)).catch(console.error); }
  };

  const toggleSecTransPlay = () => {
    if (!secTransAudioRef.current) {
      if (secTransAudioUrl) { secTransAudioRef.current = new Audio(secTransAudioUrl); secTransAudioRef.current.onended = () => setSecTransIsPlaying(false); }
      else return;
    }
    if (secTransIsPlaying) { secTransAudioRef.current.pause(); setSecTransIsPlaying(false); }
    else { secTransAudioRef.current.play().then(() => setSecTransIsPlaying(true)).catch(console.error); }
  };

  // Term / chapter change effects
  useEffect(() => {
    if (selectedTerm && chapterId) {
      setDefinition(selectedTerm.definition || "");
      setTranslatedDef("");
      setLabelledImg(null); setVideo(null); setTaxonomyImg(null);
      setImageError(false); setVideoError(false); setHasImage(false); setHasVideo(false);
      prepareAudioFromTerm(selectedTerm);
      loadDefinitionAudio(selectedTerm);
      clearTransAudio();
    } else {
      setDefinition(""); setTranslatedDef("");
      setLabelledImg(null); setVideo(null); setTaxonomyImg(null);
      setImageError(false); setVideoError(false); setHasImage(false); setHasVideo(false);
      clearAudio(); clearDefAudio(); clearTransAudio();
    }
  }, [selectedTerm, chapterId]);

  useEffect(() => () => { clearAudio(); clearDefAudio(); clearTransAudio(); clearSecAudio(); clearSecTransAudio(); }, []);

  useEffect(() => {
    if (activeTab !== "Media" || !selectedTerm) return;
    const check = async () => {
      try { const r = await fetch(`${BASE_URL}/image/${selectedTerm.domain_id}`, { headers: { Range: "bytes=0-0" } }); setHasImage(r.ok); } catch { setHasImage(false); }
      try { const r = await fetch(`${BASE_URL}/video/${selectedTerm.domain_id}`,  { headers: { Range: "bytes=0-0" } }); setHasVideo(r.ok); } catch { setHasVideo(false); }
    };
    check();
  }, [activeTab, selectedTerm]);

  useEffect(() => {
    if (activeTab === "ConceptMap" && selectedTerm) loadConceptMap();
  }, [activeTab, selectedTerm]);

  useEffect(() => {
    if (selectedView === "Summary" && selectedSectionId && chapterId) {
      fetchSingleSection(selectedSectionId);
      loadSectionSummaryAudio(selectedSectionId);
      clearSecTransAudio();
    } else {
      setSectionSummary("");
      setTranslatedSections({});
      clearSecAudio();
      clearSecTransAudio();
    }
  }, [selectedSectionId, selectedView, chapterId]);

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
    } catch { } finally { setIsLoading(false); }
    loadTranslationAudio(lang, selectedTerm);
  };

  const translateSentence = async (lang) => {
    if (!selectedParagraphSentence) return;
    try {
      setIsLoading(true);
      setTranslatedSentence("");
      const res = await fetch(`${BASE_URL}/translate/sentence/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_id: chapterId,
          sentence: selectedParagraphSentence,
          target_language: lang
        }),
      });
      const data = await res.json();
      setTranslatedSentence(
        typeof data.translated_sentence === "string"
          ? data.translated_sentence
          : data.translated_sentence?.data || "Translation unavailable."
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const translateSectionSummary = async (sectionId, lang) => {
    if (!lang) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${BASE_URL}/translate/section-summary/?chapter_id=${chapterId}&section_id=${sectionId}&target_language=${lang}`);
      const data = await res.json();
      setTranslatedSections((prev) => ({
        ...prev,
        [sectionId]: data.translated_section_summary?.data || data.translated_section_summary || "Translation unavailable.",
      }));
    } catch { } finally { setIsLoading(false); }
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

  const loadConceptMap = async () => {
    if (!selectedTerm || !chapterId) return;
    const key = `${chapterId}_${selectedTerm.domain_id}`;
    if (conceptCache[key]) { setTaxonomyImg(conceptCache[key]); return; }
    try {
      setIsLoading(true);
      setTaxonomyImg(null);
      const res = await fetch(`${BASE_URL}/taxonomy-image/${chapterId}/${selectedTerm.domain_id}`);
      const img = res.ok ? `${BASE_URL}/taxonomy-image/${chapterId}/${selectedTerm.domain_id}` : null;
      setTaxonomyImg(img);
      setConceptCache(prev => ({ ...prev, [key]: img }));
    } catch {
      setTaxonomyImg(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVideo = async () => {
    if (!selectedTerm) return;
    try {
      setIsLoading(true); setVideoError(false);
      const res = await fetch(`${BASE_URL}/video/${selectedTerm.domain_id}`);
      if (!res.ok) { setVideo(null); setVideoError(true); return; }
      setVideo(`${BASE_URL}/video/${selectedTerm.domain_id}`);
    } catch { setVideo(null); setVideoError(true); setHasVideo(false); } finally { setIsLoading(false); }
  };

  /* ══════════════════════════════════════════
     SENTENCE VIEW
  ══════════════════════════════════════════ */
  if (selectedView === "Sentence")
    return (
      <div className="analysis-panel" style={{ height: "100%", overflow: "auto", padding: "20px" }}>

        {/* Sub-tabs */}
        <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid #e0e0e0", marginBottom: "20px" }}>
          {[
            { key: "sentenceAnalysis", label: "🔬 Sentence Analysis" },
            { key: "sentenceTranslation", label: "🌐 Translation" }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveSentenceSubTab(key)}
              style={{
                padding: "10px 20px",
                background: activeSentenceSubTab === key ? "#4a90e2" : "transparent",
                color: activeSentenceSubTab === key ? "#fff" : "#666",
                border: "none",
                borderRadius: "8px 8px 0 0",
                cursor: "pointer",
                fontWeight: activeSentenceSubTab === key ? "bold" : "normal",
                fontSize: "14px"
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Simplified Paragraph */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{
            padding: "10px",
            background: "linear-gradient(135deg, #4caf50, #45a049)",
            borderRadius: "8px",
            marginBottom: "10px",
            fontWeight: "bold",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span>📖</span>
            <span>Simplified Paragraph</span>
            {paragraphData?.hasSimplified === false && (
              <span style={{ fontSize: "11px", marginLeft: "auto", opacity: 0.8 }}>
                (Original version - no simplified available)
              </span>
            )}
            {paragraphData?.from_cache && (
              <span style={{ fontSize: "11px", marginLeft: "auto", opacity: 0.8, background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: "12px" }}>
                📦 Cached
              </span>
            )}
          </div>

          {paragraphLoading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#666" }}>
              <div className="spinner"></div> Loading paragraph...
            </div>
          ) : paragraphData?.sentences && paragraphData.sentences.length > 0 ? (
            <div style={{
              padding: "15px",
              background: "#f1f8e9",
              borderRadius: "8px",
              lineHeight: "1.8",
              fontSize: "14px"
            }}>
              {paragraphData.sentences.map((sentence, idx) => {
                const isCurrent = sentence.text === selectedParagraphSentence;
                const hasUSR = sentence.hasUSR;

                return (
                  <span
                    key={idx}
                    onClick={() => {
                      console.log("Sentence clicked:", sentence.text.substring(0, 50), "hasUSR:", hasUSR);
                      if (hasUSR) {
                        setSelectedParagraphSentence(sentence.text);
                      } else {
                        alert("No semantic analysis available for this sentence yet.");
                      }
                    }}
                    style={{
                      cursor: hasUSR ? "pointer" : "not-allowed",
                      backgroundColor: isCurrent ? "#fff3e0" : "transparent",
                      borderBottom: hasUSR ? "2px solid #4caf50" : "1px solid #ddd",
                      borderRadius: "4px",
                      padding: "2px 4px",
                      margin: "0 2px",
                      display: "inline",
                      transition: "all 0.2s ease",
                      fontWeight: isCurrent ? "500" : "normal",
                      opacity: hasUSR ? 1 : 0.6
                    }}
                    onMouseEnter={(e) => {
                      if (hasUSR) {
                        e.currentTarget.style.backgroundColor = "#c8e6c9";
                        e.currentTarget.style.transform = "scale(1.01)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (hasUSR) {
                        e.currentTarget.style.backgroundColor = isCurrent ? "#fff3e0" : "transparent";
                        e.currentTarget.style.transform = "scale(1)";
                      }
                    }}
                    title={hasUSR ? "Click to view sentence analysis" : "No analysis available for this sentence"}
                  >
                    {sentence.text}
                    {idx < paragraphData.sentences.length - 1 ? " " : ""}
                  </span>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: "20px", color: "#888", textAlign: "center" }}>
              {paragraphData?.error || "No paragraph available"}
            </div>
          )}
        </div>

        {/* ANALYSIS SUB-TAB */}
        {activeSentenceSubTab === "sentenceAnalysis" && (
          selectedParagraphSentence ? (
            <div>
              <div style={{
                padding: "10px",
                background: "#f0f7ff",
                borderRadius: "8px",
                marginBottom: "10px",
                fontWeight: "bold",
                color: "#4a90e2"
              }}>
                🧠 USR Analysis for:
                <div style={{ fontSize: "12px", fontWeight: "normal", marginTop: "5px", color: "#555" }}>
                  "{selectedParagraphSentence.substring(0, 100)}..."
                </div>
              </div>

              {usrLoading ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <div className="spinner"></div>
                  <p style={{ marginTop: "10px", color: "#666" }}>Loading USR analysis...</p>
                </div>
              ) : usrText ? (
                <div>
                  <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                    <button
                      onClick={() => setShowGraph(!showGraph)}
                      style={{
                        padding: "8px 20px",
                        borderRadius: "5px",
                        border: "1px solid #4a90e2",
                        background: "#4a90e2",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: "bold"
                      }}
                    >
                      {showGraph ? "Hide Graph" : "View Graph"}
                    </button>

                    {showGraph && (
                      <button
                        onClick={() => setShowGraphFullscreen(true)}
                        style={{
                          padding: "8px 20px",
                          borderRadius: "5px",
                          border: "1px solid #4a90e2",
                          background: "#fff",
                          color: "#4a90e2",
                          cursor: "pointer",
                          fontWeight: "bold"
                        }}
                      >
                        ⛶ Fullscreen
                      </button>
                    )}
                  </div>

                  {showGraph && (
                    <div style={{
                      width: "100%",
                      overflowX: "auto",
                      overflowY: "auto",
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      backgroundColor: "#fff",
                      position: "relative",
                      minHeight: "400px",
                      maxHeight: "500px"
                    }}>
                      <div style={{ minWidth: "max-content", minHeight: "max-content", padding: "10px" }}>
                        <USRGraphVisualizer initialText={usrText} />
                      </div>
                    </div>
                  )}

                  {!showGraph && (
                    <div style={{
                      padding: "15px",
                      background: "#f8f9fa",
                      borderRadius: "8px",
                      border: "1px solid #e0e0e0"
                    }}>
                      <p style={{ color: "#666", textAlign: "center" }}>
                        Click "View Graph" to see the USR visualization
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px", color: "#888", background: "#f8f9fa", borderRadius: "8px" }}>
                  <p>No USR data available for this sentence</p>
                  <p style={{ fontSize: "12px", marginTop: "10px" }}>
                    This sentence may not have been processed with USR yet.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "#888", background: "#f8f9fa", borderRadius: "8px" }}>
              <p>👆 Click any sentence with the <span style={{ color: "#4caf50", fontWeight: "bold" }}>USR</span> badge above</p>
              <p style={{ fontSize: "12px", marginTop: "10px" }}>to view its semantic analysis</p>
            </div>
          )
        )}

        {/* TRANSLATION SUB-TAB */}
        {activeSentenceSubTab === "sentenceTranslation" && (
          selectedParagraphSentence ? (
            <div>
              <div style={{
                padding: "10px",
                background: "#f0f7ff",
                borderRadius: "8px",
                marginBottom: "15px",
                fontWeight: "bold",
                color: "#4a90e2"
              }}>
                🌐 Translation
                <div style={{ fontSize: "12px", fontWeight: "normal", marginTop: "5px", color: "#555" }}>
                  "{selectedParagraphSentence.substring(0, 100)}..."
                </div>
              </div>

              <select
                onChange={(e) => translateSentence(e.target.value)}
                style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc", width: "200px", fontSize: "14px" }}
              >
                <option value="">Select Language</option>
                <option value="hin">Hindi (हिन्दी)</option>
                <option value="tel">Telugu (తెలుగు)</option>
                <option value="ben">Bengali (বাংলা)</option>
                <option value="mar">Marathi (मराठी)</option>
                <option value="tam">Tamil (தமிழ்)</option>
                <option value="guj">Gujarati (ગુજરાતી)</option>
              </select>

              {isLoading && (
                <div style={{ marginTop: "15px", padding: "20px", textAlign: "center", background: "#e8f4f8", borderRadius: "8px" }}>
                  Translating...
                </div>
              )}

              {translatedSentence && !isLoading && (
                <div style={{
                  marginTop: "15px",
                  padding: "15px",
                  background: "#e8f4f8",
                  borderRadius: "8px",
                  border: "1px solid #b8d4e8"
                }}>
                  <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#2c6e9e" }}>Translation:</div>
                  <div style={{ lineHeight: "1.6" }}>{translatedSentence}</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "#888", background: "#f8f9fa", borderRadius: "8px" }}>
              <p>👆 Select a sentence above to view its translation</p>
            </div>
          )
        )}

        {/* Fullscreen Modal */}
        {showGraphFullscreen && usrText && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.95)", zIndex: 9999,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center"
          }}>
            <div style={{ position: "absolute", top: "20px", right: "20px", zIndex: 10000 }}>
              <button
                onClick={() => setShowGraphFullscreen(false)}
                style={{
                  padding: "10px 20px", background: "#d9534f", color: "#fff",
                  border: "none", borderRadius: "5px", cursor: "pointer",
                  fontSize: "14px", fontWeight: "bold"
                }}
              >
                ✕ Close
              </button>
            </div>
            <div style={{
              width: "95%", height: "95%", background: "#fff",
              borderRadius: "10px", overflow: "auto", padding: "20px"
            }}>
              <div style={{ minWidth: "max-content", minHeight: "max-content" }}>
                <USRGraphVisualizer initialText={usrText} />
              </div>
            </div>
          </div>
        )}
      </div>
    );

  /* ══════════════════════════════════════════
     SUMMARY VIEW
  ══════════════════════════════════════════ */
  if (selectedView === "Summary")
    return (
      <div className="analysis-panel" style={{ height: "100%", overflow: "auto", padding: "20px" }}>
        <div className="analysis-tab-header">
          <div className="analysis-title-pill">
            📝 {selectedSectionId ? `Section ${selectedSectionId}` : "Summary"}
          </div>
        </div>

        {!selectedSectionId && showSummaryHint && (
          <div
            className="summary-hint-box"
            onClick={() => setShowSummaryHint(false)}
            style={{ padding: "12px", background: "#e8f4f8", borderRadius: "8px", marginBottom: "15px", cursor: "pointer" }}
          >
            👉 Select section IDs from the PDF to view its summary{" "}
            <span style={{ fontSize: "12px", opacity: 0.6 }}>(click to hide)</span>
          </div>
        )}

        {sectionSummary && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <h4 style={{ margin: 0 }}>Section Summary</h4>
              {secAudioLoading ? (
                <div style={{ width: "24px", height: "24px", background: "#ccc", borderRadius: "50%" }} />
              ) : secAudioUrl ? (
                <button onClick={toggleSecPlay} style={{ padding: "4px 12px", borderRadius: "20px", border: "1px solid #4a90e2", background: "#fff", cursor: "pointer" }}>
                  {secIsPlaying ? "⏸" : "▶"}
                </button>
              ) : null}
            </div>
            <div style={{ fontSize: getDynamicFontSize(sectionSummary), lineHeight: "1.7", background: "#f8f9fa", padding: "15px", borderRadius: "8px" }}>
              {sectionSummary}
            </div>
          </>
        )}

        {selectedSectionId && (
          <div style={{ marginTop: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Translate Summary:</label>
            <select
              onChange={(e) => translateSectionSummary(selectedSectionId, e.target.value)}
              style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ccc", width: "200px" }}
            >
              <option value="">Select Language</option>
              <option value="hin">Hindi</option>
              <option value="tel">Telugu</option>
              <option value="ben">Bengali</option>
            </select>

            {translatedSections[selectedSectionId] && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "15px 0 10px" }}>
                  <h4 style={{ margin: 0 }}>Translated</h4>
                  {secTransAudioLoading ? (
                    <div style={{ width: "24px", height: "24px", background: "#ccc", borderRadius: "50%" }} />
                  ) : secTransAudioUrl ? (
                    <button onClick={toggleSecTransPlay} style={{ padding: "4px 12px", borderRadius: "20px", border: "1px solid #4a90e2", background: "#fff", cursor: "pointer" }}>
                      {secTransIsPlaying ? "⏸" : "▶"}
                    </button>
                  ) : null}
                </div>
                <div style={{ fontSize: getDynamicFontSize(translatedSections[selectedSectionId]), lineHeight: "1.7", background: "#e8f4f8", padding: "15px", borderRadius: "8px" }}>
                  {translatedSections[selectedSectionId]}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );

  /* ══════════════════════════════════════════
     Q/A VIEW
  ══════════════════════════════════════════ */
  if (selectedView === "Q/A")
    return (
      <div className="analysis-panel" style={{ height: "100%", overflow: "auto", padding: "20px" }}>
        <div className="analysis-tab-header">
          <div className="analysis-title-pill">❓ Question and Answer</div>
        </div>
        <div>
          {qaPairs.length === 0 && <p>No Q&A pairs found for this chapter.</p>}
          {qaPairs.map((item, index) => (
            <div key={index} style={{ marginBottom: "15px", padding: "15px", border: "1px solid #e0e0e0", borderRadius: "8px", background: "#fff" }}>
              <div style={{ marginBottom: "10px" }}>
                <span style={{ fontWeight: "bold", color: "#4a90e2" }}>Q{index + 1}.</span>
                <span style={{ marginLeft: "8px" }}>{item.question}</span>
              </div>
              <div style={{ paddingLeft: "20px", color: "#555" }}>
                <span style={{ fontWeight: "bold" }}>A:</span>
                <p style={{ margin: "5px 0 0", lineHeight: "1.5" }}>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  /* ══════════════════════════════════════════
     WORD VIEW (Define, Media, ConceptMap)
  ══════════════════════════════════════════ */
  return (
    <div className="analysis-panel" style={{ height: "100%", overflow: "auto", padding: "20px" }}>
      <div className="analysis-tab-header">
        <div className="analysis-title-pill">📚 Word Analysis</div>
      </div>

      {selectedWordText && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 15px",
          background: "linear-gradient(135deg, #667eea 10%, #764ba2 100%)",
          borderRadius: "8px", color: "#fff", marginBottom: "15px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            🔍 <strong style={{ fontSize: "18px" }}>{selectedWordText}</strong>
          </div>
          <div>
            {audioLoading ? (
              <div style={{ width: "24px", height: "24px", background: "rgba(255,255,255,0.3)", borderRadius: "50%" }} />
            ) : audioUrl ? (
              <button
                onClick={togglePlay}
                style={{ padding: "5px 15px", borderRadius: "20px", border: "none", background: "#fff", color: "#667eea", cursor: "pointer", fontWeight: "bold" }}
              >
                {isPlaying ? "⏸" : "▶"} {isPlaying ? "Pause" : "Play Audio"}
              </button>
            ) : (
              <div style={{ fontSize: "12px", opacity: 0.7 }}>No audio</div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid #e0e0e0", marginBottom: "20px" }}>
        {["Define", "Media", "ConceptMap"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 20px",
              background: activeTab === tab ? "#4a90e2" : "transparent",
              color: activeTab === tab ? "#fff" : "#666",
              border: "none", borderRadius: "8px 8px 0 0",
              cursor: "pointer", fontWeight: activeTab === tab ? "bold" : "normal"
            }}
          >
            {tab === "Define" && "📖 Definition"}
            {tab === "Media" && "🎬 Media"}
            {tab === "ConceptMap" && "🗺️ Concept Map"}
          </button>
        ))}
      </div>

      {/* DEFINE TAB */}
      {activeTab === "Define" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <h4 style={{ margin: 0 }}>Definition</h4>
            {defAudioLoading ? (
              <div style={{ width: "24px", height: "24px", background: "#ccc", borderRadius: "50%" }} />
            ) : defAudioUrl ? (
              <button onClick={toggleDefPlay} style={{ padding: "4px 12px", borderRadius: "20px", border: "1px solid #4a90e2", background: "#fff", cursor: "pointer" }}>
                {defIsPlaying ? "⏸" : "▶"}
              </button>
            ) : null}
          </div>

          <div style={{ fontSize: getDynamicFontSize(definition), lineHeight: "1.6", background: "#f8f9fa", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
            {definition || "No definition available."}
          </div>

          <div style={{ marginTop: 18 }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Translate Definition:</label>
            <select
              onChange={(e) => translateDefinition(e.target.value)}
              style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ccc", width: "200px" }}
            >
              <option value="">Select Language</option>
              <option value="hin">Hindi</option>
              <option value="tel">Telugu</option>
              <option value="ben">Bengali</option>
            </select>
          </div>

          {translatedDef && (
            <div style={{ marginTop: 15 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h4 style={{ margin: 0 }}>Translated</h4>
                {transAudioLoading ? (
                  <div style={{ width: "24px", height: "24px", background: "#ccc", borderRadius: "50%" }} />
                ) : transAudioUrl ? (
                  <button onClick={toggleTransPlay} style={{ padding: "4px 12px", borderRadius: "20px", border: "1px solid #4a90e2", background: "#fff", cursor: "pointer" }}>
                    {transIsPlaying ? "⏸" : "▶"}
                  </button>
                ) : null}
              </div>
              <div style={{ fontSize: getDynamicFontSize(translatedDef), lineHeight: "1.6", background: "#e8f4f8", padding: "15px", borderRadius: "8px", marginTop: "10px" }}>
                {translatedDef}
              </div>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <OccurrencePages
              selectedTerm={selectedTerm}
              termOccurrences={termOccurrences}
              displayToFileMap={displayToFileMap}
            />
          </div>
        </div>
      )}

      {/* MEDIA TAB */}
      {activeTab === "Media" && (
        <div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <button
              onClick={loadImages}
              disabled={!hasImage || isLoading}
              style={{ padding: "10px 20px", background: hasImage ? "#4a90e2" : "#ccc", color: "#fff", border: "none", borderRadius: "8px", cursor: hasImage ? "pointer" : "not-allowed" }}
            >
              📷 Labelled Image
            </button>
            <button
              onClick={loadVideo}
              disabled={!hasVideo || isLoading}
              style={{ padding: "10px 20px", background: hasVideo ? "#4a90e2" : "#ccc", color: "#fff", border: "none", borderRadius: "8px", cursor: hasVideo ? "pointer" : "not-allowed" }}
            >
              🎞 Process Video
            </button>
          </div>

          {isLoading && <div style={{ padding: "40px", textAlign: "center", background: "#f0f0f0", borderRadius: "8px" }}>Loading...</div>}
          {!isLoading && imageError && <p style={{ color: "#d9534f" }}>⚠️ No labelled image available.</p>}
          {!isLoading && videoError && <p style={{ color: "#d9534f" }}>⚠️ No process video available.</p>}

          {labelledImg && !imageError && (
            <div>
              <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                <button onClick={() => setZoom((z) => Math.min(3, z + 0.2))} style={{ padding: "5px 10px", cursor: "pointer" }}>+</button>
                <button onClick={() => setZoom((z) => Math.max(1, z - 0.2))} style={{ padding: "5px 10px", cursor: "pointer" }}>–</button>
                <button onClick={() => openImagePopup(labelledImg)} style={{ padding: "5px 10px", cursor: "pointer" }}>⛶ Fullscreen</button>
              </div>
              <img src={labelledImg} alt="Labelled" style={{ transform: `scale(${zoom})`, maxWidth: "100%", borderRadius: "8px" }} />
            </div>
          )}

          {video && <video src={video} controls style={{ width: "100%", borderRadius: "8px" }} />}
        </div>
      )}

      {/* CONCEPT MAP TAB */}
      {activeTab === "ConceptMap" && (
        <div>
          {isLoading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>⏳ Loading concept map...</div>
          ) : taxonomyImg ? (
            <div>
              <button
                onClick={() => setConceptFullscreen(true)}
                style={{ float: "right", padding: "5px 10px", marginBottom: "10px", cursor: "pointer" }}
              >
                ⛶ Fullscreen
              </button>
              <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                <button onClick={() => setZoom((z) => z + 0.2)} style={{ padding: "5px 10px", cursor: "pointer" }}>＋</button>
                <button onClick={() => setZoom((z) => Math.max(1, z - 0.2))} style={{ padding: "5px 10px", cursor: "pointer" }}>−</button>
                <button onClick={() => setZoom(1)} style={{ padding: "5px 10px", cursor: "pointer" }}>Reset</button>
              </div>
              <img
                src={taxonomyImg}
                alt="Concept map"
                style={{ transform: `scale(${zoom})`, maxWidth: "100%", borderRadius: "8px" }}
                onDoubleClick={() => setZoom((z) => (z === 1 ? 1.8 : 1))}
              />
            </div>
          ) : (
            <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>⚠️ No concept map available.</div>
          )}
        </div>
      )}

      {/* Concept map fullscreen */}
      {conceptFullscreen && taxonomyImg && (
        <div
          onClick={() => setConceptFullscreen(false)}
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.9)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <button
            onClick={() => setConceptFullscreen(false)}
            style={{ position: "absolute", top: "20px", right: "20px", padding: "10px", background: "#fff", border: "none", borderRadius: "50%", cursor: "pointer", fontSize: "18px" }}
          >
            ✕
          </button>
          <img src={taxonomyImg} alt="Concept Map Fullscreen" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }} />
        </div>
      )}

      {/* Image popup */}
      {popupImg && (
        <div
          onClick={closeImagePopup}
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.9)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", maxWidth: "90%", maxHeight: "90%", background: "#fff", borderRadius: "8px", padding: "20px" }}>
            <button
              onClick={closeImagePopup}
              style={{ position: "absolute", top: "10px", right: "10px", padding: "5px 10px", background: "#d9534f", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}
            >
              ✕
            </button>
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
              <button onClick={() => setZoom((z) => Math.min(4, z + 0.2))} style={{ padding: "5px 10px", cursor: "pointer" }}>+</button>
              <button onClick={() => setZoom((z) => Math.max(1, z - 0.2))} style={{ padding: "5px 10px", cursor: "pointer" }}>–</button>
              <button onClick={() => { setZoom(1); setTranslateX(0); setTranslateY(0); }} style={{ padding: "5px 10px", cursor: "pointer" }}>Reset</button>
            </div>
            <div
              onMouseDown={startPan} onMouseMove={panImage} onMouseUp={endPan} onMouseLeave={endPan}
              onTouchStart={startPinch} onTouchMove={handlePinch} onTouchEnd={endPinch}
              onDoubleClick={toggleDoubleTapZoom}
              style={{ overflow: "hidden", cursor: "grab" }}
            >
              <img
                src={popupImg}
                alt="Zoomable"
                style={{ transform: `scale(${zoom}) translate(${translateX}px, ${translateY}px)`, maxWidth: "100%", maxHeight: "70vh" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}