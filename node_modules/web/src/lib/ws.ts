"use client";

type ClientMessage =
  | { type: "client/hello"; name: string }
  | { type: "client/createMatch"; lengthMinutes: 10 | 20 | 30 }
  | { type: "client/joinMatch"; matchId: string }
  | { type: "client/action"; matchId: string; actionId: string; action: any };

type ServerMessage =
  | { type: "server/welcome"; playerId: string }
  | { type: "server/error"; message: string; actionId?: string }
  | { type: "server/matchCreated"; matchId: string }
  | { type: "server/matchSnapshot"; matchId: string; tick: number; state: any }
  | { type: "server/matchDelta"; matchId: string; tick: number; delta: any }
  | { type: "server/matchFinished"; matchId: string; winnerPlayerId: string };

type Listener = (msg: ServerMessage) => void;

export type PleasantonClient = {
  send: (msg: ClientMessage) => void;
  onMessage: (fn: Listener) => () => void;
  createMatch: (lengthMinutes: 10 | 20 | 30) => Promise<{ matchId: string }>;
  joinMatch: (matchId: string) => Promise<void>;
};

let singleton: PleasantonClient | undefined;

function uuid(): string {
  // MVP: ok for client-generated action ids.
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
}

export function connectClient(): PleasantonClient {
  if (singleton) return singleton;

  const wsUrl =
    process.env.NEXT_PUBLIC_WS_URL ??
    (typeof window !== "undefined" ? `ws://${window.location.hostname}:8787` : "ws://localhost:8787");

  const ws = new WebSocket(wsUrl);
  const listeners = new Set<Listener>();
  const pendingCreate: Array<(id: string) => void> = [];
  const sendQueue: ClientMessage[] = [];

  const flush = () => {
    while (sendQueue.length > 0 && ws.readyState === WebSocket.OPEN) {
      const next = sendQueue.shift();
      if (next) ws.send(JSON.stringify(next));
    }
  };

  ws.addEventListener("open", flush);

  ws.addEventListener("message", (evt) => {
    let parsed: ServerMessage | undefined;
    try {
      parsed = JSON.parse(evt.data as string);
    } catch {
      return;
    }
    if (!parsed) return;
    for (const fn of listeners) fn(parsed);
    if (parsed.type === "server/matchCreated") {
      const next = pendingCreate.shift();
      if (next) next(parsed.matchId);
    }
  });

  const send = (msg: ClientMessage) => {
    if (ws.readyState !== WebSocket.OPEN) {
      sendQueue.push(msg);
      return;
    }
    ws.send(JSON.stringify(msg));
  };

  singleton = {
    send,
    onMessage: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    createMatch: async (lengthMinutes) => {
      send({ type: "client/createMatch", lengthMinutes });
      const matchId = await new Promise<string>((resolve) => pendingCreate.push(resolve));
      return { matchId };
    },
    joinMatch: async (matchId) => {
      send({ type: "client/joinMatch", matchId });
    },
  };

  return singleton;
}

export function newActionId(): string {
  return uuid();
}

