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

// Auto-recover from deployment chunk loading errors & suppress extension errors
window.addEventListener(
  "error",
  (e) => {
    try {
      const filename = String(e?.filename || "");
      const stack = String(e?.error?.stack || "");
      const msg = String(e?.message || e?.error?.message || "");

      if (
        filename.includes("chrome-extension://") ||
        filename.includes("moz-extension://") ||
        filename.includes("safari-web-extension://") ||
        stack.includes("chrome-extension://") ||
        stack.includes("moz-extension://") ||
        msg.includes("M_ID")
      ) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return true;
      }

      if (
        msg.includes("Loading chunk") ||
        msg.includes("ChunkLoadError") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("Failed to fetch dynamically imported module")
      ) {
        const lastReload = sessionStorage.getItem("sdps_chunk_reload");
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
          sessionStorage.setItem("sdps_chunk_reload", now.toString());
          window.location.reload();
        }
      }
    } catch (err) {}
  },
  true
);

window.addEventListener("unhandledrejection", (e) => {
  try {
    const reason = String(e?.reason?.message || e?.reason || "");
    if (
      reason.includes("Loading chunk") ||
      reason.includes("ChunkLoadError") ||
      reason.includes("Importing a module script failed") ||
      reason.includes("Failed to fetch dynamically imported module")
    ) {
      const lastReload = sessionStorage.getItem("sdps_chunk_reload");
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
        sessionStorage.setItem("sdps_chunk_reload", now.toString());
        window.location.reload();
      }
    }
  } catch (err) {}
});

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);