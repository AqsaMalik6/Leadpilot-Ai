"use strict";

/**
 * Baileys' documented custom auth-state extension point, adapted to persist through
 * the FastAPI backend (which encrypts at rest with the same Fernet helper used for
 * gmail_accounts/Integration) instead of Baileys' default `useMultiFileAuthState`
 * (loose files on disk). Everything that would have been separate files in a folder
 * (creds.json, one file per signal key) is flattened into a single JSON object and
 * round-tripped through /api/internal/whatsapp/{orgId}/auth-state as one blob.
 */

const { BufferJSON, initAuthCreds, proto } = require("@whiskeysockets/baileys");

async function backendGet(backendUrl, secret, path) {
  const res = await fetch(`${backendUrl}${path}`, { headers: { "X-Sidecar-Secret": secret } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`backend GET ${path} failed: ${res.status}`);
  return res.json();
}

async function backendPut(backendUrl, secret, path, body) {
  const res = await fetch(`${backendUrl}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Sidecar-Secret": secret },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`backend PUT ${path} failed: ${res.status}`);
}

async function useBackendAuthState(backendUrl, secret, orgId) {
  const path = `/api/internal/whatsapp/${orgId}/auth-state`;
  let parsed = null;
  const existing = await backendGet(backendUrl, secret, path);
  if (existing && existing.authState) {
    parsed = JSON.parse(existing.authState, BufferJSON.reviver);
  }

  const creds = (parsed && parsed.creds) || initAuthCreds();
  const keysData = (parsed && parsed.keys) || {};

  const saveState = async () => {
    const payload = { creds, keys: keysData };
    await backendPut(backendUrl, secret, path, { authState: JSON.stringify(payload, BufferJSON.replacer) });
  };

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const result = {};
          for (const id of ids) {
            let value = keysData[type] && keysData[type][id];
            if (value && type === "app-state-sync-key") {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            if (value !== undefined) result[id] = value;
          }
          return result;
        },
        set: async (data) => {
          // Baileys signals "delete this key" with a falsy value for that id, not by
          // omitting it — mirroring useMultiFileAuthState's own write-or-remove logic.
          for (const category of Object.keys(data)) {
            keysData[category] = keysData[category] || {};
            for (const id of Object.keys(data[category])) {
              const value = data[category][id];
              if (value) {
                keysData[category][id] = value;
              } else {
                delete keysData[category][id];
              }
            }
          }
          await saveState();
        },
      },
    },
    saveCreds: saveState,
  };
}

module.exports = { useBackendAuthState };
