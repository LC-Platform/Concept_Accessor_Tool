// // PdfViewer.js - Fixed positioning version (updated for section-id highlights)
// import React, { useState, useEffect, useRef } from "react";
// import { Document, Page, pdfjs } from "react-pdf";
// import "react-pdf/dist/esm/Page/AnnotationLayer.css";
// import "react-pdf/dist/esm/Page/TextLayer.css";
// import "./ModernLayout.css";

// pdfjs.GlobalWorkerOptions.workerSrc =
//   `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

// /* ---------------------------------------------------------
//    NORMALIZATION
// --------------------------------------------------------- */
// function normalizeEnglish(s = "") {
//   return String(s || "")
//     .normalize("NFKD")
//     .replace(/[\u0300-\u036f]/g, "")
//     .replace(/['",.!?;:()\-]/g, " ")
//     .replace(/\s+/g, " ")
//     .toLowerCase()
//     .trim();
// }

// function makeTermKey(term) {
//   if (!term) return "";
//   if (term.normalized) return normalizeEnglish(term.normalized);
//   return normalizeEnglish(term.name || term.rawName || "");
// }

// /* ---------------------------------------------------------
//    COMPONENT
// --------------------------------------------------------- */
// export default function PdfViewer({
//   file,
//   terms = [],
//   selectedView,
//   sectionIds = [],
// }) {
//   const [numPages, setNumPages] = useState(null);
//   const [pageWidth, setPageWidth] = useState(700);
//   const [isHighlighting, setIsHighlighting] = useState(false);

//   const containerRef = useRef(null);
//   const highlightTimer = useRef(null);
//   const observerRef = useRef(null);
//   const retryRef = useRef(0);
//   const preparedTermsRef = useRef([]);
//   const highlightedTermsRef = useRef(new Set());
//   const preparedSectionIdsRef = useRef([]);

//   /* Prepare normalized terms */
//   useEffect(() => {
//     preparedTermsRef.current = (terms || [])
//       .map((t) => ({
//         raw: t,
//         key: makeTermKey(t),
//         originalName: t.name || t.rawName || "",
//         domain_id: t.domain_id || "",
//       }))
//       .filter((x) => x.key && x.key.length > 0);

//     highlightedTermsRef.current.clear();
//     // console.log("Prepared terms:", preparedTermsRef.current);
//   }, [terms]);

//   /* Prepare section IDs (exact match) */
//   useEffect(() => {
//     preparedSectionIdsRef.current = (sectionIds || []).map((s) =>
//       String(s || "").trim()
//     );
//     // console.log("Prepared section ids:", preparedSectionIdsRef.current);
//   }, [sectionIds]);

//   /* Resize handling */
//   useEffect(() => {
//     if (!containerRef.current) return;
//     const ro = new ResizeObserver(() => {
//       setPageWidth(Math.max(300, containerRef.current.clientWidth));
//     });
//     ro.observe(containerRef.current);
//     return () => ro.disconnect();
//   }, []);

//   const onDocumentLoadSuccess = ({ numPages }) => {
//     setNumPages(numPages);
//     scheduleHighlight(800); // Longer delay for PDF to fully render
//   };

//   useEffect(() => {
//     scheduleHighlight(400);
//   }, [file, terms, selectedView, numPages, sectionIds]);

//   useEffect(() => {
//     return () => {
//       clearOverlays();
//       if (observerRef.current) observerRef.current.disconnect();
//       if (highlightTimer.current) clearTimeout(highlightTimer.current);
//     };
//   }, []);

//   /* ---------------------------------------------------------
//      Overlay helpers
//   --------------------------------------------------------- */
//   function clearOverlays() {
//     document.querySelectorAll(".term-highlight-overlay").forEach((el) => el.remove());
//     document.querySelectorAll(".section-id-highlight").forEach((el) => el.remove());
//     document.querySelectorAll(".overlay-container").forEach((c) => {
//       if (c && c.children.length === 0) c.remove();
//     });
//   }

