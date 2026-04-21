import type { MatchState, NeighborhoodState, PlayerId } from "./types.js";
export type PublicNeighborhoodView = {
    ownerPlayerId: PlayerId;
    avgHappiness: number;
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
export declare function buildMatchView(match: MatchState, viewerPlayerId: PlayerId): MatchView;
//# sourceMappingURL=view.d.ts.map