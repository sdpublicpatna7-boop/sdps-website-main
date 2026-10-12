/**
 * SDPS WhatsApp microservice (Baileys)
 * ------------------------------------
 * Exposes a small HTTP API consumed by the FastAPI backend:
 *   GET  /status        -> { connected, qr, user, bulkProgress, uptimeSec }
 *   POST /disconnect    -> logout + wipe auth + generate fresh QR
 *   POST /reset-session -> force wipe stale session + generate fresh QR
 *   POST /pairing-code  -> { phone } -> { success, pairingCode, phone }
 *   POST /send-text     -> { phone, message, mediaBase64?, mediaMime?, mediaType? }
 *   POST /send-bulk     -> { contacts:[{phone,name}], message, mediaBase64?, mediaMime?, mediaType?, delayMs }
 *   GET  /bulk-progress (via /status.bulkProgress)
 *   POST /stop-bulk
 *
 * Every request must carry the shared secret header `X-WA-Secret`.
 * Bulk sends are paced with a configurable delay (default 2000ms) to reduce
 * WhatsApp ban risk, and support {name} personalisation in the message.
 */
import express from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import qrcode from "qrcode";
import pino from "pino";
import { Boom } from "@hapi/boom";
import * as baileysAll from "@whiskeysockets/baileys";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baileys = baileysAll.default && typeof baileysAll.default === "object" ? { ...baileysAll.default, ...baileysAll } : baileysAll;
const makeWASocket = typeof baileysAll.default === "function"
  ? baileysAll.default
  : (baileysAll.makeWASocket || baileys.makeWASocket || baileys.default || baileys);

const useMultiFileAuthState = baileysAll.useMultiFileAuthState || baileysAll.default?.useMultiFileAuthState || baileys.useMultiFileAuthState;
const makeCacheableSignalKeyStore = baileysAll.makeCacheableSignalKeyStore || baileysAll.default?.makeCacheableSignalKeyStore || baileys.makeCacheableSignalKeyStore;
const DisconnectReason = baileysAll.DisconnectReason || baileysAll.default?.DisconnectReason || baileys.DisconnectReason;
const fetchLatestBaileysVersion = baileysAll.fetchLatestBaileysVersion || baileysAll.default?.fetchLatestBaileysVersion || baileys.fetchLatestBaileysVersion;
const fetchLatestWaWebVersion = baileysAll.fetchLatestWaWebVersion || baileysAll.default?.fetchLatestWaWebVersion || baileys.fetchLatestWaWebVersion;
const Browsers = baileysAll.Browsers || baileysAll.default?.Browsers || baileys.Browsers;

const PORT = process.env.PORT || 3001;
const WA_API_SECRET = process.env.WA_API_SECRET || "";
const AUTH_DIR = process.env.WA_AUTH_DIR || "./auth_state";
const DEFAULT_DELAY_MS = parseInt(process.env.WA_BULK_DELAY_MS || "2000", 10);

if (!WA_API_SECRET || WA_API_SECRET === "change-me-secret") {
  console.error("FATAL: WA_API_SECRET must be set to a strong shared secret.");
  process.exit(1);
}

const logger = pino({ level: process.env.LOG_LEVEL || "warn" });

// ── Connection state ─────────────────────────────────────────────────────────
let sock = null;
let currentQR = null;      // base64 PNG data URL while waiting to be scanned
let isConnected = false;
let meUser = null;
let starting = false;
let lastDisconnectInfo = null;
let recentLogs = [];

function addLog(msg) {
  const ts = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" });
  const entry = `[${ts}] ${msg}`;
  recentLogs.unshift(entry);
  if (recentLogs.length > 30) recentLogs.pop();
  console.log(msg);
}

