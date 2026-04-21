export type HappinessComponents = {
    cleanliness: number;
    graffiti: number;
    foreclosures: number;
    schoolFunding: number;
    sanitationFunding: number;
    parksFunding: number;
    policingFunding: number;
    heatPenalty: number;
};
export type HappinessBreakdown = {
    base: number;
    weighted01: number;
    happiness10: number;
    weights: Record<keyof HappinessComponents, number>;
    components: HappinessComponents;
};
/**
 * Converts normalized (0..1) neighborhood components into average citizen happiness (0..10).
 * Intentionally simple + tunable for MVP.
 */
export declare function computeAverageHappiness(components: HappinessComponents): HappinessBreakdown;
//# sourceMappingURL=happiness.d.ts.map