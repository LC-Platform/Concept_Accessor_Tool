import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./components/HomePage";
import ConceptLayout from "./components/ConceptLayout";
import "./components/ModernLayout.css";

function App() {
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleUpload = (file) => {
    setUploadedFile(file);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage onUpload={handleUpload} />} />
        <Route
          path="/analyze"
          element={<ConceptLayout uploadedFile={uploadedFile} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
