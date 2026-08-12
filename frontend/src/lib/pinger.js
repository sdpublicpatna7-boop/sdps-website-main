/**
 * Auto-pinger: keeps the Render backend alive by hitting /api/ping
 * every 12 minutes (Render spins down after 15 min of inactivity).
 *
 * Usage:
 *   import { startPinger, stopPinger } from "./pinger";
 *   startPinger();   // call once at app startup
 */

import api from "./api";

const INTERVAL_MS = 12 * 60 * 1000; // 12 minutes

let _timer = null;
let _pingCount = 0;

async function doPing() {
  try {
    await api.get("/ping");
    _pingCount++;
    console.debug(`[pinger] keep-alive #${_pingCount} OK`);
  } catch (err) {
    // Non-fatal — backend may be restarting; next ping will catch it
    console.warn("[pinger] keep-alive failed:", err?.message || err);
  }
}

/**
 * Start the pinger. Safe to call multiple times — only one timer runs.
 * Fires immediately on first call, then every INTERVAL_MS.
 */
export function startPinger() {
  if (_timer !== null) return; // already running
  if (!window.location.pathname.startsWith('/admin')) {
    console.debug("[pinger] not on admin page, skipping start");
    return;
  }
  doPing(); // immediate first ping
  _timer = setInterval(doPing, INTERVAL_MS);
  console.info(`[pinger] started — pinging every ${INTERVAL_MS / 60000} minutes`);
}

/** Stop the pinger (useful for tests or unmount). */
export function stopPinger() {
  if (_timer !== null) {
    clearInterval(_timer);
    _timer = null;
    console.info("[pinger] stopped");
  }
}