let bulkProgress = { total: 0, sent: 0, failed: 0, running: false, errors: [] };
let stopRequested = false;
let disconnecting = false;  // Flag to prevent close handler from interfering during disconnect

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── LRU / TTL Memory Cache (compatible with Baileys CacheStore) ──────────────
class MemoryCache {
  constructor(maxSize = 4000, ttlMs = 24 * 60 * 60 * 1000) {
    this.map = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key) {
    const k = String(key);
    const item = this.map.get(k);
    if (!item) return undefined;
    if (Date.now() > item.expiry) {
      this.map.delete(k);
      return undefined;
    }
    return item.val;
  }

  set(key, val, ttlSeconds) {
    const k = String(key);
    if (this.map.size >= this.maxSize) {
      const firstKey = this.map.keys().next().value;
      if (firstKey) this.map.delete(firstKey);
    }
    const expiry = Date.now() + (ttlSeconds ? ttlSeconds * 1000 : this.ttlMs);
    this.map.set(k, { val, expiry });
    return this;
  }

  del(key) {
    return this.map.delete(String(key));
  }

  flushAll() {
    this.map.clear();
  }
}

// Caches required by Baileys for message retry handshake & multi-device resolution
const msgRetryCounterCache = new MemoryCache(4000, 30 * 60 * 1000); // 30-min window
const userDevicesCache = new MemoryCache(2000, 60 * 60 * 1000);      // 1-hour window
const messageStore = new MemoryCache(6000, 48 * 60 * 60 * 1000);     // 48-hour window for message retries

function saveMessageToStore(id, messageContent, jid) {
  if (!id || !messageContent) return;
  messageStore.set(id, messageContent);
  if (jid) {
    messageStore.set(`${jid}:${id}`, messageContent);
  }
  persistMessagesDebounced();
}

function getMessageFromStore(id, jid) {
  if (!id) return undefined;
  let msg = messageStore.get(id);
  if (!msg && jid) {
    msg = messageStore.get(`${jid}:${id}`);
  }
  return msg;
}

let saveMsgTimeout = null;
function persistMessagesDebounced() {
  if (saveMsgTimeout) return;
  saveMsgTimeout = setTimeout(() => {
    saveMsgTimeout = null;
    try {
      const resolved = path.resolve(AUTH_DIR);
      if (!fs.existsSync(resolved)) return;
      const cacheFile = path.join(resolved, "messages_cache.json");
      const entries = [];
      for (const [k, v] of messageStore.map.entries()) {
        if (!k.includes(":")) {
          entries.push([k, v.val]);
          if (entries.length >= 500) break;
        }
      }
      fs.writeFileSync(cacheFile, JSON.stringify(entries), "utf-8");
    } catch {
      /* non-fatal */
    }
  }, 2500);
}

function loadPersistedMessages() {
  try {
    const resolved = path.resolve(AUTH_DIR);
    const cacheFile = path.join(resolved, "messages_cache.json");
    if (fs.existsSync(cacheFile)) {
      const raw = fs.readFileSync(cacheFile, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        for (const [id, msg] of data) {
          if (id && msg) {
            messageStore.set(id, msg);
          }
        }
        console.log(`[WhatsApp] Loaded ${data.length} messages into store for decryption retry responses.`);
      }
    }
  } catch (e) {
    console.warn("[WhatsApp] Could not load message cache:", e.message);
  }
}

/** Clean up persisted Baileys auth state folders completely */
function cleanAuthDir() {
  messageStore.flushAll();
  msgRetryCounterCache.flushAll();
  userDevicesCache.flushAll();
  const paths = [
    path.resolve(AUTH_DIR),
    path.join(__dirname, "auth_state"),
    path.join(__dirname, "auth_info_baileys"),
    path.join(__dirname, "baileys_auth"),
    path.join(__dirname, ".baileys_auth"),
  ];
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          const files = fs.readdirSync(p);
          for (const f of files) {
            try {
              fs.rmSync(path.join(p, f), { recursive: true, force: true });
            } catch (err) {
              console.warn(`[WhatsApp] Failed to delete ${f} in ${p}:`, err.message);
            }
          }
        }
        try {
          fs.rmSync(p, { recursive: true, force: true });
        } catch { /* ok if mount point or busy */ }
        console.log("[WhatsApp] Wiped clean auth state directory contents:", p);
      }
    } catch (e) {
      console.warn("[WhatsApp] Could not clean auth state at:", p, e.message);
    }
  }
  const resolved = path.resolve(AUTH_DIR);
  if (!fs.existsSync(resolved)) {
    try {
      fs.mkdirSync(resolved, { recursive: true });
    } catch (e) {
      console.warn("[WhatsApp] Could not recreate AUTH_DIR:", e.message);
    }
  }
}

