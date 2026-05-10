import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "../styles/ModernLayout.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

function normalizeEnglish(s = "") {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

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

const PdfDocument = memo(
  ({ file, numPages, pageWidth, onLoadSuccess }) => (
    <Document file={file} onLoadSuccess={onLoadSuccess}>
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
  ),
  (prev, next) =>
    prev.file      === next.file      &&
    prev.numPages  === next.numPages  &&
    prev.pageWidth === next.pageWidth
);

export default function PdfViewer({
  file,
  terms = [],
  sectionIds = [],
  selectedView,
  isReadMode = true,
  pinPosition = null,
  onPinPlace = null,
  isPinMode = false,
  onOccurrencesFound = null,
  highlightedTermText = null,
  onLoadSuccess = null,
}) {
  const [numPages,          setNumPages]          = useState(null);
  const [pageWidth,         setPageWidth]         = useState(0);
  const [hoverState,        setHoverState]        = useState(null);
  const [hlHoverState,      setHlHoverState]      = useState(null);
  const [showHighlightHint, setShowHighlightHint] = useState(false);

  const containerRef             = useRef(null);
  const highlightTimer           = useRef(null);
  const resizeHighlightTimer     = useRef(null);
  const preparedTermsRef         = useRef([]);
  const hoverListenersAttached   = useRef(false);
  const activeObservers          = useRef([]);
  const highlightedTermsRef      = useRef(new Set());
  const occurrencesRef           = useRef({});
  const firstHighlightPageRef    = useRef({});
  const occurrencePassDoneRef    = useRef(false);
  const lastPageWidthRef         = useRef(0);
  const selectedTermOverlaysRef  = useRef([]);
  const drawnHighlightsRef       = useRef(new Set());
  const isHighlightingRef        = useRef(false);
  const isClearingHighlightsRef  = useRef(false);

  const pageLabelsRef = useRef({});

  const isReadModeRef = useRef(isReadMode);

  React.useLayoutEffect(() => {
    isReadModeRef.current = isReadMode;
  }, [isReadMode]);

  // Separate functions for different highlighting types
  const isTermHighlightingDisabled = useCallback(() => {
    return selectedView !== "Word"; // ONLY enable term highlighting in Word mode
  }, [selectedView]);

  const isSectionHighlightingDisabled = useCallback(() => {
    return selectedView !== "Summary"; // ONLY enable section highlighting in Summary mode
  }, [selectedView]);

  /* ---------------- PREPARE TERMS ---------------- */
  useEffect(() => {
    preparedTermsRef.current = terms
      .map((t) => ({
        raw:    t,
        text:   normalizeEnglish(t.name || t.rawName || "").replace(/^\W+|\W+$/g, ""),
        isMwe:  t.is_mwe === true,
        mweType: t.mwe_type || "single_word",
        isNer: String(t.names).toLowerCase() === "yes",
      }))
      .filter((t) => t.text)
      .sort((a, b) => Number(b.isMwe) - Number(a.isMwe) || b.text.length - a.text.length);
  }, [terms]);

  /* ---------------- HIGHLIGHT HINT ---------------- */
  useEffect(() => {
    if (selectedView === "Word" && !isReadMode) {
      setShowHighlightHint(true);
      const t = setTimeout(() => setShowHighlightHint(false), 4000);
      return () => clearTimeout(t);
    } else {
      setShowHighlightHint(false);
    }
  }, [selectedView, isReadMode]);

  /* ---------------- SENTENCE MODE CURSOR - IMMEDIATE I-BEAM ---------------- */
  useEffect(() => {
    if (selectedView !== "Sentence") {
      // Reset cursors when leaving Sentence mode
      document
        .querySelectorAll(".react-pdf__Page__textContent span")
        .forEach((span) => {
          span.style.cursor = "";
        });
      return;
    }

    // Apply I-beam cursor immediately - no delay
    const applyIBeamCursor = () => {
      const spans = document.querySelectorAll(".react-pdf__Page__textContent span");
      spans.forEach((span) => {
        span.style.cursor = "text";
      });
    };

    // Apply immediately
    applyIBeamCursor();

    // Also set up a MutationObserver to handle dynamically added spans
    const observer = new MutationObserver(() => {
      applyIBeamCursor();
    });

    // Observe all text content layers for new spans
    const textLayers = document.querySelectorAll(".react-pdf__Page__textContent");
    textLayers.forEach((layer) => {
      observer.observe(layer, { childList: true, subtree: true });
    });

    return () => {
      observer.disconnect();
      // Reset cursors on cleanup
      document
        .querySelectorAll(".react-pdf__Page__textContent span")
        .forEach((span) => {
          span.style.cursor = "";
        });
    };
  }, [selectedView, file, numPages]);

  /* ---------------- SELECTED TERM — HIGHLIGHT ALL OCCURRENCES ---------------- */
  useEffect(() => {
    selectedTermOverlaysRef.current.forEach((el) => { try { el.remove(); } catch (_) {} });
    selectedTermOverlaysRef.current = [];

    if (!highlightedTermText) return;
    
    if (isTermHighlightingDisabled()) return;

    const normalizedTarget = normalizeEnglish(highlightedTermText).replace(/^\W+|\W+$/g, "");
    if (!normalizedTarget) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const pages = [...document.querySelectorAll(".react-pdf__Page")];

        pages.forEach((pageEl) => {
          const tl = pageEl.querySelector(".react-pdf__Page__textContent");
          if (!tl) return;
          const pageRect = pageEl.getBoundingClientRect();
          const oc = ensureOverlayContainer(pageEl);

          const safe = normalizedTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const pattern = new RegExp(`\\b${safe}\\b`, "gi");

          [...tl.querySelectorAll("span")].forEach((span) => {
            const spanText = normalizeEnglish(span.textContent || "");
            if (!spanText.includes(normalizedTarget)) return;

            const node = span.firstChild;
            if (!node) return;

            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(spanText)) !== null) {
              const startIdx = match.index;
              const endIdx = startIdx + normalizedTarget.length;
              try {
                const range = document.createRange();
                range.setStart(node, Math.min(startIdx, node.length));
                range.setEnd(node, Math.min(endIdx, node.length));
                const rects = [...range.getClientRects()];
                range.detach();
                rects.forEach((r) => {
                  if (r.width < 2) return;
                  const div = document.createElement("div");
                  div.className = "term-selected-overlay";
                  Object.assign(div.style, {
                    position: "absolute",
                    left: `${r.left - pageRect.left}px`,
                    top: `${r.top - pageRect.top}px`,
                    width: `${r.width}px`,
                    height: `${r.height}px`,
                    background: "rgba(0, 150, 255, 0.25)",
                    borderBottom: "2.5px solid rgba(0, 150, 255, 0.85)",
                    borderRadius: "2px",
                    zIndex: 25,
                    pointerEvents: "none",
                    mixBlendMode: "multiply",
                  });
                  oc.appendChild(div);
                  selectedTermOverlaysRef.current.push(div);
                });
              } catch (_) {}
            }
          });
        });
      });
    });
  }, [highlightedTermText, isTermHighlightingDisabled]);

  /* ---------------- DISCONNECT OBSERVERS ---------------- */
  const disconnectAllObservers = useCallback(() => {
    activeObservers.current.forEach((o) => { try { o.disconnect(); } catch (_) {} });
    activeObservers.current = [];
    document.querySelectorAll(".react-pdf__Page").forEach((p) => {
      p.__observerAttached            = false;
      p.__hoverObserverAttached       = false;
      p.__highlighted                 = false;
      p.__occurrenceListenersAttached = false;
      const oc = p.querySelector(".overlay-container");
      if (oc) oc.querySelectorAll(".term-hover-highlight").forEach((h) => h.remove());
    });
    document.querySelectorAll(".react-pdf__Page__textContent span").forEach((s) => {
      s.__hoverAttached      = false;
      s.__occurrenceAttached = false;
    });
  }, []);

  /* ---------------- CLEAR ALL OVERLAYS ---------------- */
  const clearAllOverlays = useCallback(() => {
    if (isClearingHighlightsRef.current) return;
    isClearingHighlightsRef.current = true;
    
    document.querySelectorAll(".react-pdf__Page").forEach((p) => {
      p.__highlighted                 = false;
      p.__occurrenceListenersAttached = false;
    });

    highlightedTermsRef.current   = new Set();
    occurrencesRef.current        = {};
    firstHighlightPageRef.current = {};
    occurrencePassDoneRef.current = false;
    drawnHighlightsRef.current.clear();

    document.querySelectorAll(".overlay-container").forEach((c) => (c.innerHTML = ""));
    document.querySelectorAll(".term-highlight-overlay").forEach((el) => el.remove());
    document.querySelectorAll(".term-hover-highlight").forEach((el) => el.remove());
    document.querySelectorAll(".section-highlight-overlay").forEach((el) => el.remove());
    document.querySelectorAll(".term-selected-overlay").forEach((el) => el.remove());

    selectedTermOverlaysRef.current = [];
    
    setTimeout(() => {
      isClearingHighlightsRef.current = false;
    }, 100);
  }, []);

  /* ── Reset only tracking bookkeeping, no DOM clearing ── */
  const resetHighlightTracking = useCallback(() => {
    document.querySelectorAll(".react-pdf__Page").forEach((p) => {
      p.__highlighted                 = false;
      p.__occurrenceListenersAttached = false;
      p.__observerAttached            = false;
    });
    document.querySelectorAll(".react-pdf__Page__textContent span").forEach((s) => {
      s.__occurrenceAttached = false;
    });
    highlightedTermsRef.current   = new Set();
    occurrencesRef.current        = {};
    firstHighlightPageRef.current = {};
    occurrencePassDoneRef.current = false;
    drawnHighlightsRef.current.clear();
  }, []);

  /* ---------------- PIN CLICK HANDLER ---------------- */
  useEffect(() => {
    if (!isPinMode) return;
    const handlePinClick = (e) => {
      const container = containerRef.current;
      if (!container) return;
      const cr     = container.getBoundingClientRect();
      const clickY = e.clientY - cr.top + container.scrollTop;
      const pageEl = e.target.closest(".react-pdf__Page");
      if (!pageEl) return;
      const pageNumber = parseInt(pageEl.dataset.pageNumber);
      if (!pageNumber) return;
      if (onPinPlace) onPinPlace({ page: pageNumber, yOffset: clickY });
    };
    const container = containerRef.current;
    if (container) {
      container.addEventListener("click", handlePinClick);
      return () => container.removeEventListener("click", handlePinClick);
    }
  }, [isPinMode, onPinPlace]);

  /* ---------------- RESIZE OBSERVER (mount-once) ---------------- */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const initial = container.clientWidth || 700;
    lastPageWidthRef.current = initial;
    setPageWidth(initial);

    let isMounted = true;
    const ro = new ResizeObserver(() => {
      if (!isMounted || !containerRef.current) return;
      const w = containerRef.current.clientWidth;
      if (Math.abs(w - lastPageWidthRef.current) > 2) {
        lastPageWidthRef.current = w;
        setPageWidth(w);
      }
    });
    ro.observe(container);
    return () => { isMounted = false; ro.disconnect(); };
  }, []);

  /* ---------------- SCHEDULE HIGHLIGHT ---------------- */
  const scheduleHighlight = useCallback((delay = 0) => {
    if (isTermHighlightingDisabled()) return;
    if (selectedView !== "Word" || isReadModeRef.current) return;
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(runHighlightCycle, delay);
  }, [isTermHighlightingDisabled, selectedView]);

  /* ---------------- HIGHLIGHT CYCLE ---------------- */
  const runHighlightCycle = useCallback(() => {
    if (isTermHighlightingDisabled()) return;
    if (isReadModeRef.current) return;
    if (isHighlightingRef.current) return;

    const pages = [...document.querySelectorAll(".react-pdf__Page")];
    if (!pages.length) { scheduleHighlight(200); return; }

    isHighlightingRef.current = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        let pending = 0;

        for (const pageEl of pages) {
          if (pageEl.__highlighted) continue;
          const tl = pageEl.querySelector(".react-pdf__Page__textContent");
          if (!tl) { pending++; continue; }
          const valid = [...tl.querySelectorAll("span")].filter(
            (s) => (s.textContent || "").trim() && s.offsetWidth > 0
          );
          if (!valid.length) { pending++; continue; }

          highlightTermsOnPage(pageEl, highlightedTermsRef.current);
          pageEl.__highlighted = true;
          attachObserverOnce(pageEl);
        }

        isHighlightingRef.current = false;

        if (pending > 0) {
          scheduleHighlight(200);
        } else if (!occurrencePassDoneRef.current) {
          occurrencePassDoneRef.current = true;
          runOccurrencePass(pages);
        }
      });
    });
  }, [isTermHighlightingDisabled, scheduleHighlight]);

  /* ---------------- OCCURRENCE PASS ---------------- */
  const runOccurrencePass = useCallback((pages) => {
    if (Object.keys(pageLabelsRef.current).length === 0) {
      detectPrintedPageNumbers(pages.length);
    }

    const occ = {};

    for (const pageEl of pages) {
      if (pageEl.__occurrenceListenersAttached) continue;

      const tl = pageEl.querySelector(".react-pdf__Page__textContent");
      if (!tl) continue;

      const filePageNum = parseInt(pageEl.dataset.pageNumber || "0");
      const pageNum     = getDisplayPage(filePageNum);

      const allSpans = [...tl.querySelectorAll("span")];

      allSpans.forEach((span, spanIdx) => {
        const spanText = normalizeEnglish(span.textContent || "");
        if (!spanText.trim()) return;

        preparedTermsRef.current.forEach((term) => {
          if (!new RegExp(`\\b${escapeRegex(term.text)}\\b`, "i").test(spanText)) return;

          if (!occ[term.text]) occ[term.text] = {};
          if (!occ[term.text][pageNum]) occ[term.text][pageNum] = [];

          const sentence = extractSentenceContext(allSpans, spanIdx, term.text);

          if (!occ[term.text][pageNum].includes(sentence)) {
            occ[term.text][pageNum].push(sentence);
          }

          if (firstHighlightPageRef.current[term.text] === pageNum) return;
          if (span.__occurrenceAttached) return;

          span.__occurrenceAttached = true;

          span.addEventListener("mouseenter", (e) =>
            setHlHoverState({ term, x: e.clientX, y: e.clientY })
          );
          span.addEventListener("mousemove", (e) =>
            setHlHoverState((p) => (p ? { ...p, x: e.clientX, y: e.clientY } : p))
          );
          span.addEventListener("mouseleave", () => setHlHoverState(null));
          span.addEventListener("click", () => {
            if (window.onPdfTermClick) window.onPdfTermClick(term.raw);
          });

          span.style.cursor = "pointer";
        });
      });

      pageEl.__occurrenceListenersAttached = true;
    }

    // Merge into global store
    Object.entries(occ).forEach(([k, pageMap]) => {
      if (!occurrencesRef.current[k]) occurrencesRef.current[k] = {};

      Object.entries(pageMap).forEach(([page, sentences]) => {
        if (!occurrencesRef.current[k][page]) {
          occurrencesRef.current[k][page] = [];
        }

        sentences.forEach((s) => {
          if (!occurrencesRef.current[k][page].includes(s)) {
            occurrencesRef.current[k][page].push(s);
          }
        });
      });
    });

    // Send to UI
    if (onOccurrencesFound) {
      const result = {};

      Object.entries(occurrencesRef.current).forEach(([k, pageMap]) => {
        result[k] = Object.entries(pageMap)
          .flatMap(([page, sentences]) =>
            sentences.map((sentence) => ({ page, sentence }))
          )
          .sort((a, b) => {
            const na = typeof a.page === "number" ? a.page : parseInt(a.page, 10);
            const nb = typeof b.page === "number" ? b.page : parseInt(b.page, 10);
            return isNaN(na) || isNaN(nb)
              ? String(a.page).localeCompare(String(b.page))
              : na - nb;
          });
      });

      const displayToFile = {};
      Object.entries(pageLabelsRef.current).forEach(([fileIdx, label]) => {
        const disp = getDisplayPage(parseInt(fileIdx));
        displayToFile[String(disp)] = parseInt(fileIdx);
      });

      onOccurrencesFound(result, displayToFile);
    }
  }, [onOccurrencesFound]);

  /* ── Extract the full sentence containing a term from surrounding spans ── */
  const extractSentenceContext = useCallback((allSpans, spanIdx, termText) => {
    const windowStart = Math.max(0, spanIdx - 15);
    const windowEnd   = Math.min(allSpans.length - 1, spanIdx + 15);
    let rawWindow = allSpans
      .slice(windowStart, windowEnd + 1)
      .map((s) => (s.textContent || "").trim())
      .filter(Boolean)
      .join(" ");

    rawWindow = rawWindow.replace(/(\w)-\s+(\w)/g, "$1$2");

    const normWindow = normalizeEnglish(rawWindow);
    const normTerm   = normalizeEnglish(termText);
    const termIdx    = normWindow.indexOf(normTerm);

    if (termIdx === -1) {
      return rawWindow.length > 300 ? rawWindow.slice(0, 300) + "\u2026" : rawWindow;
    }

    const SENT_RE = /[.?!]\s/g;
    let sentStart = 0;
    let sm;
    SENT_RE.lastIndex = 0;
    while ((sm = SENT_RE.exec(normWindow)) !== null) {
      if (sm.index + 2 <= termIdx) sentStart = sm.index + 2;
      else break;
    }

    const afterTerm = normWindow.indexOf(".", termIdx + normTerm.length);
    const sentEnd   = afterTerm !== -1 ? afterTerm + 1 : normWindow.length;

    let sentence = rawWindow.slice(sentStart, sentEnd).trim();

    if (sentence.length > 400) {
      const pos = termIdx - sentStart;
      const s   = Math.max(0, pos - 180);
      const e   = Math.min(sentence.length, pos + normTerm.length + 180);
      sentence  = (s > 0 ? "\u2026" : "") + sentence.slice(s, e).trim() + (e < sentence.length ? "\u2026" : "");
    }

    if (sentStart > 0) sentence = "\u2026" + sentence;
    return sentence;
  }, []);

  /* ---------------- OBSERVER ---------------- */
  const attachObserverOnce = useCallback((pageEl) => {
    if (isReadModeRef.current) return;
    const tl = pageEl.querySelector(".react-pdf__Page__textContent") ||
               pageEl.querySelector(".react-pdf__TextLayer");
    if (!tl || pageEl.__observerAttached) return;
    pageEl.__observerAttached = true;
    const observer = new MutationObserver(() => {
      if (isReadModeRef.current) return;
      if (isHighlightingRef.current) return;
      if (!pageEl.__highlighted) scheduleHighlight(80);
    });
    observer.observe(tl, { childList: true, subtree: true, characterData: true });
    activeObservers.current.push(observer);
  }, [scheduleHighlight]);

  /* ---------------- READ MODE HOVER ---------------- */
  const setupReadModeHover = useCallback(() => {
    // ONLY setup hover in Word mode
    if (isTermHighlightingDisabled()) return;
    if (selectedView !== "Word") return;
    
    const pages = document.querySelectorAll(".react-pdf__Page");
    if (!pages.length) { 
      setTimeout(setupReadModeHover, 100); 
      return; 
    }
    
    pages.forEach((pageEl) => {
      const tl = pageEl.querySelector(".react-pdf__Page__textContent") ||
                 pageEl.querySelector(".react-pdf__TextLayer");
      if (!tl || pageEl.__hoverObserverAttached) return;
      pageEl.__hoverObserverAttached = true;
      
      const existing = [...tl.querySelectorAll("span")].filter((s) => (s.textContent || "").trim());
      if (existing.length) { 
        attachHoverListeners(pageEl, existing); 
        return;
      }
      
      const observer = new MutationObserver(() => {
        const spans = [...tl.querySelectorAll("span")].filter((s) => (s.textContent || "").trim());
        if (!spans.length) return;
        attachHoverListeners(pageEl, spans);
        observer.disconnect();
      });
      observer.observe(tl, { childList: true, subtree: true });
      activeObservers.current.push(observer);
    });
  }, [isTermHighlightingDisabled, selectedView]);

  const attachHoverListeners = useCallback((pageEl, spans) => {
    // ONLY attach hover listeners in Word mode
    if (selectedView !== "Word") return;
    
    ensureOverlayContainer(pageEl);
    spans.forEach((span) => {
      if (span.__hoverAttached) return;
      span.__hoverAttached = true;
      span.addEventListener("mousemove",  (e) => handleSpanHover(e, pageEl));
      span.addEventListener("mouseleave", ()  => { clearHoverHighlight(pageEl); setHoverState(null); });
    });
  }, [selectedView]);

  const handleSpanHover = useCallback((e, pageEl) => {
    // Only show tooltips in Word mode AND read mode
    if (selectedView !== "Word" || isTermHighlightingDisabled() || !isReadModeRef.current) {
      clearHoverHighlight(pageEl);
      setHoverState(null);
      return;
    }
    
    const span = e.target;
    const orig = span.textContent || "";

    if (!orig.trim()) {
      clearHoverHighlight(pageEl);
      span.style.cursor = "default";
      setHoverState(null);
      return;
    }

    const norm = normalizeEnglish(orig);

    const matched = preparedTermsRef.current.find((t) =>
      new RegExp(`(?<!\\w)${escapeRegex(t.text)}(?!\\w)`, "i").test(norm)
    );

    if (!matched) {
      clearHoverHighlight(pageEl);
      span.style.cursor = "default";
      setHoverState(null);
      return;
    }

    const node = span.firstChild;
    if (!node) return;

    // Find exact start index of matched term
    let si = -1;
    for (let i = 0; i <= orig.length - matched.text.length; i++) {
      if (
        normalizeEnglish(orig.substring(i, i + matched.text.length)) ===
        matched.text
      ) {
        si = i;
        break;
      }
    }

    if (si === -1) {
      clearHoverHighlight(pageEl);
      span.style.cursor = "default";
      setHoverState(null);
      return;
    }

    let caretRange = null;

    if (document.caretRangeFromPoint) {
      caretRange = document.caretRangeFromPoint(e.clientX, e.clientY);
    } else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
      if (pos) {
        caretRange = document.createRange();
        caretRange.setStart(pos.offsetNode, pos.offset);
      }
    }

    if (!caretRange || caretRange.startContainer !== node) {
      clearHoverHighlight(pageEl);
      span.style.cursor = "default";
      setHoverState(null);
      return;
    }

    const offset = caretRange.startOffset;

    if (offset < si || offset >= si + matched.text.length) {
      clearHoverHighlight(pageEl);
      span.style.cursor = "default";
      setHoverState(null);
      return;
    }

    showHoverHighlight(span, pageEl, matched);
    span.style.cursor = "pointer";

    setHoverState({
      term: matched,
      x: e.clientX,
      y: e.clientY,
    });

    span.onclick = () => {
      if (window.onPdfTermClick) {
        window.onPdfTermClick(matched.raw);
      }
    };
  }, [selectedView, isTermHighlightingDisabled]);

  const showHoverHighlight = useCallback((span, pageEl, term) => {
    clearHoverHighlight(pageEl);
    const oc = ensureOverlayContainer(pageEl);
    const pr = pageEl.getBoundingClientRect();
    const st = normalizeEnglish(span.textContent || "");
    const si = st.indexOf(term.text);
    if (si === -1) {
      clearHoverHighlight(pageEl);
      return;
    }
    const node = span.firstChild; if (!node) return;
    const range = document.createRange();
    range.setStart(node, si); range.setEnd(node, si + term.text.length);
    [...range.getClientRects()].forEach((r) => createHoverOverlay(r, pr, oc, term));
    range.detach();
  }, []);

  const createHoverOverlay = useCallback((rect, pageRect, container, term) => {
    const div = document.createElement("div");
    div.className = "term-hover-highlight";

    let background, border;

    if (term.isMwe) {
      background = "rgba(255,105,180,0.2)";
      border     = "2px solid rgba(255,105,180,0.6)";
    } else if (term.isNer) {
      background = "rgba(0,120,255,0.2)";
      border     = "2px solid rgba(0,120,255,0.8)";
    } else {
      background = "rgba(255,230,0,0.2)";
      border     = "2px solid rgba(255,200,0,0.6)";
    }

    Object.assign(div.style, {
      position:     "absolute",
      left:         `${rect.left - pageRect.left}px`,
      top:          `${rect.top - pageRect.top}px`,
      width:        `${rect.width}px`,
      height:       `${rect.height}px`,
      background,
      border,
      borderRadius: "3px",
      zIndex:       30,
      pointerEvents: "none",
      transition:   "all 0.15s ease",
    });

    div.title = term.isMwe
      ? "Multi-word Expression"
      : term.isNer
      ? "Named Entity (NER)"
      : "Domain Term";

    container.appendChild(div);
  }, []);

  const clearHoverHighlight = useCallback((pageEl) => {
    const oc = pageEl.querySelector(".overlay-container");
    if (oc) oc.querySelectorAll(".term-hover-highlight").forEach((h) => h.remove());
  }, []);

  /* ---------------- SECTION HIGHLIGHT ---------------- */
  const scheduleSectionHighlight = useCallback((delay = 0) => {
    if (isSectionHighlightingDisabled()) return;
    if (selectedView !== "Summary") return;
    
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => {
      if (isSectionHighlightingDisabled()) return;
      if (selectedView !== "Summary") return;
      document.querySelectorAll(".react-pdf__Page").forEach(highlightSectionIdsOnPage);
    }, delay);
  }, [isSectionHighlightingDisabled, selectedView]);

  const highlightSectionIdsOnPage = useCallback((pageEl) => {
    if (isSectionHighlightingDisabled()) return;
    if (selectedView !== "Summary") return;
    
    const tl = pageEl.querySelector(".react-pdf__Page__textContent");
    if (!tl) return;
    const oc = ensureOverlayContainer(pageEl);
    const tlr = tl.getBoundingClientRect();
    
    // Clear existing highlights
    oc.querySelectorAll(".section-highlight-overlay").forEach(h => h.remove());
    
    const allSpans = [...tl.querySelectorAll("span")].filter((s) => (s.textContent || "").trim());
    
    sectionIds.forEach((id) => {
      if (!id || /^(figure|table)/i.test(id)) return;
      
      allSpans.forEach((span) => {
        const text = span.textContent.trim();
        
        // STRICT: Only highlight if the span text EXACTLY equals the section ID
        // This will NOT highlight "3.1 Algae" because it contains extra text
        const isExactMatch = text === id;
        
        // Alternative: Allow ID followed by punctuation or space but nothing else
        // This would match "3.1", "3.1.", "3.1 ", but NOT "3.1 Algae"
        const isStrictMatch = new RegExp(`^${escapeRegex(id)}[\\s\\.\\,;:]*$`, 'i').test(text);
        
        if (isExactMatch || isStrictMatch) {
          const rect = span.getBoundingClientRect();
          const div = document.createElement("div");
          div.className = "section-highlight-overlay";
          
          Object.assign(div.style, {
            position: "absolute",
            left: `${rect.left - tlr.left}px`,
            top: `${rect.top - tlr.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            background: "rgba(0,150,255,0.35)",
            borderRadius: "3px",
            zIndex: 20,
            pointerEvents: "auto",
          });
          
          div.title = `Section: ${id}`;
          div.onclick = () => window.onSectionIdClick && window.onSectionIdClick(id);
          oc.appendChild(div);
        }
      });
    });
  }, [isSectionHighlightingDisabled, selectedView, sectionIds]);

  /* ---------------- DOCUMENT LOAD ---------------- */
  const onDocumentLoadSuccess = useCallback(async ({ numPages, ...pdfProxy }) => {
    setNumPages(numPages);

    let labelsResolved = false;
    try {
      const labels = await pdfProxy.getPageLabels();
      if (labels && labels.length) {
        const map = {};
        labels.forEach((label, i) => { map[i + 1] = label; });
        pageLabelsRef.current = map;
        labelsResolved = true;
      }
    } catch (_) {}

    if (!labelsResolved) {
      pageLabelsRef.current = {};
    }

    setTimeout(() => {
      if (selectedView === "Word" && !isTermHighlightingDisabled()) {
        if (isReadModeRef.current) setupReadModeHover();
        else scheduleHighlight(100);
      }
      if (selectedView === "Summary" && !isSectionHighlightingDisabled() && sectionIds.length > 0) {
        scheduleSectionHighlight(100);
      }
    }, 200);

    if (onLoadSuccess) onLoadSuccess();
  }, [selectedView, isTermHighlightingDisabled, isSectionHighlightingDisabled, sectionIds.length, setupReadModeHover, scheduleHighlight, scheduleSectionHighlight, onLoadSuccess]);

  /* ---------------- MAIN EFFECT ---------------- */
  useEffect(() => {
    if (!file) return;
    clearTimeout(highlightTimer.current);
    disconnectAllObservers();
    hoverListenersAttached.current = false;
    clearAllOverlays();
    
    const timeout = setTimeout(() => {
      // Term highlighting for Word mode
      if (selectedView === "Word" && !isTermHighlightingDisabled()) {
        if (isReadMode) {
          setupReadModeHover();
        } else {
          scheduleHighlight(100);
        }
      }
      // Section highlighting for Summary mode
      if (selectedView === "Summary" && !isSectionHighlightingDisabled() && sectionIds.length > 0) {
        scheduleSectionHighlight(100);
      }
    }, 200);
    return () => {
      clearTimeout(timeout);
      disconnectAllObservers();
    };
  }, [selectedView, file, isReadMode, isTermHighlightingDisabled, isSectionHighlightingDisabled, sectionIds.length, disconnectAllObservers, clearAllOverlays, setupReadModeHover, scheduleHighlight, scheduleSectionHighlight]);

  /* ---------------- SECTIONIDS CHANGE EFFECT ---------------- */
  const prevSectionIdsJsonRef = useRef("");
  useEffect(() => {
    const json = JSON.stringify(sectionIds);
    if (json === prevSectionIdsJsonRef.current) return;
    prevSectionIdsJsonRef.current = json;

    if (!file) return;
    if (isSectionHighlightingDisabled()) return;
    if (selectedView === "Summary" && sectionIds.length > 0) {
      scheduleSectionHighlight(100);
    }
  }, [sectionIds, selectedView, isSectionHighlightingDisabled, file, scheduleSectionHighlight]);

  /* ---------------- TERMS CHANGE EFFECT ---------------- */
  const prevTermsLengthRef = useRef(0);
  useEffect(() => {
    if (preparedTermsRef.current.length === prevTermsLengthRef.current) return;
    prevTermsLengthRef.current = preparedTermsRef.current.length;

    if (!file || selectedView !== "Word" || isReadModeRef.current) return;
    if (isTermHighlightingDisabled()) return;

    document.querySelectorAll(".react-pdf__Page").forEach((p) => {
      p.__highlighted                 = false;
      p.__occurrenceListenersAttached = false;
      p.__observerAttached            = false;
    });
    document.querySelectorAll(".react-pdf__Page__textContent span").forEach((s) => {
      s.__occurrenceAttached = false;
    });
    highlightedTermsRef.current   = new Set();
    occurrencesRef.current        = {};
    firstHighlightPageRef.current = {};
    occurrencePassDoneRef.current = false;
    document.querySelectorAll(".overlay-container").forEach((c) => (c.innerHTML = ""));
    drawnHighlightsRef.current.clear();
    scheduleHighlight(0);
  }, [terms, selectedView, isTermHighlightingDisabled, file, scheduleHighlight]);

  /* ---------------- READ MODE TOGGLE ---------------- */
  useEffect(() => {
    if (!file || selectedView !== "Word") return;
    
    if (isTermHighlightingDisabled()) return;

    if (!isReadMode) {
      // Entering HIGHLIGHT mode (all terms pre-highlighted)
      disconnectAllObservers();
      resetHighlightTracking();
      clearAllOverlays();
      if (preparedTermsRef.current.length > 0) scheduleHighlight(0);
    } else {
      // Entering READ mode (hover to see highlights and tooltips)
      clearAllOverlays();
      disconnectAllObservers();
      document.querySelectorAll(".react-pdf__Page").forEach((p) => {
        p.__hoverObserverAttached = false;
      });
      setupReadModeHover();
    }
  }, [isReadMode, selectedView, isTermHighlightingDisabled, file, disconnectAllObservers, resetHighlightTracking, clearAllOverlays, scheduleHighlight, setupReadModeHover]);

  /* ---------------- RESIZE RE-HIGHLIGHT ---------------- */
  useEffect(() => {
    if (isTermHighlightingDisabled()) return;
    
    if (!file || selectedView !== "Word" || isReadModeRef.current) return;
    clearTimeout(resizeHighlightTimer.current);
    resizeHighlightTimer.current = setTimeout(() => {
      document.querySelectorAll(".react-pdf__Page").forEach((p) => {
        p.__highlighted                 = false;
        p.__observerAttached            = false;
        p.__occurrenceListenersAttached = false;
      });
      highlightedTermsRef.current   = new Set();
      occurrencesRef.current        = {};
      firstHighlightPageRef.current = {};
      occurrencePassDoneRef.current = false;
      document.querySelectorAll(".overlay-container").forEach((c) => (c.innerHTML = ""));
      drawnHighlightsRef.current.clear();
      scheduleHighlight(0);
    }, 150);
    return () => clearTimeout(resizeHighlightTimer.current);
  }, [pageWidth, selectedView, isTermHighlightingDisabled, file, scheduleHighlight]);

  /* ---------------- CLEAR HIGHLIGHTS WHEN ENTERING DISABLED MODES ---------------- */
  useEffect(() => {
    if (isTermHighlightingDisabled()) {
      document.querySelectorAll(".term-highlight-overlay").forEach((el) => el.remove());
      document.querySelectorAll(".term-hover-highlight").forEach((el) => el.remove());
      document.querySelectorAll(".term-selected-overlay").forEach((el) => el.remove());
      
      disconnectAllObservers();
      hoverListenersAttached.current = false;
      
      clearTimeout(highlightTimer.current);
      clearTimeout(resizeHighlightTimer.current);
      
      highlightedTermsRef.current = new Set();
      occurrencesRef.current = {};
      firstHighlightPageRef.current = {};
      occurrencePassDoneRef.current = false;
      drawnHighlightsRef.current.clear();
      isHighlightingRef.current = false;
    }
  }, [selectedView, isTermHighlightingDisabled, disconnectAllObservers]);

  /* ---------------- HELPERS ---------------- */
  function escapeRegex(t = "") { return String(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function getDisplayPage(filePageNum) {
    const label = pageLabelsRef.current[filePageNum];
    if (label === undefined || label === null) return filePageNum;
    if (typeof label === "number") return label;
    const n = parseInt(label, 10);
    return String(n) === String(label) ? n : label;
  }

  function ensureOverlayContainer(pageEl) {
    let c = pageEl.querySelector(".overlay-container");
    if (!c) {
      c = document.createElement("div");
      c.className = "overlay-container";
      Object.assign(c.style, { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 });
      pageEl.appendChild(c);
    }
    return c;
  }

  function highlightTermsOnPage(pageEl, highlightedTerms = new Set()) {
    if (isReadModeRef.current) return;
    if (isTermHighlightingDisabled()) return;
    
    const tl = pageEl.querySelector(".react-pdf__Page__textContent");
    if (!tl) return;

    const oc       = ensureOverlayContainer(pageEl);
    const pageRect = pageEl.getBoundingClientRect();
    const SKIP     = /^(summary|questions?|exercises?|review\s*questions?|self[- ]?test|problems?|practice\s*questions?)/i;
    const raw      = [...tl.querySelectorAll("span")];

    let cutoff = raw.length;
    for (let i = 0; i < raw.length; i++) {
      const t = (raw[i].textContent || "").trim();
      if (t && SKIP.test(t)) { cutoff = i; break; }
    }

    const sizes = raw
      .map((s) => parseFloat(window.getComputedStyle(s).fontSize || "0"))
      .filter((f) => f > 0).sort((a, b) => a - b);
    const median    = sizes[Math.floor(sizes.length / 2)] || 16;
    const headingTh = median * 1.3;

    const spans = raw
      .filter((s, idx) => {
        if (idx >= cutoff) return false;

        const t  = (s.textContent || "").trim();
        if (!t) return false;

        const cs = window.getComputedStyle(s);
        const fs = parseFloat(cs.fontSize || "0");
        const fw = parseFloat(cs.fontWeight || "400");

        const isBold        = fw >= 600;
        const isHeadingSize = fs > headingTh;

        if (/^figure\s*\d+/i.test(t)) return false;
        if (/^\(?[a-z]\)|^\(?[ivx]+\)/i.test(t)) return false;
        if (/^\d+(\.\d+)+\s+[A-Z]/.test(t)) return false;
        if (t === t.toUpperCase() && t.length > 4) return false;
        if (t.split(" ").length <= 2 && s.offsetWidth < 80) return false;
        if (isHeadingSize) return false;
        if (isBold) return true;
        if (t.length <= 2) return false;
        if (s.offsetWidth < 15) return false;

        return true;
      })
      .map((s) => ({ el: s, text: s.textContent, rect: s.getBoundingClientRect() }));

    if (!spans.length) return;

    clusterLines(spans).forEach((line) => {
      const concat = line.spans.map((s) => s.text).join(" ");
      const lower  = normalizeEnglish(concat);
      const prefix = [];
      let acc = 0;
      line.spans.forEach((s) => {
        prefix.push(acc);
        acc += s.text.length + 1;
      });

      const mweRanges = [];
      preparedTermsRef.current
        .filter((t) => t.isMwe && !highlightedTerms.has(t.text))
        .forEach((t) => {
          const m = new RegExp(`\\b${escapeRegex(t.text)}\\b`, "gi").exec(lower);
          if (m) mweRanges.push({ start: m.index, end: m.index + t.text.length });
        });

      const inMwe = (s, e) => mweRanges.some((r) => s >= r.start && e <= r.end);

      preparedTermsRef.current.forEach((term) => {
        if (highlightedTerms.has(term.text)) return;

        const safe = escapeRegex(term.text || "").trim();
        if (!safe) return;

        const regex = new RegExp(`\\b${safe}\\b`, "gi");
        const match = regex.exec(lower);

        if (!match) return;

        const si = match.index;
        const ei = si + term.text.length;

        if (!term.isMwe && inMwe(si, ei)) return;

        highlightedTerms.add(term.text);

        createOverlays(pageRect, oc, line.spans, prefix, si, ei, term);
      });
    });
  }

  function createOverlays(pageRect, oc, spans, prefix, si, ei, term) {
    if (isReadModeRef.current) return;
    if (isTermHighlightingDisabled()) return;

    spans.forEach((span, i) => {
      const ss = prefix[i];
      const se = ss + span.text.length;

      const os = Math.max(si, ss);
      const oe = Math.min(ei, se);
      if (os >= oe) return;

      const node = span.el.firstChild;
      if (!node) return;

      const rng = document.createRange();
      rng.setStart(node, os - ss);
      rng.setEnd(node, oe - ss);

      [...rng.getClientRects()].forEach((r) => {
        const key = `${term.text}_${Math.round(r.left)}_${Math.round(r.top)}`;
        if (drawnHighlightsRef.current.has(key)) return;
        drawnHighlightsRef.current.add(key);

        const div = document.createElement("div");
        div.className = "term-highlight-overlay";

        Object.assign(div.style, {
          position:   "absolute",
          left:       `${r.left - pageRect.left}px`,
          top:        `${r.top - pageRect.top}px`,
          width:      `${r.width}px`,
          height:     `${r.height}px`,
          background: term.isMwe
            ? "rgba(255,105,180,0.45)"
            : term.isNer
            ? "rgba(0,120,255,0.45)"
            : "rgba(255,230,0,0.35)",
          borderRadius: "2px",
          zIndex:      20,
          pointerEvents: "auto",
          mixBlendMode: "multiply",
        });

        div.title = term.isMwe
          ? "Multi-word Expression"
          : term.isNer
          ? "Named Entity"
          : "Domain Term";

        div.onclick = () =>
          window.onPdfTermClick && window.onPdfTermClick(term.raw);

        oc.appendChild(div);
      });

      rng.detach();
    });
  }

  /* ---------------- AUTO-DETECT PRINTED PAGE NUMBERS ---------------- */
  function detectPrintedPageNumbers(totalPages) {
    const pages = [...document.querySelectorAll(".react-pdf__Page")]
    .sort((a, b) => {
      return (
        parseInt(a.dataset.pageNumber) - parseInt(b.dataset.pageNumber)
      );
    });
    if (!pages.length) return;

    const pageIntegers = {};

    pages.forEach((pageEl) => {
      const fileIdx = parseInt(pageEl.dataset.pageNumber || "0");
      if (!fileIdx) return;
      const tl = pageEl.querySelector(".react-pdf__Page__textContent");
      if (!tl) return;

      const nums = new Set();
      [...tl.querySelectorAll("span")].forEach((s) => {
        const text = (s.textContent || "").trim();
        if (!/^\d+$/.test(text)) return;
        const n = parseInt(text, 10);
        if (n >= 1 && n <= 9999) nums.add(n);
      });
      pageIntegers[fileIdx] = nums;
    });

    const fileIndices = Object.keys(pageIntegers).map(Number).sort((a, b) => a - b);
    if (fileIndices.length < 3) return;

    const firstIdx = fileIndices[0];
    let bestOffset = null;
    let bestScore  = 0;

    for (const candidate of pageIntegers[firstIdx]) {
      const offset = firstIdx - candidate;
      let score = 1;

      for (let i = 1; i < fileIndices.length; i++) {
        const fi       = fileIndices[i];
        const expected = fi - offset;
        if (expected < 1) { score = 0; break; }
        if (pageIntegers[fi] && pageIntegers[fi].has(expected)) {
          score++;
        } else {
          score--;
        }
      }

      if (score > bestScore) {
        bestScore  = score;
        bestOffset = offset;
      }
    }

    if (bestOffset === null || bestScore < Math.max(2, fileIndices.length * 0.5)) return;

    const map = {};
    for (let i = 1; i <= totalPages; i++) {
      const printed = i - bestOffset;
      if (printed > 0) map[i] = printed;
    }
    pageLabelsRef.current = map;
  }

  /* ---------------- PIN MARKER ---------------- */
  function renderPinMarker() {
    if (!pinPosition || !numPages) return null;
    return (
      <div className="reading-pin-marker" style={{ position: "absolute", left: "-40px", top: `${pinPosition.yOffset}px`, zIndex: 50 }}>
        <div className="pin-icon">📌</div>
        <div className="pin-label">Read up to here</div>
      </div>
    );
  }

  /* ---------------- RENDER ---------------- */
  return (
    <div
      ref={containerRef}
      className={`pdf-viewer-scroll ${
        selectedView === "Sentence" ? "sentence-mode" : ""
      }`}
    >
      {showHighlightHint && (
        <div className="highlight-hint-banner">
          <div className="hint-icon-wrap"><span className="hint-icon">✦</span></div>
          <div className="hint-body">
            <span className="hint-title">Terms are interactive</span>
            <span className="hint-sub">Click any highlighted word to view its definition</span>
          </div>
          <div className="hint-arrow">→</div>
          <div className="hint-progress" />
        </div>
      )}

      {isPinMode && (
        <div className="pin-mode-hint" style={{ top: `${containerRef.current?.scrollTop + containerRef.current?.clientHeight / 2}px` }}>
          📌 Click anywhere on the PDF to place your reading marker
        </div>
      )}

      {isReadMode && hoverState && selectedView === "Word" && (
        <div className="read-mode-hint" style={{ position: "fixed", left: hoverState.x + 12, top: hoverState.y + 12, zIndex: 9999 }}>
          {hoverState.term.isMwe ? "📖 Multi-word Expression"
          : hoverState.term.isNer ? "📖 Named Entity"
          : "📖 Domain Term"}— Click to view definition
        </div>
      )}

      {!isReadMode && hlHoverState && selectedView === "Word" && (
        <div style={{
          position:     "fixed",
          left:         hlHoverState.x + 14,
          top:          hlHoverState.y + 14,
          zIndex:       9999,
          background:   "rgba(20,20,20,0.92)",
          color:        "#fff",
          padding:      "6px 12px",
          borderRadius: "6px",
          fontSize:     "12px",
          pointerEvents: "none",
          boxShadow:    "0 2px 10px rgba(0,0,0,0.35)",
          display:      "flex",
          alignItems:   "center",
          gap:          "6px",
          maxWidth:     280,
        }}>
          <span>{hlHoverState.term.isMwe ? "🔵" : hlHoverState.term.isNer ? "🟢" : "🟡"}</span>
          <span>
            <strong>{hlHoverState.term.raw?.name || hlHoverState.term.raw?.rawName}</strong>
            {" — "}Click to view definition &amp; all pages
          </span>
        </div>
      )}

      {pinPosition && !isPinMode && (
        <div className="pin-marker-container">{renderPinMarker()}</div>
      )}

      {file && pageWidth > 0 && (
        <PdfDocument
          file={file}
          numPages={numPages}
          pageWidth={pageWidth}
          onLoadSuccess={onDocumentLoadSuccess}
        />
      )}
    </div>
  );
}