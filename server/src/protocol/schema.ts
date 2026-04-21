import { z } from "zod";

export const ClientHello = z.object({
  type: z.literal("client/hello"),
  name: z.string().min(1).max(24),
});

export const ClientJoinMatch = z.object({
  type: z.literal("client/joinMatch"),
  matchId: z.string().min(1),
});

export const ClientCreateMatch = z.object({
  type: z.literal("client/createMatch"),
  lengthMinutes: z.union([z.literal(10), z.literal(20), z.literal(30)]),
});

export const ClientAction = z.object({
  type: z.literal("client/action"),
  matchId: z.string().min(1),
  actionId: z.string().min(1),
  action: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("maintenance/cleanStreet") }),
    z.object({ kind: z.literal("maintenance/removeGraffiti"), houseIndex: z.number().int().min(0).max(9) }),
    z.object({ kind: z.literal("maintenance/pickupTrash"), houseIndex: z.number().int().min(0).max(9) }),
    z.object({
      kind: z.literal("funding/set"),
      school: z.number().min(0).max(1),
      sanitation: z.number().min(0).max(1),
      parks: z.number().min(0).max(1),
      policing: z.number().min(0).max(1),
    }),
    z.object({ kind: z.literal("sabotage/dumpTrash"), targetPlayerId: z.string().min(1) }),
    z.object({
      kind: z.literal("sabotage/graffitiHouse"),
      targetPlayerId: z.string().min(1),
      houseIndex: z.number().int().min(0).max(9),
      graffitiDataUrl: z.string().min(1).max(300_000), // MVP: cap payload
    }),
  ]),
});

export const ClientMessage = z.discriminatedUnion("type", [
  ClientHello,
  ClientCreateMatch,
  ClientJoinMatch,
  ClientAction,
]);

export type ClientMessage = z.infer<typeof ClientMessage>;

// ---- server -> client ----

export const ServerWelcome = z.object({
  type: z.literal("server/welcome"),
  playerId: z.string().min(1),
});

export const ServerError = z.object({
  type: z.literal("server/error"),
  message: z.string(),
  actionId: z.string().optional(),
});

export const ServerMatchCreated = z.object({
  type: z.literal("server/matchCreated"),
  matchId: z.string().min(1),
});

export const ServerMatchSnapshot = z.object({
  type: z.literal("server/matchSnapshot"),
  matchId: z.string().min(1),
  tick: z.number().int().min(0),
  state: z.any(), // serialized MatchState (MVP)
});

export const ServerMatchDelta = z.object({
  type: z.literal("server/matchDelta"),
  matchId: z.string().min(1),
  tick: z.number().int().min(0),
  delta: z.any(), // MVP: send full snapshot until we implement real diffs
});

export const ServerMatchFinished = z.object({
  type: z.literal("server/matchFinished"),
  matchId: z.string().min(1),
  winnerPlayerId: z.string().min(1),
});

export const ServerMessage = z.discriminatedUnion("type", [
  ServerWelcome,
  ServerError,
  ServerMatchCreated,
  ServerMatchSnapshot,
  ServerMatchDelta,
  ServerMatchFinished,
]);

export type ServerMessage = z.infer<typeof ServerMessage>;

