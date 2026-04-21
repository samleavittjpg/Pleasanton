import type { ServerMessage } from "./schema.js";

export function encodeServerMessage(msg: ServerMessage): string {
  return JSON.stringify(msg);
}

export function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

