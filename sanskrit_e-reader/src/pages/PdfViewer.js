import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "../styles/ModernLayout.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

/* ---------------------------------------------------------
   NORMALIZATION
--------------------------------------------------------- */
function normalizeEnglish(s = "") {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/* ---------------------------------------------------------
   LINE CLUSTERING
--------------------------------------------------------- */
function clusterLines(spans, tolerance = 3) {
  const sorted = [...spans].sort((a, b) => a.rect.top - b.rect.top);
  const lines = [];

  for (const sp of sorted) {
    const y = sp.rect.top;
    const last = lines[lines.length - 1];
    if (last && Math.abs(last._y - y) <= tolerance) {
      last.spans.push(sp);
      last._y = Math.min(last._y, y);
    } else {
      lines.push({ _y: y, spans: [sp] });
    }
  }

  return lines;
}

/* ---------------------------------------------------------
   COMPONENT
--------------------------------------------------------- */
export default function PdfViewer({
  file,
  terms = [],
  sectionIds = [],
  selectedView,
  isReadMode = true,
  pinPosition = null, // 👈 NEW: { page, yOffset }
  onPinPlace = null,  // 👈 NEW: Callback when user places pin
  isPinMode = false,  // 👈 NEW: Whether we're in pin placement mode
}) {
  const [numPages, setNumPages] = useState(null);
  const [pageWidth, setPageWidth] = useState(700);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [hoverState, setHoverState] = useState(null);
  const [showHighlightHint, setShowHighlightHint] = useState(false);
  const containerRef = useRef(null);
  const highlightTimer = useRef(null);
  const preparedTermsRef = useRef([]);
  const settleRunsRef = useRef(0);
  const hoverListenersAttached = useRef(false);
  const activeObservers = useRef([]);

  /* ---------------- PREPARE TERMS ---------------- */
  useEffect(() => {
    preparedTermsRef.current = terms
  .map((t) => ({
    raw: t,
    text: normalizeEnglish(t.name || t.rawName || "")
        .replace(/^\W+|\W+$/g, ""),  // remove leading/trailing symbols

    isMwe: t.is_mwe === true,
    mweType: t.mwe_type || "single_word",
  }))
  .filter((t) => t.text)
  // ✅ MWEs first — so "cell membrane" is matched before "cell" in Read Mode hover
  .sort((a, b) => Number(b.isMwe) - Number(a.isMwe) || b.text.length - a.text.length);
  }, [terms]);


  useEffect(() => {
    if (selectedView === "Word" && !isReadMode) {
      setShowHighlightHint(true);

      const timer = setTimeout(() => {
        setShowHighlightHint(false);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [selectedView, isReadMode]);

 /* ---------------- DISCONNECT ALL OBSERVERS ---------------- */
function disconnectAllObservers() {
  // Disconnect mutation observers
  activeObservers.current.forEach((observer) => {
    try {
      observer.disconnect();
    } catch (e) {
      console.warn("Observer disconnect failed:", e);
    }
  });

  activeObservers.current = [];

  // Reset page-level flags
  document.querySelectorAll(".react-pdf__Page").forEach((pageEl) => {
    pageEl.__observerAttached = false;
    pageEl.__hoverObserverAttached = false;

    // Clear hover overlays safely
    const overlayContainer = pageEl.querySelector(".overlay-container");
    if (overlayContainer) {
      const hoverHighlights =
        overlayContainer.querySelectorAll(".term-hover-highlight");
      hoverHighlights.forEach((h) => h.remove());
    }
  });

  // Reset span hover attachment flags
  document
    .querySelectorAll(".react-pdf__Page__textContent span")
    .forEach((span) => {
      span.__hoverAttached = false;
    });
}

  /* ---------------- 👇 NEW: PIN CLICK HANDLER ---------------- */
  useEffect(() => {
    if (!isPinMode) return;

    const handlePinClick = (e) => {
  const container = containerRef.current;
  if (!container) return;

  const containerRect = container.getBoundingClientRect();

  // Get Y position inside scroll container
  const clickY =
    e.clientY - containerRect.top + container.scrollTop;

  // Find which page was clicked
  const pageEl = e.target.closest(".react-pdf__Page");
  if (!pageEl) return;

  const pageNumber = parseInt(pageEl.dataset.pageNumber);
  if (!pageNumber) return;

  if (onPinPlace) {
    onPinPlace({
      page: pageNumber,
      yOffset: clickY,
    });
  }
};

    const container = containerRef.current;
    if (container) {
      container.addEventListener('click', handlePinClick);
      return () => container.removeEventListener('click', handlePinClick);
    }
  }, [isPinMode, onPinPlace]);

  /* ---------------- MAIN EFFECT: CLEAR AND SETUP ---------------- */
  useEffect(() => {
    if (!file) return;

    clearTimeout(highlightTimer.current);
    disconnectAllObservers();
    settleRunsRef.current = 0;
    hoverListenersAttached.current = false;

    clearAllOverlays();

    const timeout = setTimeout(() => {
      if (selectedView === "Word") {
        if (isReadMode) {
          setupReadModeHover();
        } else {
          if (preparedTermsRef.current.length > 0) {
            scheduleHighlight(100);
          }
        }
      }

      if (selectedView === "Summary" && sectionIds.length > 0) {
        scheduleSectionHighlight(100);
      }
    }, 200);

    return () => {
      clearTimeout(timeout);
      disconnectAllObservers();
      clearAllOverlays();
    };
  }, [selectedView, file, terms, sectionIds, isReadMode]);

  /* ---------------- NEW: CLEAR ALL OVERLAYS ---------------- */
  function clearAllOverlays() {
    document.querySelectorAll(".overlay-container").forEach((container) => {
      container.innerHTML = "";
    });

    document.querySelectorAll(".term-highlight-overlay").forEach((el) => el.remove());
    document.querySelectorAll(".term-hover-highlight").forEach((el) => el.remove());
    document.querySelectorAll(".section-highlight-overlay").forEach((el) => el.remove());
  }

  // AFTER — replace with this:
function setupReadModeHover() {
  const pages = document.querySelectorAll(".react-pdf__Page");
  if (!pages.length) {
    setTimeout(setupReadModeHover, 100);
    return;
  }

  pages.forEach((pageEl) => {
    const textLayer =
      pageEl.querySelector(".react-pdf__Page__textContent") ||
      pageEl.querySelector(".react-pdf__TextLayer");

    if (!textLayer || pageEl.__hoverObserverAttached) return;

    pageEl.__hoverObserverAttached = true;

    // ✅ KEY FIX: If spans already exist, attach hover listeners immediately.
    // When terms load or Read mode is toggled back on, the PDF is already rendered —
    // the MutationObserver would never fire because no new mutations happen.
    const existingSpans = [...textLayer.querySelectorAll("span")].filter(
      (s) => (s.textContent || "").trim()
    );

    if (existingSpans.length) {
      attachHoverListeners(pageEl, existingSpans);
      return;
    }

    // Spans not yet rendered — observe and attach once they appear
    const observer = new MutationObserver(() => {
      const spans = [...textLayer.querySelectorAll("span")].filter(
        (s) => (s.textContent || "").trim()
      );
      if (!spans.length) return;
      attachHoverListeners(pageEl, spans);
      observer.disconnect();
    });

    observer.observe(textLayer, { childList: true, subtree: true });
    activeObservers.current.push(observer);
  });
}
  function attachHoverListeners(pageEl, spans) {
  ensureOverlayContainer(pageEl);

  spans.forEach((span) => {
    if (span.__hoverAttached) return; // prevent duplicate listeners
    span.__hoverAttached = true;

    span.addEventListener("mousemove", (e) =>
      handleSpanHover(e, pageEl)
    );

    span.addEventListener("mouseleave", () => {
      clearHoverHighlight(pageEl);
      setHoverState(null);
    });
  });
}



  function handleSpanHover(e, pageEl) {
    const span = e.target;
    const originalText = span.textContent || "";

    if (!originalText.trim()) {
      clearHoverHighlight(pageEl);
      span.style.cursor = "default";
      setHoverState(null);
      return;
    }

    const normalizedSpan = normalizeEnglish(originalText);

    const matchedTerm = preparedTermsRef.current.find((term) => {
      const safeText = escapeRegex(term.text);
      const pattern = new RegExp(`(?<!\\w)${safeText}(?!\\w)`, "i");
      return pattern.test(normalizedSpan);
    });

    if (!matchedTerm) {
      clearHoverHighlight(pageEl);
      span.style.cursor = "default";
      setHoverState(null);
      return;
    }

    const node = span.firstChild;
    if (!node) return;

    const termLength = matchedTerm.text.length;
    let startIndex = -1;

    for (let i = 0; i <= originalText.length - termLength; i++) {
      const slice = originalText.substring(i, i + termLength);
      if (normalizeEnglish(slice) === matchedTerm.text) {
        startIndex = i;
        break;
      }
    }

    if (startIndex === -1) {
      clearHoverHighlight(pageEl);
      span.style.cursor = "default";
      setHoverState(null);
      return;
    }

    const range = document.createRange();
    range.setStart(node, startIndex);
    range.setEnd(node, startIndex + termLength);

    const rects = [...range.getClientRects()];
    range.detach();

    if (!rects.length) {
      clearHoverHighlight(pageEl);
      span.style.cursor = "default";
      setHoverState(null);
      return;
    }

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const isInside = rects.some(
      (r) =>
        mouseX >= r.left &&
        mouseX <= r.right &&
        mouseY >= r.top &&
        mouseY <= r.bottom
    );

    if (!isInside) {
      clearHoverHighlight(pageEl);
      span.style.cursor = "default";
      setHoverState(null);
      return;
    }

    showHoverHighlight(span, pageEl, matchedTerm);
    span.style.cursor = "pointer";
    setHoverState({
      term: matchedTerm,
      x: e.clientX,
      y: e.clientY,
    });

    span.onclick = () => {
      if (window.onPdfTermClick) {
        window.onPdfTermClick(matchedTerm.raw);
      }
    };
  }

  function showHoverHighlight(span, pageEl, term) {
    clearHoverHighlight(pageEl);

    const overlayContainer = ensureOverlayContainer(pageEl);
    const pageRect = pageEl.getBoundingClientRect();

    const spanText = normalizeEnglish(span.textContent || "");
    const termText = term.text;

    const startIndex = spanText.indexOf(termText);

    if (startIndex === -1) {
      const rect = span.getBoundingClientRect();
      createHoverOverlay(rect, pageRect, overlayContainer, term);
      return;
    }

    const node = span.firstChild;
    if (!node) return;

    const range = document.createRange();
    range.setStart(node, startIndex);
    range.setEnd(node, startIndex + termText.length);

    const rects = range.getClientRects();

    [...rects].forEach((rect) => {
      createHoverOverlay(rect, pageRect, overlayContainer, term);
    });

    range.detach();
  }

  function createHoverOverlay(rect, pageRect, container, term) {
    const div = document.createElement("div");

    const isMwe = term.isMwe;

    div.className = "term-hover-highlight";

    Object.assign(div.style, {
      position: "absolute",
      left: `${rect.left - pageRect.left}px`,
      top: `${rect.top - pageRect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      background: isMwe
        ? "rgba(255, 105, 180, 0.2)"
        : "rgba(255, 230, 0, 0.2)",
      border: isMwe
        ? "2px solid rgba(255, 105, 180, 0.6)"
        : "2px solid rgba(255, 200, 0, 0.6)",
      borderRadius: "3px",
      zIndex: 30,
      pointerEvents: "none",
      transition: "all 0.15s ease",
    });

    container.appendChild(div);
  }

  /* ---------------- CLEAR HOVER HIGHLIGHT ---------------- */
  function clearHoverHighlight(pageEl) {
    const overlayContainer = pageEl.querySelector(".overlay-container");
    if (!overlayContainer) return;

    const hoverHighlights = overlayContainer.querySelectorAll(".term-hover-highlight");
    hoverHighlights.forEach((h) => h.remove());
  }

  /* ---------------- RESIZE ---------------- */
  useEffect(() => {
    let isMounted = true;
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      if (!isMounted || !containerRef.current) return;
      setPageWidth(containerRef.current.clientWidth);
    });

    ro.observe(container);

    return () => {
      isMounted = false;
      ro.disconnect();
    };
  }, [isReadMode, selectedView]);


  /* ---------------- DOCUMENT LOAD ---------------- */
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setTimeout(() => {
      if (selectedView === "Word") {
        if (isReadMode) {
          setupReadModeHover();
        } else {
          scheduleHighlight(100);
        }
      }
      if (selectedView === "Summary") {
        scheduleSectionHighlight(100);
      }
    }, 200);
  };

  /* ---------------- SECTION HIGHLIGHT (Summary mode) ---------------- */
  function scheduleSectionHighlight(delay = 0) {
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => {
      runSectionHighlightCycle();
    }, delay);
  }

  function runSectionHighlightCycle() {
    const pages = document.querySelectorAll(".react-pdf__Page");
    if (!pages.length) return;

    pages.forEach(highlightSectionIdsOnPage);
  }

  function highlightSectionIdsOnPage(pageEl) {
    const textLayer = pageEl.querySelector(".react-pdf__Page__textContent");
    if (!textLayer) return;

    const overlayContainer = ensureOverlayContainer(pageEl);
    const pageRect = pageEl.getBoundingClientRect();

    const spans = [...textLayer.querySelectorAll("span")].filter((s) =>
      (s.textContent || "").trim()
    );

    if (!spans.length) return;

    spans.forEach((span) => {
      const text = span.textContent.trim();
      const lower = text.toLowerCase();
      const style = window.getComputedStyle(span);
      const fontSize = parseFloat(style.fontSize || "0");

      sectionIds.forEach((sectionId) => {
        if (!sectionId) return;

        if (lower.startsWith("figure") || lower.startsWith("table")) return;
        if (fontSize < 14) return;

        const regex = new RegExp(`^${sectionId}(\\s|$)`);
        if (!regex.test(text)) return;

        const rect = span.getBoundingClientRect();

        const div = document.createElement("div");
        div.className = "section-highlight-overlay";

        Object.assign(div.style, {
          position: "absolute",
          left: `${rect.left - pageRect.left}px`,
          top: `${rect.top - pageRect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          background: "rgba(0,150,255,0.35)",
          borderRadius: "3px",
          zIndex: 20,
          pointerEvents: "auto",
        });

        div.onclick = () => window.onSectionIdClick && window.onSectionIdClick(sectionId);

        overlayContainer.appendChild(div);
      });
    });
  }

  /* ---------------- HIGHLIGHT MODE SCHEDULER ---------------- */
  function scheduleHighlight(delay = 0) {
    if (selectedView !== "Word" || isReadMode) return;

    clearTimeout(highlightTimer.current);

    highlightTimer.current = setTimeout(() => {
      runHighlightCycle();

      if (++settleRunsRef.current < 4) {
        scheduleHighlight(120);
      } else {
        settleRunsRef.current = 0;
      }
    }, delay);
  }

  /* ---------------- MAIN HIGHLIGHT CYCLE (Highlight mode) ---------------- */
  function runHighlightCycle() {
    if (isReadMode) return;
    
    const pages = document.querySelectorAll(".react-pdf__Page");
    if (!pages.length) return;

    setIsHighlighting(true);

    pages.forEach(highlightTermsOnPage);

    setIsHighlighting(false);
    pages.forEach(attachObserverOnce);
  }

  /* ---------------- OBSERVER ---------------- */
  function attachObserverOnce(pageEl) {
    if (isReadMode) return;
    
    const textLayer =
      pageEl.querySelector(".react-pdf__Page__textContent") ||
      pageEl.querySelector(".react-pdf__TextLayer");

    if (!textLayer || pageEl.__observerAttached) return;
    pageEl.__observerAttached = true;

    const observer = new MutationObserver(() => {
      if (!isReadMode) {
        scheduleHighlight(80);
      }
    });

    observer.observe(textLayer, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    
    activeObservers.current.push(observer);
  }

    function escapeRegex(text = "") {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}



  function highlightTermsOnPage(pageEl) {
  if (isReadMode) return;

  const textLayer = pageEl.querySelector(".react-pdf__Page__textContent");
  if (!textLayer) return;

  const overlayContainer = ensureOverlayContainer(pageEl);
  const pageRect = pageEl.getBoundingClientRect();

  const spans = [...textLayer.querySelectorAll("span")]
    .filter((s) => {
      const text = (s.textContent || "").trim();
      if (!text) return false;

      const rect = s.getBoundingClientRect();
      const style = window.getComputedStyle(s);
      const fontSize = parseFloat(style.fontSize || "0");

      // Skip headings, section numbers, tiny spans, etc.
      if (fontSize > 18) return false;
      if (/^\d+(\.\d+)*\s+[A-Z]/.test(text)) return false;
      if (/^\d+(\.\d+)*\.?\s*$/.test(text)) return false;
      if (text.length <= 2) return false;
      if (rect.width < 15) return false;

      return true;
    })
    .map((s) => ({
      el: s,
      text: s.textContent,
      rect: s.getBoundingClientRect(),
    }));

  if (!spans.length) return;

  const lines = clusterLines(spans);

  lines.forEach((line) => {
    const concat = line.spans.map((s) => s.text).join("");
    const lower = normalizeEnglish(concat);

    // Skip numbered headings like "2.1 Characteristics"
    if (/^\d+(\.\d+)*\.?\s+[a-z]/i.test(concat.trim())) return;

    const prefix = [];
    let acc = 0;
    line.spans.forEach((s) => {
      prefix.push(acc);
      acc += s.text.length;
    });

    /* -----------------------------------------
       STEP 1: Collect all MWE-covered ranges
    ----------------------------------------- */
    const mweCoveredRanges = [];

    preparedTermsRef.current
  .filter((term) => term.isMwe)
  .forEach((term) => {
    const safeText = escapeRegex(term.text || "").trim();
if (!safeText) return;  // 🛑 Prevent invalid regex

const pattern = new RegExp(`\\b${safeText}\\b`, "gi");


    let match;
    while ((match = pattern.exec(lower)) !== null) {
      mweCoveredRanges.push({
        start: match.index,
        end: match.index + term.text.length,
      });
    }
  });


    /* -----------------------------------------
       Helper: check if inside MWE range
    ----------------------------------------- */
    const isInsideMwe = (start, end) =>
      mweCoveredRanges.some(
        (r) => start >= r.start && end <= r.end
      );

    /* -----------------------------------------
       STEP 2: Highlight all terms
    ----------------------------------------- */
    preparedTermsRef.current.forEach((term) => {
      const safeText = escapeRegex(term.text || "").trim();
if (!safeText) return;  // 🛑 Prevent invalid regex

const pattern = new RegExp(`\\b${safeText}\\b`, "gi");


      let match;

      while ((match = pattern.exec(lower)) !== null) {
        const startIdx = match.index;
        const endIdx = startIdx + term.text.length;

        // Prevent single-word highlight inside MWE
        if (!term.isMwe && isInsideMwe(startIdx, endIdx)) {
          continue;
        }

        createOverlays(
          pageRect,
          overlayContainer,
          line.spans,
          prefix,
          startIdx,
          endIdx,
          term
        );
      }
    });
  });
}


  function createOverlays(pageRect, overlayContainer, spans, prefix, startIdx, endIdx, term) {
    if (isReadMode) return;
    
    spans.forEach((span, i) => {
      const spanStart = prefix[i];
      const spanEnd = spanStart + span.text.length;
      const ovStart = Math.max(startIdx, spanStart);
      const ovEnd = Math.min(endIdx, spanEnd);
      if (ovStart >= ovEnd) return;

      const node = span.el.firstChild;
      if (!node) return;

      const range = document.createRange();
      range.setStart(node, ovStart - spanStart);
      range.setEnd(node, ovEnd - spanStart);

      [...range.getClientRects()].forEach((r) => {
        const div = document.createElement("div");
        const isMwe = term.isMwe;
        div.className = "term-highlight-overlay";
        Object.assign(div.style, {
          position: "absolute",
          left: `${r.left - pageRect.left}px`,
          top: `${r.top - pageRect.top}px`,
          width: `${r.width}px`,
          height: `${r.height}px`,
          background: isMwe ? "rgba(255, 105, 180, 0.45)" : "rgba(255, 230, 0, 0.35)",
          borderRadius: "2px",
          zIndex: 20,
          pointerEvents: "auto",
          mixBlendMode: "multiply",
        });

        div.title = isMwe ? "Multi-word Expression" : "Domain Term";
        div.onclick = () => window.onPdfTermClick && window.onPdfTermClick(term.raw);

        const existing = overlayContainer.querySelectorAll(".term-highlight-overlay");
        for (let ex of existing) {
          const exRect = ex.getBoundingClientRect();
          if (
            Math.abs(exRect.left - r.left) < 1 &&
            Math.abs(exRect.top - r.top) < 1 &&
            Math.abs(exRect.width - r.width) < 1
          ) {
            return;
          }
        }

        overlayContainer.appendChild(div);
      });

      range.detach();
    });
  }

  /* ---------------- OVERLAY CONTAINER ---------------- */
  function ensureOverlayContainer(pageEl) {
    let container = pageEl.querySelector(".overlay-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "overlay-container";
      Object.assign(container.style, {
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 10,
      });
      pageEl.appendChild(container);
    }
    return container;
  }

  /* ---------------- 👇 NEW: RENDER PIN MARKER ---------------- */
  function renderPinMarker() {
    if (!pinPosition || !numPages) return null;

    // Calculate position: find the page and add marker
    return (
      <div
        className="reading-pin-marker"
        style={{
          position: "absolute",
          left: "-40px",
          top: `${calculatePinTopPosition()}px`,
          zIndex: 50,
        }}
      >
        <div className="pin-icon">📌</div>
        <div className="pin-label">Read up to here</div>
      </div>
    );
  }

  function calculatePinTopPosition() {
  if (!pinPosition) return 0;
  return pinPosition.yOffset;
}


  /* ---------------- RENDER ---------------- */
  return (
    <div ref={containerRef} className="pdf-viewer-scroll">
      {isHighlighting && <div className="highlight-loading-overlay">Applying highlights…</div>}

       {showHighlightHint && (
        <div className="highlight-hint-banner">
          <div className="hint-icon-wrap">
            <span className="hint-icon">✦</span>
          </div>
          <div className="hint-body">
            <span className="hint-title">Terms are interactive</span>
            <span className="hint-sub">Click any highlighted word to view its definition</span>
          </div>
          <div className="hint-arrow">→</div>
          <div className="hint-progress" />
        </div>
      )}
      {/* 👇 NEW: Pin mode cursor hint */}
     {isPinMode && (
      <div
        className="pin-mode-hint"
        style={{
          top: `${containerRef.current?.scrollTop + containerRef.current?.clientHeight / 2}px`
        }}
      >
        📌 Click anywhere on the PDF to place your reading marker
      </div>
    )}


      {isReadMode && hoverState && (
        <div
          className="read-mode-hint"
          style={{
            position: "fixed",
            left: hoverState.x + 12,
            top: hoverState.y + 12,
            zIndex: 9999,
          }}
        >
          {hoverState.term.isMwe
            ? "📖 Multi-word Expression"
            : "📖 Domain Term"}{" "}
          - Click to view definition
        </div>
      )}

      {/* 👇 NEW: Pin marker overlay */}
      {pinPosition && !isPinMode && (
        <div className="pin-marker-container">
          {renderPinMarker()}
        </div>
      )}

      {file && (
        <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
          {Array.from({ length: numPages || 0 }, (_, i) => (
            <Page
              key={i}
              pageNumber={i + 1}
              width={pageWidth}
              renderTextLayer
              renderAnnotationLayer={false}
              data-page-number={i + 1}
            />
          ))}
        </Document>
      )}
    </div>
  );
}