/** Normalise an Indian-style phone number to a WhatsApp JID. */
function toJid(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;
  // 10-digit local number -> prepend India country code.
  if (digits.length === 10) digits = "91" + digits;
  // Handle leading 0 then 10 digits.
  if (digits.length === 11 && digits.startsWith("0")) digits = "91" + digits.slice(1);
  if (digits.length < 11 || digits.length > 15) return null;
  return `${digits}@s.whatsapp.net`;
}

async function startSock() {
  if (starting) {
    console.log("[WhatsApp] startSock already in progress, skipping duplicate call.");
    return;
  }
  starting = true;

  try {
    // 1. Clean up old socket if it exists
    if (sock) {
      try { sock.ev.removeAllListeners(); } catch (e) { /* ok */ }
      try { sock.ws?.close(); } catch (e) { /* ok */ }
      try { sock.end?.(undefined); } catch (e) { /* ok */ }
      sock = null;
    }

    const resolvedAuthDir = path.resolve(AUTH_DIR);

    if (!fs.existsSync(resolvedAuthDir)) {
      fs.mkdirSync(resolvedAuthDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(resolvedAuthDir);
    loadPersistedMessages();

    let version = [2, 3000, 1023793615];
    try {
      if (typeof fetchLatestBaileysVersion === "function") {
        const v = await fetchLatestBaileysVersion();
        if (v?.version) {
          version = v.version;
          console.log("[WhatsApp] Using latest Baileys version:", version.join("."));
        }
      } else if (typeof fetchLatestWaWebVersion === "function") {
        const v = await fetchLatestWaWebVersion();
        if (v?.version) {
          version = v.version;
          console.log("[WhatsApp] Using latest WhatsApp Web version:", version.join("."));
        }
      }
    } catch (e) {
      console.warn("[WhatsApp] Version fetch fallback, using default version:", version.join("."), e.message);
    }

    // Standard Desktop browser identity matches official Baileys tested pair profile
    const browserConfig = Browsers?.macOS
      ? Browsers.macOS("Desktop")
      : Browsers?.ubuntu
        ? Browsers.ubuntu("Chrome")
        : ["Mac OS", "Desktop", "14.4.1"];

    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      printQRInTerminal: false,
      browser: browserConfig,
      qrTimeout: 90000,
      markOnlineOnConnect: true,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      connectTimeoutMs: 120000,
      defaultQueryTimeoutMs: 120000,
      keepAliveIntervalMs: 25000,
      retryRequestDelayMs: 250,
      maxMsgRetryCount: 5,
      msgRetryCounterCache,
      userDevicesCache,
      getMessage: async (key) => {
        if (!key) return undefined;
        const found = getMessageFromStore(key.id, key.remoteJid);
        if (found) {
          addLog(`[Decryption Retry] Re-encrypting stored message for ID: ${key.id} -> ${key.remoteJid}`);
          return found;
        }
        addLog(`[Decryption Retry] Message ${key.id} not found in store for ${key.remoteJid}`);
        return undefined;
      },
    });

    sock.ev.on("creds.update", async () => {
      try {
        await saveCreds();
      } catch (err) {
        console.error("[WhatsApp] Error saving credentials:", err.message);
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      for (const m of (messages || [])) {
        if (m.key?.id && m.message) {
          saveMessageToStore(m.key.id, m.message, m.key.remoteJid);
        }
      }
    });

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        lastDisconnectInfo = null; // Clear previous disconnect warning as fresh QR is ready
        try {
          currentQR = await qrcode.toDataURL(qr, {
            margin: 2,
            scale: 8,
            color: { dark: "#0f172a", light: "#ffffff" },
          });
          addLog("Fresh QR code generated and ready to scan");
        } catch (e) {
          console.error("[WhatsApp] QR generation error:", e.message);
          addLog(`QR generation error: ${e.message}`);
          currentQR = null;
        }
      }

      if (connection === "open") {
        isConnected = true;
        currentQR = null;
        lastDisconnectInfo = null;
        meUser = sock?.user || null;
        addLog(`Successfully connected to WhatsApp as: ${meUser?.id || meUser?.name}`);
      }

      if (connection === "close") {
        isConnected = false;
        meUser = null;

        if (disconnecting) {
          addLog("Socket closed during intentional disconnect/reset.");
          return;
        }

        const err = lastDisconnect?.error;
        const statusCode = err?.output?.statusCode
          || err?.statusCode
          || err?.data?.statusCode
          || (err?.message?.includes("515") ? 515 : null);

        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
        const isRestart = statusCode === DisconnectReason.restartRequired || statusCode === 515;

        // Code 428 is routine idle timeout before scanning; only track real disconnects
        if (statusCode !== 428 || isConnected) {
          lastDisconnectInfo = {
            statusCode: statusCode || "unknown",
            loggedOut: isLoggedOut,
            restartRequired: isRestart,
            message: err?.message || "Connection closed",
            date: new Date().toISOString(),
          };
        }

        addLog(`Connection closed. StatusCode: ${statusCode} (loggedOut=${isLoggedOut}, restartRequired=${isRestart}, reason=${err?.message || 'none'})`);

        starting = false;

        if (isLoggedOut) {
          addLog("Device was logged out (code 401). Cleaning auth directory and generating fresh session...");
          cleanAuthDir();
          currentQR = null;
          await sleep(2000);
          startSock();
        } else if (isRestart) {
          addLog("Restart required (code 515: pairing handshake completed). Preserving credentials and restarting socket in 2s...");
          await sleep(2000);
          startSock();
        } else {
          addLog(`Connection dropped (status code: ${statusCode}). Reconnecting in 3s...`);
          await sleep(3000);
          startSock();
        }
      }
    });
  } catch (e) {
    console.error("[WhatsApp] startSock error:", e.message);
  } finally {
    starting = false;
  }
}

