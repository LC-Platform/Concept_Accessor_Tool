// import React, { useState, useEffect } from "react";
// import PdfViewer from "./PdfViewer";
// import ReadingPanel from "./ReadingPanel";
// import AnalysisPanel from "./AnalysisPanel";
// import "./ModernLayout.css";

// const BASE_URL = "http://10.2.8.12:8500";

// function normalizeStringForMatch(s = "") {
//   // Unicode normalize and strip non-alphanumeric (keep basic numbers/letters)
//   return s
//     .normalize("NFD")
//     .replace(/[\u0300-\u036f]/g, "") // remove diacritics
//     .replace(/[^a-zA-Z0-9]/g, "")
//     .toLowerCase();
// }

// export default function ConceptLayout({ uploadedFile }) {
//   const [chapterId, setChapterId] = useState(null);
//   const [chapterText, setChapterText] = useState("");
//   const [terms, setTerms] = useState([]);
//   const [selectedTerm, setSelectedTerm] = useState(null);
//   const [selectedSentence, setSelectedSentence] = useState(null);
//   const [summary, setSummary] = useState("");
//   const [selectedView, setSelectedView] = useState("Word");
//   const [pdfUrl, setPdfUrl] = useState(null);
//   const [chapterTitle, setChapterTitle] = useState("");

//   useEffect(() => {
//     if (uploadedFile) handleUpload(uploadedFile);
//   }, [uploadedFile]);

//   useEffect(() => {
//     window.onPdfTermClick = (term) => {
//       setSelectedTerm(term);
//       setSelectedView("Word");
//     };
//     return () => {
//       window.onPdfTermClick = null;
//     };
//   }, []);

//   /** Upload and process PDF */
//   const handleUpload = async (file) => {
//     try {
//       const fileUrl = URL.createObjectURL(file);
//       setPdfUrl(fileUrl);

//       const name = file.name.replace(".pdf", "");
//       const parts = name.split("_");
//       const title = parts[parts.length - 1];
//       setChapterTitle(title.charAt(0).toUpperCase() + title.slice(1));

//       const formData = new FormData();
//       formData.append("pdf", file);

//       const res = await fetch(`${BASE_URL}/read-pdf/`, {
//         method: "POST",
//         body: formData,
//       });

//       if (!res.ok) throw new Error("Upload failed");
//       const data = await res.json();
//       setChapterId(data.chapter_id);
//       if (data.text) setChapterText(data.text);

//       await fetchTerms(data.chapter_id);
//       await fetchSummary(data.chapter_id);
//     } catch (err) {
//       console.error("❌ Error uploading file:", err);
//     }
//   };

//   /** Fetch extracted domain terms and normalize them for robust matching */
//   const fetchTerms = async (chapterId) => {
//     try {
//       const res = await fetch(`${BASE_URL}/extract-domain-terms/`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ chapter_id: chapterId }),
//       });
//       const data = await res.json();

//       const processed = (data.terms || []).map((t) => {
//         // Prefer explicit name, fallback to tokens_with_pos
//         const rawName = t.name || (t.tokens_with_pos && t.tokens_with_pos.join(" ")) || "";
//         const normalized = normalizeStringForMatch(rawName);

//         // For display we keep original name
//         // Also keep additional normalized forms for fuzzy / multi-token matching
//         const tokensNormalized = (t.tokens_with_pos || [])
//           .map((tk) => normalizeStringForMatch(String(tk)))
//           .filter(Boolean);

//         return {
//           ...t,
//           rawName,
//           normalized,
//           tokensNormalized,
//         };
//       });

//       setTerms(processed);
//     } catch (err) {
//       console.error("❌ Error fetching terms:", err);
//     }
//   };

//   /** Fetch full chapter summary */
//   const fetchSummary = async (chapterId) => {
//     try {
//       const res = await fetch(`${BASE_URL}/full-summary/`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ chapter_id: chapterId }),
//       });
//       const data = await res.json();
//       setSummary(data.full_summary || "");
//     } catch (err) {
//       console.error("❌ Error fetching summary:", err);
//     }
//   };

//   return (
//     <div className="concept-layout">
//       <div className="concept-main">
//         {/* LEFT: PDF Viewer + Reading Panel */}
//         <div className="concept-left">
//           <div className="reading-card">
//             {/* Top tabs */}
//             <h2 className="chapter-name">
//               {chapterTitle ? chapterTitle : "Untitled Chapter"}
//             </h2>
//             <div className="view-toggle top-tabs">
//               {["Word", "Sentence", "Summary", "Q/A"].map((v) => (
//                 <button
//                   key={v}
//                   className={`toggle-btn ${selectedView === v ? "active" : ""}`}
//                   onClick={() => setSelectedView(v)}
//                 >
//                   {v}
//                 </button>
//               ))}
//             </div>

//             <div className="pdf-viewer-wrapper">
//               {pdfUrl ? (
//                 <div className="pdf-viewer-container">
//                   <PdfViewer
//                     file={pdfUrl}
//                     terms={terms}
//                     selectedView={selectedView}
//                   />
//                 </div>
//               ) : (
//                 <div className="pdf-placeholder">Upload a PDF to view</div>
//               )}
//             </div>

//             <ReadingPanel
//               text={chapterText}
//               terms={terms}
//               selectedView={selectedView}
//               onTermClick={setSelectedTerm}
//               onSentenceSelect={setSelectedSentence}
//             />
//           </div>
//         </div>

