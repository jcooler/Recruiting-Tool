import { describe, expect, it } from "vitest";
import { loginSchema, signUpSchema } from "@/lib/schemas/auth";
import { createCandidateSchema, stageMoveSchema, candidateListQuerySchema } from "@/lib/schemas/candidate";
import { objectIdSchema } from "@/lib/schemas/common";

describe("auth schemas", () => {
  it("accepts a valid signup", () => {
    const r = signUpSchema.safeParse({ username: "jon", email: "j@x.com", password: "longenough1" });
    expect(r.success).toBe(true);
  });
  it("rejects short passwords", () => {
    expect(signUpSchema.safeParse({ username: "jon", email: "j@x.com", password: "short" }).success).toBe(false);
  });
  it("rejects NoSQL operator objects in place of strings", () => {
    expect(loginSchema.safeParse({ username: { $gt: "" }, password: { $gt: "" } }).success).toBe(false);
  });
  it("rejects unknown keys (strict)", () => {
    expect(loginSchema.safeParse({ username: "a", password: "longenough1", $where: "1" }).success).toBe(false);
  });
});

describe("candidate schemas", () => {
  it("rejects invalid ObjectId strings", () => {
    expect(objectIdSchema.safeParse("not-an-id").success).toBe(false);
    expect(objectIdSchema.safeParse("507f1f77bcf86cd799439011").success).toBe(true);
  });
  it("stageMove requires exactly one of stage/rejected", () => {
    expect(stageMoveSchema.safeParse({ stage: "offer" }).success).toBe(true);
    expect(stageMoveSchema.safeParse({ rejected: true }).success).toBe(true);
    expect(stageMoveSchema.safeParse({}).success).toBe(false);
    expect(stageMoveSchema.safeParse({ stage: "offer", rejected: true }).success).toBe(false);
    expect(stageMoveSchema.safeParse({ stage: "fired" }).success).toBe(false);
  });
  it("list query rejects operator smuggling in search", () => {
    expect(candidateListQuerySchema.safeParse({ search: { $ne: null } }).success).toBe(false);
  });
  it("createCandidate validates enums and lengths", () => {
    const valid = createCandidateSchema.safeParse({
      jobId: "507f1f77bcf86cd799439011", name: "A", email: "a@x.com",
      source: "referral", stage: "applied",
    });
    expect(valid.success).toBe(true);
    expect(createCandidateSchema.safeParse({ jobId: "507f1f77bcf86cd799439011", name: "A", email: "nope", source: "referral", stage: "applied" }).success).toBe(false);
  });
});