/** Send a text and/or media message to one JID. */
async function sendMessage(jid, message, media) {
  if (!sock) throw new Error("WhatsApp socket is not connected");

  // 1. Resolve canonical JID via onWhatsApp to handle LID vs standard Phone Number routing
  // Especially critical for WhatsApp Business and Meta-secured accounts
  let targetJid = jid;
  try {
    const results = await sock.onWhatsApp(jid);
    if (Array.isArray(results) && results[0]?.exists && results[0]?.jid) {
      targetJid = results[0].jid;
    }
  } catch (e) {
    /* non-fatal, fallback to raw jid */
  }

  // 2. Pre-send handshake: subscribe to presence & brief typing indicator.
  // Signals WhatsApp server to exchange Signal E2EE ratchet keys before delivering payload,
  // preventing "Waiting for this message" decryption lag on recipient phones.
  try {
    await sock.presenceSubscribe(targetJid);
  } catch { /* non-fatal */ }

  try {
    await sock.sendPresenceUpdate("composing", targetJid);
    await sleep(250);
    await sock.sendPresenceUpdate("paused", targetJid);
  } catch { /* non-fatal */ }

  let sent;
  if (media && media.mediaBase64 && media.mediaType) {
    const buffer = Buffer.from(media.mediaBase64, "base64");
    if (media.mediaType === "image") {
      sent = await sock.sendMessage(targetJid, { image: buffer, caption: message || "" });
    } else if (media.mediaType === "video") {
      sent = await sock.sendMessage(targetJid, { video: buffer, caption: message || "" });
    } else if (media.mediaType === "document" || media.mediaType === "pdf") {
      sent = await sock.sendMessage(targetJid, {
        document: buffer,
        mimetype: media.mediaMime || "application/pdf",
        fileName: media.fileName || "document.pdf",
        caption: message || ""
      });
    } else {
      sent = await sock.sendMessage(targetJid, { text: message || "" });
    }
  } else {
    sent = await sock.sendMessage(targetJid, { text: message || "" });
  }

  // Cache sent message immediately so recipient decryption retry requests can re-encrypt it
  if (sent?.key?.id && sent?.message) {
    saveMessageToStore(sent.key.id, sent.message, targetJid);
    if (targetJid !== jid) {
      saveMessageToStore(sent.key.id, sent.message, jid);
    }
  }

  return sent;
}

