import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
export const trimmedString = (max: number) => z.string().trim().min(1).max(max);
