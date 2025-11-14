import React, { useState } from "react";

export default function InteractionPanel({
  hoveredTerm,
  clickedTerm,
  summary,
  imageData,
  videoUrl,
  selectedText,
  onTranslate,
  onTranslateDefinition,
}) {
  const [selectedLanguage, setSelectedLanguage] = useState("hin");
  const [translatedSummary, setTranslatedSummary] = useState(null);
  const [translatedDefinition, setTranslatedDefinition] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Translate Summary
  const handleSummaryTranslate = async () => {
    setIsTranslating(true);
    try {
      const translated = await onTranslate(selectedLanguage);
      setTranslatedSummary(translated);
    } catch (error) {
      console.error("Translation error:", error);
    }
    setIsTranslating(false);
  };

  // Translate Definition
  const handleDefinitionTranslate = async (domainId) => {
    setIsTranslating(true);
    try {
      const translated = await onTranslateDefinition(domainId, selectedLanguage);
      setTranslatedDefinition(translated);
    } catch (error) {
      console.error("Definition translation error:", error);
    }
    setIsTranslating(false);
  };

  return (
    <div className="interaction-panel">
      {hoveredTerm && (
        <div className="hovered">
          <strong>Hovered:</strong> {hoveredTerm.name}
        </div>
      )}

      {clickedTerm && (
        <div className="clicked">
          <strong>Clicked Term:</strong> {clickedTerm.name}

          {clickedTerm.definition && (
            <p style={{ marginTop: "8px" }}>
              <strong>Definition:</strong> {clickedTerm.definition}
            </p>
          )}

          <div className="translation-box">
            <div className="translation-header">
              <label>Translate Definition:</label>
              <select
                className="language-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option value="hin">Hindi</option>
                <option value="tel">Telugu</option>
                <option value="ben">Bengali</option>
              </select>
              <button
                className="translate-btn"
                disabled={isTranslating}
                onClick={() => handleDefinitionTranslate(clickedTerm.domain_id)}
              >
                {isTranslating ? "Translating..." : "Translate"}
              </button>
            </div>

            {translatedDefinition && (
              <div className="translated-summary">
                <h5>Translated Definition ({selectedLanguage.toUpperCase()})</h5>
                <p>{translatedDefinition}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedText && (
        <div className="selected">
          <strong>Selected Text:</strong> {selectedText}
        </div>
      )}

      {summary && (
        <div className="summary">
          <h4>Generated Summary</h4>
          <p>{summary}</p>

          <div className="translation-box">
            <div className="translation-header">
              <label>Translate Summary:</label>
              <select
                className="language-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option value="hin">Hindi</option>
                <option value="tel">Telugu</option>
                <option value="ben">Bengali</option>
              </select>
              <button
                onClick={handleSummaryTranslate}
                className="translate-btn"
                disabled={isTranslating}
              >
                {isTranslating ? "Translating..." : "Translate"}
              </button>
            </div>

            {translatedSummary && (
              <div className="translated-summary">
                <h5>Translated Summary ({selectedLanguage.toUpperCase()})</h5>
                <p>{translatedSummary}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {imageData && (
        <div className="image-section">
          <h4>Labelled Image</h4>
          <img src={imageData} alt="labelled" style={{ width: "100%", borderRadius: "8px" }} />
        </div>
      )}

      {videoUrl && (
        <div className="video-section">
          <h4>Process Video</h4>
          <video src={videoUrl} controls width="100%" />
        </div>
      )}
    </div>
  );
}
