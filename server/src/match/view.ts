import { RIVAL_VISIBILITY } from "./constants.js";
import type { MatchState, NeighborhoodState, PlayerId } from "./types.js";
import { roundTo } from "./util.js";

export type PublicNeighborhoodView = {
  ownerPlayerId: PlayerId;
  avgHappiness: number;
  // coarse, 0..1
  cleanliness01: number;
  graffitiFree01: number;
  foreclosures01: number;
  heatLevel: "low" | "medium" | "high";
};

export type MatchView = {
  id: string;
  status: MatchState["status"];
  lengthSeconds: number;
  tick: number;
  startedAtMs?: number;
  endedAtMs?: number;
  winnerPlayerId?: PlayerId;
  players: MatchState["players"];
  you: {
    playerId: PlayerId;
    neighborhood: NeighborhoodState;
  };
  rivals: PublicNeighborhoodView[];
};

function heatLevel(heat: number): PublicNeighborhoodView["heatLevel"] {
  if (heat >= 60) return "high";
  if (heat >= 25) return "medium";
  return "low";
}

export function buildMatchView(match: MatchState, viewerPlayerId: PlayerId): MatchView {
  const youN = match.neighborhoods[viewerPlayerId];
  if (!youN) throw new Error("Viewer not in match.");

  const rivals: PublicNeighborhoodView[] = [];
  for (const p of match.players) {
    if (p.id === viewerPlayerId) continue;
    const n = match.neighborhoods[p.id];
    if (!n) continue;
    rivals.push({
      ownerPlayerId: n.ownerPlayerId,
      avgHappiness: roundTo(n.avgHappiness, 2),
      cleanliness01: roundTo(n.metrics.cleanliness01, 2),
      graffitiFree01: roundTo(n.metrics.graffitiFree01, 2),
      foreclosures01: roundTo(n.metrics.foreclosures01, 2),
      heatLevel: heatLevel(n.heat),
    });
  }

  // MVP: we currently ignore flags and just always redact sensitive rival fields by not including them.
  // The constants remain here so we can expand views later without searching everywhere.
  void RIVAL_VISIBILITY;

  const base: MatchView = {
    id: match.id,
    status: match.status,
    lengthSeconds: match.lengthSeconds,
    tick: match.tick,
    players: match.players,
    you: { playerId: viewerPlayerId, neighborhood: youN },
    rivals,
  };

  if (match.startedAtMs !== undefined) base.startedAtMs = match.startedAtMs;
  if (match.endedAtMs !== undefined) base.endedAtMs = match.endedAtMs;
  if (match.winnerPlayerId !== undefined) base.winnerPlayerId = match.winnerPlayerId;

  return base;
}

