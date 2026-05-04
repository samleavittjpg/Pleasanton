import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "./cookie-name";

export async function setSessionCookie(token: string) {
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function readSessionToken(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(SESSION_COOKIE)?.value;
}
