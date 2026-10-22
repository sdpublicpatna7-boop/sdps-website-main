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
import { MongoClient } from "mongodb";

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
const initAuthCreds = baileysAll.initAuthCreds || baileys.initAuthCreds || baileysAll.default?.initAuthCreds;
const BufferJSON = baileysAll.BufferJSON || baileys.BufferJSON || baileysAll.default?.BufferJSON;
const proto = baileysAll.proto || baileys.proto || baileysAll.default?.proto;

const PORT = process.env.PORT || 3001;
const WA_API_SECRET = process.env.WA_API_SECRET || "";
const AUTH_DIR = process.env.WA_AUTH_DIR || "./auth_state";
const DEFAULT_DELAY_MS = parseInt(process.env.WA_BULK_DELAY_MS || "2000", 10);

// MongoDB configuration for cloud-persistent session & message storage across deploys
let MONGO_URL = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI || "";
let DB_NAME = process.env.DB_NAME || "sdps_portal";
let WA_MONGO_AUTH_COLLECTION = process.env.WA_MONGO_AUTH_COLLECTION || "baileys_auth";
let WA_MONGO_MESSAGES_COLLECTION = process.env.WA_MONGO_MESSAGES_COLLECTION || "baileys_messages";

// Load persisted MongoDB configuration file if present
const CONFIG_FILE = path.join(__dirname, "mongo_config.json");
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed?.mongoUrl && !MONGO_URL) {
      MONGO_URL = parsed.mongoUrl;
      if (parsed.dbName) DB_NAME = parsed.dbName;
      console.log(`[MongoDB] Loaded connection URL from persisted config (${DB_NAME})`);
    }
  }
} catch (e) {
  /* ignore */
}

let mongoClient = null;
let mongoDb = null;
let authCollection = null;
let messagesCollection = null;
let activeStorageType = "filesystem";
let lastMongoError = null;

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

async function initMongoDb(overrideUrl, overrideDb) {
  const targetUrl = overrideUrl || MONGO_URL;
  const targetDbName = overrideDb || DB_NAME;
  if (!targetUrl) {
    lastMongoError = "MONGO_URL is not configured";
    return null;
  }
  if (mongoDb && authCollection && !overrideUrl) return mongoDb;

  try {
    if (mongoClient) {
      try { await mongoClient.close(); } catch { /* ok */ }
      mongoClient = null;
      mongoDb = null;
      authCollection = null;
      messagesCollection = null;
    }

    mongoClient = new MongoClient(targetUrl, {
      maxPoolSize: 15,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 12000,
    });
    await mongoClient.connect();
    mongoDb = mongoClient.db(targetDbName);
    authCollection = mongoDb.collection(WA_MONGO_AUTH_COLLECTION);
    messagesCollection = mongoDb.collection(WA_MONGO_MESSAGES_COLLECTION);

    try {
      await messagesCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600, background: true });
    } catch { /* ok if index exists */ }

    MONGO_URL = targetUrl;
    DB_NAME = targetDbName;
    lastMongoError = null;
    activeStorageType = "mongodb";
    addLog(`[MongoDB] Connected successfully to database: ${DB_NAME}`);
    return mongoDb;
  } catch (e) {
    lastMongoError = e.message;
    console.error("[MongoDB] Connection failed:", e.message);
    addLog(`[MongoDB] Connection error: ${e.message}. Using filesystem fallback.`);
    mongoClient = null;
    mongoDb = null;
    authCollection = null;
    messagesCollection = null;
    activeStorageType = "filesystem";
    return null;
  }
}

