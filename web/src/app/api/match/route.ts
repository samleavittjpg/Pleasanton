import { NextResponse } from "next/server";

type MatchState = {
  matchId: string;
  lengthMinutes: number;
  /** plot index string -> player display name or null if empty */
  plots: Record<string, string | null>;
  createdAt: number;
};

const matches = new Map<string, MatchState>();

const PLOT_COUNT = 16;

function normalizeId(id: string) {
  return id.trim().toUpperCase();
}

function makeMatchCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]!;
  }
  return matches.has(code) ? makeMatchCode() : code;
}

function emptyPlots(): Record<string, string | null> {
  const plots: Record<string, string | null> = {};
  for (let i = 0; i < PLOT_COUNT; i++) {
    plots[String(i)] = null;
  }
  return plots;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = normalizeId(searchParams.get("matchId") ?? "");
  if (!matchId) {
    return NextResponse.json({ error: "matchId required" }, { status: 400 });
  }
  const match = matches.get(matchId);
  if (!match) {
    return NextResponse.json({ exists: false, matchId });
  }
  return NextResponse.json({
    exists: true,
    matchId: match.matchId,
    lengthMinutes: match.lengthMinutes,
    plots: match.plots,
  });
}

export async function POST(request: Request) {
  let body: {
    action?: string;
    matchId?: string;
    lengthMinutes?: number;
    plotId?: string;
    playerName?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action;

  if (action === "createMatch") {
    const lengthMinutes = body.lengthMinutes === 20 || body.lengthMinutes === 30 ? body.lengthMinutes : 10;
    const matchId = makeMatchCode();
    const match: MatchState = {
      matchId,
      lengthMinutes,
      plots: emptyPlots(),
      createdAt: Date.now(),
    };
    matches.set(matchId, match);
    return NextResponse.json({ matchId });
  }

  if (action === "joinMatch") {
    const matchId = normalizeId(body.matchId ?? "");
    if (!matchId) {
      return NextResponse.json({ ok: false, error: "matchId required" }, { status: 400 });
    }
    const match = matches.get(matchId);
    if (!match) {
      return NextResponse.json({ ok: false, error: "Match not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, matchId });
  }

  if (action === "pickPlot") {
    const matchId = normalizeId(body.matchId ?? "");
    const plotId = body.plotId != null ? String(body.plotId) : "";
    const playerName = (body.playerName ?? "Anonymous").trim().slice(0, 32) || "Anonymous";

    if (!matchId || !/^\d+$/.test(plotId)) {
      return NextResponse.json({ ok: false, error: "Invalid match or plot" }, { status: 400 });
    }
    const idx = Number(plotId);
    if (idx < 0 || idx >= PLOT_COUNT) {
      return NextResponse.json({ ok: false, error: "Invalid plot" }, { status: 400 });
    }

    const match = matches.get(matchId);
    if (!match) {
      return NextResponse.json({ ok: false, error: "Match not found" }, { status: 404 });
    }

    const key = String(idx);
    const current = match.plots[key];
    if (current != null) {
      return NextResponse.json({ ok: false, error: "Plot already taken" }, { status: 409 });
    }

    match.plots[key] = playerName;
    return NextResponse.json({ ok: true, plots: match.plots });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
