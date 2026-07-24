import { faker } from "@faker-js/faker";
import { Types } from "mongoose";
import CandidateModel from "@/models/candidate";
import JobModel from "@/models/job";
import { KNOWN_SKILLS } from "@/lib/resume";
import { SOURCES, STAGES, type EmploymentType, type Stage } from "@/lib/types";

const MS_PER_DAY = 86_400_000;
const DEMO_ACTOR_NAME = "Demo Recruiter";

export const DEMO_JOBS: {
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  description: string;
}[] = [
  {
    title: "Senior Frontend Engineer",
    department: "Engineering",
    location: "Remote",
    employmentType: "full-time",
    description:
      "Own the architecture of our React/TypeScript client and mentor mid-level engineers. You'll partner closely with design to ship polished, accessible UI at a fast pace. Strong opinions about state management and performance are a plus.",
  },
  {
    title: "Product Designer",
    department: "Design",
    location: "New York, NY",
    employmentType: "full-time",
    description:
      "Shape end-to-end product experiences, from early discovery sketches to high-fidelity prototypes and design-system components. You'll work directly with engineering and product to ship features customers love. Portfolio of shipped B2B SaaS work strongly preferred.",
  },
  {
    title: "Data Analyst",
    department: "Data",
    location: "Austin, TX",
    employmentType: "full-time",
    description:
      "Turn raw product and revenue data into clear, actionable insight for leadership. You'll build dashboards, run ad-hoc analyses, and partner with stakeholders across the business. SQL fluency and a knack for storytelling with numbers are essential.",
  },
  {
    title: "Engineering Manager",
    department: "Engineering",
    location: "San Francisco, CA",
    employmentType: "full-time",
    description:
      "Lead a team of 5-8 engineers building our core platform, balancing hands-on technical guidance with career growth for your reports. You'll drive planning, hiring, and cross-team coordination. Prior experience managing engineers at a growth-stage startup is ideal.",
  },
  {
    title: "Customer Success Lead",
    department: "GTM",
    location: "Chicago, IL (Hybrid)",
    employmentType: "full-time",
    description:
      "Own renewal and expansion outcomes for our largest accounts, building playbooks the rest of the team can follow. You'll be the voice of the customer in product planning meetings. Experience running a book of enterprise accounts is required.",
  },
];

const TAGS = ["senior", "junior", "remote-ok", "referral", "fast-track", "relocation"] as const;

const EDUCATION_DEGREES = ["B.S.", "B.A.", "M.S.", "M.B.A.", "Ph.D."] as const;
const EDUCATION_FIELDS = [
  "Computer Science",
  "Business Administration",
  "Design",
  "Economics",
  "Data Science",
  "Communications",
  "Mechanical Engineering",
  "Psychology",
] as const;

// stage/rejected bucket weights per the brief: applied .30, screening .25,
// interview .20, offer .10, hired .10, rejected .05
type Bucket = Stage | "rejected";
const BUCKET_WEIGHTS: { bucket: Bucket; weight: number }[] = [
  { bucket: "applied", weight: 0.3 },
  { bucket: "screening", weight: 0.25 },
  { bucket: "interview", weight: 0.2 },
  { bucket: "offer", weight: 0.1 },
  { bucket: "hired", weight: 0.1 },
  { bucket: "rejected", weight: 0.05 },
];

