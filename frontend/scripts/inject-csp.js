/* eslint-disable */
/**
 * Inject a strict Content-Security-Policy <meta> tag into the PRODUCTION build's
 * index.html only.
 *
 * Why post-build and not in public/index.html: a CSP meta in the source file
 * also applies during `npm start` (webpack dev server), which relies on `eval`
 * and HMR websockets that a strict script-src/connect-src would block. Applying
 * it only to the built output keeps local development working while still
 * shipping a hardened policy to production.
 *
 * Note: the production CRA build emits only external script files (with
 * INLINE_RUNTIME_CHUNK=false), so a script-src without 'unsafe-inline'/'unsafe-eval'
 * is safe here.
 */
const fs = require("fs");
const path = require("path");

const CSP = [
  "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob: https://checkout.razorpay.com",
  "style-src 'self' 'unsafe-inline' https: https://fonts.googleapis.com",
  "font-src 'self' https: data: https://fonts.gstatic.com",
  "img-src 'self' data: https: blob:",
  "media-src 'self' blob: https: data:",
  "frame-src 'self' https: https://api.sdpublic.org https://checkout.razorpay.com https://drive.google.com https://www.youtube.com https://www.youtube-nocookie.com",
  "connect-src 'self' https: wss: ws: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const indexPath = path.resolve(__dirname, "..", "build", "index.html");

if (!fs.existsSync(indexPath)) {
  console.error(`[inject-csp] build/index.html not found at ${indexPath} — skipping.`);
  process.exit(0);
}

let html = fs.readFileSync(indexPath, "utf8");

if (html.includes("http-equiv=\"Content-Security-Policy\"")) {
  console.log("[inject-csp] CSP meta already present — skipping.");
  process.exit(0);
}

const metaTag = `<meta http-equiv="Content-Security-Policy" content="${CSP}"/>`;
// Insert right after the charset meta so the policy applies as early as possible.
html = html.replace(/(<meta charset="[^"]*"\s*\/?>)/i, `$1${metaTag}`);

fs.writeFileSync(indexPath, html, "utf8");
console.log("[inject-csp] Injected Content-Security-Policy into build/index.html");
