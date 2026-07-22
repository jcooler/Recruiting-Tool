import { z } from "zod";

export const signUpSchema = z
  .object({
    username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_.-]+$/, "Letters, numbers, . _ - only"),
    email: z.string().trim().email().max(254),
    password: z.string().min(10).max(128),
  })
  .strict();

export const loginSchema = z
  .object({ username: z.string().trim().min(1).max(40), password: z.string().min(1).max(128) })
  .strict();
