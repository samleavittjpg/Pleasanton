import type { NeighborhoodState, PlayerId } from "./types.js";
export type ApplyResult = {
    ok: true;
} | {
    ok: false;
    message: string;
};
export type PlayerAction = {
    kind: "maintenance/cleanStreet";
} | {
    kind: "maintenance/removeGraffiti";
    houseIndex: number;
} | {
    kind: "maintenance/pickupTrash";
    houseIndex: number;
} | {
    kind: "funding/set";
    school: number;
    sanitation: number;
    parks: number;
    policing: number;
} | {
    kind: "sabotage/dumpTrash";
    targetPlayerId: PlayerId;
} | {
    kind: "sabotage/graffitiHouse";
    targetPlayerId: PlayerId;
    houseIndex: number;
    graffitiDataUrl: string;
};
export declare function applyAction(params: {
    actor: NeighborhoodState;
    getTarget: (playerId: PlayerId) => NeighborhoodState | undefined;
    action: PlayerAction;
}): ApplyResult;
//# sourceMappingURL=actions.d.ts.map