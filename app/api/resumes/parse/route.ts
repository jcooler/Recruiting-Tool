import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api-error";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { extractResumeFields, parseResumeBuffer } from "@/lib/resume";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";
const MAX_BYTES = 5 * 1024 * 1024;

export const POST = withAuth(
  async (req: NextRequest) => {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Attach a file field named 'file'");
    if (file.size > MAX_BYTES) throw new ApiError(413, "File too large (max 5 MB)");
    const buf = Buffer.from(await file.arrayBuffer());
    const text = await parseResumeBuffer(buf, file.name);
    return Response.json({ text, fields: extractResumeFields(text) });
  },
  { minRole: "recruiter", rateLimit: { ...RATE_LIMITS.parse, scope: "resume-parse" } }
);
