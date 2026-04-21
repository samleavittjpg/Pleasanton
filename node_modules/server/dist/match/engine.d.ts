import type { MatchLengthMinutes, MatchState, PlayerId } from "./types.js";
type CreateMatchParams = {
    lengthMinutes: MatchLengthMinutes;
    seed?: number;
};
type Player = {
    id: PlayerId;
    name: string;
};
export type MatchStore = {
    matches: Map<string, MatchState>;
};
export declare function createStore(): MatchStore;
export declare function createMatch(store: MatchStore, params: CreateMatchParams, creator: Player): MatchState;
export declare function joinMatch(store: MatchStore, matchId: string, player: Player): MatchState | undefined;
export declare function stepMatch(match: MatchState): MatchState;
export declare function tickIntervalMs(): number;
export {};
//# sourceMappingURL=engine.d.ts.map