import axios from "axios";

// Candidate backend bases, in priority order. The app uses the first that
// responds and "pins" it for the session, so if the primary (e.g. a custom
// domain) is down or not yet set up, requests automatically fall back to the
// secondary (e.g. the Render URL).
const RAW_BASES = [
  process.env.REACT_APP_BACKEND_URL,
  process.env.REACT_APP_BACKEND_FALLBACK,
]
  .filter(Boolean)
  .map((s) => s.replace(/\/+$/, ""));

// De-duplicate while preserving order.
const BASES = RAW_BASES.filter((v, i, a) => a.indexOf(v) === i);
const DEFAULT_BASE = BASES[0] || "";

function pinnedBase() {
  try {
    const p = sessionStorage.getItem("sdps_api_base");
    return p && BASES.includes(p) ? p : null;
  } catch {
    return null;
  }
}

function orderedBases() {
  const p = pinnedBase();
  const list = BASES.length ? BASES : [DEFAULT_BASE];
  return p ? [p, ...list.filter((b) => b !== p)] : list;
}

// Kept for backwards compatibility with any `import { API }` usage.
export const API = `${DEFAULT_BASE}/api`;

// In-memory auth token fallback initialized from localStorage to persist sessions on page refresh.
let inMemoryToken = null;
try {
  inMemoryToken = localStorage.getItem("sdps_admin_token") || null;
} catch (e) {}

export function setAuthToken(token) {
  inMemoryToken = token || null;
  try {
    if (token) {
      localStorage.setItem("sdps_admin_token", token);
    } else {
      localStorage.removeItem("sdps_admin_token");
    }
  } catch (e) {}
}

const api = axios.create({ withCredentials: true });

api.interceptors.request.use((config) => {
  if (inMemoryToken) config.headers.Authorization = `Bearer ${inMemoryToken}`;
  // Set the base only if a previous interceptor/retry hasn't already chosen one.
  if (!config.baseURL) {
    config.baseURL = `${orderedBases()[0]}/api`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    // Remember the base that worked for the rest of the session.
    try {
      const used = (res.config.baseURL || "").replace(/\/api$/, "");
      if (used) sessionStorage.setItem("sdps_api_base", used);
    } catch {
      /* ignore */
    }
    return res;
  },
  async (err) => {
    const config = err.config || {};

    // Network/CORS failure (no HTTP response) → try the next configured base.
    if (!err.response && config && !config.__noRetry) {
      config.__tried = config.__tried || [];
      const current = (config.baseURL || "").replace(/\/api$/, "");
      if (current && !config.__tried.includes(current)) config.__tried.push(current);
      const next = orderedBases().find((b) => !config.__tried.includes(b));
      if (next) {
        config.baseURL = `${next}/api`;
        return api(config);
      }
    }

    if (
      err?.response?.status === 401 &&
      window.location.pathname.startsWith("/admin") &&
      !window.location.pathname.includes("/admin/login") &&
      !window.location.pathname.includes("/admin/forgot-password")
    ) {
      inMemoryToken = null;
      try {
        localStorage.removeItem("sdps_admin_session");
        localStorage.removeItem("sdps_admin_token");
      } catch (e) {}
      window.location.href = "/admin/login";
    }
    return Promise.reject(err);
  }
);

export function optimizeCloudinary(url, width = null) {
  if (!url || typeof url !== "string") return url;
  if (url.includes("res.cloudinary.com")) {
    if (url.includes("/upload/q_auto")) return url;
    const params = ["q_auto", "f_auto"];
    if (width) {
      params.push(`w_${width}`);
    }
    const paramString = params.join(",");
    return url.replace("/upload/", `/upload/${paramString}/`);
  }
  return url;
}

export default api;
