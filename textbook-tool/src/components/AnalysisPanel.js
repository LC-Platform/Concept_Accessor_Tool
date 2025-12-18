import React, { useState, useEffect, useRef } from "react";

const BASE_URL = "http://10.2.8.12:8500";

export default function AnalysisPanel({
  selectedTerm,
  selectedWordText,
  selectedSentence,
  summary,
  chapterId,
  selectedView,
  selectedSectionId,qaPairs
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
  const [paraphrasedSentence, setParaphrasedSentence] = useState("");
  const [showSummaryHint, setShowSummaryHint] = useState(true);


  // audio states
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const [popupImg, setPopupImg] = useState(null);

  const openImagePopup = (url) => {
    setPopupImg(url);
  };

  const closeImagePopup = () => {
    setPopupImg(null);
  };


  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [initialTranslate, setInitialTranslate] = useState({ x: 0, y: 0 });

  // Pinch Zoom State
  const [initialPinchDistance, setInitialPinchDistance] = useState(null);
  const [initialPinchZoom, setInitialPinchZoom] = useState(1);

  // Reset when popup opens
  useEffect(() => {
    if (popupImg) {
      setZoom(1);
      setTranslateX(0);
      setTranslateY(0);
    }
  }, [popupImg]);


  /** Reset when word changes */
  useEffect(() => {
    if (selectedTerm && chapterId) {
      setDefinition(selectedTerm.definition || "");
      setTranslatedDef("");
      setLabelledImg(null);
      setVideo(null);
      setTaxonomyImg(null);
      setImageError(false);

      // prepare audio if base64 present
      prepareAudioFromTerm(selectedTerm);
    } else {
      setDefinition("");
      setTranslatedDef("");
      setLabelledImg(null);
      setVideo(null);
      setTaxonomyImg(null);
      setImageError(false);
      clearAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTerm, chapterId]);

  useEffect(() => {
    // cleanup audio on unmount
    return () => {
      clearAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPan = (e) => {
    e.preventDefault();
    setPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setInitialTranslate({ x: translateX, y: translateY });
  };

  const panImage = (e) => {
    if (!panning) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    setTranslateX(initialTranslate.x + dx);
    setTranslateY(initialTranslate.y + dy);
  };

  const endPan = () => setPanning(false);

  const getDistance = (touches) => {
    const [a, b] = touches;
    return Math.sqrt(
      Math.pow(a.clientX - b.clientX, 2) +
      Math.pow(a.clientY - b.clientY, 2)
    );
  };

  const startPinch = (e) => {
    if (e.touches.length === 2) {
      const dist = getDistance(e.touches);
      setInitialPinchDistance(dist);
      setInitialPinchZoom(zoom);
    }
  };

  const handlePinch = (e) => {
    if (e.touches.length === 2) {
      const dist = getDistance(e.touches);
      const scale = dist / initialPinchDistance;
      setZoom(() => Math.min(4, Math.max(1, initialPinchZoom * scale)));
    }
  };

  const endPinch = () => {
    setInitialPinchDistance(null);
  };

  const toggleDoubleTapZoom = () => {
    setZoom((z) => (z === 1 ? 2 : 1));
    setTranslateX(0);
    setTranslateY(0);
  };


  const clearAudio = () => {
    setIsPlaying(false);
    setAudioLoading(false);
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = "";
      } catch (e) {}
      audioRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  const prepareAudioFromTerm = async (term) => {
    clearAudio();
    if (!term) return;
    // prefer audio_binary embedded in response
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

    // fallback: try server endpoint (if available)
    try {
      setAudioLoading(true);
      const res = await fetch(`${BASE_URL}/audio/${term.domain_id}`);
      if (!res.ok) {
        setAudioLoading(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setIsPlaying(false);
    } catch (err) {
      console.warn("No audio available from server or error fetching it.", err);
    } finally {
      setAudioLoading(false);
    }
  };

  const paraphraseSentence = async () => {
    if (!selectedSentence) return;

    try {
      setIsLoading(true);

      const res = await fetch(`${BASE_URL}/paraphrase/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedSentence }),
      });

      const data = await res.json();
      setParaphrasedSentence(data.paraphrase || "Unable to paraphrase.");
    } catch (err) {
      console.error("Paraphrase error:", err);
      setParaphrasedSentence("Error generating paraphrase.");
    } finally {
      setIsLoading(false);
    }
  };


  const base64ToUrl = (b64, mime = "audio/mpeg") => {
    // Accept strings that may include "data:audio/...;base64," prefix
    const prefixIndex = b64.indexOf("base64,");
    if (prefixIndex !== -1) b64 = b64.slice(prefixIndex + 7);

    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes.buffer], { type: mime });
    return URL.createObjectURL(blob);
  };

  const togglePlay = () => {
    if (!audioRef.current) {
      if (audioUrl) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => setIsPlaying(false);
      } else {
        // no audio available
        return;
      }
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error("Audio play failed:", err);
        });
    }
  };

  /** ONLY ConceptMap auto-loads */
  useEffect(() => {
    if (activeTab === "ConceptMap" && selectedTerm) loadConceptMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedTerm]);

  /** When a section id is clicked inside PDF */
  useEffect(() => {
    if (selectedView === "Summary" && selectedSectionId && chapterId) {
      fetchSingleSection(selectedSectionId);
    } else {
      setSectionSummary("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectionId, selectedView, chapterId]);

  /** Fetch a single section summary */
  const fetchSingleSection = async (sectionId) => {
    try {
      setIsLoading(true);
      const res = await fetch(
      `${BASE_URL}/section-summary/?chapter_id=${chapterId}&section_id=${sectionId}`,
      { method: "GET" }
      );

      const data = await res.json();
      setSectionSummary(data.section_summary || "No summary available.");
    } catch (err) {
      console.error("Section summary error:", err);
      setSectionSummary("Error fetching summary.");
    } finally {
      setIsLoading(false);
    }
  };

  /** Translate Definition */
  const translateDefinition = async (lang) => {
    if (!selectedTerm) return;
    try {
      setIsLoading(true);

      const url =
        `${BASE_URL}/translate/definition/` +
        `?chapter_id=${chapterId}` +
        `&domain_id=${selectedTerm.domain_id}` +
        `&target_language=${lang}`;

      const res = await fetch(url, { method: "GET" });
      const data = await res.json();

      const finalValue =
        data.translated_definition?.data ||
        data.translated_definition ||
        "Translation unavailable.";

      setTranslatedDef(finalValue);
    } catch (err) {
      console.error("Translate definition error:", err);
    } finally {
      setIsLoading(false);
    }
  };


  /** Translate Sentence */
  const translateSentence = async (lang) => {
    if (!selectedSentence) return;
    try {
      setIsLoading(true);

      const res = await fetch(`${BASE_URL}/translate/sentence/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_id: chapterId,
          sentence: selectedSentence,
          target_language: lang,
        }),
      });

      const data = await res.json();
      if (typeof data.translated_sentence === "string")
        setTranslatedSentence(data.translated_sentence);
      else if (data.translated_sentence?.data)
        setTranslatedSentence(data.translated_sentence.data);
      else setTranslatedSentence("Translation unavailable.");
    } catch (err) {
      console.error("Translate sentence error:", err);
    } finally {
      setIsLoading(false);
    }

  };

  /** Translate Section Summary */
  const translateSectionSummary = async (sectionId, lang) => {
    try {
      setIsLoading(true);

      const res = await fetch(`${BASE_URL}/translate/section-summary/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_id: chapterId,
          section_id: sectionId,
          target_language: lang,
        }),
      });

      const data = await res.json();
      const value =
        data.translated_section_summary?.data ||
        data.translated_section_summary ||
        "Translation unavailable.";

      setTranslatedSections((prev) => ({
        ...prev,
        [sectionId]: value,
      }));
    } catch (err) {
      console.error("Translate summary error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /** Load labelled image */
  const loadImages = async () => {
    if (!selectedTerm) return;

    setImageError(false);
    try {
      setIsLoading(true);

      const url = `${BASE_URL}/image/${selectedTerm.domain_id}`;
      const res = await fetch(url);

      if (!res.ok) {
        setLabelledImg(null);
        setImageError(true);
        return;
      }

      setLabelledImg(url);
    } catch (err) {
      console.error("Image load error:", err);
      setImageError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConceptMap = async () => {
    if (!selectedTerm || !chapterId) return;

    try {
      setIsLoading(true);

      const url = `${BASE_URL}/taxonomy-image/${chapterId}/${selectedTerm.domain_id}`;
      const res = await fetch(url);

      if (!res.ok) {
        setTaxonomyImg(null);
        return;
      }

      setTaxonomyImg(url);
    } catch (err) {
      console.error("ConceptMap error:", err);
      setTaxonomyImg(null);
    } finally {
      setIsLoading(false);
    }
  };


  
  const loadVideo = async () => {
    if (!selectedTerm) return;

    try {
      setIsLoading(true);

      const url = `${BASE_URL}/video/${selectedTerm.domain_id}`;
      const res = await fetch(url);

      if (!res.ok) {
        console.error("Video not found");
        setVideo(null);
        return;
      }

      // Direct video URL to stream
      setVideo(url);

    } catch (err) {
      console.error("Video load error:", err);
      setVideo(null);
    } finally {
      setIsLoading(false);
    }
  };


 

  // ---------------------------------------------------------------------
  // SENTENCE VIEW
  // ---------------------------------------------------------------------
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
            <p className="selected-sentence-box">{selectedSentence}</p>

            {/* TRANSLATE SENTENCE */}
            <div className="translation-box">
              <label>Translate Sentence:</label>
              <select onChange={(e) => translateSentence(e.target.value)}>
                <option value="">Select Language</option>
                <option value="hin">Hindi</option>
                <option value="tel">Telugu</option>
                <option value="ben">Bengali</option>
              </select>
            </div>

            {/* SHOW TRANSLATED SENTENCE */}
            {translatedSentence && (
              <div className="translated-text-box">
                <h4>Translated Sentence:</h4>
                <p>{translatedSentence}</p>
              </div>
            )}

     
            {/* <button
              style={{
                marginTop: "12px",
                padding: "10px 14px",
                background: "#1976d2",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600"
              }}
              onClick={paraphraseSentence}
              disabled={isLoading}
            >
              {isLoading ? "⏳ Paraphrasing..." : "✨ Paraphrase Sentence"}
            </button> */}

            {/* SHOW PARAPHRASED SENTENCE */}
            {/* {paraphrasedSentence && (
              <div
                className="translated-text-box"
                style={{ marginTop: "15px" }}
              >
                <h4>Paraphrased Sentence:</h4>
                <p>{paraphrasedSentence}</p>
              </div>
            )} */}
          </>
        )}
      </div>
    );


  if (selectedView === "Summary")
    return (
      <div className="analysis-panel">
        <div className="analysis-tab-header">
          <div className="analysis-title-pill">
            {selectedSectionId ? `Section ${selectedSectionId}` : "Summary"}
          </div>
        </div>

        {/* SHOW HINT ONLY IF NO SECTION SELECTED */}
        {!selectedSectionId && showSummaryHint && (
          <div
            className="summary-hint-box"
            onClick={() => setShowSummaryHint(false)}
          >
            👉 Select section IDs from the PDF to view its summary  
            <span style={{ fontSize: "12px", opacity: 0.6 }}>
              (click to hide)
            </span>
          </div>
        )}

        {/* SUMMARY CONTENT */}
        {sectionSummary && (
          <p className="section-summary">{sectionSummary}</p>
        )}

        {/* TRANSLATION DROPDOWN */}
        {selectedSectionId && (
          <div className="translation-box">
            <label>Translate Summary:</label>
            <select
              onChange={(e) =>
                translateSectionSummary(selectedSectionId, e.target.value)
              }
            >
              <option value="hin">Hindi</option>
              <option value="tel">Telugu</option> 
              <option value="ben">Bengali</option>
            </select>

            {translatedSections[selectedSectionId] && (
              <p className="translated-text">
                {translatedSections[selectedSectionId]}
              </p>
            )}
          </div>
        )}
      </div>
    );


   if (selectedView === "Q/A") {
    return (
      <div className="analysis-panel">
        <div className="analysis-tab-header">
          <div className="analysis-title-pill">Question and Answer</div>
        </div>

        <div className="qa-container">
          {qaPairs.length === 0 && (
            <p>No Q/A pairs found for this chapter.</p>
          )}

          {qaPairs.map((item, index) => (
            <div key={index} className="qa-card">
              <p><strong>{index + 1}. Question:</strong> {item.question}</p>
              <p><strong>Answer:</strong> {item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // WORD VIEW
  // ---------------------------------------------------------------------
  return (
    <div className="analysis-panel">
      <div className="analysis-tab-header">
        <div className="analysis-title-pill">Word Analysis</div>
      </div>

      {selectedWordText && (
        <div className="selected-word-banner" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            🔍 <strong>{selectedWordText}</strong>
          </div>

          {/* small play button to the right of the banner */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {audioLoading ? (
              <div className="play-audio-btn play-loading" title="Loading audio..." />
            ) : audioUrl ? (
              <button
                className={`play-audio-btn ${isPlaying ? "playing" : ""}`}
                onClick={togglePlay}
                title={isPlaying ? "Pause audio" : "Play audio"}
              >
                {isPlaying ? "▌▌" : "▶"}
              </button>
            ) : (
              <div className="play-audio-btn disabled" title="No audio available" />
            )}
          </div>
        </div>
      )}

      <div className="analysis-tabs">
        {["Define", "Media", "Structure", "ConceptMap"].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* DEFINE */}
      {activeTab === "Define" && (
        <div className="define-section">
          <h4>Definition</h4>
          <p>{definition || "No definition available."}</p>

          <div className="translation-box">
            <label>Translate:</label>
            <select onChange={(e) => translateDefinition(e.target.value)}>
              <option value="">Select Language</option>
              <option value="hin">Hindi</option>
              <option value="tel">Telugu</option>
              <option value="ben">Bengali</option>
            </select>
          </div>

          {translatedDef && (
            <div className="translated-text">
              <h4>Translated:</h4>
              <p>{translatedDef}</p>
            </div>
          )}
        </div>
      )}

      {/* MEDIA */}
      {activeTab === "Media" && (
        <div className="media-section">

          <button
            className="media-load-btn"
            onClick={loadImages}
            disabled={isLoading}
          >
            {isLoading ? "⏳ Loading..." : "📷 Load Labelled Image"}
          </button>

          <button
            className="media-load-btn"
            onClick={loadVideo}
            disabled={isLoading}
          >
            🎞 Load Process Video
          </button>

          {isLoading && <div className="media-skeleton"></div>}

          {!isLoading && imageError && (
            <button className="retry-btn" onClick={loadImages}>
              🔄 Retry Loading Image
            </button>
          )}

          {labelledImg && !imageError && (
            <div className="media-image-wrapper">

              <div className="media-controls">
                <button className="media-control-btn" onClick={() => setZoom(z => Math.min(3, z + 0.2))}>
                  +
                </button>
                <button className="media-control-btn" onClick={() => setZoom(z => Math.max(1, z - 0.2))}>
                  –
                </button>
                <button className="media-control-btn" onClick={() => openImagePopup(labelledImg)}>
                  ⛶
                </button>
              </div>

              <img
                src={labelledImg}
                alt="Labelled"
                className="media-image-preview"
                style={{ transform: `scale(${zoom})` }}
              />
            </div>
          )}


          {video && (
            <video src={video} controls className="media-video-preview" />
          )}
        </div>
      )}

      {/* STRUCTURE */}
      {activeTab === "Structure" && (
        <div className="structure-section">
          {selectedTerm?.word_structure ? (
            <>
              <h4>Word Structure</h4>

              <p>
                <strong>Type:</strong>{" "}
                {selectedTerm.word_structure.type || "—"}
              </p>

              <p>
                <strong>Structure:</strong>{" "}
                {selectedTerm.word_structure.structure || "—"}
              </p>
            </>
          ) : (
            <p>No word structure available.</p>
          )}
        </div>
      )}

      {/* CONCEPT MAP */}
      {activeTab === "ConceptMap" && (
        <div className="conceptmap-section">
          {taxonomyImg ? (
            <div className="zoom-container">
              {/* Fullscreen button */}
              <button
                className="zoom-btn fullscreen-btn"
                onClick={() => openImagePopup(taxonomyImg)}
              >
                ⛶
              </button>

              {/* Zoom controls */}
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

      {popupImg && (
        <div className="image-popup-overlay" onClick={closeImagePopup}>
          <div
            className="image-popup-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="image-popup-close" onClick={closeImagePopup}>
              ✕
            </button>

            {/* === ZOOM BUTTONS for POPUP === */}
            <div className="popup-zoom-controls">
              <button
                className="popup-zoom-btn"
                onClick={() => setZoom((z) => Math.min(4, z + 0.2))}
              >
                +
              </button>

              <button
                className="popup-zoom-btn"
                onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
              >
                –
              </button>

              <button
                className="popup-zoom-btn"
                onClick={() => {
                  setZoom(1);
                  setTranslateX(0);
                  setTranslateY(0);
                }}
              >
                Reset
              </button>
            </div>

            {/* === Zoomable Image Wrapper === */}
            <div
              className="zoomable-wrapper"
              onMouseDown={startPan}
              onMouseMove={panImage}
              onMouseUp={endPan}
              onMouseLeave={endPan}
              onTouchStart={startPinch}
              onTouchMove={handlePinch}
              onTouchEnd={endPinch}
              onDoubleClick={toggleDoubleTapZoom}
            >
              <img
                src={popupImg}
                alt="Zoomable"
                className="zoomable-popup-img"
                style={{
                  transform: `scale(${zoom}) translate(${translateX}px, ${translateY}px)`
                }}
              />
            </div>
          </div>
        </div>
      )}


    </div>
  );
   
}
