"use strict";

/**
 * SKILL-MULTI-TENANT-CONNECT.md §3 — connects a customer's real WhatsApp number via
 * the same unofficial "linked device" protocol WhatsApp Web itself uses (QR pairing),
 * so no Meta App/Business account is ever needed. Localhost-only, never publicly
 * exposed: an outbound WebSocket to WhatsApp's own servers, nothing external needs to
 * reach this process.
 *
 * One in-memory Baileys socket per connected organization. Never a bulk/broadcast
 * tool — this is strictly 1:1 reply-to-inbound-lead traffic (see
 * backend/app/services/whatsapp_service.py's docstring for the full ban-risk
 * disclosure carried through to the dashboard UI).
 */

require("dotenv/config");
const express = require("express");
const qrcode = require("qrcode");
const pino = require("pino");
const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const { useBackendAuthState } = require("./authState");

const PORT = Number(process.env.SIDECAR_PORT || 8020);
const BACKEND_URL = process.env.LEADPILOT_BACKEND_URL || "http://127.0.0.1:8010";
const SECRET = process.env.SIDECAR_INTERNAL_SECRET || "";

if (!SECRET) {
  console.error("SIDECAR_INTERNAL_SECRET is not set — refusing to start (see .env.example)");
  process.exit(1);
}

const logger = pino({ level: process.env.LOG_LEVEL || "warn" });

/** @type {Map<string, { sock: any }>} */
const sessions = new Map();
// Tracked separately from `sessions` (not inside the per-connection entry) so the
// count survives across startSession() restarts instead of resetting to 0 every
// reconnect — otherwise MAX_RECONNECT_ATTEMPTS would never actually trigger.
const reconnectAttempts = new Map();

// Reconnect backoff caps at ~5 minutes, and stops retrying entirely after 10
// consecutive failures (requires a manual "Reconnect" click from the dashboard
// after that) — a tight reconnect loop is a known real trigger for WhatsApp
// flagging automated linked-device behavior, so this is deliberate, not an oversight.
const MAX_RECONNECT_ATTEMPTS = 10;
function backoffDelayMs(attempt) {
  return Math.min(5000 * 2 ** attempt, 5 * 60 * 1000);
}

// The package's bundled default protocol version goes stale as WhatsApp updates
// their servers — connecting with a stale version gets rejected outright with
// statusCode 405 ("Connection Failure"), before a QR ever has a chance to render.
// fetchLatestBaileysVersion() fixes that but hits an external endpoint with no
// built-in timeout — on a flaky connection it can hang indefinitely (reproduced
// live: every reconnect attempt stalled forever instead of failing). Race it
// against a hard timeout instead of trusting it unconditionally either way.
async function getWAVersion() {
  try {
    const { version } = await Promise.race([
      fetchLatestBaileysVersion(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("version fetch timed out after 8s")), 8000)),
    ]);
    return version;
  } catch (err) {
    logger.warn({ err }, "couldn't fetch the latest WhatsApp protocol version in time — falling back to the bundled default (may get rejected with statusCode 405 if it's stale; the next reconnect attempt will try fetching a fresh one again)");
    return undefined;
  }
}

async function backendCall(method, path, body) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-Sidecar-Secret": SECRET },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`backend call failed: ${method} ${path} -> ${res.status}`);
  }
  return res.status === 404 ? null : res.json();
}

