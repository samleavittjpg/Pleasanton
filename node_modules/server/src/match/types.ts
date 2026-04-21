export type MatchLengthMinutes = 10 | 20 | 30;

export type MatchStatus = "lobby" | "running" | "finished";

export type PlayerId = string;

export type NeighborhoodId = string;

export type HouseIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type ServicesFunding = {
  school: number; // 0..1
  sanitation: number; // 0..1
  parks: number; // 0..1
  policing: number; // 0..1
};

export type NeighborhoodMetrics = {
  cleanliness01: number; // 0..1
  graffitiFree01: number; // 0..1
  foreclosures01: number; // 0..1
};

export type HouseState = {
  index: HouseIndex;
  graffiti01: number; // 0..1
  trashed01: number; // 0..1
  foreclosed: boolean;
  // MVP graffiti payload: store as PNG data URL or vector strokes later.
  graffitiDataUrl: string | undefined;
};

export type NeighborhoodState = {
  id: NeighborhoodId;
  ownerPlayerId: PlayerId;
  budget: number;
  heat: number; // 0..100
  services: ServicesFunding;
  houses: HouseState[];
  metrics: NeighborhoodMetrics;
  avgHappiness: number; // 0..10
};

export type MatchState = {
  id: string;
  status: MatchStatus;
  lengthSeconds: number;
  createdAtMs: number;
  startedAtMs?: number;
  endedAtMs?: number;
  tick: number;
  players: Array<{ id: PlayerId; name: string }>;
  neighborhoods: Record<NeighborhoodId, NeighborhoodState>;
  winnerPlayerId?: PlayerId;
};

