import { InferSchemaType, Schema, model, models, type Model } from "mongoose";

const workspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    isDemo: { type: Boolean, default: false },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);
workspaceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

export type Workspace = InferSchemaType<typeof workspaceSchema>;
export default (models.Workspace as Model<Workspace>) ?? model<Workspace>("Workspace", workspaceSchema);
