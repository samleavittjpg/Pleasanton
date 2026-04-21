const clamp01 = (n) => Math.max(0, Math.min(1, n));
const clamp10 = (n) => Math.max(0, Math.min(10, n));
/**
 * Converts normalized (0..1) neighborhood components into average citizen happiness (0..10).
 * Intentionally simple + tunable for MVP.
 */
export function computeAverageHappiness(components) {
    const c = {
        cleanliness: clamp01(components.cleanliness),
        graffiti: clamp01(components.graffiti),
        foreclosures: clamp01(components.foreclosures),
        schoolFunding: clamp01(components.schoolFunding),
        sanitationFunding: clamp01(components.sanitationFunding),
        parksFunding: clamp01(components.parksFunding),
        policingFunding: clamp01(components.policingFunding),
        heatPenalty: clamp01(components.heatPenalty),
    };
    // Tunable MVP weights. Sum doesn't have to be 1 because we normalize below.
    const weights = {
        cleanliness: 2.0,
        graffiti: 1.6,
        foreclosures: 2.4,
        schoolFunding: 1.2,
        sanitationFunding: 1.0,
        parksFunding: 0.8,
        policingFunding: 0.6,
        heatPenalty: 1.0,
    };
    const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
    const weighted = c.cleanliness * weights.cleanliness +
        c.graffiti * weights.graffiti +
        c.foreclosures * weights.foreclosures +
        c.schoolFunding * weights.schoolFunding +
        c.sanitationFunding * weights.sanitationFunding +
        c.parksFunding * weights.parksFunding +
        c.policingFunding * weights.policingFunding +
        c.heatPenalty * weights.heatPenalty;
    // Map normalized 0..1 -> 0..10 with a slight floor so games aren't miserable instantly.
    const weighted01 = clamp01(weighted / weightSum);
    const base = 2.5; // floor happiness when everything is awful (still recoverable)
    const happiness10 = clamp10(base + weighted01 * (10 - base));
    return { base, weighted01, happiness10, weights, components: c };
}
//# sourceMappingURL=happiness.js.map