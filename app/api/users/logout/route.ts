import { NextRequest } from "next/server";
import { expiredSessionCookie, destroySession, SESSION_COOKIE } from "@/lib/session";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";

export const POST = withAuth(async (req: NextRequest) => {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": expiredSessionCookie() } });
});
