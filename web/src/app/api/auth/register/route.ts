import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session-cookie";
import { makeSessionToken } from "@/lib/auth/session-token";
import { createSession, createUser, isValidPassword, isValidUsername, normalizeUsername } from "@/lib/auth/store";

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
    return NextResponse.json(
      { error: "Username must be 3–20 characters: letters, numbers, underscore only." },
      { status: 400 },
    );
  }
  if (!isValidPassword(password)) {
    return NextResponse.json({ error: "Password must be 8–128 characters." }, { status: 400 });
  }

  try {
    const { salt, hash } = await hashPassword(password);
    const user = createUser(username, salt, hash);
    const token = makeSessionToken();
    createSession(user.id, token);
    await setSessionCookie(token);
    return NextResponse.json({
      ok: true,
      user: { username: user.username, profile: user.profile },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "USERNAME_TAKEN") {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    throw e;
  }
}
