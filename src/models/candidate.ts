import { InferSchemaType, Schema, model, models, type Model } from "mongoose";
import { SOURCES, STAGES } from "@/lib/types";

export const ACTIVITY_TYPES = [
  "created", "stage-moved", "rating-changed", "note-added", "resume-parsed", "updated",
] as const;

const candidateSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true, maxlength: 40 },
    location: { type: String, trim: true, maxlength: 120 },
    avatarSeed: { type: String, required: true },
    source: { type: String, enum: SOURCES, required: true },
    stage: { type: String, enum: STAGES, required: true },
    rejected: { type: Boolean, default: false },
    stageHistory: [
      new Schema({ stage: { type: String, enum: STAGES, required: true }, enteredAt: { type: Date, required: true } }, { _id: false }),
    ],
    rating: { type: Number, min: 0, max: 5, default: 0 },
    tags: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    experience: [
      new Schema(
        {
          company: { type: String, required: true, maxlength: 120 },
          title: { type: String, required: true, maxlength: 120 },
          startDate: { type: Date, required: true },
          endDate: { type: Date },
        },
        { _id: false }
      ),
    ],
    education: { type: String, maxlength: 300 },
    desiredPay: { type: String, maxlength: 60 },
    notes: [
      new Schema(
        {
          authorId: { type: Schema.Types.ObjectId, required: true },
          authorName: { type: String, required: true },
          body: { type: String, required: true, maxlength: 2000 },
          createdAt: { type: Date, required: true },
        },
        { _id: false }
      ),
    ],
    activity: [
      new Schema(
        {
          type: { type: String, enum: ACTIVITY_TYPES, required: true },
          actorId: { type: Schema.Types.ObjectId, required: true },
          actorName: { type: String, required: true },
          meta: { type: String, default: "" },
          createdAt: { type: Date, required: true },
        },
        { _id: false }
      ),
    ],
    resume: new Schema(
      {
        text: { type: String, required: true, maxlength: 100000 },
        parsedFields: {
          name: String,
          email: String,
          phone: String,
          skills: { type: [String], default: [] },
        },
        parsedAt: { type: Date, required: true },
      },
      { _id: false }
    ),
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);
candidateSchema.index({ workspaceId: 1, jobId: 1, stage: 1 });
candidateSchema.index({ workspaceId: 1, updatedAt: -1 });

export type Candidate = InferSchemaType<typeof candidateSchema>;
export default (models.Candidate as Model<Candidate>) ?? model<Candidate>("Candidate", candidateSchema);
