import type { EmploymentType, Role, Source, Stage } from "@/lib/types";

export interface UserDto {
  id: string;
  username: string;
  email?: string;
  role: Role;
  workspaceId: string;
  isDemo: boolean;
  workspaceName: string;
  demoExpiresAt?: string;
}

export interface JobDto {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  status: "open" | "closed";
  description: string;
  createdAt: string;
  counts?: Record<Stage, number>;
}

export interface CandidateDto {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  avatarSeed: string;
  source: Source;
  stage: Stage;
  rejected: boolean;
  stageHistory: { stage: Stage; enteredAt: string }[];
  rating: number;
  tags: string[];
  skills: string[];
  experience: { company: string; title: string; startDate: string; endDate?: string }[];
  education?: string;
  desiredPay?: string;
  notes: { authorId: string; authorName: string; body: string; createdAt: string }[];
  activity: { type: string; actorId: string; actorName: string; meta: string; createdAt: string }[];
  resume?: {
    text: string;
    parsedFields: { name?: string; email?: string; phone?: string; skills: string[] };
    parsedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Minimal shapes for the Mongoose documents these mappers consume. The
// documents themselves are `InferSchemaType` results (see src/models/*), so
// these types intentionally cover only the fields the DTOs read.
interface CandidateDoc {
  _id: { toString(): string };
  jobId: { toString(): string };
  name: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  avatarSeed: string;
  source: Source;
  stage: Stage;
  rejected: boolean;
  stageHistory: { stage: Stage; enteredAt: Date }[];
  rating: number;
  tags: string[];
  skills: string[];
  experience: { company: string; title: string; startDate: Date; endDate?: Date | null }[];
  education?: string | null;
  desiredPay?: string | null;
  notes: { authorId: { toString(): string }; authorName: string; body: string; createdAt: Date }[];
  activity: {
    type: string;
    actorId: { toString(): string };
    actorName: string;
    meta: string;
    createdAt: Date;
  }[];
  resume?: {
    text: string;
    parsedFields?: { name?: string | null; email?: string | null; phone?: string | null; skills: string[] } | null;
    parsedAt: Date;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface JobDoc {
  _id: { toString(): string };
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  status: "open" | "closed";
  description: string;
  createdAt: Date;
}

export function toCandidateDto(doc: CandidateDoc): CandidateDto {
  return {
    id: doc._id.toString(),
    jobId: doc.jobId.toString(),
    name: doc.name,
    email: doc.email,
    ...(doc.phone != null ? { phone: doc.phone } : {}),
    ...(doc.location != null ? { location: doc.location } : {}),
    avatarSeed: doc.avatarSeed,
    source: doc.source,
    stage: doc.stage,
    rejected: doc.rejected,
    stageHistory: doc.stageHistory.map((h) => ({ stage: h.stage, enteredAt: h.enteredAt.toISOString() })),
    rating: doc.rating,
    tags: doc.tags,
    skills: doc.skills,
    experience: doc.experience.map((e) => ({
      company: e.company,
      title: e.title,
      startDate: e.startDate.toISOString(),
      ...(e.endDate != null ? { endDate: e.endDate.toISOString() } : {}),
    })),
    ...(doc.education != null ? { education: doc.education } : {}),
    ...(doc.desiredPay != null ? { desiredPay: doc.desiredPay } : {}),
    notes: doc.notes.map((n) => ({
      authorId: n.authorId.toString(),
      authorName: n.authorName,
      body: n.body,
      createdAt: n.createdAt.toISOString(),
    })),
    activity: doc.activity.map((a) => ({
      type: a.type,
      actorId: a.actorId.toString(),
      actorName: a.actorName,
      meta: a.meta,
      createdAt: a.createdAt.toISOString(),
    })),
    ...(doc.resume != null
      ? {
          resume: {
            text: doc.resume.text,
            parsedFields: {
              ...(doc.resume.parsedFields?.name != null ? { name: doc.resume.parsedFields.name } : {}),
              ...(doc.resume.parsedFields?.email != null ? { email: doc.resume.parsedFields.email } : {}),
              ...(doc.resume.parsedFields?.phone != null ? { phone: doc.resume.parsedFields.phone } : {}),
              skills: doc.resume.parsedFields?.skills ?? [],
            },
            parsedAt: doc.resume.parsedAt.toISOString(),
          },
        }
      : {}),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function toJobDto(doc: JobDoc, counts?: Record<Stage, number>): JobDto {
  return {
    id: doc._id.toString(),
    title: doc.title,
    department: doc.department,
    location: doc.location,
    employmentType: doc.employmentType,
    status: doc.status,
    description: doc.description,
    createdAt: doc.createdAt.toISOString(),
    ...(counts != null ? { counts } : {}),
  };
}
