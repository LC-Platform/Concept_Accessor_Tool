import React, { useEffect, useState } from "react";
import "../components/styles/ModernLayout.css";

export default function ReadingPanel({
  text,
  terms,
  selectedView,
  onTermClick,
  onSentenceSelect,
}) {
  const [title, setTitle] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  /* --------------------------- TOAST COMPONENT --------------------------- */
  const Toast = ({ message, onClose }) => (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        background: "#d9534f",
        color: "white",
        padding: "12px 16px",
        borderRadius: "6px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        zIndex: 9999,
        fontSize: "14px",
      }}
    >
      {message}
      <button
        style={{
          marginLeft: "12px",
          background: "transparent",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontWeight: "bold",
        }}
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  );

  /* --------------------------- TITLE EXTRACT ---------------------------- */
  useEffect(() => {
    if (text) {
      const firstLine = text.split("\n")[0] || "";
      const cleaned = firstLine.replace(/[^a-zA-Z0-9\s]/g, "").trim();
      setTitle(cleaned || "Untitled Document");
    }
  }, [text]);
  
  useEffect(() => {
  // 🔥 When in Q/A mode → remove ALL highlights completely
  if (selectedView === "Q/A") {
    document
      .querySelectorAll(".term-highlight-overlay, .section-id-highlight")
      .forEach(el => el.remove());
    return;
  }
}, [selectedView]);


  /* ----------------------- MANUAL SENTENCE SELECT ----------------------- */
  useEffect(() => {
    if (selectedView !== "Sentence") return;

    const ENGLISH_SENTENCE_DELIMITER = /[.!?]$/;

    const handleMouseUp = () => {
      const selectedText = window.getSelection().toString().trim();
      if (!selectedText) return;

      const isCompleteSentence = ENGLISH_SENTENCE_DELIMITER.test(selectedText);

      if (!isCompleteSentence) {
        setToastMessage(
          "Please select at least one complete sentence ending with ., ! or ?"
        );
        return;
      }

      if (onSentenceSelect) onSentenceSelect(selectedText);
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [selectedView, onSentenceSelect]);

  /* --------------------------- WORD CLICK --------------------------- */
  const handleTermClick = (term) => {
    if (selectedView === "Word" && onTermClick) {
      onTermClick(term);
    }
  };

  /* ------------------------ SENTENCE CLICK --------------------------- */
  const handleSentenceClick = (sentence) => {
    if (selectedView === "Sentence" && onSentenceSelect) {
      onSentenceSelect(sentence);
    }
  };

  const renderTextWithHighlights = () => {
  if (!text) return null;

  // 🚫 DO NOT highlight in Q/A mode
  if (selectedView === "Q/A") {
    return text;
  }

  if (!terms || terms.length === 0) return text;

  let elements = [text];

  terms.forEach((term) => {
    if (!term?.name) return;
    const newElements = [];

    elements.forEach((element) => {
      if (typeof element === "string") {
        const parts = element.split(
          new RegExp(`\\b(${term.name})\\b`, "gi")
        );

        parts.forEach((part, index) => {
          if (part.toLowerCase() === term.name.toLowerCase()) {
            newElements.push(
              <span
                key={`${term.domain_id}-${index}`}
                className="highlighted-term"
                onClick={() => handleTermClick(term)}
                style={{
                  cursor: "pointer",
                  backgroundColor: "yellow",
                }}
              >
                {part}
              </span>
            );
          } else if (part) {
            newElements.push(part);
          }
        });
      } else {
        newElements.push(element);
      }
    });

    elements = newElements;
  });

  return elements;
};

  /* ------------------------------- RENDER ------------------------------- */

  return (
    <div className="reading-panel-container">
      {/* 🔥 Toast Message */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage("")}
        />
      )}

      {/* WORD VIEW ----------------------------------------------------- */}
      {selectedView === "Word" && (
        <div className="reading-panel word-view">
          <h2 className="chapter-title">{title}</h2>
          <div className="chapter-content">{renderTextWithHighlights()}</div>
        </div>
      )}

      {/* SENTENCE VIEW ------------------------------------------------- */}
      {selectedView === "Sentence" && (
        <div className="reading-panel sentence-view">
          <h2 className="chapter-title">{title}</h2>

          <div className="sentence-list">
            {text.split(/(?<=[.!?])\s+/).map((sentence, i) => (
              <p
                key={i}
                className="sentence-item sentence-hover-hint"
                onClick={() => handleSentenceClick(sentence)}
              >
                {sentence}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Q/A VIEW ------------------------------------------------------ */}
      {selectedView === "Q/A" && (
        <div className="reading-panel qa-view">
          <h2 className="chapter-title">{title}</h2>
          <div className="chapter-content">
            <p>{text}</p>
          </div>
        </div>
      )}
    </div>
  );
}
