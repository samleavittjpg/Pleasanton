/**
 * House variants derived from `Base_House_<Name>.png` in public/houses.
 * Labels are title-cased names for UI; ids are stable lowercase keys.
 */
export type HouseVariantId =
  | "cyan"
  | "fire"
  | "green"
  | "ocean"
  | "pastel"
  | "pink"
  | "purple"
  | "rare"
  | "red"
  | "yellow";

export type HouseVariant = {
  id: HouseVariantId;
  /** Display name from filename token, e.g. fire, ocean */
  label: string;
  baseSrc: `/houses/Base_House_${string}.png`;
  /** Approximate body paint for streets / UI accents */
  accentRgb: string;
};

function filenameSuffixFromId(id: HouseVariantId): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export const HOUSE_VARIANTS: HouseVariant[] = (
  [
    ["cyan", "#22d3ee"],
    ["fire", "#f97316"],
    ["green", "#22c55e"],
    ["ocean", "#0ea5e9"],
    ["pastel", "#fda4af"],
    ["pink", "#ec4899"],
    ["purple", "#a78bfa"],
    ["rare", "#fbbf24"],
    ["red", "#ef4444"],
    ["yellow", "#eab308"],
  ] as const
).map(([id, accentRgb]) => {
  const vid = id as HouseVariantId;
  const suffix = filenameSuffixFromId(vid);
  return {
    id: vid,
    label: id,
    baseSrc: `/houses/Base_House_${suffix}.png` as HouseVariant["baseSrc"],
    accentRgb,
  };
});

const byId = new Map(HOUSE_VARIANTS.map((v) => [v.id, v]));

export function getHouseVariant(id: HouseVariantId): HouseVariant | undefined {
  return byId.get(id);
}

export function houseVariantLabel(id: HouseVariantId): string {
  return getHouseVariant(id)?.label ?? id;
}

export const SLOT_COUNT = 10;
/** Starting filled lots (first four slots) for a new player neighborhood */
export const STARTER_FILLED_SLOTS = 4;
