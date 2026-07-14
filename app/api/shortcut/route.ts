import { NextResponse } from "next/server";
import { validateGraph } from "@/lib/graph";
import { graphToShortcutPlist } from "@/lib/plist";
import {
  activeBackend,
  encodeShortcutPayload,
  storageEnvCandidates,
  storeShortcut,
} from "@/lib/storage";

export const runtime = "nodejs";

/** Resolve the public origin Apple's importer will fetch from. */
function publicOrigin(request: Request): string {
  const fixed = process.env.PUBLIC_BASE_URL;
  if (fixed) return fixed.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  let graph;
  try {
    const body = (await request.json()) as { graph?: unknown };
    graph = validateGraph(body.graph);
  } catch {
    return NextResponse.json({ error: "Invalid action graph." }, { status: 400 });
  }

  if (graph.feasibility === "impossible" || graph.actions.length === 0) {
    return NextResponse.json(
      { error: "Nothing to serialize for this order." },
      { status: 422 },
    );
  }

  const plist = graphToShortcutPlist(graph);
  const origin = publicOrigin(request);

  let fileUrl: string;
  let id: string | undefined;
  let storage: "blob" | "stateless" | "memory";

  if (activeBackend() === "blob") {
    id = await storeShortcut(graph.title, plist);
    fileUrl = `${origin}/api/shortcut/${id}`;
    storage = "blob";
  } else {
    // No blob token: prefer the stateless URL — it works on any serverless
    // instance. Memory only when the file is too large to ride the URL.
    const payload = encodeShortcutPayload(graph.title, plist);
    if (payload) {
      fileUrl = `${origin}/api/shortcut/dl?d=${payload}`;
      storage = "stateless";
    } else {
      id = await storeShortcut(graph.title, plist);
      fileUrl = `${origin}/api/shortcut/${id}`;
      storage = "memory";
    }
  }

  const importUrl =
    "shortcuts://import-shortcut?" +
    new URLSearchParams({
      url: fileUrl,
      name: graph.title,
      silent: "false", // always let the user review before adding
    }).toString();

  return NextResponse.json({
    ...(id ? { id } : {}),
    fileUrl,
    importUrl,
    storage,
    // Misconfiguration aid: env key NAMES (never values) that look
    // storage-related, present only while the memory fallback is active.
    ...(storage === "memory" ? { storageEnvCandidates: storageEnvCandidates() } : {}),
  });
}
