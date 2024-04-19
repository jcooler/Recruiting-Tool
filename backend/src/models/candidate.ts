import { InferSchemaType, Schema, model } from "mongoose";

const candidateSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      
    },
    address: {
      type: String,
      
    },
    skills: {
      type: [String],
      
    },
    experience: {
      type: Number,
      
    },
    education: {
      type: String,
      
    },
    certifications: {
      type: [String],
    },
    desiredPay: {
      type: String,
    },
    typeOfEmployment: {
      type: [String],
    },
    desiredWorkLocation: {
      type: [String],
    },
    status: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

type Candidate = InferSchemaType<typeof candidateSchema>;

export default model<Candidate>("Candidate", candidateSchema);
