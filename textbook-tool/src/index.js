import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Temporarily remove the NODE_ENV check to debug production
(function() {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [url, options] = args;
    const id = Math.random().toString(36).slice(2, 7);
    console.log(`→ [${id}] FETCH`, options?.method || "GET", url);
    try {
      const res = await originalFetch(...args);
      console.log(`← [${id}] ${res.status}`, url);
      return res;
    } catch (err) {
      console.error(`✗ [${id}] FAILED`, url, err.message);
      throw err;
    }
  };
})();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();