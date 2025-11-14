import React, { useEffect, useState } from "react";
import "./ModernLayout.css";

export default function ReadingPanel({
  text,
  terms,
  selectedView,
  onTermClick,
  onSentenceSelect,
}) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (text) {
      const firstLine = text.split("\n")[0] || "";
      const cleaned = firstLine.replace(/[^a-zA-Z0-9\s]/g, "").trim();
      setTitle(cleaned || "Untitled Document");
    }
  }, [text]);

  // ✅ Detect manual text selection for sentence view
  useEffect(() => {
    if (selectedView !== "Sentence") return;

    const handleMouseUp = () => {
      const selectedText = window.getSelection().toString().trim();
      if (selectedText && onSentenceSelect) {
        onSentenceSelect(selectedText);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [selectedView, onSentenceSelect]);

  const handleTermClick = (term) => {
    if (selectedView === "Word" && onTermClick) {
      onTermClick(term);
    }
  };

  const handleSentenceClick = (sentence) => {
    if (selectedView === "Sentence" && onSentenceSelect) {
      onSentenceSelect(sentence);
    }
  };

  // Highlight terms (existing logic)
  const renderTextWithHighlights = () => {
    if (!text) return null;
    if (!terms || terms.length === 0) return text;

    let elements = [text];
    terms.forEach((term) => {
      if (!term?.name) return;
      const newElements = [];
      elements.forEach((element) => {
        if (typeof element === "string") {
          const parts = element.split(new RegExp(`\\b(${term.name})\\b`, "gi"));
          parts.forEach((part, index) => {
            if (part.toLowerCase() === term.name.toLowerCase()) {
              newElements.push(
                <span
                  key={`${term.domain_id}-${index}`}
                  className="highlighted-term"
                  onClick={() => handleTermClick(term)}
                  style={{ cursor: "pointer", backgroundColor: "yellow" }}
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

  if (selectedView === "Word") {
    return (
      <div className="reading-panel word-view">
        <h2 className="chapter-title">{title}</h2>
        <div className="chapter-content">{renderTextWithHighlights()}</div>
      </div>
    );
  }

  if (selectedView === "Sentence") {
    const sentences = text.split(/(?<=[.!?])\s+/);
    return (
      <div className="reading-panel sentence-view">
        <h2 className="chapter-title">{title}</h2>
        <div className="sentence-list">
          {sentences.map((s, i) => (
            <p key={i} className="sentence-item" onClick={() => handleSentenceClick(s)}>
              {s}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return null;
}