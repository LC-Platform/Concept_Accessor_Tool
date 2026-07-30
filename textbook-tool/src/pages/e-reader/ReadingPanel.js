import React, { useEffect, useState } from "react";
import "../../styles/ModernLayout.css";

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
  const Toast = ({ message, onClose }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
      if (!message) return;

      const hideTimer = setTimeout(() => {
        setVisible(false); // trigger fade out
      }, 2500); // start fade before removal

      const removeTimer = setTimeout(() => {
        onClose(); // remove completely
      }, 3000);

      return () => {
        clearTimeout(hideTimer);
        clearTimeout(removeTimer);
      };
    }, [message, onClose]);

    if (!message) return null;

    return (
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          background: "#d9534f",
          color: "white",
          padding: "12px 16px",
          borderRadius: "6px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          zIndex: 9999,
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "10px",

          // ✨ Animation
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.4s ease",
        }}
      >
        <span>{message}</span>

        <button
          onClick={onClose}
          style={{
            background: "transparent",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          ✕
        </button>
      </div>
    );
  };

  /* --------------------------- TITLE EXTRACT ---------------------------- */
  useEffect(() => {
    if (text) {
      const firstLine = text.split("\n")[0] || "";
      const cleaned = firstLine.replace(/[^a-zA-Z0-9\s]/g, "").trim();
      setTitle(cleaned || "Untitled Document");
    }
  }, [text]);

  useEffect(() => {
    if (!toastMessage) return;

    const timer = setTimeout(() => {
      setToastMessage("");
    }, 3000); // ⏱ auto close after 3 sec

    return () => clearTimeout(timer);
  }, [toastMessage]);
  
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

    const ENGLISH_SENTENCE_DELIMITER = /[.!?]["')\]]?\s*$/;
    
    // 🔥 Track if selection is in progress
    let selectionInProgress = false;
    let selectionTimeout = null;

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      console.log("🟡 RAW SELECTION OBJECT:", selection);

      if (!selection) return;

      const selectedText = selection.toString().replace(/\s+/g, " ").trim();
      console.log("🟢 SELECTED TEXT (RAW):", selectedText); 
      // 🔥 Only process when selection is complete (not dragging)
      if (!selection.isCollapsed && selectedText && !selectionInProgress) {
        selectionInProgress = true;
        
        // Clear any previous timeout
        if (selectionTimeout) clearTimeout(selectionTimeout);
        
        // Small delay to ensure selection is final
        selectionTimeout = setTimeout(() => {
          const finalText = window.getSelection().toString().replace(/\s+/g, " ").trim();
          console.log("🟣 FINAL TEXT:", finalText);
          if (finalText) {
            const isCompleteSentence = ENGLISH_SENTENCE_DELIMITER.test(finalText);
            console.log("🟠 IS COMPLETE SENTENCE:", isCompleteSentence);
            if (!isCompleteSentence) {
              setToastMessage(
                "Please select at least one complete sentence ending with ., ! or ?"
              );
            } else if (onSentenceSelect) {
              console.log("✅ SENDING TO ANALYSIS PANEL:", finalText);
              onSentenceSelect(finalText);
            }
          }
          
          selectionInProgress = false;
          selectionTimeout = null;
        }, 50);
      }
    };

      document.addEventListener("mouseup", handleSelectionChange);

      return () => {
      document.removeEventListener("mouseup", handleSelectionChange);
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
