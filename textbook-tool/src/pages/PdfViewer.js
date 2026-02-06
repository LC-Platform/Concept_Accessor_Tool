import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "../styles/ModernLayout.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc =
  `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

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
function makeTermKey(term) {
  if (!term) return "";
  if (term.normalized) return normalizeEnglish(term.normalized);
  return normalizeEnglish(term.name || term.rawName || "");
}

/* ---------------------------------------------------------
   WORD BOUNDARY
--------------------------------------------------------- */




/* ---------------------------------------------------------
   LINE / TABLE CLUSTERING
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
  lines.forEach((ln) => {
    ln.spans.sort((a, b) => a.rect.left - b.rect.left);
    ln.text = ln.spans.map((s) => s.textTrimmed).join(" ").trim();
    ln.fontSizeAvg =
      ln.spans.reduce((a, s) => a + (s.fontSize || 12), 0) / Math.max(1, ln.spans.length);
  });
  return lines;
}

function clusterColumns(line, xTolerance = 6) {
  const xs = line.spans.map((s) => s.rect.left).sort((a, b) => a - b);
  const cols = [];
  for (const x of xs) {
    const last = cols[cols.length - 1];
    if (last && Math.abs(last.avg - x) <= xTolerance) {
      last.values.push(x);
      last.avg = last.values.reduce((a, b) => a + b, 0) / last.values.length;
    } else {
      cols.push({ values: [x], avg: x });
    }
  }
  return cols.map((c) => c.avg);
}

function detectTableBlocks(lines, options = {}) {
  const {
    minCols = 3,
    minConsecutive = 3,
    minConsecutiveTwoCols = 5,
    smallFontMax = 12,
    yGapTolerance = 10,
    xClusterTolerance = 8,
  } = options;

  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    if (!lines[i].spans.length) { i++; continue; }

    let j = i;
    const refCols = clusterColumns(lines[i], xClusterTolerance);
    let count3 = 1;
    let count2 = 1;

    while (j + 1 < lines.length) {
      const gapY = Math.abs(lines[j + 1]._y - lines[j]._y);
      if (gapY > yGapTolerance) break;

      const nextCols = clusterColumns(lines[j + 1], xClusterTolerance);
      const overlap = refCols.filter((x) =>
        nextCols.some((y) => Math.abs(y - x) <= xClusterTolerance)
      );

      if (refCols.length >= minCols && overlap.length >= minCols) {
        count3++;
        j++;
      } else if (
        refCols.length >= 2 &&
        nextCols.length >= 2 &&
        overlap.length >= 2 &&
        lines[j + 1].fontSizeAvg <= smallFontMax
      ) {
        count2++;
        j++;
      } else break;
    }

    const len = j - i + 1;
    const is3 = refCols.length >= minCols && len >= minConsecutive && count3 >= minConsecutive;
    const is2 =
      refCols.length >= 2 &&
      len >= minConsecutiveTwoCols &&
      count2 >= minConsecutiveTwoCols &&
      lines.slice(i, j + 1).every((ln) => ln.fontSizeAvg <= smallFontMax);

    if (is3 || is2) {
      blocks.push({ start: i, end: j });
      i = j + 1;
    } else {
      i++;
    }
  }
  return blocks;
}

function lineInAnyBlock(idx, blocks) {
  return blocks.some((b) => idx >= b.start && idx <= b.end);
}

/* ---------------------------------------------------------
   HEADINGS, LABELS, SECTION HEADINGS
--------------------------------------------------------- */
const FIG_TABLE_LABEL_RE = /^(figure|fig\.?|table)\s*\d+(\.\d+)?/i;
function looksLikeHeading(line) {
  if (!line || !line.text) return false;
  const t = line.text.trim();
  // All-caps headings are very likely headings
  if (t.length > 3 && t === t.toUpperCase()) return true;
  // Treat moderately large fonts and semibold weight as headings to avoid false highlights
  if ((line.fontSizeAvg || 0) >= 16) return true;
  if ((line.fontWeight || 0) >= 600) return true;
  return false;
}
function looksLikeFigureOrTableLabel(line) {
  if (!line || !line.text) return false;
  return FIG_TABLE_LABEL_RE.test(line.text.trim());
}
// 3.1 Algae / 3.1.3 Rhodophyceae, etc.
const SECTION_HEADING_RE = /^\s*\d+(\.\d+)+\s+[A-Z][a-zA-Z].*$/;

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
  const preparedSectionIdsRef = useRef([]);
  // Cache for server-verified media availability per domain_id
  const mediaAvailabilityRef = useRef({});
  const resizeDebounce = useRef(null);
  const dragPauseTimer = useRef(null);
  const dragWasActiveRef = useRef(false);
  const BASE_URL = "http://localhost:8000";

  /* Prepare terms */
  useEffect(() => {
    preparedTermsRef.current = (terms || [])
      .map((t) => ({
        raw: t,
        key: makeTermKey(t),
        originalName: t.name || t.rawName || "",
      }))
      .filter((x) => x.key);
  }, [terms]);

  useEffect(() => {
    if (terms.length && numPages) {
      scheduleHighlight(200);
    }
  }, [terms, numPages]);


  

  /* Prepare section IDs */
  useEffect(() => {
    preparedSectionIdsRef.current = (sectionIds || []).map((s) => String(s || "").trim());
  }, [sectionIds]);

  /* Debounced ResizeObserver (drag-aware) */
  useEffect(() => {
    if (!containerRef.current) return;

    const ro = new ResizeObserver(() => {
      // During drag, just remember we resized; don’t thrash renders.
      if (document.body.classList.contains("dragging")) {
        dragWasActiveRef.current = true;
        if (resizeDebounce.current) clearTimeout(resizeDebounce.current);
        // keep it light during drag; we will resize at drag end.
        return;
      }

      if (resizeDebounce.current) clearTimeout(resizeDebounce.current);
      resizeDebounce.current = setTimeout(() => {
        if (!containerRef.current) return;
        setPageWidth(Math.max(300, containerRef.current.clientWidth));
        scheduleHighlight(120);
      }, 180);
    });

    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      if (resizeDebounce.current) clearTimeout(resizeDebounce.current);
    };
  }, []);

  /* Listen for drag end to apply a single resize & highlight */
  useEffect(() => {
    const onDragEndish = () => {
      // Wait a tick after drag class removal for layout to settle
      if (!document.body.classList.contains("dragging") && dragWasActiveRef.current) {
        dragWasActiveRef.current = false;
        if (dragPauseTimer.current) clearTimeout(dragPauseTimer.current);
        dragPauseTimer.current = setTimeout(() => {
          if (containerRef.current) {
            setPageWidth(Math.max(300, containerRef.current.clientWidth));
          }
          // one clean pass after drag completes
          scheduleHighlight(100);
        }, 120);
      }
    };

    // Mouse/touch up events correlate with drag ending in your layout
    window.addEventListener("mouseup", onDragEndish, { passive: true });
    window.addEventListener("touchend", onDragEndish, { passive: true });
    window.addEventListener("touchcancel", onDragEndish, { passive: true });

    return () => {
      window.removeEventListener("mouseup", onDragEndish);
      window.removeEventListener("touchend", onDragEndish);
      window.removeEventListener("touchcancel", onDragEndish);
      if (dragPauseTimer.current) clearTimeout(dragPauseTimer.current);
    };
  }, []);

  const onDocumentLoadSuccess = ({ numPages }) => {
  setNumPages(numPages);

  // 🔥 wait for layout + paint to finish
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scheduleHighlight(0);
    });
  });
  };


  /* Drive highlighting on key changes */
  useEffect(() => {
    scheduleHighlight(500);
  }, [file, terms, selectedView, numPages, sectionIds]);

  /* Reset cache on Word tab */
    useEffect(() => {
    if (selectedView === "Word" || selectedView === "Summary") {
        if (window.__highlightedOnceGlobal) window.__highlightedOnceGlobal.clear();
        scheduleHighlight(200);
    } else {
        clearOverlays();
    }
    }, [selectedView]);

  /* Cleanup */
  useEffect(() => {
    return () => {
      clearOverlays();
      observerRef.current?.disconnect();
      clearTimeout(highlightTimer.current);
      clearTimeout(resizeDebounce.current);
      clearTimeout(dragPauseTimer.current);
    };
  }, []);


  useEffect(() => {
  const overlays = document.querySelectorAll(
    ".term-highlight-overlay, .section-id-highlight"
  );

  // Remove term overlays entirely when entering Summary mode to avoid visual noise
  if (selectedView === 'Summary') {
    document.querySelectorAll('.term-highlight-overlay').forEach((e) => e.remove());
  }

  overlays.forEach((ov) => {
    if (ov.classList.contains('term-highlight-overlay')) {
      // Only allow interaction and visibility when in Word mode
      ov.style.pointerEvents = selectedView === 'Word' ? 'auto' : 'none';
      if (selectedView === 'Word') ov.style.display = '';
      else ov.style.display = 'none';
    } else if (ov.classList.contains('section-id-highlight')) {
      ov.style.pointerEvents = selectedView === 'Summary' ? 'auto' : 'none';
      // Only show section-id highlights in Summary
      if (selectedView === 'Summary') ov.style.display = '';
      else ov.style.display = 'none';
    } else {
      ov.style.pointerEvents = 'none';
    }
  });
}, [selectedView]);


  useEffect(() => {
  if (selectedView !== "Sentence") {
    document.querySelectorAll(".pdf-sentence-tooltip").forEach((el) => el.remove());
    return;
  }

  function handleHover(e) {
    console.log("Hover target:", e.target, e.target.tagName);
    const target = e.target;

    // Only show tooltip for PDF text spans
    if (!target || target.tagName !== "SPAN") return;

    // Remove any existing tooltip first
    document.querySelectorAll(".pdf-sentence-tooltip").forEach((el) => el.remove());

    // Create tooltip
    const tip = document.createElement("div");
    tip.className = "pdf-sentence-tooltip";
    tip.textContent = "Drag and select a sentence to analyze it";

    Object.assign(tip.style, {
      position: "fixed",
      background: "#333",
      color: "#fff",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      zIndex: 9999,
      pointerEvents: "none",
      whiteSpace: "nowrap",
      opacity: "0",
      transition: "opacity 0.15s ease-in-out"
    });

    document.body.appendChild(tip);

    // Position the tooltip near the cursor
    const rect = target.getBoundingClientRect();
    tip.style.left = `${rect.left}px`;
    tip.style.top = `${rect.top - 28}px`;
    tip.style.opacity = "1";

    const removeTip = () => {
      tip.style.opacity = "0";
      setTimeout(() => tip.remove(), 150);
    };

    target.addEventListener("mouseleave", removeTip, { once: true });
  }

  // Use a more reliable approach to attach the listener
  const attachHoverListener = () => {
    document.addEventListener("mouseover", handleHover);
  };

  // Wait a bit for the PDF text layer to be ready
  const timeoutId = setTimeout(attachHoverListener, 100);

  return () => {
    clearTimeout(timeoutId);
    document.removeEventListener("mouseover", handleHover);
    document.querySelectorAll(".pdf-sentence-tooltip").forEach((el) => el.remove());
  };
}, [selectedView]);


  /* ---------------------------------------------------------
     Scheduler (drag-aware)
  --------------------------------------------------------- */
  function scheduleHighlight(delay = 0) {
    // Run highlights in Word and Summary (section ids)
    if (selectedView !== "Word" && selectedView !== "Summary") return;

    // Don’t schedule while user is dragging the divider
    if (document.body.classList.contains("dragging")) return;

    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(runHighlightCycle, delay);
  }

  function clearOverlays() {
    document.querySelectorAll(".term-highlight-overlay").forEach((e) => e.remove());
    document.querySelectorAll(".section-id-highlight").forEach((e) => e.remove());
    document.querySelectorAll(".overlay-container").forEach((c) => {
      if (c.children.length === 0) c.remove();
    });
  }

  function escapeRegex(str = "") {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Collapses fake spaced letters from textbook PDFs
function tightenSpacedLetters(s = "") {
  return s
    .toLowerCase()
    // remove spaces between single letters: c h l o r e l l a
    .replace(/(?<=\b[a-z])\s+(?=[a-z]\b)/gi, "")
    // normalize multiple spaces
    .replace(/\s+/g, " ");
}

// Builds safe flexible regex for terms
function buildTermRegex(term = "") {
  const safe = escapeRegex(term.toLowerCase().trim());
  const flexible = safe
    .replace(/\s+/g, "\\s+")      // flexible spaces
    .replace(/-/g, "[-\\s]?");   // hyphen or space
  return new RegExp(flexible, "gi");
}


 function runHighlightCycle() {
  if (selectedView !== "Word" && selectedView !== "Summary") return;
  if (document.body.classList.contains("dragging")) return;

  const pages = Array.from(document.querySelectorAll(".react-pdf__Page"));
  if (!pages.length) {
    retryRef.current++;
    if (retryRef.current <= 8) scheduleHighlight(350);
    return;
  }

  retryRef.current = 0;
  clearOverlays();
  setIsHighlighting(true);
  
  try {
    if (selectedView === "Word") {
      console.log("\n🚀 STARTING HIGHLIGHT CYCLE");
      console.log("📄 Total pages:", pages.length);
      console.log("📝 Total terms to highlight:", preparedTermsRef.current.length);
      
      pages.forEach(highlightTermsOnPage);
      
      console.log("\n✅ HIGHLIGHT CYCLE COMPLETE\n");
    }
    if (selectedView === "Summary") pages.forEach(highlightSectionIdsOnPage);
  } finally {
    setIsHighlighting(false);
    if (pages[0]) attachObserverOnce(pages[0]);
  }
}

  function attachObserverOnce(pageEl) {
    const textLayer =
      pageEl.querySelector(".react-pdf__Page__textContent") ||
      pageEl.querySelector(".react-pdf__TextLayer");
    if (!textLayer) return;

    observerRef.current?.disconnect();
    observerRef.current = new MutationObserver(() => {
      // Skip noisy mutations during drag; re-run after drag end via scheduleHighlight
      if (document.body.classList.contains("dragging")) return;
      observerRef.current?.disconnect();
      scheduleHighlight(280);
    });

    observerRef.current.observe(textLayer, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  /* ---------------------------------------------------------
     MAIN TERM HIGHLIGHT (multi-span substring + boundaries)
  --------------------------------------------------------- */
function highlightTermsOnPage(pageEl) {
  const textLayer = pageEl.querySelector(".react-pdf__Page__textContent");
  if (!textLayer) return;

  // 🔥 Attach overlays to textLayer (fixes scaling bug)
  const overlayContainer = ensureOverlayContainer(textLayer, 10);
  const layerRect = textLayer.getBoundingClientRect();

  const rawSpans = [...textLayer.querySelectorAll("span")].filter(
    (s) => (s.textContent || "").trim()
  );

  const spans = rawSpans.map((s) => ({
    el: s,
    textRaw: s.textContent || "",
    textTrimmed: (s.textContent || "").trim(),
    rect: s.getBoundingClientRect(),
  }));

  if (!spans.length) return;

  const lines = clusterLines(spans);

  // ---------- SKIP RULES ----------
const captionSkip = new Set();
const labelLines = new Set();
const headingSkip = new Set();
const sectionSkip = new Set();

lines.forEach((ln, i) => {
    if (looksLikeFigureOrTableLabel(ln)) {
    labelLines.add(i);

    // Skip caption + area below where diagram labels exist
    for (let k = 0; k <= 5; k++) {
        if (i + k < lines.length) captionSkip.add(i + k);
    }
    }

  if (looksLikeHeading(ln)) headingSkip.add(i);

  if (SECTION_HEADING_RE.test(ln.text)) sectionSkip.add(i);
});

const tableBlocks = detectTableBlocks(lines);

// Detect single-line tables (your old logic)
const singleLineTable = new Set();
lines.forEach((ln, i) => {
  const cols = clusterColumns(ln, 8);
  if (cols.length >= 3) singleLineTable.add(i);
});

const diagramLabelLines = new Set();

lines.forEach((ln, i) => {
  const text = ln.text.trim();

  // Very short lines with spaced capitals: "A  B  C"
  if (/^([A-Z]\s+){2,}[A-Z]$/.test(text)) {
    diagramLabelLines.add(i);
  }

  // Lines with 1–3 character tokens (typical diagram markers)
  const tokens = text.split(/\s+/);
  if (tokens.length <= 6 && tokens.every(t => t.length <= 2)) {
    diagramLabelLines.add(i);
  }
});



  const termList = preparedTermsRef.current
    .map((t) => {
      const rawName = t.raw?.name || t.raw?.rawName || t.originalName || "";
      if (!rawName) return null;
      return {
        pterm: t,
        originalName: rawName,
        termRegex: buildTermRegex(rawName),
      };
    })
    .filter(Boolean);

  lines.forEach((line,lineIdx) => {
    const lineSpans = line.spans;
    if (!lineSpans.length) return;
    
    if (headingSkip.has(lineIdx)) return;
    if (captionSkip.has(lineIdx)) return;
    if (labelLines.has(lineIdx)) return;
    if (sectionSkip.has(lineIdx)) return;
    if (lineInAnyBlock(lineIdx, tableBlocks)) return;
    if (singleLineTable.has(lineIdx)) return;
    if (diagramLabelLines.has(lineIdx)) return;
    const concat = lineSpans.map((s) => s.textRaw).join("");
    const concatTight = tightenSpacedLetters(concat);

    // Map character positions back to spans
    const prefix = [];
    let acc = 0;
    for (let i = 0; i < lineSpans.length; i++) {
      prefix.push(acc);
      acc += lineSpans[i].textRaw.length;
    }

    termList.forEach(({ pterm, termRegex }) => {
      let match;

      while ((match = termRegex.exec(concatTight)) !== null) {
        const idx = match.index;
        const end = idx + match[0].length;

        createSubstringOverlaysForRange(
          layerRect,
          overlayContainer,
          lineSpans,
          prefix,
          idx,
          end,
          pterm
        );

        termRegex.lastIndex = end;
      }
    });
  });
}

  function createSubstringOverlaysForRange(
  layerRect,
  overlayContainer,
  lineSpans,
  prefix,
  startIdx,
  endIdx,
  pterm
) {
  for (let i = 0; i < lineSpans.length; i++) {
    const span = lineSpans[i];
    const spanStart = prefix[i];
    const spanEnd = spanStart + span.textRaw.length;

    const ovStart = Math.max(startIdx, spanStart);
    const ovEnd = Math.min(endIdx, spanEnd);
    if (ovStart >= ovEnd) continue;

    const node = span.el.firstChild;
    if (!node || node.nodeType !== Node.TEXT_NODE) continue;

    const localStart = ovStart - spanStart;
    const localEnd = ovEnd - spanStart;

    const range = document.createRange();
    range.setStart(node, localStart);
    range.setEnd(node, localEnd);

    const rects = [...range.getClientRects()];

    rects.forEach((r) => {
      const overlay = document.createElement("div");
      overlay.className = "term-highlight-overlay";

      Object.assign(overlay.style, {
        position: "absolute",
        left: `${r.left - layerRect.left}px`,
        top: `${r.top - layerRect.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        background: "rgba(255,255,0,0.4)",
        borderRadius: "2px",
        pointerEvents: "auto",
        zIndex: 20,
      });

      overlay.onclick = () => {
        if (window.onPdfTermClick) window.onPdfTermClick(pterm.raw);
      };

      overlayContainer.appendChild(overlay);
    });

    range.detach();
  }
}

  
  /* ---------------------------------------------------------
     SECTION ID HIGHLIGHT
  --------------------------------------------------------- */
  function highlightSectionIdsOnPage(pageEl) {
  const textLayer = pageEl.querySelector(".react-pdf__Page__textContent");
  if (!textLayer) return;

  // 🔥 IMPORTANT — attach overlays to textLayer
  const overlayContainer = ensureOverlayContainer(textLayer, 15);
  const layerRect = textLayer.getBoundingClientRect();

  const domSpans = [...textLayer.querySelectorAll("span")];
  if (!domSpans.length) return;

  const spanObjs = domSpans.map((s) => ({
    el: s,
    rect: s.getBoundingClientRect(),
    textTrimmed: (s.textContent || "").trim(),
    textRaw: s.textContent || "",
    fontSize: parseFloat(window.getComputedStyle(s).fontSize || 12),
  }));

  const lines = clusterLines(spanObjs);

  const tableBlocks = detectTableBlocks(lines);
  const labelLines = new Set();
  lines.forEach((ln, i) => {
    if (looksLikeFigureOrTableLabel(ln)) {
      labelLines.add(i);
      if (i + 1 < lines.length) labelLines.add(i + 1);
    }
  });

  const isLineSectionHeading = (ln, sid) => {
    if (!ln || !ln.text) return false;
    const txt = ln.text.trim();

    if (SECTION_HEADING_RE.test(txt) && txt.startsWith(sid)) return true;

    const re = new RegExp(`^\\s*${sid}\\s+[A-Z]`);
    if (re.test(ln.text)) return true;

    if (ln.spans.length > 1 && ln.spans[0].textTrimmed === sid) {
      const next = ln.spans[1].textTrimmed || "";
      if (/^[A-Z]/.test(next.trim())) return true;
    }

    return false;
  };

  lines.forEach((ln, lineIdx) => {
    if (!ln || !ln.text) return;
    if (labelLines.has(lineIdx)) return;
    if (lineInAnyBlock(lineIdx, tableBlocks)) return;

    const lineText = ln.text.trim();

    preparedSectionIdsRef.current.forEach((sid) => {
      if (
        lineText === sid ||
        isLineSectionHeading(ln, sid) ||
        lineText.startsWith(sid + " ")
      ) {
        let targetSpan =
          ln.spans.find((s) => s.textTrimmed === sid) ||
          ln.spans.find((s) => s.textTrimmed.includes(sid));

        if (!targetSpan) targetSpan = ln.spans[0];

        const r = targetSpan.rect || targetSpan.el.getBoundingClientRect();
        if (!r) return;

        const overlay = document.createElement("div");
        overlay.className = "section-id-highlight";

        Object.assign(overlay.style, {
          position: "absolute",
          left: `${r.left - layerRect.left}px`,
          top: `${r.top - layerRect.top}px`,
          width: `${r.width}px`,
          height: `${r.height}px`,
          background: "rgba(255,200,0,0.5)",
          borderRadius: "2px",
          cursor: "pointer",
          zIndex: 20,
          pointerEvents: "auto",
        });

        overlay.onclick = () => {
          if (window.onSectionIdClick) window.onSectionIdClick(sid);
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
     UTIL
  --------------------------------------------------------- */
  function ensureOverlayContainer(pageEl, zIndex) {
    let container = pageEl.querySelector(".overlay-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "overlay-container";
      Object.assign(container.style, {
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex,
      });
      pageEl.appendChild(container);
    }
    return container;
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
          onLoadError={(e) => console.error("PDF load error:", e)}
          loading={<div>Loading PDF...</div>}
        >
          {Array.from({ length: numPages || 0 }, (_, i) => (
            <Page
              key={`p_${i + 1}`}
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
