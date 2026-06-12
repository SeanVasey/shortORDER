/**
 * Ephemeral .shortcut hosting.
 *
 * The Shortcuts importer needs a publicly fetchable http(s) URL — a data:
 * URI will not work — so generated files are stored briefly and streamed
 * back through GET /api/shortcut/[id].
 *
 * Backends:
 *  - Vercel Blob when BLOB_READ_WRITE_TOKEN is set (durable across
 *    serverless instances; objects are deleted after TTL on read-through).
 *  - In-process memory otherwise (local dev / single long-lived server).
 *
 * Cloudflare R2 can slot in later behind the same interface.
 */

import { randomUUID } from "node:crypto";

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
    });
  },
  async get(id) {
    const { head, del } = await import("@vercel/blob");
    try {
      const info = await head(`shortcuts/${id}.json`);
      const res = await fetch(info.url);
      if (!res.ok) return null;
      const envelope = (await res.json()) as { name: string; createdAt: number; plist: string };
      if (Date.now() - envelope.createdAt > SHORTCUT_TTL_MS) {
        await del(info.url).catch(() => {});
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

function activeStore(): ShortcutStore {
  return process.env.BLOB_READ_WRITE_TOKEN ? blobStore : memoryStore;
}

export async function storeShortcut(name: string, plistXml: string): Promise<string> {
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