async function useMongoDBAuthState() {
  const db = await initMongoDb();
  if (!db || !authCollection) return null;

  const writeData = async (data, key) => {
    try {
      const stringified = JSON.stringify(data, BufferJSON.replacer);
      await authCollection.updateOne(
        { _id: String(key) },
        { $set: { data: stringified, updatedAt: new Date() } },
        { upsert: true }
      );
    } catch (err) {
      console.warn(`[MongoDB Auth] writeData error for ${key}:`, err.message);
    }
  };

  const readData = async (key) => {
    try {
      const doc = await authCollection.findOne({ _id: String(key) });
      if (!doc?.data) return null;
      return JSON.parse(doc.data, BufferJSON.reviver);
    } catch (err) {
      console.warn(`[MongoDB Auth] readData error for ${key}:`, err.message);
      return null;
    }
  };

  const removeData = async (key) => {
    try {
      await authCollection.deleteOne({ _id: String(key) });
    } catch { /* ok */ }
  };

  let creds = await readData("creds");
  if (!creds) {
    creds = typeof initAuthCreds === "function" ? initAuthCreds() : {};
    await writeData(creds, "creds");
  }

  const state = {
    creds,
    keys: {
      get: async (type, ids) => {
        const data = {};
        await Promise.all(
          ids.map(async (id) => {
            let value = await readData(`${type}-${id}`);
            if (type === "app-state-sync-key" && value && proto?.Message?.AppStateSyncKeyData) {
              try {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              } catch { /* fallback to raw */ }
            }
            if (value !== null && value !== undefined) {
              data[id] = value;
            }
          })
        );
        return data;
      },
      set: async (data) => {
        const operations = [];
        for (const category of Object.keys(data)) {
          for (const id of Object.keys(data[category])) {
            const value = data[category][id];
            const key = `${category}-${id}`;
            if (value) {
              operations.push({
                updateOne: {
                  filter: { _id: String(key) },
                  update: {
                    $set: {
                      data: JSON.stringify(value, BufferJSON.replacer),
                      updatedAt: new Date()
                    }
                  },
                  upsert: true,
                }
              });
            } else {
              operations.push({
                deleteOne: {
                  filter: { _id: String(key) },
                }
              });
            }
          }
        }
        if (operations.length > 0) {
          try {
            await authCollection.bulkWrite(operations, { ordered: false });
          } catch (bulkErr) {
            console.warn("[MongoDB Auth] bulkWrite error:", bulkErr.message);
          }
        }
      },
    },
  };

  return {
    state,
    saveCreds: () => writeData(state.creds, "creds"),
  };
}

async function saveMessageToStore(id, messageContent, jid) {
  if (!id || !messageContent) return;
  messageStore.set(id, messageContent);
  if (jid) {
    messageStore.set(`${jid}:${id}`, messageContent);
  }

  if (messagesCollection) {
    try {
      const serialized = JSON.stringify(messageContent, BufferJSON.replacer);
      await messagesCollection.updateOne(
        { _id: String(id) },
        { 
          $set: { 
            data: serialized, 
            jid: jid || null, 
            createdAt: new Date() 
          } 
        },
        { upsert: true }
      );
    } catch { /* non-fatal */ }
  } else {
    persistMessagesDebounced();
  }
}

async function getMessageFromStore(id, jid) {
  if (!id) return undefined;
  let msg = messageStore.get(id);
  if (!msg && jid) {
    msg = messageStore.get(`${jid}:${id}`);
  }
  if (msg) return msg;

  if (messagesCollection) {
    try {
      const doc = await messagesCollection.findOne({ _id: String(id) });
      if (doc?.data) {
        const parsed = JSON.parse(doc.data, BufferJSON.reviver);
        if (parsed) {
          messageStore.set(id, parsed);
          return parsed;
        }
      }
    } catch { /* non-fatal */ }
  }
  return undefined;
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

async function loadPersistedMessages() {
  if (messagesCollection) {
    try {
      const cursor = messagesCollection.find({}).sort({ createdAt: -1 }).limit(1000);
      const docs = await cursor.toArray();
      let count = 0;
      for (const doc of docs) {
        if (doc?._id && doc?.data) {
          try {
            const parsed = JSON.parse(doc.data, BufferJSON.reviver);
            messageStore.set(doc._id, parsed);
            count++;
          } catch { /* skip */ }
        }
      }
      if (count > 0) {
        console.log(`[WhatsApp] Loaded ${count} messages from MongoDB into store for decryption retry responses.`);
      }
      return;
    } catch (e) {
      console.warn("[WhatsApp] Could not load messages from MongoDB:", e.message);
    }
  }

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
        console.log(`[WhatsApp] Loaded ${data.length} messages from disk into store for decryption retry responses.`);
      }
    }
  } catch (e) {
    console.warn("[WhatsApp] Could not load message cache from disk:", e.message);
  }
}

