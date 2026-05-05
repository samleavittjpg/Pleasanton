import { NextResponse } from "next/server";
import { readSessionToken } from "@/lib/auth/session-cookie";
import { getSessionUserId, getUserById } from "@/lib/auth/store";

export const runtime = "nodejs";

export async function GET() {
  const token = await readSessionToken();
  if (!token) {
    return NextResponse.json({ user: null });
  }
  const userId = getSessionUserId(token);
  if (!userId) {
    return NextResponse.json({ user: null });
  }
  const user = getUserById(userId);
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: { username: user.username, profile: user.profile },
  });
}
