// App.js (with enhanced 404 page)
import React from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import HomePage from "./pages/e-reader/HomePage";
import ConceptLayout from "./pages/e-reader/ConceptLayout";
import AboutPage from "./pages/e-reader/AboutPage";
import ContactPage from "./pages/e-reader/ContactPage";
import HowItWorksPage from "./pages/e-reader/HowItWorksPage";
import LegalPage from "./pages/e-reader/LegalPage";
import "./styles/ModernLayout.css";
import LoginPage from "./pages/e-reader/LoginPage";
import SignupPage from "./pages/e-reader/SignupPage";
import ForgotPassword from "./pages/e-reader/ForgotPassword";
import VerifyResetCode from "./pages/e-reader/VerifyResetCode";
import ResetPassword from "./pages/e-reader/ResetPassword";
import ProfilePage from "./pages/e-reader/ProfilePage";
import ChapterListPage from "./pages/e-reader/ChapterList";
import ProtectedRoute from "./auth/ProtectedRoute";
import SubjectSelectionPage from "./pages/e-reader/SubjectSelectionPage";
import GamesAssessment from "./pages/games/GamesAssessment";


function App() {
 
  
  return (
    <Router basename="/bioereaderfe/">
      <Routes>
        {/* Main Pages */}
        <Route path="/" element={<HomePage />} />
        <Route
          path="/subjects"
          element={
            <ProtectedRoute>
              <SubjectSelectionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chapters"
          element={
            <ProtectedRoute>
              <ChapterListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analyze/:chapterId"
          element={
            <ProtectedRoute>
              <ConceptLayout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessment"
          element={
            <ProtectedRoute>
              <GamesAssessment onComplete={() => window.location.replace("/bioereaderfe/subjects")} />
            </ProtectedRoute>
          }
        />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-reset-code" element={<VerifyResetCode />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
     
        
        {/* Informational Pages */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        
        {/* Legal Pages */}
        <Route path="/privacy" element={<LegalPage />} />
        <Route path="/terms" element={<LegalPage />} />
        
        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

// Enhanced 404 component with navigation
function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <div className="not-found-illustration">
          <div className="error-code">404</div>
          <div className="error-icon">🔍</div>
        </div>
        
        <h1 className="not-found-title">Page Not Found</h1>
        
        <p className="not-found-description">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="not-found-actions">
          <button 
            className="primary-btn"
            onClick={() => navigate(-1)}
          >
            ← Go Back
          </button>
          <button 
            className="secondary-btn"
            onClick={() => navigate('/')}
          >
            Go Home
          </button>
        </div>
        
        <div className="not-found-links">
          <p>You might be looking for:</p>
          <div className="suggested-links">
            <a href="/how-it-works">How It Works</a>
            <a href="/about">About Us</a>
            <a href="/contact">Contact</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;


// // App.js (with enhanced 404 page)
// import React from "react";
// import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
// import HomePage from "./pages/HomePage";
// import ConceptLayout from "./pages/ConceptLayout";
// import AboutPage from "./pages/AboutPage";
// import ContactPage from "./pages/ContactPage";
// import HowItWorksPage from "./pages/HowItWorksPage";
// import LegalPage from "./pages/LegalPage";
// import "./styles/ModernLayout.css";
// import LoginPage from "./pages/LoginPage";
// import SignupPage from "./pages/SignupPage";
// import ForgotPassword from "./pages/ForgotPassword";
// import VerifyResetCode from "./pages/VerifyResetCode";
// import ResetPassword from "./pages/ResetPassword";
// import ChapterListPage from "./pages/ChapterList";
// import ProtectedRoute from "./auth/ProtectedRoute";
// import SubjectSelectionPage from "./pages/SubjectSelectionPage";



// function App() {
 

//   return (
//     <Router basename="/">
//       <Routes>
//         {/* Main Pages */}
//         <Route path="/" element={<HomePage />} />
//         <Route
//           path="/subjects"
//           element={
//             <ProtectedRoute>
//               <SubjectSelectionPage />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/chapters"
//           element={
//             <ProtectedRoute>
//               <ChapterListPage />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/analyze/:chapterId"
//           element={
//             <ProtectedRoute>
//               <ConceptLayout />
//             </ProtectedRoute>
//           }
//         />

//         <Route path="/login" element={<LoginPage />} />
//         <Route path="/signup" element={<SignupPage />} />
//         <Route path="/forgot-password" element={<ForgotPassword />} />
//         <Route path="/verify-reset-code" element={<VerifyResetCode />} />
//         <Route path="/reset-password" element={<ResetPassword />} />

     
        
//         {/* Informational Pages */}
//         <Route path="/about" element={<AboutPage />} />
//         <Route path="/contact" element={<ContactPage />} />
//         <Route path="/how-it-works" element={<HowItWorksPage />} />
        
//         {/* Legal Pages */}
//         <Route path="/privacy" element={<LegalPage />} />
//         <Route path="/terms" element={<LegalPage />} />
        
//         {/* 404 Fallback */}
//         <Route path="*" element={<NotFoundPage />} />
//       </Routes>
//     </Router>
//   );
// }

// // Enhanced 404 component with navigation
// function NotFoundPage() {
//   const navigate = useNavigate();

//   return (
//     <div className="not-found-container">
//       <div className="not-found-content">
//         <div className="not-found-illustration">
//           <div className="error-code">404</div>
//           <div className="error-icon">🔍</div>
//         </div>
        
//         <h1 className="not-found-title">Page Not Found</h1>
        
//         <p className="not-found-description">
//           The page you're looking for doesn't exist or has been moved.
//         </p>
        
//         <div className="not-found-actions">
//           <button 
//             className="primary-btn"
//             onClick={() => navigate(-1)}
//           >
//             ← Go Back
//           </button>
//           <button 
//             className="secondary-btn"
//             onClick={() => navigate('/')}
//           >
//             Go Home
//           </button>
//         </div>
        
//         <div className="not-found-links">
//           <p>You might be looking for:</p>
//           <div className="suggested-links">
//             <a href="/how-it-works">How It Works</a>
//             <a href="/about">About Us</a>
//             <a href="/contact">Contact</a>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default App;
