import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

export function handleApiError(err: unknown): Response {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const path = first.path.length ? `${first.path.join(".")}: ` : "";
    return jsonError(400, `${path}${first.message}`);
  }
  if (err instanceof ApiError) return jsonError(err.status, err.message);
  console.error(err);
  return jsonError(500, "Internal server error");
}