/** Clean up persisted Baileys auth state completely (MongoDB collections & disk) */
async function cleanAuthDir() {
  messageStore.flushAll();
  msgRetryCounterCache.flushAll();
  userDevicesCache.flushAll();

  if (authCollection) {
    try {
      await authCollection.deleteMany({});
      console.log("[WhatsApp] Wiped clean MongoDB auth collection:", WA_MONGO_AUTH_COLLECTION);
    } catch (e) {
      console.warn("[WhatsApp] Error wiping Mongo auth collection:", e.message);
    }
  }
  if (messagesCollection) {
    try {
      await messagesCollection.deleteMany({});
      console.log("[WhatsApp] Wiped clean MongoDB messages collection:", WA_MONGO_MESSAGES_COLLECTION);
    } catch (e) {
      console.warn("[WhatsApp] Error wiping Mongo messages collection:", e.message);
    }
  }

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

    let authState = null;
    activeStorageType = "filesystem";

    if (MONGO_URL) {
      try {
        authState = await useMongoDBAuthState();
        if (authState) {
          activeStorageType = "mongodb";
          addLog(`[WhatsApp] Using MongoDB persistent session storage (${DB_NAME}.${WA_MONGO_AUTH_COLLECTION}).`);
        }
      } catch (e) {
        console.warn("[WhatsApp] MongoDB auth init failed, falling back to disk:", e.message);
      }
    }

    if (!authState) {
      const resolvedAuthDir = path.resolve(AUTH_DIR);
      if (!fs.existsSync(resolvedAuthDir)) {
        fs.mkdirSync(resolvedAuthDir, { recursive: true });
      }
      authState = await useMultiFileAuthState(resolvedAuthDir);
      activeStorageType = "filesystem";
      addLog("[WhatsApp] Using local filesystem session storage.");
    }

    const { state, saveCreds } = authState;
    await loadPersistedMessages();

    let version = [2, 3000, 1015901307];
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

    // Standard Ubuntu Chrome browser identity — optimal profile for Baileys web companion linking
    // Meta rejects "Desktop" profiles for phone pairing codes and restricts them on web
    const browserConfig = Browsers?.ubuntu
      ? Browsers.ubuntu("Chrome")
      : Browsers?.appropriate
        ? Browsers.appropriate("Chrome")
        : ["Ubuntu", "Chrome", "22.04.4"];

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
        const found = await getMessageFromStore(key.id, key.remoteJid);
        if (found) {
          addLog(`[Decryption Retry] Re-encrypting stored message for ID: ${key.id} -> ${key.remoteJid}`);
          return found;
        }
        addLog(`[Decryption Retry] Message ${key.id} not found in store for ${key.remoteJid}`);
        return undefined;
      },
    });

    let isSavingCreds = false;
    sock.ev.on("creds.update", async () => {
      try {
        isSavingCreds = true;
        await saveCreds();
      } catch (err) {
        console.error("[WhatsApp] Error saving credentials:", err.message);
      } finally {
        isSavingCreds = false;
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      for (const m of (messages || [])) {
        if (m.key?.id && m.message) {
          await saveMessageToStore(m.key.id, m.message, m.key.remoteJid);
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
          await cleanAuthDir();
          currentQR = null;
          await sleep(2000);
          startSock();
        } else if (isRestart) {
          addLog("Restart required (code 515: pairing handshake completed). Preserving credentials and restarting socket in 2s...");
          // Wait for any in-flight creds save to finish
          for (let i = 0; i < 6; i++) {
            if (!isSavingCreds) break;
            await sleep(500);
          }
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
    await saveMessageToStore(sent.key.id, sent.message, targetJid);
    if (targetJid !== jid) {
      await saveMessageToStore(sent.key.id, sent.message, jid);
    }
  }

  return sent;
}

// ── HTTP API ─────────────────────────────────────────────────────────────────
const app = express();
// 20mb accommodates base64-encoded media (~15mb raw) without allowing memory exhaustion
app.use(express.json({ limit: process.env.WA_BODY_LIMIT || "20mb" }));

// Public keep-alive endpoint (no secret) — for the pinger / uptime monitors.
app.get("/ping", (req, res) => res.json({
  status: "alive",
  connected: isConnected,
  hasQR: !!currentQR,
  hasUser: !!meUser,
  starting,
  lastDisconnect: lastDisconnectInfo?.message || null,
  version: "v2.10.11",
  storage: activeStorageType,
  mongoConnected: !!mongoClient && !!mongoDb,
  mongoConfigured: !!MONGO_URL,
  mongoError: lastMongoError,
  dbName: DB_NAME,
  uptimeSec: Math.floor(process.uptime()),
  messageCount: messageStore.map.size,
}));

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
    storage: activeStorageType,
    mongoConnected: !!mongoClient && !!mongoDb,
    mongoConfigured: !!MONGO_URL,
    mongoError: lastMongoError,
    dbName: DB_NAME,
    version: "v2.10.11",
    recentLogs: recentLogs.slice(0, 15),
  });
});

