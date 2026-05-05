export type BoardPad = { x: number; y: number };

/**
 * Canonical 9 pad anchors for `public/Neighborhood.png`.
 * These are board-image-relative coordinates (0..900) and should be used everywhere.
 */
export const BOARD_PADS: readonly BoardPad[] = [
  { x: 480, y: 220 },
  { x: 320, y: 325 },
  { x: 620, y: 325 },
  { x: 160, y: 440 },
  { x: 460, y: 440 },
  { x: 750, y: 430 },
  { x: 300, y: 550 },
  { x: 600, y: 550 },
  { x: 440, y: 660 },
] as const;

