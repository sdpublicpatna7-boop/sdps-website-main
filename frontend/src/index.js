import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Unregister any stale Service Workers and purge cache to prevent white screen
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
    }
  }).catch(() => {});
  if ("caches" in window) {
    caches.keys().then((names) => {
      for (let name of names) {
        if (name.includes("sdps") || name.includes("workbox") || name.includes("precache")) {
          caches.delete(name);
        }
      }
    }).catch(() => {});
  }
}

// Suppress browser extension runtime errors
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

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);