//   function scheduleHighlight(delay = 400) {
//     // Only Word view highlights terms, Summary view highlights section ids
//     if (selectedView !== "Word" && selectedView !== "Summary") {
//       clearOverlays();
//       return;
//     }

//     if (highlightTimer.current) clearTimeout(highlightTimer.current);
//     highlightTimer.current = setTimeout(() => {
//       runHighlightCycle();
//       highlightTimer.current = null;
//     }, delay);
//   }

//   function runHighlightCycle() {
//     if (selectedView !== "Word" && selectedView !== "Summary") {
//       clearOverlays();
//       return;
//     }

//     const pages = Array.from(document.querySelectorAll(".react-pdf__Page"));
//     if (!pages.length) {
//       retryRef.current++;
//       if (retryRef.current <= 10) scheduleHighlight(500);
//       return;
//     }

//     retryRef.current = 0;
//     clearOverlays();
//     setIsHighlighting(true);

//     try {
//       if (selectedView === "Word") {
//         let highlightedCount = 0;
//         pages.forEach((page) => {
//           try {
//             const count = highlightPage(page);
//             highlightedCount += count;
//           } catch (e) {
//             // ignore per-page errors
//           }
//         });
//         // console.log(`Highlights applied: ${highlightedCount}`);
//       } else if (selectedView === "Summary") {
//         // Only highlight section IDs in summary view (exact match)
//         pages.forEach((page) => {
//           try {
//             highlightSectionIdsOnPage(page);
//           } catch (e) {
//             // ignore
//           }
//         });
//       }
//     } finally {
//       setIsHighlighting(false);
//       // attach observer to first page so we re-run highlights on reflow
//       if (pages[0]) attachObserverOnce(pages[0]);
//     }
//   }

//   function attachObserverOnce(samplePage) {
//     if (!samplePage) return;
//     const textLayer =
//       samplePage.querySelector(".react-pdf__Page__textContent") ||
//       samplePage.querySelector(".react-pdf__TextLayer");
//     if (!textLayer) return;

//     if (observerRef.current) observerRef.current.disconnect();

//     const obs = new MutationObserver(() => {
//       obs.disconnect();
//       observerRef.current = null;
//       scheduleHighlight(300);
//     });

//     obs.observe(textLayer, { childList: true, subtree: true, characterData: true });
//     observerRef.current = obs;
//   }

//   /* ---------------------------------------------------------
//      Highlighting: TERMS (existing)
//   --------------------------------------------------------- */
//   function highlightPage(pageEl) {
//     const textLayer = pageEl.querySelector(".react-pdf__Page__textContent") ||
//       pageEl.querySelector(".react-pdf__TextLayer");
//     if (!textLayer) return 0;

//     const spans = Array.from(textLayer.querySelectorAll("span"))
//       .filter(span => span.textContent && span.textContent.trim().length > 0);

//     if (!spans.length) return 0;

//     // Get the PDF canvas for reference
//     const pdfCanvas = pageEl.querySelector("canvas");
//     if (!pdfCanvas) return 0;

//     const pageRect = pageEl.getBoundingClientRect();
//     const canvasRect = pdfCanvas.getBoundingClientRect();

//     // Group spans by line
//     const lines = {};
//     spans.forEach((span) => {
//       const rect = span.getBoundingClientRect();
//       if (rect.width === 0 || rect.height === 0) return;

//       const lineKey = Math.round(rect.top);
//       if (!lines[lineKey]) lines[lineKey] = [];
//       lines[lineKey].push({ span, rect });
//     });

//     let highlightsApplied = 0;

//     Object.values(lines).forEach((lineSpans) => {
//       lineSpans.sort((a, b) => a.rect.left - b.rect.left);

//       const lineText = lineSpans.map(item => item.span.textContent).join("");
//       const normalizedLine = normalizeEnglish(lineText);
//       if (!normalizedLine) return;

