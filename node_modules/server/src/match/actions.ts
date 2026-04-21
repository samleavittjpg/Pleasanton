import type { NeighborhoodState, PlayerId } from "./types.js";
import { HEAT } from "./constants.js";
import { clamp, clamp01 } from "./util.js";

export type ApplyResult = { ok: true } | { ok: false; message: string };

export type PlayerAction =
  | { kind: "maintenance/cleanStreet" }
  | { kind: "maintenance/removeGraffiti"; houseIndex: number }
  | { kind: "maintenance/pickupTrash"; houseIndex: number }
  | { kind: "funding/set"; school: number; sanitation: number; parks: number; policing: number }
  | { kind: "sabotage/dumpTrash"; targetPlayerId: PlayerId }
  | { kind: "sabotage/graffitiHouse"; targetPlayerId: PlayerId; houseIndex: number; graffitiDataUrl: string };

export function applyAction(params: {
  actor: NeighborhoodState;
  getTarget: (playerId: PlayerId) => NeighborhoodState | undefined;
  action: PlayerAction;
}): ApplyResult {
  const { actor, getTarget, action } = params;

  switch (action.kind) {
    case "maintenance/cleanStreet": {
      const cost = 4;
      if (actor.budget < cost) return { ok: false, message: "Not enough budget." };
      actor.budget -= cost;
      for (const h of actor.houses) h.trashed01 = clamp01(h.trashed01 - 0.12);
      return { ok: true };
    }
    case "maintenance/removeGraffiti": {
      const i = action.houseIndex;
      const house = actor.houses[i];
      if (!house) return { ok: false, message: "Invalid house." };
      const cost = 3;
      if (actor.budget < cost) return { ok: false, message: "Not enough budget." };
      actor.budget -= cost;
      house.graffiti01 = clamp01(house.graffiti01 - 0.5);
      if (house.graffiti01 < 0.05) house.graffitiDataUrl = undefined;
      return { ok: true };
    }
    case "maintenance/pickupTrash": {
      const i = action.houseIndex;
      const house = actor.houses[i];
      if (!house) return { ok: false, message: "Invalid house." };
      const cost = 2;
      if (actor.budget < cost) return { ok: false, message: "Not enough budget." };
      actor.budget -= cost;
      house.trashed01 = clamp01(house.trashed01 - 0.6);
      return { ok: true };
    }
    case "funding/set": {
      actor.services = {
        school: clamp(action.school, 0, 1),
        sanitation: clamp(action.sanitation, 0, 1),
        parks: clamp(action.parks, 0, 1),
        policing: clamp(action.policing, 0, 1),
      };
      return { ok: true };
    }
    case "sabotage/dumpTrash": {
      const target = getTarget(action.targetPlayerId);
      if (!target) return { ok: false, message: "Invalid target." };
      if (target.ownerPlayerId === actor.ownerPlayerId) return { ok: false, message: "Nice try." };
      const cost = 6;
      if (actor.budget < cost) return { ok: false, message: "Not enough budget." };
      actor.budget -= cost;
      actor.heat = clamp(actor.heat + HEAT.sabotageHeatGain, 0, HEAT.max);
      // Spread trash over multiple houses.
      for (const h of target.houses) h.trashed01 = clamp01(h.trashed01 + 0.08);
      return { ok: true };
    }
    case "sabotage/graffitiHouse": {
      const target = getTarget(action.targetPlayerId);
      if (!target) return { ok: false, message: "Invalid target." };
      if (target.ownerPlayerId === actor.ownerPlayerId) return { ok: false, message: "Nice try." };
      const house = target.houses[action.houseIndex];
      if (!house) return { ok: false, message: "Invalid house." };
      if (house.foreclosed) return { ok: false, message: "House is foreclosed." };
      const cost = 7;
      if (actor.budget < cost) return { ok: false, message: "Not enough budget." };
      actor.budget -= cost;
      actor.heat = clamp(actor.heat + HEAT.sabotageHeatGain, 0, HEAT.max);
      house.graffiti01 = clamp01(house.graffiti01 + 0.55);
      house.graffitiDataUrl = action.graffitiDataUrl;
      return { ok: true };
    }
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

