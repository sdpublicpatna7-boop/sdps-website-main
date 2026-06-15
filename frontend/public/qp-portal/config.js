/* QP Portal backend configuration.
 *
 * `apiBases` is an ordered list of backend URLs. The portal uses the first one
 * that responds and "pins" it for the session, so listing both your Render URL
 * and your custom domain gives automatic failover.
 *
 * In production these values are written by scripts/inject-qp-config.js at build
 * time from the env vars:
 *   REACT_APP_BACKEND_URL        -> primary API base
 *   REACT_APP_QP_API_FALLBACK    -> optional secondary API base
 * Set those env vars rather than editing this file directly.
 */
window.QP_CONFIG = {
  apiBases: [
    "https://sdps-website-main.onrender.com",
    "https://api.sdpublic.org"
  ]
};