//       let overlayContainer = pageEl.querySelector(".overlay-container");
//       if (!overlayContainer) {
//         overlayContainer = document.createElement("div");
//         overlayContainer.className = "overlay-container";
//         overlayContainer.style.position = "absolute";
//         overlayContainer.style.left = "0";
//         overlayContainer.style.top = "0";
//         overlayContainer.style.width = "100%";
//         overlayContainer.style.height = "100%";
//         overlayContainer.style.pointerEvents = "none";
//         overlayContainer.style.zIndex = "10";
//         pageEl.appendChild(overlayContainer);
//       }

//       preparedTermsRef.current.forEach((pterm) => {
//         if (highlightedTermsRef.current.has(pterm.domain_id)) return;

//         const termWords = pterm.key.split(" ").filter(w => w.length > 0);
//         if (termWords.length === 0) return;

//         let foundMatch = false;

//         if (termWords.length === 1) {
//           const term = termWords[0];
//           const regex = new RegExp(`\\b${term}\\b`, 'gi');
//           let match;

//           while ((match = regex.exec(normalizedLine)) !== null) {
//             const success = highlightTermInLine(
//               pageEl, overlayContainer, lineSpans, lineText, normalizedLine,
//               match.index, match.index + term.length - 1, pterm.raw,
//               pageRect, canvasRect
//             );

//             if (success) {
//               highlightsApplied++;
//               foundMatch = true;
//               break;
//             }
//           }
//         } else {
//           const termPhrase = termWords.join(" ");
//           const startIndex = normalizedLine.indexOf(termPhrase);
//           if (startIndex !== -1) {
//             const success = highlightTermInLine(
//               pageEl, overlayContainer, lineSpans, lineText, normalizedLine,
//               startIndex, startIndex + termPhrase.length - 1, pterm.raw,
//               pageRect, canvasRect
//             );

//             if (success) {
//               highlightsApplied++;
//               foundMatch = true;
//             }
//           }
//         }

//         if (foundMatch && pterm.domain_id) {
//           highlightedTermsRef.current.add(pterm.domain_id);
//         }
//       });
//     });

//     return highlightsApplied;
//   }

//   function highlightTermInLine(
//     pageEl, overlayContainer, lineSpans, originalText, normalizedText,
//     normStart, normEnd, termRaw, pageRect, canvasRect
//   ) {
//     try {
//       // Convert normalized positions to original text positions
//       let origStart = -1;
//       let origEnd = -1;
//       let normIdx = 0;
//       let origIdx = 0;

//       while (normIdx <= normEnd && origIdx < originalText.length) {
//         const origChar = originalText[origIdx];
//         const normChar = normalizeEnglish(origChar);

//         if (normChar && normChar !== " ") {
//           if (normIdx === normStart) origStart = origIdx;
//           if (normIdx === normEnd) {
//             origEnd = origIdx;
//             break;
//           }
//           normIdx++;
//         }
//         origIdx++;
//       }

//       if (origStart === -1 || origEnd === -1) return false;

//       // Find spans containing the text range
//       let currentPos = 0;
//       let startSpan = null, endSpan = null;
//       let startOffset = 0, endOffset = 0;

//       for (const item of lineSpans) {
//         const span = item.span;
//         const text = span.textContent;
//         const spanStart = currentPos;
//         const spanEnd = currentPos + text.length - 1;

//         if (spanStart <= origStart && spanEnd >= origStart && !startSpan) {
//           startSpan = item;
//           startOffset = origStart - spanStart;
//         }

//         if (spanStart <= origEnd && spanEnd >= origEnd && !endSpan) {
//           endSpan = item;
//           endOffset = origEnd - spanStart;
//           break;
//         }

//         currentPos += text.length;
//       }

//       if (!startSpan || !endSpan) return false;

//       // Calculate position with improved accuracy
//       let left, top, width, height;