async function startSession(orgId, { force = false } = {}) {
  const existing = sessions.get(orgId);
  if (existing) {
    // Without `force`, stay idempotent — a double-click or page refresh mid-pairing
    // can't spin up a second socket. But the dashboard's "Connect" button only ever
    // calls this endpoint when it already believes the account is NOT connected, so a
    // stale in-memory socket left over from an earlier attempt (still reconnecting, or
    // stuck after the phone never scanned it) must not silently block a fresh pairing
    // — that produced the exact "QR showed but my phone said login failed" symptom
    // (customer scanning an old, already-expired QR because no new socket was ever
    // started for their retry).
    if (!force) return;
    sessions.delete(orgId);
    reconnectAttempts.delete(orgId);
    try {
      // Strip the old socket's listeners first so its own "connection.update" close
      // handler can't post a stray status update or schedule a reconnect for a
      // session we're intentionally replacing right now.
      existing.sock.ev.removeAllListeners();
      existing.sock.end(new Error("restarting for a fresh /connect request"));
    } catch (err) {
      logger.warn({ err, orgId }, "error ending stale socket before restart — continuing anyway");
    }
  }

  const { state, saveCreds } = await useBackendAuthState(BACKEND_URL, SECRET, orgId);
  const version = await getWAVersion();
  const sock = makeWASocket({ auth: state, logger, printQRInTerminal: false, ...(version ? { version } : {}) });

  const entry = { sock };
  sessions.set(orgId, entry);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const qrDataUrl = await qrcode.toDataURL(qr);
      await backendCall("POST", `/api/internal/whatsapp/${orgId}/status`, { state: "qr_pending", qr: qrDataUrl }).catch((err) =>
        logger.error({ err, orgId }, "failed to post QR to backend")
      );
    }

    if (connection === "open") {
      const phoneNumber = sock.user && sock.user.id ? sock.user.id.split(":")[0] : null;
      reconnectAttempts.delete(orgId);
      await backendCall("POST", `/api/internal/whatsapp/${orgId}/status`, { state: "connected", phoneNumber }).catch((err) =>
        logger.error({ err, orgId }, "failed to post connected status to backend")
      );
    }

    if (connection === "close") {
      const statusCode = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output && lastDisconnect.error.output.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      sessions.delete(orgId);
      logger.warn(
        { orgId, statusCode, message: lastDisconnect && lastDisconnect.error && lastDisconnect.error.message },
        "whatsapp connection closed"
      );

      if (loggedOut) {
        reconnectAttempts.delete(orgId);
        await backendCall("POST", `/api/internal/whatsapp/${orgId}/status`, { state: "disconnected" }).catch(() => {});
        await backendCall("DELETE", `/api/internal/whatsapp/${orgId}/auth-state`).catch(() => {});
        return;
      }

      const attempt = (reconnectAttempts.get(orgId) ?? 0) + 1;
      reconnectAttempts.set(orgId, attempt);
      if (attempt > MAX_RECONNECT_ATTEMPTS) {
        await backendCall("POST", `/api/internal/whatsapp/${orgId}/status`, {
          state: "error",
          error: "Too many reconnect failures — click Reconnect on the dashboard to try again",
        }).catch(() => {});
        return;
      }
      const delay = backoffDelayMs(attempt);
      logger.warn({ orgId, attempt, delay }, "reconnecting with backoff");
      setTimeout(() => startSession(orgId).catch((err) => logger.error({ err, orgId }, "reconnect attempt failed")), delay);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      // Groups (@g.us) and status broadcasts (@broadcast) are never a real 1:1 lead
      // conversation — remoteJid for a group is the GROUP's own id, not the actual
      // sender's phone number, so forwarding these produced fake "leads" keyed by a
      // group id instead of a real customer's number. Only individual DMs
      // (@s.whatsapp.net) are ever real inbound leads.
      const remoteJid = msg.key.remoteJid || "";
      if (remoteJid.endsWith("@g.us") || remoteJid.endsWith("@broadcast")) continue;
      // Text-only — media/voice messages aren't handled (an honest, disclosed scope
      // limit, not silently dropped-and-pretend-nothing-happened: see the plan doc).
      const text = msg.message && (msg.message.conversation || (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text));
      if (!text) continue;
      // WhatsApp's LID (linked-identity) rollout means remoteJid for a real 1:1 chat
      // can be a privacy-preserving @lid address instead of the actual phone-number
      // JID — the numeric part of a @lid is an opaque internal id, NOT a dialable
      // number. Baileys surfaces the real phone-number JID separately on
      // msg.key.senderPn whenever WhatsApp's server includes it (confirmed against
      // this installed package's Types/Message.d.ts — WAMessageKey.senderPn). Without
      // this, a @lid contact's "phone number" was stored as garbled digits that look
      // real but aren't — showed wrong in the dashboard and made every reply send fail
      // with "422 not a valid/registered WhatsApp number" (a LID formatted as if it
      // were a phone-number JID isn't a registered one).
      const isLid = remoteJid.endsWith("@lid");
      const from = isLid ? (msg.key.senderPn ? msg.key.senderPn.split("@")[0] : remoteJid) : remoteJid.split("@")[0];
      if (!from) continue;
      const fromName = msg.pushName || from;
      try {
        await backendCall("POST", `/api/internal/whatsapp/${orgId}/inbound`, { from, fromName, text, waMessageId: msg.key.id });
      } catch (err) {
        logger.error({ err, orgId }, "failed to forward inbound message to backend");
      }
    }
  });
}

