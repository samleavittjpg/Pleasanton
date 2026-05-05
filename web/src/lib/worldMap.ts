import type { HouseVariantId } from "./houseCatalog";
import { HOUSE_VARIANTS, SLOT_COUNT, STARTER_FILLED_SLOTS } from "./houseCatalog";

export type NeighborhoodId = string;

export type NeighborhoodState = {
  id: NeighborhoodId;
  /** Player display label — yours is "You" for now */
  ownerLabel: string;
  variantId: HouseVariantId;
  /** true = center tile in the fixed world grid */
  isPlayer: boolean;
};

/** Fixed 3×3 layout; player always occupies center */
export const CENTER_ROW = 1;
export const CENTER_COL = 1;

export function buildDefaultWorld(playerVariantId: HouseVariantId): NeighborhoodState[][] {
  const others = HOUSE_VARIANTS.filter((v) => v.id !== playerVariantId);
  /** Stable order around the ring (8 neighbors) */
  const ring: HouseVariantId[] = [];
  for (let i = 0; i < 8; i++) {
    ring.push(others[i % others.length]!.id);
  }

  let k = 0;
  const grid: NeighborhoodState[][] = [];
  for (let r = 0; r < 3; r++) {
    const row: NeighborhoodState[] = [];
    for (let c = 0; c < 3; c++) {
      if (r === CENTER_ROW && c === CENTER_COL) {
        row.push({
          id: "player",
          ownerLabel: "You",
          variantId: playerVariantId,
          isPlayer: true,
        });
      } else {
        const variantId = ring[k]!;
        k += 1;
        row.push({
          id: `npc-${r}-${c}`,
          ownerLabel: `Town ${k}`,
          variantId,
          isPlayer: false,
        });
      }
    }
    grid.push(row);
  }
  return grid;
}

/** Optional decoration for NPC lots — sparse houses for atmosphere */
export function npcFilledSlotMask(): boolean[] {
  const filled = Array<boolean>(SLOT_COUNT).fill(false);
  filled[0] = true;
  filled[5] = true;
  return filled;
}

export function playerSlotSrcs(baseSrc: string): (string | null)[] {
  const slots: (string | null)[] = Array(SLOT_COUNT).fill(null);
  for (let i = 0; i < STARTER_FILLED_SLOTS; i++) {
    slots[i] = baseSrc;
  }
  return slots;
}

export function npcSlotSrcs(baseSrc: string, row: number, col: number): (string | null)[] {
  const slots: (string | null)[] = Array(SLOT_COUNT).fill(null);
  if ((row + col) % 2 === 0) {
    const mask = npcFilledSlotMask();
    for (let i = 0; i < SLOT_COUNT; i++) {
      if (mask[i]) slots[i] = baseSrc;
    }
  }
  return slots;
}