//       try {
//         // Method 1: Try using text range (most accurate)
//         const range = document.createRange();
//         range.setStart(startSpan.span.firstChild, startOffset);
//         range.setEnd(endSpan.span.firstChild, endOffset + 1);

//         const rangeRect = range.getBoundingClientRect();
//         if (rangeRect.width > 0 && rangeRect.height > 0) {
//           left = rangeRect.left - pageRect.left;
//           top = rangeRect.top - pageRect.top;
//           width = rangeRect.width;
//           height = rangeRect.height;
//         } else {
//           throw new Error("Invalid range");
//         }
//       } catch (e) {
//         // Method 2: Use span positions with adjustment
//         const startRect = startSpan.rect;
//         const endRect = endSpan.rect;

//         left = (startRect.left - pageRect.left);
//         top = (startRect.top - pageRect.top);
//         width = (endRect.right - startRect.left);
//         height = startRect.height;

//         left -= 1;
//         width += 1;
//       }

//       // Create highlight overlay
//       const overlay = document.createElement("div");
//       overlay.className = "term-highlight-overlay";
//       overlay.style.position = "absolute";
//       overlay.style.left = `${Math.max(0, left)}px`;
//       overlay.style.top = `${Math.max(0, top)}px`;
//       overlay.style.width = `${Math.max(1, width)}px`;
//       overlay.style.height = `${Math.max(1, height)}px`;
//       overlay.style.backgroundColor = "rgba(255, 255, 0, 0.4)";
//       overlay.style.borderRadius = "1px";
//       overlay.style.pointerEvents = "auto";
//       overlay.style.cursor = "pointer";
//       overlay.style.zIndex = "5";

//       overlay.onclick = (e) => {
//         e.stopPropagation();
//         e.preventDefault();
//         if (window.onPdfTermClick) window.onPdfTermClick(termRaw);
//       };

//       overlay.onmouseenter = () => {
//         overlay.style.backgroundColor = "rgba(255, 235, 59, 0.6)";
//       };

//       overlay.onmouseleave = () => {
//         overlay.style.backgroundColor = "rgba(255, 255, 0, 0.4)";
//       };

//       overlayContainer.appendChild(overlay);
//       return true;
//     } catch (error) {
//       // console.warn("Highlight error:", error);
//       return false;
//     }
//   }

//   /* ---------------------------------------------------------
//      Highlighting: SECTION IDS (exact span text match)
//   --------------------------------------------------------- */
//   function highlightSectionIdsOnPage(pageEl) {
//     const textLayer = pageEl.querySelector(".react-pdf__Page__textContent") ||
//       pageEl.querySelector(".react-pdf__TextLayer");
//     if (!textLayer) return;

//     const spans = Array.from(textLayer.querySelectorAll("span"))
//       .filter(span => span.textContent && span.textContent.trim().length > 0);

//     if (!spans.length) return;

//     let overlayContainer = pageEl.querySelector(".overlay-container");
//     if (!overlayContainer) {
//       overlayContainer = document.createElement("div");
//       overlayContainer.className = "overlay-container";
//       overlayContainer.style.position = "absolute";
//       overlayContainer.style.left = "0";
//       overlayContainer.style.top = "0";
//       overlayContainer.style.width = "100%";
//       overlayContainer.style.height = "100%";
//       overlayContainer.style.pointerEvents = "none";
//       overlayContainer.style.zIndex = "15";
//       pageEl.appendChild(overlayContainer);
//     }

//     const pageRect = pageEl.getBoundingClientRect();

//     // exact-match: only highlight spans whose trimmed text === section id
//     spans.forEach((span) => {
//       const txt = span.textContent.trim();
//       if (!txt) return;

//       preparedSectionIdsRef.current.forEach((sectionId) => {
//         if (txt === sectionId) {
//           const rect = span.getBoundingClientRect();
//           const left = rect.left - pageRect.left;
//           const top = rect.top - pageRect.top;
//           const width = rect.width;
//           const height = rect.height;