const app = express();
app.use(express.json());

// Defense in depth: even though this service is meant to be localhost-only and never
// publicly exposed, every endpoint still requires the shared secret.
app.use((req, res, next) => {
  if (req.header("X-Sidecar-Secret") !== SECRET) return res.status(401).json({ error: "unauthorized" });
  next();
});

app.post("/sessions/:orgId/start", async (req, res) => {
  try {
    await startSession(req.params.orgId, { force: req.query.force === "true" });
    res.json({ status: "started" });
  } catch (err) {
    logger.error({ err, orgId: req.params.orgId }, "failed to start session");
    res.status(500).json({ error: String(err) });
  }
});

app.get("/sessions/:orgId/status", (req, res) => {
  res.json({ active: sessions.has(req.params.orgId) });
});

app.post("/sessions/:orgId/send", async (req, res) => {
  const entry = sessions.get(req.params.orgId);
  if (!entry) return res.status(409).json({ error: "no active session for this org" });
  const { to, text } = req.body || {};
  if (!to || !text) return res.status(400).json({ error: "to and text are required" });
  try {
    const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
    if (!to.includes("@")) {
      // If this number isn't actually registered on WhatsApp, sendMessage can hang
      // waiting on a prekey lookup that never resolves instead of failing cleanly —
      // check first so a bad number surfaces as a clear error, not a 12s timeout.
      const [check] = await entry.sock.onWhatsApp(to).catch(() => []);
      if (!check || !check.exists) {
        return res.status(422).json({ error: `${to} is not a valid/registered WhatsApp number` });
      }
    }
    // sock.sendMessage has no built-in timeout — on a broken IPv6 route (observed
    // live: the socket receives inbound messages fine but sendMessage hangs ~15s+
    // per attempt) it hangs instead of failing, so the backend's own 15s client
    // timeout is what was actually firing. Fail fast here with a clear reason
    // instead of a bare httpx.ReadTimeout on the caller's side.
    await Promise.race([
      entry.sock.sendMessage(jid, { text }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("sendMessage timed out after 12s — likely a broken IPv6 route; try --dns-result-order=ipv4first")), 12000)),
    ]);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, orgId: req.params.orgId }, "send failed");
    res.status(500).json({ error: String(err) });
  }
});

app.post("/sessions/:orgId/logout", async (req, res) => {
  const entry = sessions.get(req.params.orgId);
  if (entry) {
    try {
      await entry.sock.logout();
    } catch (err) {
      logger.warn({ err, orgId: req.params.orgId }, "logout call failed, clearing local session anyway");
    }
    sessions.delete(req.params.orgId);
  }
  res.json({ ok: true });
});

async function resumeConnectedOrgsOnBoot() {
  // The live Baileys socket only ever exists in THIS process's memory — a backend
  // restart never touches it (separate OS process), but a sidecar restart (crash,
  // manual restart, or this file's own --watch reload) wipes the in-memory
  // `sessions` Map even though the real creds are safely persisted in Postgres.
  // Without this, every sidecar restart silently sat "connected" in the DB while
  // actually having no live socket, until someone happened to click Connect on the
  // dashboard — resume automatically instead so it's never noticeable at all.
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const data = await backendCall("GET", "/api/internal/whatsapp/connected-orgs");
      const orgIds = (data && data.organizationIds) || [];
      logger.info({ orgIds }, "resuming previously-connected WhatsApp sessions on boot");
      for (const orgId of orgIds) {
        startSession(orgId).catch((err) => logger.error({ err, orgId }, "failed to auto-resume session on boot"));
      }
      return;
    } catch (err) {
      // The backend can still be mid-cold-start (its own dependency imports alone
      // take 20-30s) when the sidecar boots first — retry with backoff instead of
      // giving up after one failed attempt.
      logger.warn({ err, attempt }, "backend not reachable yet for boot-time resume — retrying");
      await new Promise((r) => setTimeout(r, attempt * 5000));
    }
  }
  logger.error("giving up on boot-time session resume after 5 attempts — connect manually from the dashboard");
}

app.listen(PORT, "127.0.0.1", () => {
  console.log(`whatsapp-sidecar listening on http://127.0.0.1:${PORT} (backend: ${BACKEND_URL})`);
  resumeConnectedOrgsOnBoot();
});
