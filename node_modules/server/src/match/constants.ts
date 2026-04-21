export const MVP_MAX_PLAYERS = 4;
export const MVP_MIN_PLAYERS = 2;

// Visibility rules (MVP):
// - You can always see full state of your own neighborhood.
// - For rivals, you only see public summary + a coarse "problem" overlay, not exact tile/house values.
export const RIVAL_VISIBILITY = {
  showExactBudget: false,
  showExactServices: false,
  showExactHouseStates: false,
  showTrendWindowSeconds: 60,
} as const;

export const TICK_MS = 1000;
export const EARLY_WIN_HAPPINESS = 9.5;
export const EARLY_WIN_MIN_SECONDS = 120;

export const HEAT = {
  max: 100,
  decayPerTick: 0.25, // per second
  sabotageHeatGain: 10,
  highHeatThreshold: 60,
} as const;

