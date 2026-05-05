import type { SavedCharacter } from "./types";

const HAIR_STYLES = ["short", "spiky", "bob", "buzz"] as const;

export function parseSavedProfile(raw: unknown): SavedCharacter | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const displayName = typeof o.displayName === "string" ? o.displayName.trim().slice(0, 40) : "";
  const skinTone = typeof o.skinTone === "string" ? o.skinTone : "";
  const shirtColor = typeof o.shirtColor === "string" ? o.shirtColor : "";
  const hairColor = typeof o.hairColor === "string" ? o.hairColor : "";
  const eyeColor = typeof o.eyeColor === "string" ? o.eyeColor : "";
  const hairStyle = typeof o.hairStyle === "string" ? o.hairStyle : "";
  if (!displayName) return null;
  if (!HAIR_STYLES.includes(hairStyle as (typeof HAIR_STYLES)[number])) return null;
  const hex = (s: string) => /^#[0-9A-Fa-f]{6}$/.test(s);
  if (!hex(skinTone) || !hex(shirtColor) || !hex(hairColor) || !hex(eyeColor)) return null;
  return {
    displayName: displayName || "Anonymous",
    skinTone,
    shirtColor,
    hairColor,
    eyeColor,
    hairStyle: hairStyle as SavedCharacter["hairStyle"],
  };
}
