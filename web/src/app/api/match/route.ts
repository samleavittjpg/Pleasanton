import { NextResponse } from "next/server";

type MatchRecord = { lengthMinutes: 10 | 20 | 30; createdAt: number };

const matches = new Map<string, MatchRecord>();

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const action = (body as { action?: string }).action;

  if (action === "createMatch") {
    const lengthMinutes = (body as { lengthMinutes?: number }).lengthMinutes;
    if (lengthMinutes !== 10 && lengthMinutes !== 20 && lengthMinutes !== 30) {
      return NextResponse.json({ error: "lengthMinutes must be 10, 20, or 30" }, { status: 400 });
    }
    const matchId = crypto.randomUUID();
    matches.set(matchId, { lengthMinutes, createdAt: Date.now() });
    return NextResponse.json({ matchId });
  }

  if (action === "joinMatch") {
    const matchId = (body as { matchId?: string }).matchId;
    if (!matchId || typeof matchId !== "string" || !matches.has(matchId)) {
      return NextResponse.json({ ok: false as const, error: "Match not found" });
    }
    return NextResponse.json({ ok: true as const });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
