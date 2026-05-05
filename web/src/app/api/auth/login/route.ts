import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session-cookie";
import { makeSessionToken } from "@/lib/auth/session-token";
import { createSession, getUserByUsername, isValidUsername, normalizeUsername } from "@/lib/auth/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = (await request.json()) as { username?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username = normalizeUsername(body.username ?? "");
  const password = body.password ?? "";

  if (!isValidUsername(username)) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const user = getUserByUsername(username);
  if (!user) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.salt, user.hash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const token = makeSessionToken();
  createSession(user.id, token);
  await setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    user: { username: user.username, profile: user.profile },
  });
}
