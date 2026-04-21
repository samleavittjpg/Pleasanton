import { z } from "zod";
export declare const ClientHello: z.ZodObject<{
    type: z.ZodLiteral<"client/hello">;
    name: z.ZodString;
}, z.core.$strip>;
export declare const ClientJoinMatch: z.ZodObject<{
    type: z.ZodLiteral<"client/joinMatch">;
    matchId: z.ZodString;
}, z.core.$strip>;
export declare const ClientCreateMatch: z.ZodObject<{
    type: z.ZodLiteral<"client/createMatch">;
    lengthMinutes: z.ZodUnion<readonly [z.ZodLiteral<10>, z.ZodLiteral<20>, z.ZodLiteral<30>]>;
}, z.core.$strip>;
export declare const ClientAction: z.ZodObject<{
    type: z.ZodLiteral<"client/action">;
    matchId: z.ZodString;
    actionId: z.ZodString;
    action: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"maintenance/cleanStreet">;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"maintenance/removeGraffiti">;
        houseIndex: z.ZodNumber;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"maintenance/pickupTrash">;
        houseIndex: z.ZodNumber;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"funding/set">;
        school: z.ZodNumber;
        sanitation: z.ZodNumber;
        parks: z.ZodNumber;
        policing: z.ZodNumber;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"sabotage/dumpTrash">;
        targetPlayerId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"sabotage/graffitiHouse">;
        targetPlayerId: z.ZodString;
        houseIndex: z.ZodNumber;
        graffitiDataUrl: z.ZodString;
    }, z.core.$strip>], "kind">;
}, z.core.$strip>;
export declare const ClientMessage: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"client/hello">;
    name: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"client/createMatch">;
    lengthMinutes: z.ZodUnion<readonly [z.ZodLiteral<10>, z.ZodLiteral<20>, z.ZodLiteral<30>]>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"client/joinMatch">;
    matchId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"client/action">;
    matchId: z.ZodString;
    actionId: z.ZodString;
    action: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"maintenance/cleanStreet">;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"maintenance/removeGraffiti">;
        houseIndex: z.ZodNumber;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"maintenance/pickupTrash">;
        houseIndex: z.ZodNumber;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"funding/set">;
        school: z.ZodNumber;
        sanitation: z.ZodNumber;
        parks: z.ZodNumber;
        policing: z.ZodNumber;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"sabotage/dumpTrash">;
        targetPlayerId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"sabotage/graffitiHouse">;
        targetPlayerId: z.ZodString;
        houseIndex: z.ZodNumber;
        graffitiDataUrl: z.ZodString;
    }, z.core.$strip>], "kind">;
}, z.core.$strip>], "type">;
export type ClientMessage = z.infer<typeof ClientMessage>;
export declare const ServerWelcome: z.ZodObject<{
    type: z.ZodLiteral<"server/welcome">;
    playerId: z.ZodString;
}, z.core.$strip>;
export declare const ServerError: z.ZodObject<{
    type: z.ZodLiteral<"server/error">;
    message: z.ZodString;
    actionId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ServerMatchCreated: z.ZodObject<{
    type: z.ZodLiteral<"server/matchCreated">;
    matchId: z.ZodString;
}, z.core.$strip>;
export declare const ServerMatchSnapshot: z.ZodObject<{
    type: z.ZodLiteral<"server/matchSnapshot">;
    matchId: z.ZodString;
    tick: z.ZodNumber;
    state: z.ZodAny;
}, z.core.$strip>;
export declare const ServerMatchDelta: z.ZodObject<{
    type: z.ZodLiteral<"server/matchDelta">;
    matchId: z.ZodString;
    tick: z.ZodNumber;
    delta: z.ZodAny;
}, z.core.$strip>;
export declare const ServerMatchFinished: z.ZodObject<{
    type: z.ZodLiteral<"server/matchFinished">;
    matchId: z.ZodString;
    winnerPlayerId: z.ZodString;
}, z.core.$strip>;
export declare const ServerMessage: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"server/welcome">;
    playerId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"server/error">;
    message: z.ZodString;
    actionId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"server/matchCreated">;
    matchId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"server/matchSnapshot">;
    matchId: z.ZodString;
    tick: z.ZodNumber;
    state: z.ZodAny;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"server/matchDelta">;
    matchId: z.ZodString;
    tick: z.ZodNumber;
    delta: z.ZodAny;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"server/matchFinished">;
    matchId: z.ZodString;
    winnerPlayerId: z.ZodString;
}, z.core.$strip>], "type">;
export type ServerMessage = z.infer<typeof ServerMessage>;
//# sourceMappingURL=schema.d.ts.map