/** Even integer split of `total` across `parts` buckets (remainder to the first buckets). */
function spreadEvenly(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const remainder = total % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Largest-remainder apportionment of `n` items across the weighted buckets.
 * Deterministic (no randomness) so every stage/rejected bucket gets a fair
 * share of a job's candidates instead of leaving low-weight stages empty by
 * chance — this is what guarantees the default 60-candidate seed populates
 * every stage of every job.
 */
function allocateBuckets(n: number): Record<Bucket, number> {
  const raw = BUCKET_WEIGHTS.map(({ weight }) => weight * n);
  const floors = raw.map(Math.floor);
  const allocated = floors.reduce((a, b) => a + b, 0);
  const remainder = n - allocated;

  const order = raw
    .map((r, i) => ({ i, frac: r - floors[i] }))
    .sort((a, b) => b.frac - a.frac);

  const counts = [...floors];
  for (let k = 0; k < remainder; k++) {
    counts[order[k % order.length].i]++;
  }

  return Object.fromEntries(BUCKET_WEIGHTS.map(({ bucket }, i) => [bucket, counts[i]])) as Record<Bucket, number>;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Builds a chronological stageHistory from a random application date 5-60
 * days ago, hopping 1-9 days forward through each stage up to `finalStage`.
 * Every date is clamped to `now` so a run of unlucky hops never produces a
 * stage entry in the future (which would otherwise poison time-in-stage
 * analytics with negative durations).
 */
function buildStageHistory(finalStage: Stage, now: number): { stage: Stage; enteredAt: Date }[] {
  const finalIdx = STAGES.indexOf(finalStage);
  const daysAgo = faker.number.int({ min: 5, max: 60 });

  const timestamps: number[] = [Math.min(now - daysAgo * MS_PER_DAY, now)];
  for (let i = 1; i <= finalIdx; i++) {
    const hop = faker.number.int({ min: 1, max: 9 });
    timestamps.push(Math.min(timestamps[i - 1] + hop * MS_PER_DAY, now));
  }

  return timestamps.map((ts, i) => ({ stage: STAGES[i], enteredAt: new Date(ts) }));
}

function buildExperience(now: number): { company: string; title: string; startDate: Date; endDate?: Date }[] {
  const count = faker.number.int({ min: 1, max: 4 });
  const entries: { company: string; title: string; startDate: Date; endDate?: Date }[] = [];

  let cursor = now - faker.number.int({ min: 3, max: 12 }) * 365 * MS_PER_DAY;
  for (let i = 0; i < count; i++) {
    const durationDays = faker.number.int({ min: 180, max: 900 });
    const startMs = Math.min(cursor, now);
    const endMs = Math.min(cursor + durationDays * MS_PER_DAY, now);
    const isCurrentJob = i === count - 1 && faker.datatype.boolean();

    entries.push({
      company: faker.company.name(),
      title: faker.person.jobTitle(),
      startDate: new Date(startMs),
      ...(isCurrentJob ? {} : { endDate: new Date(endMs) }),
    });

    const gapDays = faker.number.int({ min: 0, max: 180 });
    cursor = endMs + gapDays * MS_PER_DAY;
  }
  return entries;
}

function buildEducation(): string {
  const degree = faker.helpers.arrayElement(EDUCATION_DEGREES);
  const field = faker.helpers.arrayElement(EDUCATION_FIELDS);
  return `${degree} in ${field}, University of ${faker.location.city()}`;
}

interface SeedCandidate {
  workspaceId: Types.ObjectId;
  jobId: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  location: string;
  avatarSeed: string;
  source: (typeof SOURCES)[number];
  stage: Stage;
  rejected: boolean;
  stageHistory: { stage: Stage; enteredAt: Date }[];
  rating: number;
  tags: string[];
  skills: string[];
  experience: { company: string; title: string; startDate: Date; endDate?: Date }[];
  education: string;
  notes: { authorId: Types.ObjectId; authorName: string; body: string; createdAt: Date }[];
  activity: { type: string; actorId: Types.ObjectId; actorName: string; meta: string; createdAt: Date }[];
  createdBy: Types.ObjectId;
}

function buildCandidate(
  workspaceId: Types.ObjectId,
  jobId: Types.ObjectId,
  actorId: Types.ObjectId,
  bucket: Bucket,
  now: number,
  jobTitle: string
): SeedCandidate {
  const name = faker.person.fullName();
  const finalStage: Stage = bucket === "rejected" ? faker.helpers.arrayElement(STAGES) : bucket;
  const stageHistory = buildStageHistory(finalStage, now);
  const appliedAt = stageHistory[0].enteredAt;

  const activity: SeedCandidate["activity"] = [
    { type: "created", actorId, actorName: DEMO_ACTOR_NAME, meta: `added to ${jobTitle}`, createdAt: appliedAt },
  ];
  const noteCount = faker.number.int({ min: 0, max: 2 });
  const notes: SeedCandidate["notes"] = [];
  for (let i = 0; i < noteCount; i++) {
    const createdAt = faker.date.between({ from: appliedAt, to: new Date(now) });
    const body = faker.lorem.sentence();
    notes.push({ authorId: actorId, authorName: DEMO_ACTOR_NAME, body, createdAt });
    activity.push({ type: "note-added", actorId, actorName: DEMO_ACTOR_NAME, meta: "", createdAt });
  }

  return {
    workspaceId,
    jobId,
    name,
    email: faker.internet.email({ firstName: name.split(" ")[0] }).toLowerCase(),
    phone: faker.phone.number(),
    location: faker.location.city(),
    avatarSeed: slugify(name),
    source: faker.helpers.arrayElement(SOURCES),
    stage: finalStage,
    rejected: bucket === "rejected",
    stageHistory,
    rating: faker.helpers.weightedArrayElement([
      { weight: 1, value: 0 },
      { weight: 2, value: 1 },
      { weight: 4, value: 2 },
      { weight: 6, value: 3 },
      { weight: 6, value: 4 },
      { weight: 2, value: 5 },
    ]),
    tags: faker.helpers.arrayElements(TAGS, { min: 1, max: 3 }),
    skills: faker.helpers.arrayElements(KNOWN_SKILLS, { min: 3, max: 8 }),
    experience: buildExperience(now),
    education: buildEducation(),
    notes,
    activity,
    createdBy: actorId,
  };
}

export async function seedWorkspace(
  workspaceId: Types.ObjectId | string,
  actorUserId: Types.ObjectId | string,
  opts?: { seed?: number; candidateCount?: number }
): Promise<{ jobs: number; candidates: number }> {
  faker.seed(opts?.seed ?? 42);

  const wsId = new Types.ObjectId(workspaceId);
  const actorId = new Types.ObjectId(actorUserId);
  const now = Date.now();

  const jobs = await JobModel.insertMany(
    DEMO_JOBS.map((job) => ({ ...job, workspaceId: wsId, createdBy: actorId }))
  );

  const totalCandidates = opts?.candidateCount ?? 60;
  const perJobCounts = spreadEvenly(totalCandidates, jobs.length);

  const candidateDocs: SeedCandidate[] = [];
  jobs.forEach((job, i) => {
    const buckets = allocateBuckets(perJobCounts[i]);
    for (const { bucket } of BUCKET_WEIGHTS) {
      const count = buckets[bucket];
      for (let k = 0; k < count; k++) {
        candidateDocs.push(buildCandidate(wsId, job._id, actorId, bucket, now, job.title));
      }
    }
  });

  if (candidateDocs.length) await CandidateModel.insertMany(candidateDocs);

  return { jobs: jobs.length, candidates: candidateDocs.length };
}
