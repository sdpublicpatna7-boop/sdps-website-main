/* eslint-disable */
/**
 * Writes build/qp-portal/config.js from environment variables so the static QP
 * portal uses the same backend URL(s) as the rest of the app — no hardcoding.
 *
 *   REACT_APP_BACKEND_URL      -> primary API base (required for production)
 *   REACT_APP_QP_API_FALLBACK  -> optional secondary API base (failover)
 *
 * The portal tries the bases in order and pins the first that responds.
 */
const fs = require("fs");
const path = require("path");

const primary = (process.env.REACT_APP_BACKEND_URL || "").trim().replace(/\/+$/, "");
const fallback = (process.env.REACT_APP_BACKEND_FALLBACK || process.env.REACT_APP_QP_API_FALLBACK || "").trim().replace(/\/+$/, "");

const bases = [primary, fallback].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

if (bases.length === 0) {
  console.warn("[inject-qp-config] REACT_APP_BACKEND_URL not set — leaving committed config.js defaults in place.");
  process.exit(0);
}

const outPath = path.resolve(__dirname, "..", "build", "qp-portal", "config.js");
if (!fs.existsSync(path.dirname(outPath))) {
  console.error(`[inject-qp-config] ${path.dirname(outPath)} not found — skipping.`);
  process.exit(0);
}

const content = `window.QP_CONFIG = { apiBases: ${JSON.stringify(bases)} };\n`;
fs.writeFileSync(outPath, content, "utf8");
console.log("[inject-qp-config] wrote build/qp-portal/config.js ->", JSON.stringify(bases));