//           const overlay = document.createElement("div");
//           overlay.className = "section-id-highlight";
//           overlay.style.position = "absolute";
//           overlay.style.left = `${Math.max(0, left)}px`;
//           overlay.style.top = `${Math.max(0, top)}px`;
//           overlay.style.width = `${Math.max(2, width)}px`;
//           overlay.style.height = `${Math.max(2, height)}px`;
//           overlay.style.background = "rgba(255, 200, 0, 0.5)";
//           overlay.style.borderRadius = "2px";
//           overlay.style.pointerEvents = "auto";
//           overlay.style.cursor = "pointer";
//           overlay.style.zIndex = "20";

//           overlay.onmouseenter = () => {
//             overlay.style.background = "rgba(255, 220, 0, 0.7)";
//           };
//           overlay.onmouseleave = () => {
//             overlay.style.background = "rgba(255, 200, 0, 0.5)";
//           };

//           overlay.onclick = (e) => {
//             e.stopPropagation();
//             e.preventDefault();
//             if (window.onSectionIdClick) window.onSectionIdClick(sectionId);
//           };

//           overlayContainer.appendChild(overlay);
//         }
//       });
//     });
//   }

//   /* ---------------------------------------------------------
//      RENDER
//   --------------------------------------------------------- */
//   return (
//     <div ref={containerRef} className="pdf-viewer-scroll" style={{ position: "relative" }}>
//       {isHighlighting && (
//         <div className="highlight-loading-overlay">
//           <div className="highlight-loading-text">Applying highlights...</div>
//         </div>
//       )}

//       {file ? (
//         <Document
//           file={file}
//           onLoadSuccess={onDocumentLoadSuccess}
//           onLoadError={(error) => console.error("PDF load error:", error)}
//           loading={<div>Loading PDF...</div>}
//         >
//           {Array.from({ length: numPages || 0 }, (_, i) => (
//             <Page
//               key={`page_${i + 1}`}
//               pageNumber={i + 1}
//               width={pageWidth}
//               renderTextLayer={true}
//               renderAnnotationLayer={false}
//               loading={<div>Loading page {i + 1}...</div>}
//             />
//           ))}
//         </Document>
//       ) : (
//         <div className="pdf-placeholder">Upload a PDF to view</div>
//       )}
//     </div>
//   );
// }



// PdfViewer.js - Fixed positioning version (updated for section-id highlights + WORD TAB FIX)
import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "./ModernLayout.css";