//         {/* RIGHT: Analysis Panel */}
//         <div className="concept-right">
//           <div className="analysis-card">
//             <AnalysisPanel
//               selectedTerm={selectedTerm}
//               selectedSentence={selectedSentence}
//               summary={summary}
//               chapterId={chapterId}
//               selectedView={selectedView}
//             />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


import React, { useState, useEffect } from "react";
import PdfViewer from "./PdfViewer";
import ReadingPanel from "./ReadingPanel";
import AnalysisPanel from "./AnalysisPanel";
import "./ModernLayout.css";

const BASE_URL = "http://10.2.8.12:8500";

function normalizeStringForMatch(s = "") {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

export default function ConceptLayout({ uploadedFile }) {
  const [chapterId, setChapterId] = useState(null);
  const [chapterText, setChapterText] = useState("");
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [selectedSentence, setSelectedSentence] = useState(null);
  const [summary, setSummary] = useState("");
  const [selectedView, setSelectedView] = useState("Word");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [chapterTitle, setChapterTitle] = useState("");
  const [sectionIds, setSectionIds] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedWordText, setSelectedWordText] = useState("");

  useEffect(() => {
    if (uploadedFile) handleUpload(uploadedFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedFile]);

  useEffect(() => {
    window.onPdfTermClick = (term) => {
      setSelectedTerm(term);
      setSelectedWordText(term?.name || term?.rawName || "");
      setSelectedView("Word");
    };
    // section id click handler
    window.onSectionIdClick = (sectionId) => {
      setSelectedSectionId(sectionId);
      setSelectedView("Summary");
    };

    return () => {
      window.onPdfTermClick = null;
      window.onSectionIdClick = null;
    };
  }, []);

  /** Upload and process PDF */
  const handleUpload = async (file) => {
    try {
      const fileUrl = URL.createObjectURL(file);
      setPdfUrl(fileUrl);

      const name = file.name.replace(".pdf", "");
      const parts = name.split("_");
      const title = parts[parts.length - 1];
      setChapterTitle(title.charAt(0).toUpperCase() + title.slice(1));

      const formData = new FormData();
      formData.append("pdf", file);

      const res = await fetch(`${BASE_URL}/read-pdf/`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setChapterId(data.chapter_id);
      if (data.text) setChapterText(data.text);

      // store section ids if provided
      setSectionIds(data.section_ids || []);

      await fetchTerms(data.chapter_id);
      await fetchSummary(data.chapter_id);
    } catch (err) {
      console.error("❌ Error uploading file:", err);
    }
  };

  /** Fetch extracted domain terms and normalize them for robust matching */
  const fetchTerms = async (chapterId) => {
    try {
      const res = await fetch(`${BASE_URL}/extract-domain-terms/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_id: chapterId }),
      });
      const data = await res.json();

      const processed = (data.terms || []).map((t) => {
        const rawName = t.name || (t.tokens_with_pos && t.tokens_with_pos.join(" ")) || "";
        const normalized = normalizeStringForMatch(rawName);
        const tokensNormalized = (t.tokens_with_pos || [])
          .map((tk) => normalizeStringForMatch(String(tk)))
          .filter(Boolean);

        return {
          ...t,
          rawName,
          normalized,
          tokensNormalized,
        };
      });

      setTerms(processed);
    } catch (err) {
      console.error("❌ Error fetching terms:", err);
    }
  };

  /** Fetch full chapter summary (kept for other uses) */
  const fetchSummary = async (chapterId) => {
    try {
      const res = await fetch(`${BASE_URL}/full-summary/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_id: chapterId }),
      });
      const data = await res.json();
      setSummary(data.full_summary || "");
    } catch (err) {
      console.error("❌ Error fetching summary:", err);
    }
  };

  return (
    <div className="concept-layout">
      <div className="concept-main">
        {/* LEFT: PDF Viewer + Reading Panel */}
        <div className="concept-left">
          <div className="reading-card">
            {/* Top tabs */}
            <h2 className="chapter-name">
              {chapterTitle ? chapterTitle : "Untitled Chapter"}
            </h2>
            <div className="view-toggle top-tabs">
              {["Word", "Sentence", "Summary", "Q/A"].map((v) => (
                <button
                  key={v}
                  className={`toggle-btn ${selectedView === v ? "active" : ""}`}
                  onClick={() => setSelectedView(v)}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="pdf-viewer-wrapper">
              {pdfUrl ? (
                <div className="pdf-viewer-container">
                  <PdfViewer
                    file={pdfUrl}
                    terms={terms}
                    selectedView={selectedView}
                    sectionIds={sectionIds}
                  />
                </div>
              ) : (
                <div className="pdf-placeholder">Upload a PDF to view</div>
              )}
            </div>

            <ReadingPanel
              text={chapterText}
              terms={terms}
              selectedView={selectedView}
              onTermClick={setSelectedTerm}
              onSentenceSelect={setSelectedSentence}
            />
          </div>
        </div>

        {/* RIGHT: Analysis Panel */}
        <div className="concept-right">
          <div className="analysis-card">
            <AnalysisPanel
              selectedTerm={selectedTerm}
              selectedWordText={selectedWordText}
              selectedSentence={selectedSentence}
              summary={summary}
              chapterId={chapterId}
              selectedView={selectedView}
              selectedSectionId={selectedSectionId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
  