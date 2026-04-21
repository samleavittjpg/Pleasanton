import http from "node:http";
import { randomUUID } from "node:crypto";
import WebSocket, { WebSocketServer } from "ws";
import { z } from "zod";
import { applyAction } from "./match/actions.js";
import { createMatch, createStore, joinMatch, stepMatch, tickIntervalMs } from "./match/engine.js";
import { buildMatchView } from "./match/view.js";
import { ClientMessage } from "./protocol/schema.js";
import type { ClientMessage as ClientMessageT, ServerMessage } from "./protocol/schema.js";
import { encodeServerMessage, safeJsonParse } from "./protocol/wire.js";

type ConnState = {
  playerId: string;
  name: string;
  matchId?: string;
};

const store = createStore();

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("Pleasanton server running.\n");
});

const wss = new WebSocketServer({ server });

const conns = new Map<WebSocket, ConnState>();

function send(ws: WebSocket, msg: ServerMessage) {
  ws.send(encodeServerMessage(msg));
}

function broadcastMatch(matchId: string) {
  for (const [ws, st] of conns) {
    if (st.matchId !== matchId) continue;
    const match = store.matches.get(matchId);
    if (!match) continue;
    const view = buildMatchView(match, st.playerId);
    send(ws, { type: "server/matchDelta", matchId, tick: match.tick, delta: view });
    if (match.status === "finished" && match.winnerPlayerId) {
      send(ws, { type: "server/matchFinished", matchId, winnerPlayerId: match.winnerPlayerId });
    }
  }
}

function uuid(): string {
  return randomUUID();
}

wss.on("connection", (ws) => {
  const state: ConnState = { playerId: uuid(), name: "Anonymous" };
  conns.set(ws, state);
  send(ws, { type: "server/welcome", playerId: state.playerId });

  ws.on("message", (data) => {
    const raw = data.toString();
    const parsed = safeJsonParse(raw);
    const msg = ClientMessage.safeParse(parsed);
    if (!msg.success) {
      send(ws, { type: "server/error", message: "Invalid message." });
      return;
    }
    handleClientMessage(ws, state, msg.data);
  });

  ws.on("close", () => {
    conns.delete(ws);
  });
});

function handleClientMessage(ws: WebSocket, st: ConnState, msg: ClientMessageT) {
  switch (msg.type) {
    case "client/hello": {
      st.name = msg.name;
      return;
    }
    case "client/createMatch": {
      const match = createMatch(store, { lengthMinutes: msg.lengthMinutes }, { id: st.playerId, name: st.name });
      st.matchId = match.id;
      send(ws, { type: "server/matchCreated", matchId: match.id });
      send(ws, { type: "server/matchSnapshot", matchId: match.id, tick: match.tick, state: buildMatchView(match, st.playerId) });
      broadcastMatch(match.id);
      return;
    }
    case "client/joinMatch": {
      const match = joinMatch(store, msg.matchId, { id: st.playerId, name: st.name });
      if (!match) {
        send(ws, { type: "server/error", message: "Match not found." });
        return;
      }
      st.matchId = match.id;
      send(ws, { type: "server/matchSnapshot", matchId: match.id, tick: match.tick, state: buildMatchView(match, st.playerId) });
      broadcastMatch(match.id);
      return;
    }
    case "client/action": {
      const match = store.matches.get(msg.matchId);
      if (!match) {
        send(ws, { type: "server/error", message: "Match not found.", actionId: msg.actionId });
        return;
      }
      if (match.status !== "running") {
        send(ws, { type: "server/error", message: "Match not running.", actionId: msg.actionId });
        return;
      }
      const actor = match.neighborhoods[st.playerId];
      if (!actor) {
        send(ws, { type: "server/error", message: "Not in match.", actionId: msg.actionId });
        return;
      }

      const res = applyAction({
        actor,
        getTarget: (pid) => match.neighborhoods[pid],
        action: msg.action as any,
      });

      if (!res.ok) {
        send(ws, { type: "server/error", message: res.message, actionId: msg.actionId });
        return;
      }
      broadcastMatch(match.id);
      return;
    }
    default: {
      const _exhaustive: never = msg;
      return _exhaustive;
    }
  }
}

setInterval(() => {
  for (const match of store.matches.values()) {
    if (match.status !== "running") continue;
    stepMatch(match);
    broadcastMatch(match.id);
  }
}, tickIntervalMs());

const port = z.coerce.number().int().min(1).default(8787).parse(process.env.PORT);
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Pleasanton server listening on :${port}`);
});

