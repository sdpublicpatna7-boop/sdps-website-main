import { createContext, useContext, useEffect, useState } from "react";
import api, { setAuthToken } from "./api";

const AuthCtx = createContext(null);

// Non-sensitive hint that a session *may* exist, so we don't probe /admin/me
// for every anonymous public visitor. This is NOT a credential — the actual
// auth token lives in an HttpOnly cookie the browser sends automatically.
const SESSION_HINT = "sdps_admin_session";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(SESSION_HINT) !== "1") {
      setLoading(false);
      return;
    }
    // Restore the session via the HttpOnly auth cookie.
    api.get("/admin/me")
      .then((r) => setUser(r.data))
      .catch(() => {
        localStorage.removeItem(SESSION_HINT);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const r = await api.post("/admin/login", { email, password });
    // Cookie is set by the server; keep an in-memory fallback token + a presence hint.
    setAuthToken(r.data.access_token);
    localStorage.setItem(SESSION_HINT, "1");
    setUser(r.data.user);
    return r.data;
  };

  const logout = async () => {
    try {
      await api.post("/admin/logout");
    } catch {
      // ignore — clear client state regardless
    }
    setAuthToken(null);
    localStorage.removeItem(SESSION_HINT);
    setUser(null);
    window.location.href = "/admin/login";
  };

  useEffect(() => {
    if (!user) return;
    const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes
    let timer;
    const reset = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        // Skip auto-logout if a long-running operation (e.g. PDF export) is in progress
        if (window.__sdps_suppress_logout) return reset();
        logout();
      }, INACTIVITY_LIMIT);
    };
    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [user]);

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
