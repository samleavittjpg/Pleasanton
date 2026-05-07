import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

function safeId(raw: string) {
  // Keep it filename-safe and stable.
  return raw.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "unknown";
}

function graffitiDir() {
  return path.join(process.cwd(), "data", "graffiti");
}

function graffitiPath(houseId: string) {
  return path.join(graffitiDir(), `${safeId(houseId)}.png`);
}

async function ensureDir() {
  await fs.mkdir(graffitiDir(), { recursive: true });
}

export async function GET(_req: Request, ctx: { params: Promise<{ houseId: string }> }) {
  const { houseId } = await ctx.params;
  const p = graffitiPath(houseId);
  try {
    const buf = await fs.readFile(p);
    return new Response(buf, {
      headers: {
        "content-type": "image/png",
        "cache-control": "no-store",
      },
    });
  } catch (err: unknown) {
    const code = typeof err === "object" && err != null && "code" in err ? (err as { code?: string }).code : undefined;
    if (code === "ENOENT") return NextResponse.json({ exists: false }, { status: 404 });
    return NextResponse.json({ error: "Failed to read graffiti" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ houseId: string }> }) {
  const { houseId } = await ctx.params;
  let body: { pngDataUrl?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const dataUrl = body.pngDataUrl ?? "";
  const m = /^data:image\/png;base64,(.+)$/i.exec(dataUrl);
  if (!m) {
    return NextResponse.json({ ok: false, error: "pngDataUrl must be a base64 data URL" }, { status: 400 });
  }

  try {
    await ensureDir();
    const buf = Buffer.from(m[1]!, "base64");
    await fs.writeFile(graffitiPath(houseId), buf);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to save graffiti" }, { status: 500 });
  }
}