// ── HTTP API ─────────────────────────────────────────────────────────────────
const app = express();
// 20mb accommodates base64-encoded media (~15mb raw) without allowing memory exhaustion
app.use(express.json({ limit: process.env.WA_BODY_LIMIT || "20mb" }));

// Public keep-alive endpoint (no secret) — for the pinger / uptime monitors.
app.get("/ping", (req, res) => res.json({ status: "alive", connected: isConnected }));

// Shared-secret auth for every other route (timing-safe comparison).
const secretBuf = Buffer.from(WA_API_SECRET);
const secretMatches = (provided) => {
  const providedBuf = Buffer.from(String(provided || ""));
  return (
    providedBuf.length === secretBuf.length &&
    crypto.timingSafeEqual(providedBuf, secretBuf)
  );
};

app.use((req, res, next) => {
  if (!secretMatches(req.headers["x-wa-secret"])) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

app.get("/status", (req, res) => {
  res.json({
    connected: isConnected,
    qr: currentQR,
    user: meUser ? { id: meUser.id, name: meUser.name } : null,
    bulkProgress,
    uptimeSec: Math.floor(process.uptime()),
    lastDisconnectInfo,
    recentLogs: recentLogs.slice(0, 15),
  });
});

app.post("/reset-session", async (req, res) => {
  console.log("[WhatsApp] ===== RESET SESSION REQUESTED =====");
  disconnecting = true;
  isConnected = false;
  meUser = null;
  currentQR = null;
  lastDisconnectInfo = null;
  starting = false;

  if (sock) {
    try { sock.ev.removeAllListeners(); } catch (e) { /* ok */ }
    try { sock.ws?.close(); } catch (e) { /* ok */ }
    try { sock.end?.(undefined); } catch (e) { /* ok */ }
    sock = null;
  }

  cleanAuthDir();
  await sleep(1500);

  disconnecting = false;
  startSock();

  // Wait briefly (up to 3s) to return fresh QR immediately if available
  for (let i = 0; i < 6; i++) {
    if (currentQR) break;
    await sleep(500);
  }

  res.json({
    status: "reset_complete",
    message: "Fresh QR session initialized.",
    qr: currentQR,
  });
});

app.post("/disconnect", (req, res, next) => {
  // Disconnect behaves identically to reset-session: wipes stale state & restarts fresh QR
  req.url = "/reset-session";
  app.handle(req, res, next);
});

app.post("/pairing-code", async (req, res) => {
  if (isConnected) {
    return res.status(400).json({ error: "WhatsApp is already connected." });
  }
  const { phone } = req.body || {};
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) digits = "91" + digits;
  if (digits.length === 11 && digits.startsWith("0")) digits = "91" + digits.slice(1);

  if (digits.length < 11 || digits.length > 15) {
    return res.status(400).json({ error: "Invalid mobile number. Please enter a valid 10-digit Indian phone number." });
  }

  if (!sock) {
    await startSock();
    await sleep(2000);
  }

  try {
    if (typeof sock?.requestPairingCode !== "function") {
      return res.status(500).json({ error: "Pairing code is not supported by the current socket." });
    }
    const rawCode = await sock.requestPairingCode(digits);
    const formattedCode = rawCode?.match(/.{1,4}/g)?.join("-") || rawCode;
    console.log(`[WhatsApp] Pairing code generated for ${digits}: ${formattedCode}`);
    res.json({ success: true, pairingCode: formattedCode, rawCode, phone: digits });
  } catch (e) {
    console.error("[WhatsApp] Pairing code generation error:", e.message);
    res.status(500).json({ error: `Could not generate pairing code: ${e.message}` });
  }
});

app.post("/send-text", async (req, res) => {
  if (!isConnected || !sock) return res.status(409).json({ error: "WhatsApp not connected" });
  const { phone, message } = req.body || {};
  const jid = toJid(phone);
  if (!jid) return res.status(400).json({ error: "Invalid phone number" });
  try {
    await sendMessage(jid, message, req.body);
    res.json({ success: true, jid });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post("/send-bulk", async (req, res) => {
  if (!isConnected || !sock) return res.status(409).json({ error: "WhatsApp not connected" });
  if (bulkProgress.running) return res.status(409).json({ error: "A campaign is already running" });

  const { contacts, message, delayMs } = req.body || {};
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ error: "No contacts provided" });
  }
  const media = {
    mediaBase64: req.body.mediaBase64,
    mediaMime: req.body.mediaMime,
    mediaType: req.body.mediaType,
  };
  const delay = Number.isFinite(delayMs) ? Math.max(500, delayMs) : DEFAULT_DELAY_MS;

  bulkProgress = { total: contacts.length, sent: 0, failed: 0, running: true, errors: [] };
  stopRequested = false;

  // Respond immediately; the campaign runs in the background and is polled via /status.
  res.json({ started: true, total: contacts.length, delayMs: delay });

  (async () => {
    for (let i = 0; i < contacts.length; i++) {
      if (stopRequested) break;
      const c = contacts[i];
      const jid = toJid(c.phone);
      // Per-contact message (e.g. fee reminders) takes precedence; otherwise
      // fall back to the shared campaign message with {name} personalisation.
      const personalised = c.message
        ? c.message
        : (message || "").replace(/\{name\}/g, c.name || "");
      
      const contactMedia = (c.mediaBase64) ? {
        mediaBase64: c.mediaBase64,
        mediaMime: c.mediaMime || "image/jpeg",
        mediaType: c.mediaType || "image"
      } : media;

      if (!jid) {
        bulkProgress.failed++;
        bulkProgress.errors.push(`${c.phone}: invalid number`);
      } else {
        try {
          await sendMessage(jid, personalised, contactMedia);
          bulkProgress.sent++;
        } catch (e) {
          bulkProgress.failed++;
          bulkProgress.errors.push(`${c.phone}: ${e.message}`);
        }
      }
      // Pace the sends (skip the wait after the last one).
      if (i < contacts.length - 1 && !stopRequested) await sleep(delay);
    }
    bulkProgress.running = false;
  })().catch((e) => {
    bulkProgress.running = false;
    bulkProgress.errors.push(`fatal: ${e.message}`);
  });
});

app.post("/stop-bulk", (req, res) => {
  stopRequested = true;
  res.json({ status: "stopping" });
});

app.listen(PORT, () => {
  console.log(`SDPS WhatsApp service listening on :${PORT}`);
  startSock();
  startKeepAlive();
});

// ── Keep-alive: ping self + the backend every ~12 min so neither Render
// instance spins down for inactivity (24x7 warm). ───────────────────────────
function startKeepAlive() {
  const intervalMs = (parseInt(process.env.KEEPALIVE_INTERVAL_SEC || "720", 10)) * 1000;
  const selfUrl = (process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL || "").replace(/\/+$/, "");
  const backendUrl = (process.env.BACKEND_URL || "").replace(/\/+$/, "");
  const tick = () => {
    const targets = [];
    if (selfUrl) targets.push(`${selfUrl}/ping`);
    if (backendUrl) targets.push(`${backendUrl}/api/ping`);
    targets.forEach((u) => {
      fetch(u).catch(() => { /* non-fatal */ });
    });
  };
  setInterval(tick, intervalMs);
  console.log(`Keep-alive started — every ${intervalMs / 60000} min`);
}
