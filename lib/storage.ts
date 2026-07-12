/**
 * Ephemeral .shortcut hosting.
 *
 * The Shortcuts importer needs a publicly fetchable http(s) URL — a data:
 * URI will not work — so generated files are served back through
 * GET /api/shortcut/*.
 *
 * Backends:
 *  - Vercel Blob when a read-write token is set (durable across
 *    serverless instances; objects are deleted after TTL on read-through).
 *  - Stateless otherwise: the gzipped plist rides inside the download URL
 *    itself (GET /api/shortcut/dl?d=…), so any serverless instance can
 *    serve it with no shared storage at all.
 *  - In-process memory only as the last resort for payloads too large to
 *    fit in a URL when no Blob token exists — fragile on serverless, and
 *    surfaced as such to the client.
 */

import { randomUUID } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";

export const SHORTCUT_TTL_MS = 15 * 60 * 1000;

export interface StoredShortcut {
  body: Uint8Array;
  name: string;
  createdAt: number;
}

interface ShortcutStore {
  put(id: string, file: StoredShortcut): Promise<void>;
  get(id: string): Promise<StoredShortcut | null>;
}

// ── Memory backend ──────────────────────────────────────────────────────────

const memory = new Map<string, StoredShortcut>();

function sweep() {
  const now = Date.now();
  for (const [id, f] of memory) {
    if (now - f.createdAt > SHORTCUT_TTL_MS) memory.delete(id);
  }
}

const memoryStore: ShortcutStore = {
  async put(id, file) {
    sweep();
    memory.set(id, file);
  },
  async get(id) {
    sweep();
    return memory.get(id) ?? null;
  },
};

// ── Vercel Blob backend ─────────────────────────────────────────────────────

/**
 * Resolve the Blob read-write token. Connecting a store with a custom
 * environment-variable prefix yields `<PREFIX>_READ_WRITE_TOKEN` instead of
 * the default `BLOB_READ_WRITE_TOKEN`; accept either so a rename in the
 * Vercel dashboard doesn't silently drop the app onto the memory fallback.
 */
function blobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  // Any non-empty *_READ_WRITE_TOKEN counts; token value formats have
  // changed over time, so don't filter on the value. Prefer a key
  // mentioning BLOB if several match.
  const matches = Object.entries(process.env)
    .filter(([key, value]) => key.endsWith("_READ_WRITE_TOKEN") && value)
    .sort(([a], [b]) => Number(b.includes("BLOB")) - Number(a.includes("BLOB")));
  return matches[0]?.[1];
}

/** Env key NAMES (never values) relevant to storage config — for diagnostics. */
export function storageEnvCandidates(): string[] {
  return Object.keys(process.env)
    .filter((k) => /BLOB|READ_WRITE_TOKEN/i.test(k))
    .sort();
}

// Blob objects are a small JSON envelope so the display name and creation
// time survive without relying on provider metadata support.
const blobStore: ShortcutStore = {
  async put(id, file) {
    const { put } = await import("@vercel/blob");
    const envelope = JSON.stringify({
      name: file.name,
      createdAt: file.createdAt,
      plist: new TextDecoder().decode(file.body),
    });
    await put(`shortcuts/${id}.json`, envelope, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      cacheControlMaxAge: Math.floor(SHORTCUT_TTL_MS / 1000),
      token: blobToken(),
    });
  },
  async get(id) {
    const { head, del } = await import("@vercel/blob");
    try {
      const info = await head(`shortcuts/${id}.json`, { token: blobToken() });
      const res = await fetch(info.url);
      if (!res.ok) return null;
      const envelope = (await res.json()) as { name: string; createdAt: number; plist: string };
      if (Date.now() - envelope.createdAt > SHORTCUT_TTL_MS) {
        await del(info.url, { token: blobToken() }).catch(() => {});
        return null;
      }
      return {
        body: new TextEncoder().encode(envelope.plist),
        name: envelope.name,
        createdAt: envelope.createdAt,
      };
    } catch {
      return null;
    }
  },
};

// ── Stateless backend: the file travels inside the URL ─────────────────────

/**
 * Cap on the encoded payload so the shortcuts://import-shortcut URL (which
 * wraps the download URL again) stays well inside URL/header limits.
 */
export const MAX_STATELESS_PAYLOAD_CHARS = 6000;
const MAX_DECODED_BYTES = 256 * 1024;

/**
 * gzip + base64url the plist and its display name. Returns null when the
 * result would not fit in a URL — callers fall back to a stored backend.
 */
export function encodeShortcutPayload(name: string, plistXml: string): string | null {
  const envelope = JSON.stringify({ name, plist: plistXml });
  const payload = gzipSync(Buffer.from(envelope, "utf8")).toString("base64url");
  return payload.length <= MAX_STATELESS_PAYLOAD_CHARS ? payload : null;
}

/**
 * Inverse of encodeShortcutPayload. Returns null on anything malformed:
 * bad charset, corrupt gzip, oversized output, or content that is not an
 * XML plist — this endpoint must not become an arbitrary-download oracle.
 */
export function decodeShortcutPayload(payload: string): StoredShortcut | null {
  if (!payload || payload.length > MAX_STATELESS_PAYLOAD_CHARS || !/^[\w-]+$/.test(payload)) {
    return null;
  }
  try {
    const raw = gunzipSync(Buffer.from(payload, "base64url"), { maxOutputLength: MAX_DECODED_BYTES });
    const envelope = JSON.parse(raw.toString("utf8")) as { name?: unknown; plist?: unknown };
    if (typeof envelope.name !== "string" || typeof envelope.plist !== "string") return null;
    if (!envelope.plist.trimStart().startsWith("<?xml") || !envelope.plist.includes("<plist")) return null;
    return {
      body: new TextEncoder().encode(envelope.plist),
      name: envelope.name,
      createdAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/** Which backend is live — surfaced by POST /api/shortcut for diagnosability. */
export function activeBackend(): "blob" | "stateless" {
  return blobToken() ? "blob" : "stateless";
}

function activeStore(): ShortcutStore {
  return activeBackend() === "blob" ? blobStore : memoryStore;
}

let warnedMemoryInProd = false;

/**
 * Store the file in blob (token present) or memory (oversized-payload
 * fallback). The common no-token path never reaches this — it rides the
 * stateless URL instead.
 */
export async function storeShortcut(name: string, plistXml: string): Promise<string> {
  if (activeBackend() !== "blob" && process.env.NODE_ENV === "production" && !warnedMemoryInProd) {
    warnedMemoryInProd = true;
    console.warn(
      `storage: memory fallback in prod (payload too large for a stateless URL); candidate env keys: ${storageEnvCandidates().join("|") || "none"}`,
    );
  }
  // Hyphen-free id keeps the import URL tidy.
  const id = randomUUID().replace(/-/g, "");
  await activeStore().put(id, {
    body: new TextEncoder().encode(plistXml),
    name,
    createdAt: Date.now(),
  });
  return id;
}

export async function loadShortcut(id: string): Promise<StoredShortcut | null> {
  if (!/^[0-9a-f]{32}$/.test(id)) return null;
  return activeStore().get(id);
}
