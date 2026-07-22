import { startDemo } from "@/lib/demo";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { serializeSessionCookie } from "@/lib/session";
import { withPublic } from "@/lib/with-auth";

export const runtime = "nodejs";

export const POST = withPublic(
  async () => {
    const { token, expiresAt } = await startDemo();
    return Response.json(
      { ok: true },
      { status: 200, headers: { "Set-Cookie": serializeSessionCookie(token, expiresAt) } }
    );
  },
  { rateLimit: { ...RATE_LIMITS.demo, scope: "demo-start" } }
);