pdfjs.GlobalWorkerOptions.workerSrc =
  `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

/* ---------------------------------------------------------
   NORMALIZATION
--------------------------------------------------------- */
function normalizeEnglish(s = "") {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['",.!?;:()\-]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function makeTermKey(term) {
  if (!term) return "";
  if (term.normalized) return normalizeEnglish(term.normalized);
  return normalizeEnglish(term.name || term.rawName || "");
}

/* ---------------------------------------------------------
   COMPONENT
--------------------------------------------------------- */
export default function PdfViewer({
  file,
  terms = [],
  selectedView,
  sectionIds = [],
}) {
  const [numPages, setNumPages] = useState(null);
  const [pageWidth, setPageWidth] = useState(700);
  const [isHighlighting, setIsHighlighting] = useState(false);

  const containerRef = useRef(null);
  const highlightTimer = useRef(null);
  const observerRef = useRef(null);
  const retryRef = useRef(0);
  const preparedTermsRef = useRef([]);
  const highlightedTermsRef = useRef(new Set());
  const preparedSectionIdsRef = useRef([]);

  /* Prepare normalized terms */
  useEffect(() => {
    preparedTermsRef.current = (terms || [])
      .map((t) => ({
        raw: t,
        key: makeTermKey(t),
        originalName: t.name || t.rawName || "",
        domain_id: t.domain_id || "",
      }))
      .filter((x) => x.key && x.key.length > 0);

    highlightedTermsRef.current.clear();
  }, [terms]);

  /* Prepare section IDs (exact match) */
  useEffect(() => {
    preparedSectionIdsRef.current = (sectionIds || []).map((s) =>
      String(s || "").trim()
    );
  }, [sectionIds]);

  /* Resize handling */
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      setPageWidth(Math.max(300, containerRef.current.clientWidth));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    scheduleHighlight(800);
  };

  useEffect(() => {
    scheduleHighlight(400);
  }, [file, terms, selectedView, numPages, sectionIds]);

  useEffect(() => {
    return () => {
      clearOverlays();
      if (observerRef.current) observerRef.current.disconnect();
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    };
  }, []);

  /* ---------------------------------------------------------
     NEW FIX — rehighlight when returning to Word tab
  --------------------------------------------------------- */
  useEffect(() => {
    if (selectedView === "Word") {
      // Coming back to Word view → rehighlight
      scheduleHighlight(200);
    } else {
      // Leaving Word view → remove all highlights immediately
      clearOverlays();
    }
  }, [selectedView]);

  /* ---------------------------------------------------------
     Overlay helpers
  --------------------------------------------------------- */
  function clearOverlays() {
    document.querySelectorAll(".term-highlight-overlay").forEach((el) => el.remove());
    document.querySelectorAll(".section-id-highlight").forEach((el) => el.remove());
    document.querySelectorAll(".overlay-container").forEach((c) => {
      if (c && c.children.length === 0) c.remove();
    });
  }

  function scheduleHighlight(delay = 400) {
    if (selectedView !== "Word" && selectedView !== "Summary") return;

    if (highlightTimer.current) clearTimeout(highlightTimer.current);

    highlightTimer.current = setTimeout(() => {
      runHighlightCycle();
      highlightTimer.current = null;
    }, delay);
  }

  function runHighlightCycle() {
    if (selectedView !== "Word" && selectedView !== "Summary") return;

    const pages = Array.from(document.querySelectorAll(".react-pdf__Page"));
    if (!pages.length) {
      retryRef.current++;
      if (retryRef.current <= 10) scheduleHighlight(500);
      return;
    }

    retryRef.current = 0;
    clearOverlays();
    setIsHighlighting(true);

    try {
      if (selectedView === "Word") {
        pages.forEach((page) => {
          try { highlightPage(page); } catch {}
        });
      }

      if (selectedView === "Summary") {
        pages.forEach((page) => {
          try { highlightSectionIdsOnPage(page); } catch {}
        });
      }
    } finally {
      setIsHighlighting(false);
      if (pages[0]) attachObserverOnce(pages[0]);
    }
  }

  function attachObserverOnce(page) {
    const textLayer =
      page.querySelector(".react-pdf__Page__textContent") ||
      page.querySelector(".react-pdf__TextLayer");
    if (!textLayer) return;

    if (observerRef.current) observerRef.current.disconnect();

    const obs = new MutationObserver(() => {
      obs.disconnect();
      observerRef.current = null;
      scheduleHighlight(300);
    });

    obs.observe(textLayer, { childList: true, subtree: true, characterData: true });
    observerRef.current = obs;
  }

  /* ---------------------------------------------------------
     TERM HIGHLIGHTING
  --------------------------------------------------------- */
  function highlightPage(pageEl) {
    const textLayer = pageEl.querySelector(".react-pdf__Page__textContent");
    if (!textLayer) return;

    const spans = [...textLayer.querySelectorAll("span")];
    if (!spans.length) return;

    let overlayContainer = pageEl.querySelector(".overlay-container");
    if (!overlayContainer) {
      overlayContainer = document.createElement("div");
      overlayContainer.className = "overlay-container";
      Object.assign(overlayContainer.style, {
        position: "absolute",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 10,
      });
      pageEl.appendChild(overlayContainer);
    }

    const pageRect = pageEl.getBoundingClientRect();

    spans.forEach((span) => {
      const raw = span.textContent.trim();
      const n = normalizeEnglish(raw);
      if (!n) return;

      preparedTermsRef.current.forEach((pterm) => {
        if (n === pterm.key) {
          // overlay
          const r = span.getBoundingClientRect();

          const overlay = document.createElement("div");
          overlay.className = "term-highlight-overlay";
          Object.assign(overlay.style, {
            position: "absolute",
            left: `${r.left - pageRect.left}px`,
            top: `${r.top - pageRect.top}px`,
            width: `${r.width}px`,
            height: `${r.height}px`,
            background: "rgba(255,255,0,0.4)",
            borderRadius: "2px",
            cursor: "pointer",
            zIndex: 20,
            pointerEvents: "auto",
          });

          overlay.onclick = () => {
            if (window.onPdfTermClick) window.onPdfTermClick(pterm.raw);
          };

          overlay.onmouseenter = () =>
            (overlay.style.background = "rgba(255,235,59,0.6)");
          overlay.onmouseleave = () =>
            (overlay.style.background = "rgba(255,255,0,0.4)");

          overlayContainer.appendChild(overlay);
        }
      });
    });
  }

  /* ---------------------------------------------------------
     SECTION-ID HIGHLIGHTING
  --------------------------------------------------------- */
  function highlightSectionIdsOnPage(pageEl) {
    const textLayer = pageEl.querySelector(".react-pdf__Page__textContent");
    if (!textLayer) return;

    const spans = [...textLayer.querySelectorAll("span")];
    if (!spans.length) return;

    let overlayContainer = pageEl.querySelector(".overlay-container");
    if (!overlayContainer) {
      overlayContainer = document.createElement("div");
      overlayContainer.className = "overlay-container";
      Object.assign(overlayContainer.style, {
        position: "absolute",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 15,
      });
      pageEl.appendChild(overlayContainer);
    }

    const pageRect = pageEl.getBoundingClientRect();

    spans.forEach((span) => {
      const txt = span.textContent.trim();
      if (!txt) return;

      preparedSectionIdsRef.current.forEach((sectionId) => {
        if (txt === sectionId) {
          const r = span.getBoundingClientRect();

          const overlay = document.createElement("div");
          overlay.className = "section-id-highlight";
          Object.assign(overlay.style, {
            position: "absolute",
            left: `${r.left - pageRect.left}px`,
            top: `${r.top - pageRect.top}px`,
            width: `${r.width}px`,
            height: `${r.height}px`,
            background: "rgba(255,200,0,0.5)",
            borderRadius: "2px",
            cursor: "pointer",
            zIndex: 20,
            pointerEvents: "auto",
          });

          overlay.onclick = () => {
            if (window.onSectionIdClick) window.onSectionIdClick(sectionId);
          };

          overlay.onmouseenter = () =>
            (overlay.style.background = "rgba(255,220,0,0.7)");
          overlay.onmouseleave = () =>
            (overlay.style.background = "rgba(255,200,0,0.5)");

          overlayContainer.appendChild(overlay);
        }
      });
    });
  }

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */
  return (
    <div ref={containerRef} className="pdf-viewer-scroll" style={{ position: "relative" }}>
      {isHighlighting && (
        <div className="highlight-loading-overlay">
          <div className="highlight-loading-text">Applying highlights...</div>
        </div>
      )}

      {file ? (
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(error) => console.error("PDF load error:", error)}
          loading={<div>Loading PDF...</div>}
        >
          {Array.from({ length: numPages || 0 }, (_, i) => (
            <Page
              key={`page_${i + 1}`}
              pageNumber={i + 1}
              width={pageWidth}
              renderTextLayer={true}
              renderAnnotationLayer={false}
              loading={<div>Loading page {i + 1}...</div>}
            />
          ))}
        </Document>
      ) : (
        <div className="pdf-placeholder">Upload a PDF to view</div>
      )}
    </div>
  );
}
