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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => {
        console.log("Service Worker registered successfully:", reg.scope);
      })
      .catch((err) => {
        console.error("Service Worker registration failed:", err);
      });
  });
}