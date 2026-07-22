import { z } from "zod";
import { EMPLOYMENT_TYPES } from "@/lib/types";
import { trimmedString } from "./common";

export const createJobSchema = z
  .object({
    title: trimmedString(120),
    department: trimmedString(80),
    location: trimmedString(120),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    description: z.string().max(5000).optional().default(""),
    status: z.enum(["open", "closed"]).optional().default("open"),
  })
  .strict();

export const updateJobSchema = createJobSchema.partial().strict();