app.post("/configure-storage", async (req, res) => {
  const { mongoUrl, dbName } = req.body || {};
  if (!mongoUrl) {
    return res.status(400).json({ error: "mongoUrl is required" });
  }
  try {
    addLog(`[Storage Config] Received storage configuration request for DB: ${dbName || DB_NAME}`);
    
    // Save to persisted config file
    try {
      fs.writeFileSync(
        CONFIG_FILE,
        JSON.stringify({ mongoUrl, dbName: dbName || DB_NAME, updatedAt: new Date().toISOString() }),
        "utf-8"
      );
    } catch (writeErr) {
      console.warn("[Storage Config] Failed to save mongo_config.json:", writeErr.message);
    }

    const db = await initMongoDb(mongoUrl, dbName);
    if (!db) {
      return res.status(500).json({
        success: false,
        error: lastMongoError || "Failed to connect to MongoDB with provided URL",
        storage: activeStorageType,
      });
    }

    // If socket is not connected, restart socket to use MongoDB auth
    if (!isConnected) {
      addLog("[Storage Config] Restarting WhatsApp socket with MongoDB auth persistence...");
      await startSock();
    }

    res.json({
      success: true,
      storage: "mongodb",
      mongoConnected: true,
      dbName: DB_NAME,
      message: "Successfully connected to MongoDB Atlas for session persistence.",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, storage: activeStorageType });
  }
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

  await cleanAuthDir();
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

  // Ensure socket is alive and ready
  if (!sock || !sock.ws || sock.ws.readyState !== 1) {
    addLog(`[Pairing Code] Initializing socket for pairing phone +${digits}...`);
    await startSock();
    for (let i = 0; i < 10; i++) {
      if (sock?.ws?.readyState === 1 || currentQR) break;
      await sleep(500);
    }
  }

  try {
    if (typeof sock?.requestPairingCode !== "function") {
      return res.status(500).json({ error: "Pairing code is not supported by the current Baileys build." });
    }

    let rawCode;
    try {
      rawCode = await sock.requestPairingCode(digits);
    } catch (firstErr) {
      addLog(`[Pairing Code] Initial attempt failed (${firstErr.message}), cycling socket for clean pairing code...`);
      await startSock();
      for (let i = 0; i < 10; i++) {
        if (sock?.ws?.readyState === 1 || currentQR) break;
        await sleep(500);
      }
      rawCode = await sock.requestPairingCode(digits);
    }

    const formattedCode = rawCode?.match(/.{1,4}/g)?.join("-") || rawCode;
    addLog(`[WhatsApp] Pairing code successfully generated for +${digits}: ${formattedCode}`);
    res.json({ success: true, pairingCode: formattedCode, rawCode, phone: digits });
  } catch (e) {
    console.error("[WhatsApp] Pairing code generation error:", e.message);
    addLog(`[WhatsApp] Pairing code error for +${digits}: ${e.message}`);
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
