import { NextResponse } from "next/server";
import { clearSessionCookie, readSessionToken } from "@/lib/auth/session-cookie";
import { deleteSession } from "@/lib/auth/store";

export const runtime = "nodejs";

export async function POST() {
  const token = await readSessionToken();
  if (token) {
    deleteSession(token);
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
