import React, { useState, useEffect } from "react";

const BASE_URL = "http://10.2.8.12:8500";

export default function AnalysisPanel({
  selectedTerm,
  selectedWordText,
  selectedSentence,
  summary,
  chapterId,
  selectedView,
  selectedSectionId,
}) {
  const [activeTab, setActiveTab] = useState("Define");
  const [definition, setDefinition] = useState("");
  const [translatedDef, setTranslatedDef] = useState("");
  const [taxonomyImg, setTaxonomyImg] = useState(null);
  const [labelledImg, setLabelledImg] = useState(null);
  const [video, setVideo] = useState(null);
  const [translatedSentence, setTranslatedSentence] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sectionSummary, setSectionSummary] = useState("");
  const [translatedSections, setTranslatedSections] = useState({});
  const [imageError, setImageError] = useState(false);

  /** Reset when word changes */
  useEffect(() => {
    if (selectedTerm && chapterId) {
      setDefinition(selectedTerm.definition || "");
      setTranslatedDef("");
      setLabelledImg(null);
      setVideo(null);
      setTaxonomyImg(null);
      setImageError(false);
    } else {
      setDefinition("");
      setTranslatedDef("");
      setLabelledImg(null);
      setVideo(null);
      setTaxonomyImg(null);
      setImageError(false);
    }
  }, [selectedTerm, chapterId]);

  /** ONLY ConceptMap auto-loads */
  useEffect(() => {
    if (activeTab === "ConceptMap" && selectedTerm) loadConceptMap();
  }, [activeTab, selectedTerm]);

  /** When a section id is clicked inside PDF */
  useEffect(() => {
    if (selectedView === "Summary" && selectedSectionId && chapterId) {
      fetchSingleSection(selectedSectionId);
    } else {
      setSectionSummary("");
    }
  }, [selectedSectionId, selectedView, chapterId]);

  /** Fetch a single section summary */
  const fetchSingleSection = async (sectionId) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${BASE_URL}/section-summary/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_id: chapterId, section_id: sectionId }),
      });

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

      const res = await fetch(`${BASE_URL}/translate/definition/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_id: chapterId,
          domain_id: selectedTerm.domain_id,
          target_language: lang,
        }),
      });

      const data = await res.json();

      if (typeof data.translated_definition === "string")
        setTranslatedDef(data.translated_definition);
      else if (data.translated_definition?.data)
        setTranslatedDef(data.translated_definition.data);
      else setTranslatedDef("Translation unavailable.");
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

  /** Load Concept Map (taxonomy) */
  const loadConceptMap = async () => {
    try {
      setIsLoading(true);

      const url = `${BASE_URL}/taxonomy-image/${selectedTerm.domain_id}`;
      const res = await fetch(url);

      if (!res.ok) return setTaxonomyImg(null);

      setTaxonomyImg(url);
    } catch (err) {
      console.error("ConceptMap error:", err);
      setTaxonomyImg(null);
    } finally {
      setIsLoading(false);
    }
  };

  /** Video placeholder */
  const loadVideo = () => setVideo(null);

  /** Fullscreen Image Viewer */
  const openFullscreen = (url) => {
    const win = window.open();
    win.document.write(`
      <html>
        <head>
          <title>Fullscreen Image</title>
          <style>
            body { margin:0; background:black; }
            img { width:100%; object-fit:contain; }
          </style>
        </head>
        <body><img src="${url}" /></body>
      </html>
    `);
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

        {selectedWordText && (
          <div className="selected-word-banner">
            🔍 <strong>{selectedWordText}</strong>
          </div>
        )}

        {!selectedSentence && <p>Select a sentence to analyze.</p>}

        {selectedSentence && (
          <>
            <p><strong>Selected Sentence:</strong></p>
            <p className="selected-sentence-box">{selectedSentence}</p>

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
                <p>{translatedSentence}</p>
              </div>
            )}
          </>
        )}
      </div>
    );

  // ---------------------------------------------------------------------
  // SUMMARY VIEW
  // ---------------------------------------------------------------------
  if (selectedView === "Summary")
    return (
      <div className="analysis-panel">
        <div className="analysis-tab-header">
          <div className="analysis-title-pill">
            Section {selectedSectionId || ""}
          </div>
        </div>

        {selectedWordText && (
          <div className="selected-word-banner">
            🔍 <strong>{selectedWordText}</strong>
          </div>
        )}

        {sectionSummary && (
          <p className="section-summary">{sectionSummary}</p>
        )}

        {selectedSectionId && (
          <div className="translation-box">
            <label>Translate Summary:</label>
            <select
              onChange={(e) =>
                translateSectionSummary(selectedSectionId, e.target.value)
              }
            >
              <option value="">Select Language</option>
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

  // ---------------------------------------------------------------------
  // WORD VIEW
  // ---------------------------------------------------------------------
  return (
    <div className="analysis-panel">
      <div className="analysis-tab-header">
        <div className="analysis-title-pill">Word Analysis</div>
      </div>

      {selectedWordText && (
        <div className="selected-word-banner">
          🔍 <strong>{selectedWordText}</strong>
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
            <img
              src={labelledImg}
              alt="Labelled"
              className="enhanced-media-image"
              onClick={() => openFullscreen(labelledImg)}
            />
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
            <img
              src={taxonomyImg}
              alt={selectedTerm?.word ? `Concept map for ${selectedTerm.word}` : "Concept map"}
              className="analysis-full-image"
            />
          ) : (
            <p>No concept map available.</p>
          )}
        </div>
      )}
    </div>
  );
}
