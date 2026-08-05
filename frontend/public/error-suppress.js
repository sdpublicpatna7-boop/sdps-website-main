// Suppress a benign cross-origin DataCloneError from PerformanceServerTiming
// that some browsers raise. Kept in an external file so the page can enforce a
// strict Content-Security-Policy (no inline scripts).
window.addEventListener("error", function (e) {
  if (
    e.error &&
    typeof DOMException !== "undefined" &&
    e.error instanceof DOMException &&
    e.error.name === "DataCloneError" &&
    e.message &&
    e.message.includes("PerformanceServerTiming")
  ) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
}, true);
