import { NextResponse } from "next/server";
import { decodeShortcutPayload } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Stateless download: the gzipped plist rides in the `d` query param, so
 * this works on any serverless instance with no shared storage. The codec
 * rejects anything that doesn't decode to an XML plist.
 */
export async function GET(request: Request) {
  const payload = new URL(request.url).searchParams.get("d") ?? "";
  const file = decodeShortcutPayload(payload);
  if (!file) {
    return NextResponse.json(
      { error: "This shortcut link is malformed. Fire the order again." },
      { status: 404 },
    );
  }

  const safeName = file.name.replace(/[^\w .-]/g, "").trim() || "Shortcut";
  return new NextResponse(Buffer.from(file.body), {
    headers: {
      // application/octet-stream keeps Apple's importer (and browsers)
      // treating this as a file download rather than displayable XML.
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}.shortcut"`,
    },
  });
}
