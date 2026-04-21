export type MatchLengthMinutes = 10 | 20 | 30;
export type MatchStatus = "lobby" | "running" | "finished";
export type PlayerId = string;
export type NeighborhoodId = string;
export type HouseIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type ServicesFunding = {
    school: number;
    sanitation: number;
    parks: number;
    policing: number;
};
export type NeighborhoodMetrics = {
    cleanliness01: number;
    graffitiFree01: number;
    foreclosures01: number;
};
export type HouseState = {
    index: HouseIndex;
    graffiti01: number;
    trashed01: number;
    foreclosed: boolean;
    graffitiDataUrl: string | undefined;
};
export type NeighborhoodState = {
    id: NeighborhoodId;
    ownerPlayerId: PlayerId;
    budget: number;
    heat: number;
    services: ServicesFunding;
    houses: HouseState[];
    metrics: NeighborhoodMetrics;
    avgHappiness: number;
};
export type MatchState = {
    id: string;
    status: MatchStatus;
    lengthSeconds: number;
    createdAtMs: number;
    startedAtMs?: number;
    endedAtMs?: number;
    tick: number;
    players: Array<{
        id: PlayerId;
        name: string;
    }>;
    neighborhoods: Record<NeighborhoodId, NeighborhoodState>;
    winnerPlayerId?: PlayerId;
};
//# sourceMappingURL=types.d.ts.map