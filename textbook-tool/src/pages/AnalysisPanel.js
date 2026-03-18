import React, { useState, useEffect, useRef, useMemo } from "react";

const BASE_URL = "http://10.2.8.12:8500";

/* ─────────────────────────────────────────────
   Tiny reusable audio-button component

   States handled:
   1. loading          → spinner (disabled)
   2. audioUrl ready   → ▶ / ▌▌  toggle
   3. no url yet, onLoadAndPlay provided → ▶ (fetches+plays on click)
   4. fetch failed (hasError), onLoadAndPlay provided → ↺ retry
   5. nothing available at all → dimmed ▶ (no action)
───────────────────────────────────────────── */
function AudioBtn({ audioUrl, loading, isPlaying, hasError, onToggle, onLoadAndPlay, title = "" }) {
  // 1. Loading spinner
  if (loading)
    return (
      <button className="play-audio-btn play-loading" disabled title="Loading audio…" />
    );

  // 2. Audio ready — play / pause
  if (audioUrl)
    return (
      <button
        className={`play-audio-btn ${isPlaying ? "playing" : ""}`}
        onClick={onToggle}
        title={isPlaying ? `Pause ${title}` : `Play ${title}`}
      >
        {isPlaying ? "▌▌" : "▶"}
      </button>
    );

  // 3 & 4. No audio yet OR fetch failed — show a clickable button if we have an endpoint
  if (onLoadAndPlay)
    return (
      <button
        className="play-audio-btn"
        onClick={onLoadAndPlay}
        title={hasError ? `Retry ${title}` : `Play ${title}`}
        style={hasError ? { opacity: 0.65 } : undefined}
      >
        {hasError ? "↺" : "▶"}
      </button>
    );

  // 5. Truly no endpoint — dimmed, non-interactive
  return <div className="play-audio-btn disabled" title="No audio available" />;
}

