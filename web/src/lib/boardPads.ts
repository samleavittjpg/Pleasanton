export type BoardPad = { x: number; y: number };

/**
 * Canonical 9 pad anchors for `public/Neighborhood_v2.png`.
 * These are board-image-relative coordinates (0..900) and should be used everywhere.
 */
export const BOARD_PADS: readonly BoardPad[] = [
  { x: 465, y: 220 },
  { x: 300, y: 325 },
  { x: 610, y: 325 },
  { x: 130, y: 435 },
  { x: 450, y: 440 },
  { x: 750, y: 435 },
  { x: 280, y: 565 },
  { x: 595, y: 555 },
  { x: 435, y: 680 },
] as const;

