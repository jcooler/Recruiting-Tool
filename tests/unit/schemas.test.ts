import { describe, expect, it } from "vitest";
import { z } from "zod";
import { loginSchema, signUpSchema } from "@/lib/schemas/auth";
import { createCandidateSchema, stageMoveSchema, candidateListQuerySchema, updateCandidateSchema, noteSchema, ratingSchema, memberRoleSchema } from "@/lib/schemas/candidate";
import { createJobSchema, updateJobSchema } from "@/lib/schemas/job";
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

describe("injection hardening applies to every schema", () => {
  const validSamples: [string, z.ZodTypeAny, Record<string, unknown>][] = [
    ["signUpSchema", signUpSchema, { username: "jon", email: "j@x.com", password: "longenough1" }],
    ["loginSchema", loginSchema, { username: "jon", password: "longenough1" }],
    ["createJobSchema", createJobSchema, { title: "T", department: "D", location: "L", employmentType: "full-time" }],
    ["updateJobSchema", updateJobSchema, { title: "T" }],
    ["createCandidateSchema", createCandidateSchema, { jobId: "507f1f77bcf86cd799439011", name: "A", email: "a@x.com", source: "referral", stage: "applied" }],
    ["updateCandidateSchema", updateCandidateSchema, { name: "A" }],
    ["stageMoveSchema", stageMoveSchema, { stage: "offer" }],
    ["noteSchema", noteSchema, { body: "hello" }],
    ["ratingSchema", ratingSchema, { rating: 3 }],
    ["memberRoleSchema", memberRoleSchema, { role: "admin" }],
  ];

  it.each(validSamples)("%s rejects unknown/$-operator keys", (_name, schema, valid) => {
    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse({ ...valid, $where: "1" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, injected: true }).success).toBe(false);
  });

  it.each(validSamples)("%s rejects operator objects replacing string values", (_name, schema, valid) => {
    const firstStringKey = Object.entries(valid).find(([, v]) => typeof v === "string")?.[0];
    if (!firstStringKey) return;
    expect(schema.safeParse({ ...valid, [firstStringKey]: { $ne: "" } }).success).toBe(false);
  });
});
