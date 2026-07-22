import { InferSchemaType, Schema, model, models, type Model } from "mongoose";
import { ROLES } from "@/lib/types";

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, maxlength: 40 },
    email: { type: String, required: true, unique: true, select: false, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    role: { type: String, enum: ROLES, required: true },
  },
  { timestamps: true }
);

export type User = InferSchemaType<typeof userSchema>;
export default (models.User as Model<User>) ?? model<User>("User", userSchema);
