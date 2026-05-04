import type { SavedCharacter } from "@/lib/auth/types";

function apiBase() {
  if (typeof window !== "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

const root = () => apiBase();

const fetchOpts: RequestInit = { credentials: "include" };

export type AuthUser = {
  username: string;
  profile: SavedCharacter | null;
};

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch(`${root()}/api/auth/me`, { ...fetchOpts, method: "GET" });
  if (!res.ok) return null;
  const data = (await res.json()) as { user: AuthUser | null };
  return data.user;
}

export async function registerAccount(username: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${root()}/api/auth/register`, {
    ...fetchOpts,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = (await res.json()) as { ok?: boolean; user?: AuthUser; error?: string };
  if (!res.ok) {
    throw new Error(data.error || "Could not create account");
  }
  if (!data.user) throw new Error("Missing user in response");
  return data.user;
}

export async function loginAccount(username: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${root()}/api/auth/login`, {
    ...fetchOpts,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = (await res.json()) as { ok?: boolean; user?: AuthUser; error?: string };
  if (!res.ok) {
    throw new Error(data.error || "Could not sign in");
  }
  if (!data.user) throw new Error("Missing user in response");
  return data.user;
}

export async function logoutAccount(): Promise<void> {
  await fetch(`${root()}/api/auth/logout`, { ...fetchOpts, method: "POST" });
}

export async function saveProfileToServer(profile: SavedCharacter): Promise<void> {
  const res = await fetch(`${root()}/api/auth/profile`, {
    ...fetchOpts,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok) {
    throw new Error(data.error || "Could not save profile");
  }
}
