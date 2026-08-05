// Suppress cross-origin & stream reading network connection reset errors
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

window.addEventListener("unhandledrejection", function (e) {
  if (
    e.reason &&
    typeof e.reason.message === "string" &&
    (e.reason.message.includes("connection reset") ||
      e.reason.message.includes("stream reading error"))
  ) {
    e.preventDefault();
  }
});
