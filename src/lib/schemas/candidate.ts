import { z } from "zod";
import { ROLES, SOURCES, STAGES } from "@/lib/types";
import { objectIdSchema, trimmedString } from "./common";

const experienceSchema = z
  .object({
    company: trimmedString(120),
    title: trimmedString(120),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
  })
  .strict();

export const createCandidateSchema = z
  .object({
    jobId: objectIdSchema,
    name: trimmedString(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(40).optional(),
    location: z.string().trim().max(120).optional(),
    source: z.enum(SOURCES),
    stage: z.enum(STAGES).optional().default("applied"),
    tags: z.array(trimmedString(30)).max(20).optional().default([]),
    skills: z.array(trimmedString(40)).max(50).optional().default([]),
    experience: z.array(experienceSchema).max(20).optional().default([]),
    education: z.string().trim().max(300).optional(),
    desiredPay: z.string().trim().max(60).optional(),
    resumeText: z.string().max(100000).optional(),
  })
  .strict();

export const updateCandidateSchema = createCandidateSchema.omit({ jobId: true, stage: true, resumeText: true }).partial().strict();

export const stageMoveSchema = z
  .object({ stage: z.enum(STAGES).optional(), rejected: z.boolean().optional() })
  .strict()
  .refine((v) => (v.stage !== undefined) !== (v.rejected !== undefined), {
    message: "Provide exactly one of stage or rejected",
  });

export const noteSchema = z.object({ body: trimmedString(2000) }).strict();
export const ratingSchema = z.object({ rating: z.number().int().min(0).max(5) }).strict();

export const candidateListQuerySchema = z
  .object({
    jobId: objectIdSchema.optional(),
    stage: z.enum(STAGES).optional(),
    search: z.string().trim().max(100).optional(),
    tag: z.string().trim().max(30).optional(),
    rejected: z.enum(["true", "false"]).optional(),
  })
  .strict();

export const memberRoleSchema = z.object({ role: z.enum(ROLES) }).strict();
