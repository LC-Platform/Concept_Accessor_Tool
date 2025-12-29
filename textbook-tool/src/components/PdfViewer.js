import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "../components/styles/ModernLayout.css";
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
   WORD BOUNDARY
--------------------------------------------------------- */
function isBoundaryChar(ch) {
  return !ch || /[^a-zA-Z]/.test(ch);
}
function isValidWordBoundary(concat, startIdx, endIdx) {
  const before = concat[startIdx - 1];
  const after = concat[endIdx];
  return isBoundaryChar(before) && isBoundaryChar(after);
}

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
  // Backend base URL (match AnalysisPanel)
  const BASE_URL = "http://10.2.8.12:8500";

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
    scheduleHighlight(500);
  };

  /* Drive highlighting on key changes */
  useEffect(() => {
    scheduleHighlight(500);
  }, [file, terms, selectedView, numPages, sectionIds]);

  /* Reset cache on Word tab */
  useEffect(() => {
    if (selectedView === "Word") {
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
  function scheduleHighlight(delay = 400) {
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
        if (selectedView === "Word") pages.forEach(highlightTermsOnPage);
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

    const overlayContainer = ensureOverlayContainer(pageEl, 10);
    const pageRect = pageEl.getBoundingClientRect();

    const rawSpans = [...textLayer.querySelectorAll("span")].filter(
      (s) => (s.textContent || "").trim()
    );

    const spans = rawSpans.map((s) => {
      const style = window.getComputedStyle(s);
      return {
        el: s,
        textRaw: s.textContent || "",
        textTrimmed: (s.textContent || "").trim(),
        rect: s.getBoundingClientRect(),
        fontSize: parseFloat(style.fontSize) || 12,
        fontWeight: parseInt(style.fontWeight) || 400,
        lineHeight: parseFloat(style.lineHeight) || 0,
      };
    });
    if (!spans.length) return;

    const lines = clusterLines(spans);

    // label/caption skip
    const captionSkip = new Set();
    const labelLines = new Set();
    lines.forEach((ln, i) => {
      if (looksLikeFigureOrTableLabel(ln)) {
        labelLines.add(i);
        captionSkip.add(i);
        if (i + 1 < lines.length) captionSkip.add(i + 1);
        if (i + 2 < lines.length) captionSkip.add(i + 2);
      }
    });

    // heading skip
    const headingSkip = new Set();
    lines.forEach((ln, i) => {
      if (looksLikeHeading(ln)) headingSkip.add(i);
    });

    // table detection
    const tableBlocks = detectTableBlocks(lines);

    // Heuristic: detect single-line table-like rows (e.g., table header rows or small tabular lines)
    // and skip highlighting on those lines to avoid noisy highlights inside tables
    const singleLineTable = new Set();
    lines.forEach((ln, i) => {
      const cols = clusterColumns(ln, 8);
      const avgSpanWidth = ln.spans.reduce((a, s) => a + (s.rect?.width || 0), 0) / Math.max(1, ln.spans.length);
      // If there are multiple column clusters or very narrow columns, treat as table row
      if (cols.length >= 3 && (ln.fontSizeAvg || 0) <= 16) singleLineTable.add(i);
      else if (ln.spans.length >= 3 && avgSpanWidth < (pageRect.width || 800) / 6 && (ln.fontSizeAvg || 0) <= 16) singleLineTable.add(i);
    });

    // Margin/side-heading heuristic: compute median left of spans and skip short lines that sit in page margins
    const marginSkip = new Set();
    try {
      const allLefts = spans.map((s) => s.rect.left).sort((a, b) => a - b);
      const medianLeft = allLefts.length ? allLefts[Math.floor(allLefts.length / 2)] : 0;
      const pageW = pageRect.width || 800;
      lines.forEach((ln, i) => {
        const avgLeft = ln.spans.reduce((a, s) => a + (s.rect.left || 0), 0) / Math.max(1, ln.spans.length);
        const txtLen = (ln.text || "").trim().length;
        // short lines in far-left or far-right margin -> likely side heading/label
        if (txtLen > 0 && txtLen < 40 && (avgLeft < Math.max(10, medianLeft - 60) || avgLeft > Math.min(pageW - 40, medianLeft + 200))) {
          marginSkip.add(i);
        }
        // also if very short and entirely near right edge
        if (txtLen > 0 && txtLen < 20 && avgLeft > pageW - 80) marginSkip.add(i);
      });
    } catch (e) {
      // fall back silently if geometry unavailable
      console.warn("Margin heuristic failed:", e);
    }

    // terms
    const termList = preparedTermsRef.current
      .map((t) => {
        const rawName = t.raw?.name || t.raw?.rawName || t.originalName || "";
        const termLower = rawName.toLowerCase().trim() || t.key;
        return { pterm: t, termLower };
      })
      .filter((x) => x.termLower);

    const highlightedOnce = new Set();

    // iterate lines
    lines.forEach((line, lineIdx) => {
      const text = line.text;
      if (headingSkip.has(lineIdx)) return;
      if (captionSkip.has(lineIdx)) return;
      if (labelLines.has(lineIdx)) return;
      if (lineInAnyBlock(lineIdx, tableBlocks)) return;
      if (singleLineTable.has(lineIdx)) return; // skip suspected single-line table rows
      if (marginSkip.has(lineIdx)) return; // skip margin/side headings
      if (SECTION_HEADING_RE.test(text)) return; // numbered section headings

      const lineSpans = line.spans;
      if (!lineSpans.length) return;

      const concat = lineSpans.map((s) => s.textRaw).join("");
      const concatLower = concat.toLowerCase();

      const prefix = [];
      let acc = 0;
      for (let i = 0; i < lineSpans.length; i++) {
        prefix.push(acc);
        acc += lineSpans[i].textRaw.length;
      }

      const covered = [];

      termList.forEach(({ pterm, termLower }) => {
        if (highlightedOnce.has(pterm.key)) return;

        let idx = concatLower.indexOf(termLower);
        let found = -1;
        while (idx !== -1) {
          const end = idx + termLower.length;
          if (isValidWordBoundary(concat, idx, end)) {
            found = idx;
            break;
          }
          idx = concatLower.indexOf(termLower, idx + 1);
        }
        if (found === -1) return;

        const endPos = found + termLower.length;

        const overlaps = covered.some(([a, b]) => !(endPos <= a || found >= b));
        if (overlaps) return;

        createSubstringOverlaysForRange(
          pageRect,
          overlayContainer,
          lineSpans,
          prefix,
          found,
          endPos,
          pterm
        );

        covered.push([found, endPos]);
        highlightedOnce.add(pterm.key);
      });
    });
  }

  function createSubstringOverlaysForRange(
    pageRect,
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
      if (localStart < 0 || localEnd > node.textContent.length) continue;

      const range = document.createRange();
      range.setStart(node, localStart);
      range.setEnd(node, localEnd);

      const rects = range.getClientRects ? [...range.getClientRects()] : [];
      rects.forEach((r) => {
        const overlay = document.createElement("div");

        // Detect whether this term has any extra resources (definition, image, video, concept map, structure, audio)
        const raw = pterm.raw || {};

        // Helper to determine if a string-like field contains useful information
        const isMeaningfulString = (v) => {
          if (v === null || v === undefined) return false;
          const s = String(v).trim();
          if (!s) return false;
          const lower = s.toLowerCase();
          const blacklist = [
            "definition not found",
            "not found",
            "no definition",
            "no definition available",
            "unable to find",
            "not available",
            "none",
            "n/a",
            "—",
            "-",
            "no summary available",
            "no summary",
            "image not found",
            "no image",
            "video not available",
            "placeholder",
          ];
          for (const b of blacklist) if (lower.includes(b)) return false;
          return true;
        };

        // Heuristic to detect whether a value likely points to a media resource
        const isLikelyMedia = (v) => {
          if (v === null || v === undefined) return false;
          if (Array.isArray(v)) return v.some(isLikelyMedia);
          if (!isMeaningfulString(v)) return false;
          const s = String(v).trim().toLowerCase();

          // Data URIs
          if (s.startsWith('data:image') || s.startsWith('data:video') || s.startsWith('data:audio')) return true;

          // Common URL patterns
          if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('//') || s.startsWith('/')) return true;

          // File-like strings with known extensions
          if (/(\.(png|jpg|jpeg|gif|svg|webp|bmp|tiff))(\?.*)?$/.test(s)) return true;
          if (/(\.(mp4|webm|ogg|mov|avi|mkv))(\?.*)?$/.test(s)) return true;
          if (/(\.(mp3|wav|ogg|m4a|flac))(\?.*)?$/.test(s)) return true;

          // Contains base64 marker
          if (s.includes('base64,')) return true;

          return false;
        };

        const hasDefinition = isMeaningfulString(raw.definition);
        // Only count as available if explicitly in term object (from API response)
        // Check multiple possible field name variants for each resource type
        const hasLabelledImage = (Array.isArray(raw.images) && raw.images.some(isLikelyMedia)) || isLikelyMedia(raw.labelled_img) || isLikelyMedia(raw.labelled_image) || isLikelyMedia(raw.labelledImage) || isLikelyMedia(raw.image) || isLikelyMedia(raw.image_url) || isLikelyMedia(raw.imageUrl);
        const hasVideo = isLikelyMedia(raw.video) || isLikelyMedia(raw.video_url) || isLikelyMedia(raw.videoUrl) || isLikelyMedia(raw.process_video) || isLikelyMedia(raw.processVideo) || isLikelyMedia(raw.process_video_url) || isLikelyMedia(raw.processVideoUrl);
        const hasTaxonomy = isLikelyMedia(raw.taxonomy_image) || isLikelyMedia(raw.taxonomyImage) || isLikelyMedia(raw.taxonomyImg) || isLikelyMedia(raw.taxonomy) || isLikelyMedia(raw.taxonomy_image_url) || isLikelyMedia(raw.taxonomyImageUrl) || isLikelyMedia(raw.concept_map) || isLikelyMedia(raw.conceptMap);
        const hasStructure = raw.word_structure && Object.keys(raw.word_structure || {}).length > 0;
        const hasAudio = isLikelyMedia(raw.audio_binary) || isLikelyMedia(raw.audio_url) || isLikelyMedia(raw.audioUrl) || isLikelyMedia(raw.audio);
        const hasExtra = !!(hasDefinition || hasLabelledImage || hasVideo || hasTaxonomy || hasStructure || hasAudio);

        overlay.className = "term-highlight-overlay" + (hasExtra ? " has-data" : " no-data");

        Object.assign(overlay.style, {
          position: "absolute",
          left: `${r.left - pageRect.left}px`,
          top: `${r.top - pageRect.top}px`,
          width: `${r.width}px`,
          height: `${r.height}px`,
          borderRadius: "2px",
          cursor: "pointer",
          zIndex: 20,
          pointerEvents: "auto",
          background: hasExtra ? "rgba(255,255,0,0.4)" : "rgba(160,160,160,0.28)",
        });

        const available = [];
        if (hasDefinition) available.push("definition");
        if (hasLabelledImage) available.push("image");
        if (hasVideo) available.push("video");
        if (hasTaxonomy) available.push("concept map");
        if (hasStructure) available.push("structure");
        if (hasAudio) available.push("audio");

        overlay.title = available.length ? `Available: ${available.join(', ')}` : 'No definition/image/video/concept map available';
        overlay.setAttribute('data-available', available.length ? available.join(',') : 'none');

        overlay.onclick = () => {
          if (window.onPdfTermClick) window.onPdfTermClick(pterm.raw);
        };

        // On hover, verify server-side media availability if needed (cached per-domain_id)
        overlay.onmouseenter = async () => {
          overlay.style.background = hasExtra ? "rgba(255,235,59,0.6)" : "rgba(150,150,150,0.36)";

          const domainId = pterm.raw?.domain_id || pterm.raw?.id || pterm.raw?.domain;
          if (!domainId) return;

          // If we already checked earlier, update title from cache and skip network
          const cached = mediaAvailabilityRef.current[domainId];
          if (cached) {
            const available = [];
            if (hasDefinition) available.push("definition");
            if (cached.hasLabelledImage || hasLabelledImage) available.push("image");
            if (cached.hasVideo || hasVideo) available.push("video");
            if (hasTaxonomy) available.push("concept map");
            if (hasStructure) available.push("structure");
            if (hasAudio) available.push("audio");
            overlay.title = available.length ? `Available: ${available.join(", ")}` : 'No definition/image/video/concept map available';
            overlay.setAttribute('data-available', available.length ? available.join(',') : 'none');
            return;
          }

          // Only perform checks if the term object did not already confidently indicate resources
          try {
            // Quick visual feedback
            overlay.title = 'Checking media availability...';

            // Helper: try HEAD first, fall back to a small GET (Range 0-0) if HEAD returns 405 or fails
            const checkUrlExists = async (u) => {
              try {
                const h = await fetch(u, { method: 'HEAD' });
                if (h.ok) return true;
                if (h.status === 405) {
                  // server doesn't allow HEAD -> try small GET
                  const g = await fetch(u, { method: 'GET', headers: { Range: 'bytes=0-0' } });
                  return !!g.ok;
                }
                return false;
              } catch (e) {
                try {
                  const g = await fetch(u, { method: 'GET', headers: { Range: 'bytes=0-0' } });
                  return !!g.ok;
                } catch (e2) {
                  return false;
                }
              }
            };

            const [imgOk, vidOk] = await Promise.all([
              checkUrlExists(`${BASE_URL}/image/${domainId}`),
              checkUrlExists(`${BASE_URL}/video/${domainId}`),
            ]);

            mediaAvailabilityRef.current[domainId] = { hasLabelledImage: !!imgOk, hasVideo: !!vidOk };

            const available = [];
            if (hasDefinition) available.push("definition");
            if (imgOk || hasLabelledImage) available.push("image");
            if (vidOk || hasVideo) available.push("video");
            if (hasTaxonomy) available.push("concept map");
            if (hasStructure) available.push("structure");
            if (hasAudio) available.push("audio");

            overlay.title = available.length ? `Available: ${available.join(", ")}` : 'No definition/image/video/concept map available';
            overlay.setAttribute('data-available', available.length ? available.join(',') : 'none');
          } catch (err) {
            // keep previous title if check fails
            console.warn('Media availability check failed', err);
          }
        };

        overlay.onmouseleave = () => (overlay.style.background = hasExtra ? "rgba(255,255,0,0.4)" : "rgba(160,160,160,0.28)");

        overlayContainer.appendChild(overlay);
      });

      range.detach?.();
    }
  }

  /* ---------------------------------------------------------
     SECTION ID HIGHLIGHT
  --------------------------------------------------------- */
  function highlightSectionIdsOnPage(pageEl) {
    const textLayer = pageEl.querySelector(".react-pdf__Page__textContent");
    if (!textLayer) return;

    const overlayContainer = ensureOverlayContainer(pageEl, 15);
    const pageRect = pageEl.getBoundingClientRect();
    const domSpans = [...textLayer.querySelectorAll("span")];
    if (!domSpans.length) return;

    // Build lightweight span objects suitable for clustering
    const spanObjs = domSpans.map((s) => ({
      el: s,
      rect: s.getBoundingClientRect(),
      textTrimmed: (s.textContent || "").trim(),
      textRaw: s.textContent || "",
      fontSize: parseFloat(window.getComputedStyle(s).fontSize || 12),
    }));

    const lines = clusterLines(spanObjs);

    // Skip table blocks / figure labels like we do elsewhere
    const tableBlocks = detectTableBlocks(lines);
    const labelLines = new Set();
    lines.forEach((ln, i) => {
      if (looksLikeFigureOrTableLabel(ln)) {
        labelLines.add(i);
        if (i + 1 < lines.length) labelLines.add(i + 1);
      }
    });

    // Helper: does this line look like a section heading for this sid?
    const isLineSectionHeading = (ln, sid) => {
      if (!ln || !ln.text) return false;
      const txt = ln.text.trim();
      // Direct numbered heading (e.g., "2.1 Title")
      if (SECTION_HEADING_RE.test(txt) && txt.startsWith(sid)) return true;
      // If line starts with the sid then a title follows (sid + space + TitleCase)
      const re = new RegExp(`^\\s*${sid}\\s+[A-Z]`);
      if (re.test(ln.text)) return true;
      // If the first span is exactly the sid and the next span appears like a title
      if (ln.spans.length > 1 && ln.spans[0].textTrimmed === sid) {
        const next = ln.spans[1].textTrimmed || "";
        if (/^[A-Z]/.test(next.trim())) return true;
      }
      return false;
    };

    // Iterate lines and only highlight section ids when line appears to be a heading
    lines.forEach((ln, lineIdx) => {
      if (!ln || !ln.text) return;
      if (labelLines.has(lineIdx)) return;
      if (lineInAnyBlock(lineIdx, tableBlocks)) return; // skip table rows / blocks

      const lineText = ln.text.trim();
      preparedSectionIdsRef.current.forEach((sid) => {
        // Exact match in this line or heading-like match
        if (lineText === sid || isLineSectionHeading(ln, sid) || lineText.startsWith(sid + " ")) {
          // Find span within this line that contains the sid (prefer exact match)
          let targetSpan = ln.spans.find((s) => s.textTrimmed === sid) || ln.spans.find((s) => s.textTrimmed.includes(sid));
          if (!targetSpan) targetSpan = ln.spans[0];

          const r = targetSpan.rect || targetSpan.el?.getBoundingClientRect();
          if (!r) return;

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
            if (window.onSectionIdClick) window.onSectionIdClick(sid);
          };
          overlay.onmouseenter = () => (overlay.style.background = "rgba(255,220,0,0.7)");
          overlay.onmouseleave = () => (overlay.style.background = "rgba(255,200,0,0.5)");

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
