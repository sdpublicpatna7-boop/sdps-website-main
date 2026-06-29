import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

// Suppress browser extension runtime errors from triggering Create React App error overlay
window.addEventListener("error", (e) => {
  if (
    e.message?.includes("extension") || 
    e.message?.includes("browser extension") || 
    e.filename?.startsWith("blob:") || 
    e.filename?.includes("extension")
  ) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});
window.addEventListener("unhandledrejection", (e) => {
  if (
    e.reason?.message?.includes("extension") || 
    e.reason?.stack?.includes("extension") || 
    String(e.reason)?.includes("extension")
  ) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);