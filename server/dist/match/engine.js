import { randomUUID } from "node:crypto";
import { computeAverageHappiness } from "./happiness.js";
import { EARLY_WIN_HAPPINESS, EARLY_WIN_MIN_SECONDS, HEAT, MVP_MAX_PLAYERS, MVP_MIN_PLAYERS, TICK_MS } from "./constants.js";
import { clamp, clamp01, roundTo } from "./util.js";
export function createStore() {
    return { matches: new Map() };
}
export function createMatch(store, params, creator) {
    const id = randomUUID();
    const seed = params.seed ?? Math.floor(Math.random() * 1_000_000_000);
    const match = {
        id,
        status: "lobby",
        lengthSeconds: params.lengthMinutes * 60,
        createdAtMs: Date.now(),
        tick: 0,
        players: [creator],
        neighborhoods: {},
    };
    match.neighborhoods[creator.id] = newNeighborhood(creator.id);
    store.matches.set(id, match);
    maybeStartMatch(match);
    return match;
}
export function joinMatch(store, matchId, player) {
    const match = store.matches.get(matchId);
    if (!match)
        return undefined;
    if (match.status !== "lobby")
        return match;
    if (match.players.some((p) => p.id === player.id))
        return match;
    if (match.players.length >= MVP_MAX_PLAYERS)
        return match;
    match.players.push(player);
    match.neighborhoods[player.id] = newNeighborhood(player.id);
    maybeStartMatch(match);
    return match;
}
function maybeStartMatch(match) {
    if (match.status !== "lobby")
        return;
    if (match.players.length < MVP_MIN_PLAYERS)
        return;
    match.status = "running";
    match.startedAtMs = Date.now();
    match.tick = 0;
}
function newNeighborhood(ownerPlayerId) {
    const houses = Array.from({ length: 10 }, (_, i) => ({
        index: i,
        graffiti01: 0,
        trashed01: 0,
        foreclosed: false,
        graffitiDataUrl: undefined,
    }));
    const metrics = computeMetrics(houses);
    const h = computeAverageHappiness({
        cleanliness: metrics.cleanliness01,
        graffiti: metrics.graffitiFree01,
        foreclosures: metrics.foreclosures01,
        schoolFunding: 0.25,
        sanitationFunding: 0.25,
        parksFunding: 0.25,
        policingFunding: 0.25,
        heatPenalty: 1,
    });
    return {
        id: ownerPlayerId,
        ownerPlayerId,
        budget: 50,
        heat: 0,
        services: { school: 0.25, sanitation: 0.25, parks: 0.25, policing: 0.25 },
        houses,
        metrics,
        avgHappiness: roundTo(h.happiness10, 2),
    };
}
function computeMetrics(houses) {
    const avgTrash = houses.reduce((a, h) => a + h.trashed01, 0) / houses.length;
    const avgGraffiti = houses.reduce((a, h) => a + h.graffiti01, 0) / houses.length;
    const foreclosedCount = houses.reduce((a, h) => a + (h.foreclosed ? 1 : 0), 0);
    return {
        cleanliness01: clamp01(1 - avgTrash),
        graffitiFree01: clamp01(1 - avgGraffiti),
        foreclosures01: clamp01(1 - foreclosedCount / houses.length),
    };
}
export function stepMatch(match) {
    if (match.status !== "running" || !match.startedAtMs)
        return match;
    match.tick += 1;
    for (const p of match.players) {
        const n = match.neighborhoods[p.id];
        if (!n)
            continue;
        // Passive decay (creates ongoing maintenance pressure).
        for (const h of n.houses) {
            if (!h.foreclosed) {
                h.trashed01 = clamp01(h.trashed01 + 0.004);
                h.graffiti01 = clamp01(h.graffiti01 + 0.0015);
            }
        }
        // Heat decays slowly over time.
        n.heat = clamp(n.heat - HEAT.decayPerTick, 0, HEAT.max);
        // Foreclosure pressure when you're doing terribly for a while.
        const lowHappiness = n.avgHappiness < 3.0;
        if (lowHappiness && match.tick % 10 === 0) {
            const candidates = n.houses.filter((h) => !h.foreclosed);
            if (candidates.length > 0 && Math.random() < 0.25) {
                const pick = candidates[Math.floor(Math.random() * candidates.length)];
                if (pick)
                    pick.foreclosed = true;
            }
        }
        // Services cost each tick; cost scales slightly with heat (bad optics / inefficiency).
        const servicesSum = n.services.school + n.services.sanitation + n.services.parks + n.services.policing;
        const servicesCost = servicesSum * 0.8 * (1 + n.heat / 200);
        n.budget = Math.max(0, n.budget - servicesCost);
        // Income depends on happiness and foreclosures.
        const foreclosedCount = n.houses.reduce((a, h) => a + (h.foreclosed ? 1 : 0), 0);
        const foreclosurePenalty = foreclosedCount * 0.15;
        const income = 1.5 + (n.avgHappiness / 10) * 1.5 - foreclosurePenalty;
        n.budget = Math.max(0, n.budget + income);
        // Recompute metrics/happiness.
        n.metrics = computeMetrics(n.houses);
        const heatPenalty = n.heat < HEAT.highHeatThreshold ? 1 : clamp01(1 - (n.heat - HEAT.highHeatThreshold) / 60);
        const h = computeAverageHappiness({
            cleanliness: n.metrics.cleanliness01,
            graffiti: n.metrics.graffitiFree01,
            foreclosures: n.metrics.foreclosures01,
            schoolFunding: n.services.school,
            sanitationFunding: n.services.sanitation,
            parksFunding: n.services.parks,
            policingFunding: n.services.policing,
            heatPenalty,
        });
        n.avgHappiness = roundTo(h.happiness10, 2);
    }
    // Win conditions
    const elapsedSeconds = Math.floor((Date.now() - match.startedAtMs) / 1000);
    const best = bestPlayer(match);
    if (best && elapsedSeconds >= EARLY_WIN_MIN_SECONDS && best.avgHappiness >= EARLY_WIN_HAPPINESS) {
        finishMatch(match, best.playerId);
    }
    else if (elapsedSeconds >= match.lengthSeconds) {
        finishMatch(match, best?.playerId);
    }
    return match;
}
function bestPlayer(match) {
    let best;
    for (const p of match.players) {
        const n = match.neighborhoods[p.id];
        if (!n)
            continue;
        if (!best || n.avgHappiness > best.avgHappiness)
            best = { playerId: p.id, avgHappiness: n.avgHappiness };
    }
    return best;
}
function finishMatch(match, winnerPlayerId) {
    match.status = "finished";
    match.endedAtMs = Date.now();
    if (winnerPlayerId)
        match.winnerPlayerId = winnerPlayerId;
}
export function tickIntervalMs() {
    return TICK_MS;
}
//# sourceMappingURL=engine.js.map