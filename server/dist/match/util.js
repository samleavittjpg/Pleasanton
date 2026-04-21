export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const clamp01 = (n) => clamp(n, 0, 1);
export function roundTo(n, decimals) {
    const f = Math.pow(10, decimals);
    return Math.round(n * f) / f;
}
//# sourceMappingURL=util.js.map