import { NextResponse } from "next/server";
import { parseSavedProfile } from "@/lib/auth/profile-validation";
import { readSessionToken } from "@/lib/auth/session-cookie";
import { getSessionUserId, updateUserProfile } from "@/lib/auth/store";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const token = await readSessionToken();
  const userId = token ? getSessionUserId(token) : undefined;
  if (!userId) {
    return NextResponse.json({ error: "Sign in to save your profile." }, { status: 401 });
  }

  let body: { profile?: unknown };
  try {
    body = (await request.json()) as { profile?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const profile = parseSavedProfile(body.profile);
  if (!profile) {
    return NextResponse.json({ error: "Invalid profile data." }, { status: 400 });
  }

  const user = updateUserProfile(userId, profile);
  return NextResponse.json({
    ok: true,
    user: { username: user.username, profile: user.profile },
  });
}
