import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError, handleApiError, jsonError } from "@/lib/api-error";

describe("api errors", () => {
  it("jsonError shapes the contract", async () => {
    const res = jsonError(404, "Not found");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });
  it("maps ZodError to 400", async () => {
    const err = z.object({ a: z.string() }).safeParse({}).error;
    const res = handleApiError(err);
    expect(res.status).toBe(400);
  });
  it("maps ApiError to its status and unknown to 500", async () => {
    expect(handleApiError(new ApiError(403, "Forbidden")).status).toBe(403);
    expect(handleApiError(new Error("boom")).status).toBe(500);
    expect((await handleApiError(new Error("boom")).json()).error).toBe("Internal server error");
  });
});
