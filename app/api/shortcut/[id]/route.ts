import { NextResponse } from "next/server";
import { loadShortcut } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const file = await loadShortcut(id);
  if (!file) {
    return NextResponse.json(
      { error: "This shortcut has expired. Fire the order again." },
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
