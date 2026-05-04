import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { SavedCharacter, SessionRecord, UserRecord } from "./types";

type StoreFile = {
  version: 1;
  usersById: Record<string, UserRecord>;
  usernameToId: Record<string, string>;
  sessions: Record<string, SessionRecord>;
};

const STORE_VERSION = 1 as const;

function storePath(): string {
  return path.join(process.cwd(), "data", "users-store.json");
}

function emptyStore(): StoreFile {
  return {
    version: STORE_VERSION,
    usersById: {},
    usernameToId: {},
    sessions: {},
  };
}

function readStore(): StoreFile {
  const file = storePath();
  try {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    if (parsed?.version !== STORE_VERSION || !parsed.usersById || !parsed.usernameToId || !parsed.sessions) {
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

function writeStore(store: StoreFile): void {
  const file = storePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(store, null, 2), "utf8");
}

function pruneSessions(store: StoreFile): void {
  const now = Date.now();
  for (const [token, session] of Object.entries(store.sessions)) {
    if (session.expiresAt <= now) {
      delete store.sessions[token];
    }
  }
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsername(u: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(u);
}

export function isValidPassword(p: string): boolean {
  return typeof p === "string" && p.length >= 8 && p.length <= 128;
}

export function getUserByUsername(username: string): UserRecord | undefined {
  const store = readStore();
  pruneSessions(store);
  const id = store.usernameToId[normalizeUsername(username)];
  if (!id) return undefined;
  return store.usersById[id];
}

export function getUserById(id: string): UserRecord | undefined {
  const store = readStore();
  pruneSessions(store);
  return store.usersById[id];
}

export function createUser(usernameNorm: string, salt: string, hash: string): UserRecord {
  const store = readStore();
  pruneSessions(store);
  if (store.usernameToId[usernameNorm]) {
    throw new Error("USERNAME_TAKEN");
  }
  const id = randomUUID();
  const user: UserRecord = {
    id,
    username: usernameNorm,
    salt,
    hash,
    profile: null,
  };
  store.usersById[id] = user;
  store.usernameToId[usernameNorm] = id;
  writeStore(store);
  return user;
}

export function updateUserProfile(userId: string, profile: SavedCharacter): UserRecord {
  const store = readStore();
  pruneSessions(store);
  const user = store.usersById[userId];
  if (!user) throw new Error("USER_NOT_FOUND");
  user.profile = profile;
  writeStore(store);
  return user;
}

const SESSION_MS = 1000 * 60 * 60 * 24 * 30;

export function createSession(userId: string, token: string): void {
  const store = readStore();
  pruneSessions(store);
  store.sessions[token] = {
    userId,
    expiresAt: Date.now() + SESSION_MS,
  };
  writeStore(store);
}

export function deleteSession(token: string): void {
  const store = readStore();
  pruneSessions(store);
  delete store.sessions[token];
  writeStore(store);
}

export function getSessionUserId(token: string): string | undefined {
  const store = readStore();
  pruneSessions(store);
  const session = store.sessions[token];
  if (!session || session.expiresAt <= Date.now()) {
    return undefined;
  }
  return session.userId;
}
