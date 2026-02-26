import React from "react";
import {
  FaBook,
  FaFileAlt,
  FaVideo,
  FaImage,
  FaMouse,
  FaInfoCircle,
  FaUpload,
  FaVolumeUp,
} from "react-icons/fa";

export default function PdfViewerNavbar({
  onFileUpload,
  onFullSummaryClick,
  onSectionSummaryClick,
  onTranslateClick,
  onVideoClick,
  onImageClick,
  onAudioClick,
  onTextSelectionClick,
  textSelectionMode,
}) {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) onFileUpload(file);
  };

  return (
    <nav className="pdf-navbar">
      <div className="left-section">
        <label className="btn-icon" title="Upload PDF">
          <FaUpload />
          <input
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </label>
        <button className="btn-icon" title="User Guide">
          <FaBook />
        </button>
      </div>

      <div className="right-section">
        <button
          className={`btn-icon ${textSelectionMode ? "active" : ""}`}
          title="Select Text"
          onClick={onTextSelectionClick}
        >
          <FaMouse />
        </button>
        <button className="btn-icon" title="Full Summary" onClick={onFullSummaryClick}>
          <FaFileAlt />
        </button>
        <button className="btn-icon" title="Section Summary" onClick={onSectionSummaryClick}>
          <FaInfoCircle />
        </button>
        <button className="btn-icon" title="Translate Summary" onClick={() => onTranslateClick("tel")}>
          🌐
        </button>
        <button className="btn-icon" title="Play Audio" onClick={onAudioClick}>
          <FaVolumeUp />
        </button>
        <button className="btn-icon" title="Images" onClick={onImageClick}>
          <FaImage />
        </button>
        <button className="btn-icon" title="Videos" onClick={onVideoClick}>
          <FaVideo />
        </button>
      </div>
    </nav>
  );
}
