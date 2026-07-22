import { InferSchemaType, Schema, model, models, type Model } from "mongoose";

const rateLimitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  windowStart: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
});
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RateLimit = InferSchemaType<typeof rateLimitSchema>;
export default (models.RateLimit as Model<RateLimit>) ?? model<RateLimit>("RateLimit", rateLimitSchema);
