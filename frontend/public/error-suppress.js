// Suppress browser extension injected errors (e.g. Urban VPN M_ID, adblockers), cross-origin & stream reading network reset errors
window.addEventListener("error", function (e) {
  try {
    var filename = String(e && (e.filename || "") || "");
    var stack = String(e && e.error && e.error.stack || "");
    var message = String(e && (e.message || (e.error && e.error.message) || "") || "");

    if (
      filename.indexOf("chrome-extension://") !== -1 ||
      filename.indexOf("moz-extension://") !== -1 ||
      filename.indexOf("safari-web-extension://") !== -1 ||
      stack.indexOf("chrome-extension://") !== -1 ||
      stack.indexOf("moz-extension://") !== -1 ||
      message.indexOf("M_ID") !== -1
    ) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return true;
    }

    if (
      e.error &&
      typeof DOMException !== "undefined" &&
      e.error instanceof DOMException &&
      e.error.name === "DataCloneError" &&
      message.indexOf("PerformanceServerTiming") !== -1
    ) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return true;
    }
  } catch (err) {}
}, true);

window.addEventListener("unhandledrejection", function (e) {
  try {
    var stack = String(e && e.reason && e.reason.stack || "");
    var reason = String(e && (e.reason && (e.reason.message || e.reason)) || "");

    if (
      stack.indexOf("chrome-extension://") !== -1 ||
      stack.indexOf("moz-extension://") !== -1 ||
      reason.indexOf("M_ID") !== -1
    ) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return true;
    }

    if (
      reason.indexOf("connection reset") !== -1 ||
      reason.indexOf("stream reading error") !== -1
    ) {
      e.preventDefault();
    }
  } catch (err) {}
}, true);
