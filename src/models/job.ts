import { InferSchemaType, Schema, model, models, type Model } from "mongoose";
import { EMPLOYMENT_TYPES } from "@/lib/types";

const jobSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    department: { type: String, required: true, trim: true, maxlength: 80 },
    location: { type: String, required: true, trim: true, maxlength: 120 },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES, required: true },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    description: { type: String, default: "", maxlength: 5000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export type Job = InferSchemaType<typeof jobSchema>;
export default (models.Job as Model<Job>) ?? model<Job>("Job", jobSchema);