/* ─────────────────────────────────────────────
   Hook: manages one audio stream
   Returns { audioUrl, loading, isPlaying, load, toggle, clear }
───────────────────────────────────────────── */
function useAudioStream() {
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError]  = useState(false);

  const audioRef   = useRef(null);
  const urlRef     = useRef(null);
  const loadingRef = useRef(false);

  const _setUrl = (u) => { urlRef.current = u; setAudioUrl(u); };
  const _setLoading = (v) => { loadingRef.current = v; setLoading(v); };

  const clear = () => {
    setIsPlaying(false);
    setHasError(false);
    _setLoading(false);
    if (audioRef.current) {
      try { audioRef.current.pause(); audioRef.current.src = ""; } catch (_) {}
      audioRef.current = null;
    }
    if (urlRef.current) { try { URL.revokeObjectURL(urlRef.current); } catch (_) {} }
    _setUrl(null);
  };

  const _attach = (blobUrl) => {
    _setUrl(blobUrl);
    const audio = new Audio(blobUrl);
    audio.onended = () => setIsPlaying(false);
    audioRef.current = audio;
    return audio;
  };

  const load = async (url) => {
    clear();
    if (!url) return;
    try {
      _setLoading(true);
      setHasError(false);
      const res = await fetch(url);
      if (!res.ok) { setHasError(true); return; }
      const blob = await res.blob();
      _attach(URL.createObjectURL(blob));
    } catch (err) {
      console.warn("Audio fetch failed:", url, err);
      setHasError(true);
    } finally {
      _setLoading(false);
    }
  };

  const loadBase64 = (b64, mime = "audio/mpeg") => {
    clear();
    try {
      _setLoading(true);
      const idx = b64.indexOf("base64,");
      const raw = idx !== -1 ? b64.slice(idx + 7) : b64;
      const binary = atob(raw);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      _attach(URL.createObjectURL(new Blob([bytes.buffer], { type: mime })));
    } catch (err) {
      console.error("Base64 audio decode error:", err);
      setHasError(true);
    } finally {
      _setLoading(false);
    }
  };

  const toggle = () => {
    if (!audioRef.current) {
      if (urlRef.current) {
        const audio = new Audio(urlRef.current);
        audio.onended = () => setIsPlaying(false);
        audioRef.current = audio;
      } else return;
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.error("Audio play failed:", e));
    }
  };

  const loadAndPlay = async (url) => {
    clear();
    if (!url) return;
    try {
      _setLoading(true);
      setHasError(false);
      const res = await fetch(url);
      if (!res.ok) { setHasError(true); console.warn("Audio not found:", url); return; }
      const blob = await res.blob();
      const audio = _attach(URL.createObjectURL(blob));
      _setLoading(false);
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.warn("loadAndPlay failed:", err);
      setHasError(true);
      _setLoading(false);
    }
  };

  useEffect(() => () => {
    if (audioRef.current) { try { audioRef.current.pause(); audioRef.current.src = ""; } catch (_) {} }
    if (urlRef.current) { try { URL.revokeObjectURL(urlRef.current); } catch (_) {} }
  }, []);

  return { audioUrl, loading, isPlaying, hasError, load, loadBase64, loadAndPlay, toggle, clear };
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
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

  /* ── audio streams ─────────────────────── */
  // 1. Domain word pronunciation  (base64 from /extract-domain-terms/)
  const wordAudio = useAudioStream();
  // 2. English definition audio   (GET /api/get-definition-audio)
  const defAudio = useAudioStream();
  // 3. Translated definition audio (GET /api/get-definition-audio-translation)
  const transDefAudio = useAudioStream();
  // 4. English section-summary audio
  const summaryAudio = useAudioStream();
  // 5. Translated section-summary audio
  const transSummaryAudio = useAudioStream();

  /* ── image popup state ─────────────────── */
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
    if (len < 200) return "22px";
    if (len < 500) return "19px";
    if (len < 1000) return "17px";
    if (len < 2000) return "15px";
    return "14px";
  };

  /* ── helpers ───────────────────────────── */
  const openImagePopup = (url) => {
    setPopupImg(null);
    requestAnimationFrame(() => {
      setZoom(1); setTranslateX(0); setTranslateY(0); setPopupImg(url);
    });
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

  /* ══════════════════════════════════════════
     AUDIO LOADERS
  ══════════════════════════════════════════ */

  /**
   * Audio 1: Domain word pronunciation — base64 from /extract-domain-terms/ response
   */
  const loadWordAudio = (term) => {
    wordAudio.clear();
    if (!term?.audio_binary) return;
    wordAudio.loadBase64(term.audio_binary, "audio/mpeg");
  };

  /**
   * Audio 2: English definition audio
   *    GET /api/get-definition-audio?chapter_id=...&domain_id=...
   */
  const loadDefinitionAudio = async (term) => {
    defAudio.clear();
    if (!term || !chapterId) return;
    await defAudio.load(
      `${BASE_URL}/api/get-definition-audio?chapter_id=${chapterId}&domain_id=${term.domain_id}`
    );
  };

  /**
   * Audio 3: Translated definition audio
   *    GET /api/get-definition-audio-translation?chapter_id=...&domain_id=...&language=...
   */
  const loadTranslatedDefinitionAudio = async (lang) => {
    transDefAudio.clear();
    if (!selectedTerm || !chapterId || !lang) return;
    await transDefAudio.load(
      `${BASE_URL}/api/get-definition-audio-translation` +
      `?chapter_id=${chapterId}&domain_id=${selectedTerm.domain_id}&language=${lang}`
    );
  };

  /**
   * English section summary audio
   *    GET /api/get-section-summary-audio?chapter_id=...&section_id=...
   */
  const loadSectionSummaryAudio = async (sectionId) => {
    summaryAudio.clear();
    transSummaryAudio.clear();
    if (!sectionId || !chapterId) return;
    await summaryAudio.load(
      `${BASE_URL}/api/get-section-summary-audio?chapter_id=${chapterId}&section_id=${sectionId}`
    );
  };

  /**
   * Translated section summary audio
   *    GET /api/get-section-summary-audio-translation?chapter_id=...&section_id=...&language=...
   */
  const loadTranslatedSectionSummaryAudio = async (sectionId, lang) => {
    if (!sectionId || !chapterId || !lang) return;
    await transSummaryAudio.load(
      `${BASE_URL}/api/get-section-summary-audio-translation` +
      `?chapter_id=${chapterId}&section_id=${sectionId}&language=${lang}`
    );
  };

  /* ══════════════════════════════════════════
     EFFECTS
  ══════════════════════════════════════════ */

  /** Reset when selected term changes */
  useEffect(() => {
    if (selectedTerm && chapterId) {
      setDefinition(selectedTerm.definition || "");
      setTranslatedDef("");
      setLabelledImg(null);
      setVideo(null);
      setTaxonomyImg(null);
      setImageError(false);
      setVideoError(false);
      setHasImage(false);
      setHasVideo(false);

      // 🔊 Audio 1: word pronunciation (base64 embedded in term)
      loadWordAudio(selectedTerm);

      // 🔊 Audio 2: English definition (API)
      loadDefinitionAudio(selectedTerm);

      // Clear translated audio when term changes
      transDefAudio.clear();

    } else {
      setDefinition("");
      setTranslatedDef("");
      setLabelledImg(null);
      setVideo(null);
      setTaxonomyImg(null);
      setImageError(false);
      setVideoError(false);
      setHasImage(false);
      setHasVideo(false);

      wordAudio.clear();
      defAudio.clear();
      transDefAudio.clear();
    }
  }, [selectedTerm, chapterId]);

  /** Check media availability when Media tab opens */
  useEffect(() => {
    if (activeTab !== "Media" || !selectedTerm) return;
    const checkAvailability = async () => {
      try { const r = await fetch(`${BASE_URL}/image/${selectedTerm.domain_id}`, { headers: { Range: "bytes=0-0" } }); setHasImage(r.ok); } catch { setHasImage(false); }
      try { const r = await fetch(`${BASE_URL}/video/${selectedTerm.domain_id}`, { headers: { Range: "bytes=0-0" } }); setHasVideo(r.ok); } catch { setHasVideo(false); }
    };
    checkAvailability();
  }, [activeTab, selectedTerm]);

  /** Auto-load concept map */
  useEffect(() => {
    if (activeTab === "ConceptMap" && selectedTerm) loadConceptMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedTerm]);

  /** Section ID clicked → fetch summary + English audio */
  useEffect(() => {
    if (selectedView === "Summary" && selectedSectionId && chapterId) {
      fetchSingleSection(selectedSectionId);
    } else {
      setSectionSummary("");
      summaryAudio.clear();
      transSummaryAudio.clear();
      setTranslatedSections({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectionId, selectedView, chapterId]);

  /* ══════════════════════════════════════════
     DATA FETCH FUNCTIONS
  ══════════════════════════════════════════ */

  const fetchSingleSection = async (sectionId) => {
    try {
      setIsLoading(true);
      const res = await fetch(
        `${BASE_URL}/section-summary/?chapter_id=${chapterId}&section_id=${sectionId}`
      );
      const data = await res.json();
      setSectionSummary(data.section_summary || "No summary available.");
    } catch (err) {
      console.error("Section summary error:", err);
      setSectionSummary("Error fetching summary.");
    } finally {
      setIsLoading(false);
    }
    loadSectionSummaryAudio(sectionId);
  };

  /** Translate Definition — also fetches Audio 3 (translated definition audio) */
  const translateDefinition = async (lang) => {
    if (!selectedTerm || !lang) return;
    try {
      setIsLoading(true);
      const res = await fetch(
        `${BASE_URL}/translate/definition/?chapter_id=${chapterId}&domain_id=${selectedTerm.domain_id}&target_language=${lang}`
      );
      const data = await res.json();
      const finalValue =
        data.translated_definition?.data || data.translated_definition || "Translation unavailable.";
      setTranslatedDef(finalValue);
    } catch (err) {
      console.error("Translate definition error:", err);
    } finally {
      setIsLoading(false);
    }
    // 🔊 Audio 3: load translated definition audio in parallel
    loadTranslatedDefinitionAudio(lang);
  };

  const translateSentence = async (lang) => {
    if (!selectedSentence) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${BASE_URL}/translate/sentence/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_id: chapterId, sentence: selectedSentence, target_language: lang }),
      });
      const data = await res.json();
      if (typeof data.translated_sentence === "string") setTranslatedSentence(data.translated_sentence);
      else if (data.translated_sentence?.data) setTranslatedSentence(data.translated_sentence.data);
      else setTranslatedSentence("Translation unavailable.");
    } catch (err) {
      console.error("Translate sentence error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /** Translate Section Summary — also fetches translated audio */
  const translateSectionSummary = async (sectionId, lang) => {
    if (!lang) return;
    try {
      setIsLoading(true);
      const res = await fetch(
        `${BASE_URL}/translate/section-summary/?chapter_id=${chapterId}&section_id=${sectionId}&target_language=${lang}`
      );
      const data = await res.json();
      const value =
        data.translated_section_summary?.data || data.translated_section_summary || "Translation unavailable.";
      setTranslatedSections((prev) => ({ ...prev, [sectionId]: value }));
    } catch (err) {
      console.error("Translate summary error:", err);
    } finally {
      setIsLoading(false);
    }
    loadTranslatedSectionSummaryAudio(sectionId, lang);
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
    try {
      setIsLoading(true);
      const res = await fetch(`${BASE_URL}/taxonomy-image/${chapterId}/${selectedTerm.domain_id}`);
      setTaxonomyImg(res.ok ? `${BASE_URL}/taxonomy-image/${chapterId}/${selectedTerm.domain_id}` : null);
    } catch { setTaxonomyImg(null); } finally { setIsLoading(false); }
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
      <div className="analysis-panel">
        <div className="analysis-tab-header">
          <div className="analysis-title-pill">Sentence Analysis</div>
        </div>
        {!selectedSentence && <p>Select a sentence to analyze.</p>}
        {selectedSentence && (
          <>
            <p><strong>Selected Sentence:</strong></p>
            <p className="selected-sentence-box" style={{ fontSize: getDynamicFontSize(selectedSentence), lineHeight: "1.6" }}>
              {selectedSentence}
            </p>
            <div className="translation-box">
              <label>Translate Sentence:</label>
              <select onChange={(e) => translateSentence(e.target.value)}>
                <option value="">Select Language</option>
                <option value="hin">Hindi</option>
                <option value="tel">Telugu</option>
                <option value="ben">Bengali</option>
              </select>
            </div>
            {translatedSentence && (
              <div className="translated-text-box">
                <h4>Translated Sentence:</h4>
                <p style={{ fontSize: getDynamicFontSize(translatedSentence), lineHeight: "1.6" }}>
                  {translatedSentence}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    );

  /* ══════════════════════════════════════════
     SUMMARY VIEW
  ══════════════════════════════════════════ */
  if (selectedView === "Summary")
    return (
      <div className="analysis-panel">
        <div className="analysis-tab-header">
          <div className="analysis-title-pill">
            {selectedSectionId ? `Section ${selectedSectionId}` : "Summary"}
          </div>
        </div>

        {!selectedSectionId && showSummaryHint && (
          <div className="summary-hint-box" onClick={() => setShowSummaryHint(false)}>
            👉 Select section IDs from the PDF to view its summary{" "}
            <span style={{ fontSize: "12px", opacity: 0.6 }}>(click to hide)</span>
          </div>
        )}

        {sectionSummary && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
            <div style={{ flexShrink: 0, marginTop: 4 }}>
              <AudioBtn
                audioUrl={summaryAudio.audioUrl}
                loading={summaryAudio.loading}
                isPlaying={summaryAudio.isPlaying}
                hasError={summaryAudio.hasError}
                onToggle={summaryAudio.toggle}
                title="summary"
              />
            </div>
            <p
              className="section-summary"
              style={{ fontSize: getDynamicFontSize(sectionSummary), lineHeight: "1.7", margin: 0 }}
            >
              {sectionSummary}
            </p>
          </div>
        )}

        {selectedSectionId && (
          <div className="translation-box">
            <label>Translate Summary:</label>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) translateSectionSummary(selectedSectionId, e.target.value);
              }}
            >
              <option value="" disabled>Select Language</option>
              <option value="hin">Hindi</option>
              <option value="tel">Telugu</option>
              <option value="ben">Bengali</option>
            </select>

            {translatedSections[selectedSectionId] && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 10 }}>
                <div style={{ flexShrink: 0, marginTop: 4 }}>
                  <AudioBtn
                    audioUrl={transSummaryAudio.audioUrl}
                    loading={transSummaryAudio.loading}
                    isPlaying={transSummaryAudio.isPlaying}
                    hasError={transSummaryAudio.hasError}
                    onToggle={transSummaryAudio.toggle}
                    title="translated summary"
                  />
                </div>
                <p
                  className="translated-text"
                  style={{
                    fontSize: getDynamicFontSize(translatedSections[selectedSectionId]),
                    lineHeight: "1.7",
                    margin: 0,
                  }}
                >
                  {translatedSections[selectedSectionId]}
                </p>
              </div>
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
      <div className="analysis-panel">
        <div className="analysis-tab-header">
          <div className="analysis-title-pill">Question and Answer</div>
        </div>
        <div className="qa-container">
          {qaPairs.length === 0 && <p className="qa-empty">No Q&A pairs found for this chapter.</p>}
          {qaPairs.map((item, index) => (
            <div key={index} className="qa-card">
              <div className="qa-question">
                <span className="qa-number">Q{index + 1}</span>
                <span className="qa-question-text">{item.question}</span>
              </div>
              <div className="qa-answer">
                <span className="qa-answer-label">A</span>
                <p className="qa-answer-text">{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  /* ══════════════════════════════════════════
     WORD VIEW
  ══════════════════════════════════════════ */
  return (
    <div className="analysis-panel">
      <div className="analysis-tab-header">
        <div className="analysis-title-pill">Word Analysis</div>
      </div>

      {/*
        Top banner: shows selected word + Audio 1 (word pronunciation)
        Audio 1 source: audio_binary (base64) from /extract-domain-terms/
      */}
      {selectedWordText && (
        <div className="selected-word-banner" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            🔍 <strong>{selectedWordText}</strong>
          </div>
          <AudioBtn
            audioUrl={wordAudio.audioUrl}
            loading={wordAudio.loading}
            isPlaying={wordAudio.isPlaying}
            hasError={wordAudio.hasError}
            onToggle={wordAudio.toggle}
            title={`pronunciation of "${selectedWordText}"`}
          />
        </div>
      )}

      <div className="analysis-tabs">
        {["Define", "Media", "ConceptMap"].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── DEFINE TAB ── */}
      {activeTab === "Define" && (
        <div className="define-section">

          {/*
            ── Audio 2: English definition ──────────────────────────────────
            Source: GET /api/get-definition-audio
            Shown next to the "Definition" heading.
            onLoadAndPlay is provided so a lazy retry works if bg-fetch failed.
          */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h4 style={{ margin: 0 }}>Definition</h4>
            <AudioBtn
              audioUrl={defAudio.audioUrl}
              loading={defAudio.loading}
              isPlaying={defAudio.isPlaying}
              hasError={defAudio.hasError}
              onToggle={defAudio.toggle}
              onLoadAndPlay={() =>
                defAudio.loadAndPlay(
                  `${BASE_URL}/api/get-definition-audio?chapter_id=${chapterId}&domain_id=${selectedTerm?.domain_id}`
                )
              }
              title="English definition"
            />
          </div>

          {/* Definition text */}
          <p
            style={{
              fontSize: getDynamicFontSize(definition),
              lineHeight: "1.6",
              transition: "font-size 0.3s ease",
            }}
          >
            {definition || "No definition available."}
          </p>

          {/* Translation selector */}
          <div className="translation-box">
            <label>Translate:</label>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) translateDefinition(e.target.value);
              }}
            >
              <option value="" disabled>Select Language</option>
              <option value="hin">Hindi</option>
              <option value="tel">Telugu</option>
              <option value="ben">Bengali</option>
            </select>
          </div>

          {/*
            ── Audio 3: Translated definition ───────────────────────────────
            Source: GET /api/get-definition-audio-translation
            Loaded automatically when user picks a language in the selector above.
          */}
          {translatedDef && (
            <div className="translated-text">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <h4 style={{ margin: 0 }}>Translated:</h4>
                <AudioBtn
                  audioUrl={transDefAudio.audioUrl}
                  loading={transDefAudio.loading}
                  isPlaying={transDefAudio.isPlaying}
                  hasError={transDefAudio.hasError}
                  onToggle={transDefAudio.toggle}
                  onLoadAndPlay={
                    // Allow retry if the bg-fetch failed
                    transDefAudio.hasError
                      ? () =>
                          transDefAudio.loadAndPlay(
                            `${BASE_URL}/api/get-definition-audio-translation` +
                            `?chapter_id=${chapterId}&domain_id=${selectedTerm?.domain_id}&language=${
                              // Re-read last selected language from DOM as cheapest approach
                              document.querySelector(".translation-box select")?.value || ""
                            }`
                          )
                      : undefined
                  }
                  title="translated definition"
                />
              </div>
              <p
                style={{
                  fontSize: getDynamicFontSize(translatedDef),
                  lineHeight: "1.6",
                  transition: "font-size 0.3s ease",
                }}
              >
                {translatedDef}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── MEDIA TAB ── */}
      {activeTab === "Media" && (
        <div className="media-section">
          <div className="media-action-row">
            <button
              className={`media-action-btn image ${!hasImage ? "disabled" : ""}`}
              onClick={loadImages}
              disabled={!hasImage || isLoading}
            >
              📷 <span>Labelled Image</span>
            </button>
            <button
              className={`media-action-btn video ${!hasVideo ? "disabled" : ""}`}
              onClick={loadVideo}
              disabled={!hasVideo || isLoading}
            >
              🎞 <span>Process Video</span>
            </button>
          </div>

          {isLoading && <div className="media-skeleton" />}
          {!isLoading && imageError && <p className="media-error">⚠️ No labelled image available.</p>}
          {!isLoading && videoError && <p className="media-error">⚠️ No process video available.</p>}

          {labelledImg && !imageError && (
            <div className="media-image-wrapper">
              <div className="media-controls">
                <button className="media-control-btn" onClick={() => setZoom((z) => Math.min(3, z + 0.2))}>+</button>
                <button className="media-control-btn" onClick={() => setZoom((z) => Math.max(1, z - 0.2))}>–</button>
                <button className="media-control-btn" onClick={() => openImagePopup(labelledImg)}>⛶</button>
              </div>
              <img src={labelledImg} alt="Labelled" className="media-image-preview" style={{ transform: `scale(${zoom})` }} />
            </div>
          )}

          {video && <video src={video} controls className="media-video-preview" />}
        </div>
      )}

      {/* ── CONCEPT MAP TAB ── */}
      {activeTab === "ConceptMap" && (
        <div className="conceptmap-section">
          {taxonomyImg ? (
            <div className="zoom-container">
              <button className="zoom-btn fullscreen-btn" onClick={() => setConceptFullscreen(true)}>⛶</button>
              <div className="zoom-controls">
                <button className="zoom-btn" onClick={() => setZoom((z) => z + 0.2)}>＋</button>
                <button className="zoom-btn" onClick={() => setZoom((z) => Math.max(1, z - 0.2))}>−</button>
                <button className="zoom-btn" onClick={() => setZoom(1)}>Reset</button>
              </div>
              <img
                src={taxonomyImg}
                alt="Concept map"
                className="analysis-full-image zoomable"
                style={{ transform: `scale(${zoom})` }}
                onDoubleClick={() => setZoom((z) => (z === 1 ? 1.8 : 1))}
              />
            </div>
          ) : (
            <p>No concept map available.</p>
          )}
        </div>
      )}

      {/* Concept map fullscreen */}
      {conceptFullscreen && taxonomyImg && (
        <div className="conceptmap-fullscreen-overlay" onClick={() => setConceptFullscreen(false)}>
          <button className="image-popup-close" onClick={() => setConceptFullscreen(false)}>✕</button>
          <img src={taxonomyImg} alt="Concept Map Fullscreen" className="conceptmap-fullscreen-image" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Image popup */}
      {popupImg && (
        <div className="image-popup-overlay" onClick={closeImagePopup}>
          <div className="image-popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-popup-close" onClick={closeImagePopup}>✕</button>
            <div className="popup-zoom-controls">
              <button className="popup-zoom-btn" onClick={() => setZoom((z) => Math.min(4, z + 0.2))}>+</button>
              <button className="popup-zoom-btn" onClick={() => setZoom((z) => Math.max(1, z - 0.2))}>–</button>
              <button className="popup-zoom-btn" onClick={() => { setZoom(1); setTranslateX(0); setTranslateY(0); }}>Reset</button>
            </div>
            <div
              className="zoomable-wrapper"
              onMouseDown={startPan} onMouseMove={panImage} onMouseUp={endPan} onMouseLeave={endPan}
              onTouchStart={startPinch} onTouchMove={handlePinch} onTouchEnd={endPinch}
              onDoubleClick={toggleDoubleTapZoom}
            >
              <img
                src={popupImg}
                alt="Zoomable"
                className="zoomable-popup-img"
                style={{ transform: `scale(${zoom}) translate(${translateX}px, ${translateY}px)` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}