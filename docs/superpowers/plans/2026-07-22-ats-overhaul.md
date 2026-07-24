# ATS Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the Express backend + Next.js pages frontend into one Next.js 15 App Router app: workspace/RBAC data model, Kanban pipeline with keyboard-accessible drag-drop, resume parsing, analytics, one-click demo sandbox, security hardening, and WCAG 2.2 AA in light + dark themes.

**Architecture:** Single Next.js app at repo root. Mongoose models + Mongo-backed sessions (ported semantics from the old Express app), every API route wrapped in a `withAuth` composable (session → workspace scope → RBAC → rate limit → zod strict parse). TanStack Query for server state with optimistic stage moves; Zustand for ephemeral UI only. Old `backend/` and `frontend/` directories are deleted in the final phase.

**Tech Stack:** Next.js 15 (App Router, React 19), TypeScript strict, Mongoose 8, zod, bcrypt, TanStack Query/Table/Virtual, Zustand, @dnd-kit/core, Recharts, cmdk, react-loading-skeleton, Framer Motion, Tailwind CSS v4 + Radix primitives, @faker-js/faker + @dicebear (local SVG avatars), pdf-parse + mammoth, Vitest + mongodb-memory-server, Playwright + @axe-core/playwright.

**Spec:** `docs/superpowers/specs/2026-07-22-ats-overhaul-design.md` — read it before starting any task.

## Global Constraints

- TypeScript `strict: true` everywhere; no `any` (use `unknown` + narrowing, matching existing backend style).
- Every API input parsed with zod `.strict()` schemas before any DB call; ObjectIds validated; unknown keys rejected.
- Every Mongo query scoped by `workspaceId` taken from the session context — never from client input.
- Roles: `admin` > `recruiter` > `interviewer` (exact strings). Stages: `applied`, `screening`, `interview`, `offer`, `hired` (exact strings, this order) plus a `rejected: boolean` archive flag.
- Session cookie name `aw_session`: httpOnly, `sameSite=lax`, `secure` in production, `path=/`. Theme cookie `aw_theme` (`light`|`dark`), not httpOnly.
- Zustand for ephemeral UI state only — no persist middleware, no localStorage of app data.
- API error contract: JSON `{ "error": string }` with correct status code.
- All API routes run on the Node.js runtime (never edge — Mongoose/bcrypt need Node).
- Env vars: `MONGODB_URI`, `SESSION_SECRET` (min 32 chars) — validated at boot, never hardcoded.
- Accessibility: WCAG 2.2 AA in BOTH themes; stage/rating never color-only; `prefers-reduced-motion` respected; focus trapped in overlays and restored on close.
- Commit after every task (conventional commits, `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`).
- New app lives at repo root (`app/`, `src/`, `scripts/`, `tests/`). Do NOT touch `backend/` or `frontend/` until Task 28 deletes them.
- Windows dev machine: commands below are PowerShell-safe (`npm run ...`); path separators in configs use forward slashes.

---

## Phase A — Foundation

### Task 1: Scaffold the root Next.js app

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`, `.env.example`, `.env.local` (developer supplies values), `vitest.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `src/lib/types.ts`, `tests/unit/types.test.ts`

**Interfaces:**
- Produces: `STAGES`, `Stage`, `ROLES`, `Role`, `roleRank`, `SOURCES`, `Source`, `EMPLOYMENT_TYPES` from `@/lib/types` — every later task imports these.
- Produces: npm scripts `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch`.

- [ ] **Step 1: Create root package.json and install**

```json
{
  "name": "applicantwizard",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "seed": "tsx scripts/seed.ts",
    "contrast": "node scripts/contrast-check.mjs"
  }
}
```

Run:
```
npm install next@15 react@19 react-dom@19 mongoose@8 bcrypt zod
npm install @tanstack/react-query@5 @tanstack/react-table@8 @tanstack/react-virtual@3 zustand @dnd-kit/core @dnd-kit/utilities recharts cmdk react-loading-skeleton framer-motion @dicebear/core @dicebear/collection react-hook-form @hookform/resolvers
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-toast @radix-ui/react-tabs @radix-ui/react-select
npm install pdf-parse@1.1.1 mammoth
npm install -D typescript @types/node @types/react @types/react-dom @types/bcrypt tailwindcss@4 @tailwindcss/postcss vitest mongodb-memory-server @faker-js/faker tsx eslint eslint-config-next
```
Expected: installs cleanly (bcrypt uses prebuilt Windows binaries).

- [ ] **Step 2: Write configs**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "backend", "frontend"]
}
```

`next.config.ts`:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose", "bcrypt", "pdf-parse", "mammoth"],
};

export default nextConfig;
```

`postcss.config.mjs`:
```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    hookTimeout: 60000,
    testTimeout: 30000,
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

`.gitignore` (root):
```
node_modules/
.next/
.env*.local
coverage/
test-results/
playwright-report/
screenshots/
```

`.env.example`:
```
MONGODB_URI=mongodb://localhost:27017/applicantwizard
SESSION_SECRET=change-me-to-a-random-string-of-at-least-32-chars
```

- [ ] **Step 3: Write the shared domain constants and a failing test**

`tests/unit/types.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { STAGES, ROLES, roleRank, SOURCES } from "@/lib/types";

describe("domain constants", () => {
  it("defines the five pipeline stages in order", () => {
    expect(STAGES).toEqual(["applied", "screening", "interview", "offer", "hired"]);
  });
  it("ranks roles admin > recruiter > interviewer", () => {
    expect(roleRank.admin).toBeGreaterThan(roleRank.recruiter);
    expect(roleRank.recruiter).toBeGreaterThan(roleRank.interviewer);
  });
  it("defines candidate sources", () => {
    expect(SOURCES).toContain("referral");
    expect(ROLES).toEqual(["admin", "recruiter", "interviewer"]);
  });
});
```

Run: `npm test` — Expected: FAIL (cannot resolve `@/lib/types`).

- [ ] **Step 4: Implement `src/lib/types.ts`**

```ts
export const STAGES = ["applied", "screening", "interview", "offer", "hired"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
};

export const ROLES = ["admin", "recruiter", "interviewer"] as const;
export type Role = (typeof ROLES)[number];

export const roleRank: Record<Role, number> = { interviewer: 0, recruiter: 1, admin: 2 };

export const SOURCES = ["job-board", "referral", "agency", "outbound", "career-page", "other"] as const;
export type Source = (typeof SOURCES)[number];

export const SOURCE_LABELS: Record<Source, string> = {
  "job-board": "Job board",
  referral: "Referral",
  agency: "Agency",
  outbound: "Outbound",
  "career-page": "Career page",
  other: "Other",
};

export const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "intern"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
```

Run: `npm test` — Expected: PASS (3 tests).

- [ ] **Step 5: Minimal app shell renders**

`app/globals.css`:
```css
@import "tailwindcss";
```

`app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApplicantWizard",
  description: "A modern applicant tracking system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`app/page.tsx`:
```tsx
export default function Home() {
  return <main className="p-8 text-xl font-semibold">ApplicantWizard</main>;
}
```

Run: `npm run typecheck` then `npm run dev` and open http://localhost:3000 — Expected: page renders "ApplicantWizard". Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 app with strict TS, Tailwind v4, vitest"
```

---

### Task 2: Env validation, cached Mongo connection, test DB harness

**Files:**
- Create: `src/lib/env.ts`, `src/lib/db.ts`, `tests/helpers/db.ts`
- Test: `tests/unit/env.test.ts`, `tests/unit/db.test.ts`

**Interfaces:**
- Produces: `getEnv(): { MONGODB_URI: string; SESSION_SECRET: string }` (throws listing missing vars).
- Produces: `dbConnect(): Promise<typeof mongoose>` — cached across hot reloads/invocations via `globalThis`.
- Produces test helper: `setupTestDb()` — call at top of any vitest file needing Mongo; boots one in-memory server per file, clears collections after each test.

- [ ] **Step 1: Failing tests**

`tests/unit/env.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";

describe("getEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns validated env when all vars present", async () => {
    vi.stubEnv("MONGODB_URI", "mongodb://localhost/x");
    vi.stubEnv("SESSION_SECRET", "a".repeat(32));
    const { getEnv } = await import("@/lib/env");
    expect(getEnv().MONGODB_URI).toBe("mongodb://localhost/x");
  });

  it("throws naming the missing/invalid var", async () => {
    vi.stubEnv("MONGODB_URI", "mongodb://localhost/x");
    vi.stubEnv("SESSION_SECRET", "short");
    const { getEnv } = await import("@/lib/env");
    expect(() => getEnv()).toThrow(/SESSION_SECRET/);
  });
});
```

`tests/unit/db.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { setupTestDb } from "../helpers/db";

setupTestDb();

describe("dbConnect", () => {
  it("connects and reuses the cached connection", async () => {
    const { dbConnect } = await import("@/lib/db");
    const a = await dbConnect();
    const b = await dbConnect();
    expect(a).toBe(b);
    expect(mongoose.connection.readyState).toBe(1);
  });
});
```

Run: `npm test` — Expected: FAIL (modules missing).

- [ ] **Step 2: Implement**

`src/lib/env.ts` (zod replaces the old envalid pattern, same boot-validation semantics):
```ts
import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
});

type Env = z.infer<typeof envSchema>;
let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${details}`);
  }
  cached = parsed.data;
  return cached;
}

/** test-only */
export function resetEnvCache() {
  cached = null;
}
```

Note: `getEnv` caches — the env tests above must call `resetEnvCache()` in `afterEach` too; update the test's `afterEach` to:
```ts
afterEach(async () => {
  vi.unstubAllEnvs();
  (await import("@/lib/env")).resetEnvCache();
});
```

`src/lib/db.ts` (serverless-safe cached connection):
```ts
import mongoose from "mongoose";
import { getEnv } from "./env";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalWithMongoose = globalThis as typeof globalThis & { _mongoose?: MongooseCache };
const cache: MongooseCache = globalWithMongoose._mongoose ?? { conn: null, promise: null };
globalWithMongoose._mongoose = cache;

export async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose.connect(getEnv().MONGODB_URI, { bufferCommands: false });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
```

`tests/helpers/db.ts`:
```ts
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

export function setupTestDb() {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    vi.stubEnv("MONGODB_URI", mongod.getUri("testdb"));
    vi.stubEnv("SESSION_SECRET", "test-secret-".padEnd(32, "x"));
    const { resetEnvCache } = await import("@/lib/env");
    resetEnvCache();
    const { dbConnect } = await import("@/lib/db");
    await dbConnect();
  });

  afterEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
    vi.unstubAllEnvs();
  });
}
```

Run: `npm test` — Expected: PASS (first run downloads a Mongo binary; allow a minute).

- [ ] **Step 3: Commit**

```bash
git add src/lib/env.ts src/lib/db.ts tests/
git commit -m "feat: zod env validation and cached mongoose connection with test harness"
```

---

### Task 3: Mongoose models

**Files:**
- Create: `src/models/workspace.ts`, `src/models/user.ts`, `src/models/session.ts`, `src/models/job.ts`, `src/models/candidate.ts`, `src/models/rate-limit.ts`
- Test: `tests/unit/models.test.ts`

**Interfaces:**
- Produces default-export models `WorkspaceModel`, `UserModel`, `SessionModel`, `JobModel`, `CandidateModel`, `RateLimitModel`, each using the existing repo pattern (`InferSchemaType`, `timestamps: true`) plus hot-reload-safe registration: `models.X ?? model("X", schema)`.
- Candidate subdocument shapes used by later tasks:
  - `stageHistory: { stage: Stage; enteredAt: Date }[]`
  - `notes: { authorId: ObjectId; authorName: string; body: string; createdAt: Date }[]`
  - `activity: { type: "created" | "stage-moved" | "rating-changed" | "note-added" | "resume-parsed" | "updated"; actorId: ObjectId; actorName: string; meta: string; createdAt: Date }[]`
  - `experience: { company: string; title: string; startDate: Date; endDate?: Date }[]`
  - `resume?: { text: string; parsedFields: { name?: string; email?: string; phone?: string; skills: string[] }; parsedAt: Date }`

- [ ] **Step 1: Failing test**

`tests/unit/models.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { setupTestDb } from "../helpers/db";
import WorkspaceModel from "@/models/workspace";
import UserModel from "@/models/user";
import SessionModel from "@/models/session";
import JobModel from "@/models/job";
import CandidateModel from "@/models/candidate";

setupTestDb();

describe("models", () => {
  it("creates a workspace with isDemo default false", async () => {
    const ws = await WorkspaceModel.create({ name: "Acme" });
    expect(ws.isDemo).toBe(false);
    expect(ws.expiresAt).toBeUndefined();
  });

  it("hides email and passwordHash by default on User", async () => {
    const ws = await WorkspaceModel.create({ name: "Acme" });
    await UserModel.create({
      username: "jon", email: "j@x.com", passwordHash: "h",
      workspaceId: ws._id, role: "admin",
    });
    const found = await UserModel.findOne({ username: "jon" }).exec();
    expect(found!.email).toBeUndefined();
    expect(found!.passwordHash).toBeUndefined();
    const withSecret = await UserModel.findOne({ username: "jon" }).select("+email +passwordHash").exec();
    expect(withSecret!.email).toBe("j@x.com");
  });

  it("rejects invalid role and stage enums", async () => {
    const ws = await WorkspaceModel.create({ name: "Acme" });
    await expect(
      UserModel.create({ username: "a", email: "a@x.com", passwordHash: "h", workspaceId: ws._id, role: "boss" })
    ).rejects.toThrow(/role/);
    await expect(
      CandidateModel.create({
        workspaceId: ws._id, jobId: new Types.ObjectId(), name: "C", email: "c@x.com",
        avatarSeed: "s", source: "referral", stage: "limbo", createdBy: new Types.ObjectId(),
      })
    ).rejects.toThrow(/stage/);
  });

  it("creates a full candidate with defaults", async () => {
    const ws = await WorkspaceModel.create({ name: "Acme" });
    const job = await JobModel.create({
      workspaceId: ws._id, title: "Engineer", department: "Eng", location: "Remote",
      employmentType: "full-time", description: "d", createdBy: new Types.ObjectId(),
    });
    const c = await CandidateModel.create({
      workspaceId: ws._id, jobId: job._id, name: "Cami", email: "c@x.com",
      avatarSeed: "cami", source: "job-board", stage: "applied", createdBy: new Types.ObjectId(),
      stageHistory: [{ stage: "applied", enteredAt: new Date() }],
    });
    expect(c.rejected).toBe(false);
    expect(c.rating).toBe(0);
    expect(c.tags).toEqual([]);
    expect(job.status).toBe("open");
  });

  it("session TTL index exists on expiresAt", async () => {
    await SessionModel.createIndexes();
    const indexes = await SessionModel.collection.indexes();
    const ttl = indexes.find((i) => i.expireAfterSeconds === 0 && i.key.expiresAt === 1);
    expect(ttl).toBeDefined();
  });
});
```

Run: `npm test -- models` — Expected: FAIL (models missing).

- [ ] **Step 2: Implement the six models**

`src/models/workspace.ts`:
```ts
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
```

`src/models/user.ts`:
```ts
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
```

`src/models/session.ts`:
```ts
import { InferSchemaType, Schema, model, models, type Model } from "mongoose";

const sessionSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    expiresAt: { type: Date, required: true },
    absoluteExpiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type Session = InferSchemaType<typeof sessionSchema>;
export default (models.Session as Model<Session>) ?? model<Session>("Session", sessionSchema);
```

`src/models/job.ts`:
```ts
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
```

`src/models/candidate.ts`:
```ts
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
```

`src/models/rate-limit.ts`:
```ts
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
```

Run: `npm test -- models` — Expected: PASS (5 tests).

- [ ] **Step 3: Commit**

```bash
git add src/models tests/unit/models.test.ts
git commit -m "feat: workspace/user/session/job/candidate/rate-limit mongoose models"
```

---

### Task 4: Shared zod schemas (incl. NoSQL-injection hardening)

**Files:**
- Create: `src/lib/schemas/common.ts`, `src/lib/schemas/auth.ts`, `src/lib/schemas/job.ts`, `src/lib/schemas/candidate.ts`
- Test: `tests/unit/schemas.test.ts`

**Interfaces:**
- Produces (all `.strict()`):
  - `objectIdSchema` — `z.string().regex(/^[0-9a-fA-F]{24}$/)`
  - auth: `signUpSchema` (`username` 3–40 `/^[a-zA-Z0-9_.-]+$/`, `email`, `password` min 10 max 128), `loginSchema` (`username`, `password`)
  - job: `createJobSchema`, `updateJobSchema` (partial of create)
  - candidate: `createCandidateSchema`, `updateCandidateSchema` (partial), `stageMoveSchema` (`{ stage? , rejected? }`, exactly one key), `noteSchema` (`{ body: 1–2000 }`), `ratingSchema` (`{ rating: int 0–5 }`), `candidateListQuerySchema` (`{ jobId?, stage?, search? (max 100), tag?, rejected? ("true"|"false") }`)
  - `memberRoleSchema` (`{ role: enum ROLES }`)

- [ ] **Step 1: Failing tests (include operator-injection attempts)**

`tests/unit/schemas.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { loginSchema, signUpSchema } from "@/lib/schemas/auth";
import { createCandidateSchema, stageMoveSchema, candidateListQuerySchema } from "@/lib/schemas/candidate";
import { objectIdSchema } from "@/lib/schemas/common";

describe("auth schemas", () => {
  it("accepts a valid signup", () => {
    const r = signUpSchema.safeParse({ username: "jon", email: "j@x.com", password: "longenough1" });
    expect(r.success).toBe(true);
  });
  it("rejects short passwords", () => {
    expect(signUpSchema.safeParse({ username: "jon", email: "j@x.com", password: "short" }).success).toBe(false);
  });
  it("rejects NoSQL operator objects in place of strings", () => {
    expect(loginSchema.safeParse({ username: { $gt: "" }, password: { $gt: "" } }).success).toBe(false);
  });
  it("rejects unknown keys (strict)", () => {
    expect(loginSchema.safeParse({ username: "a", password: "longenough1", $where: "1" }).success).toBe(false);
  });
});

describe("candidate schemas", () => {
  it("rejects invalid ObjectId strings", () => {
    expect(objectIdSchema.safeParse("not-an-id").success).toBe(false);
    expect(objectIdSchema.safeParse("507f1f77bcf86cd799439011").success).toBe(true);
  });
  it("stageMove requires exactly one of stage/rejected", () => {
    expect(stageMoveSchema.safeParse({ stage: "offer" }).success).toBe(true);
    expect(stageMoveSchema.safeParse({ rejected: true }).success).toBe(true);
    expect(stageMoveSchema.safeParse({}).success).toBe(false);
    expect(stageMoveSchema.safeParse({ stage: "offer", rejected: true }).success).toBe(false);
    expect(stageMoveSchema.safeParse({ stage: "fired" }).success).toBe(false);
  });
  it("list query rejects operator smuggling in search", () => {
    expect(candidateListQuerySchema.safeParse({ search: { $ne: null } }).success).toBe(false);
  });
  it("createCandidate validates enums and lengths", () => {
    const valid = createCandidateSchema.safeParse({
      jobId: "507f1f77bcf86cd799439011", name: "A", email: "a@x.com",
      source: "referral", stage: "applied",
    });
    expect(valid.success).toBe(true);
    expect(createCandidateSchema.safeParse({ jobId: "507f1f77bcf86cd799439011", name: "A", email: "nope", source: "referral", stage: "applied" }).success).toBe(false);
  });
});
```

Run: `npm test -- schemas` — Expected: FAIL.

- [ ] **Step 2: Implement**

`src/lib/schemas/common.ts`:
```ts
import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
export const trimmedString = (max: number) => z.string().trim().min(1).max(max);
```

`src/lib/schemas/auth.ts`:
```ts
import { z } from "zod";

export const signUpSchema = z
  .object({
    username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_.-]+$/, "Letters, numbers, . _ - only"),
    email: z.string().trim().email().max(254),
    password: z.string().min(10).max(128),
  })
  .strict();

export const loginSchema = z
  .object({ username: z.string().trim().min(1).max(40), password: z.string().min(1).max(128) })
  .strict();
```

`src/lib/schemas/job.ts`:
```ts
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
```

`src/lib/schemas/candidate.ts`:
```ts
import { z } from "zod";
import { ROLES, SOURCES, STAGES } from "@/lib/types";
import { objectIdSchema, trimmedString } from "./common";

const experienceSchema = z
  .object({
    company: trimmedString(120),
    title: trimmedString(120),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
  })
  .strict();

export const createCandidateSchema = z
  .object({
    jobId: objectIdSchema,
    name: trimmedString(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(40).optional(),
    location: z.string().trim().max(120).optional(),
    source: z.enum(SOURCES),
    stage: z.enum(STAGES).optional().default("applied"),
    tags: z.array(trimmedString(30)).max(20).optional().default([]),
    skills: z.array(trimmedString(40)).max(50).optional().default([]),
    experience: z.array(experienceSchema).max(20).optional().default([]),
    education: z.string().trim().max(300).optional(),
    desiredPay: z.string().trim().max(60).optional(),
    resumeText: z.string().max(100000).optional(),
  })
  .strict();

export const updateCandidateSchema = createCandidateSchema.omit({ jobId: true, stage: true, resumeText: true }).partial().strict();

export const stageMoveSchema = z
  .object({ stage: z.enum(STAGES).optional(), rejected: z.boolean().optional() })
  .strict()
  .refine((v) => (v.stage !== undefined) !== (v.rejected !== undefined), {
    message: "Provide exactly one of stage or rejected",
  });

export const noteSchema = z.object({ body: trimmedString(2000) }).strict();
export const ratingSchema = z.object({ rating: z.number().int().min(0).max(5) }).strict();

export const candidateListQuerySchema = z
  .object({
    jobId: objectIdSchema.optional(),
    stage: z.enum(STAGES).optional(),
    search: z.string().trim().max(100).optional(),
    tag: z.string().trim().max(30).optional(),
    rejected: z.enum(["true", "false"]).optional(),
  })
  .strict();

export const memberRoleSchema = z.object({ role: z.enum(ROLES) }).strict();
```

Run: `npm test -- schemas` — Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/schemas tests/unit/schemas.test.ts
git commit -m "feat: strict zod schemas for auth/job/candidate with injection tests"
```

---

### Task 5: API error helpers + session library

**Files:**
- Create: `src/lib/api-error.ts`, `src/lib/session.ts`
- Test: `tests/unit/session.test.ts`, `tests/unit/api-error.test.ts`

**Interfaces:**
- Produces `ApiError` class (`new ApiError(status, message)`), `jsonError(status, message)` → `Response`, `handleApiError(err: unknown)` → `Response` (ZodError → 400 first-issue message; ApiError → its status; other → 500 "Internal server error").
- Produces session API (port of express-session + connect-mongo semantics — 1h rolling idle, 7d absolute default):
  - `SESSION_COOKIE = "aw_session"`
  - `createSession(userId: string, opts?: { absoluteMs?: number }): Promise<{ token: string; expiresAt: Date }>`
  - `getUserIdForToken(token: string): Promise<string | null>` — extends idle expiry (rolling), returns null when expired/unknown
  - `destroySession(token: string): Promise<void>`
  - `serializeSessionCookie(token: string, expiresAt: Date): string` and `expiredSessionCookie(): string` (Set-Cookie header values; httpOnly, SameSite=Lax, Path=/, Secure when `NODE_ENV === "production"`)

- [ ] **Step 1: Failing tests**

`tests/unit/api-error.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError, handleApiError, jsonError } from "@/lib/api-error";

describe("api errors", () => {
  it("jsonError shapes the contract", async () => {
    const res = jsonError(404, "Not found");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });
  it("maps ZodError to 400", async () => {
    const err = z.object({ a: z.string() }).safeParse({}).error;
    const res = handleApiError(err);
    expect(res.status).toBe(400);
  });
  it("maps ApiError to its status and unknown to 500", async () => {
    expect(handleApiError(new ApiError(403, "Forbidden")).status).toBe(403);
    expect(handleApiError(new Error("boom")).status).toBe(500);
    expect((await handleApiError(new Error("boom")).json()).error).toBe("Internal server error");
  });
});
```

`tests/unit/session.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { setupTestDb } from "../helpers/db";
import SessionModel from "@/models/session";
import { createSession, destroySession, getUserIdForToken, serializeSessionCookie } from "@/lib/session";

setupTestDb();

describe("sessions", () => {
  const userId = new Types.ObjectId().toString();

  it("round-trips a session and stores only a hash", async () => {
    const { token } = await createSession(userId);
    expect(await getUserIdForToken(token)).toBe(userId);
    const doc = await SessionModel.findOne().exec();
    expect(doc!.tokenHash).not.toBe(token);
  });

  it("returns null for unknown or expired tokens", async () => {
    expect(await getUserIdForToken("nope")).toBeNull();
    const { token } = await createSession(userId);
    await SessionModel.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
    expect(await getUserIdForToken(token)).toBeNull();
  });

  it("destroySession revokes server-side", async () => {
    const { token } = await createSession(userId);
    await destroySession(token);
    expect(await getUserIdForToken(token)).toBeNull();
  });

  it("cookie flags are correct", async () => {
    const cookie = serializeSessionCookie("tok", new Date(Date.now() + 1000));
    expect(cookie).toContain("aw_session=tok");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
  });
});
```

Run: `npm test -- session api-error` — Expected: FAIL.

- [ ] **Step 2: Implement**

`src/lib/api-error.ts`:
```ts
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

export function handleApiError(err: unknown): Response {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const path = first.path.length ? `${first.path.join(".")}: ` : "";
    return jsonError(400, `${path}${first.message}`);
  }
  if (err instanceof ApiError) return jsonError(err.status, err.message);
  console.error(err);
  return jsonError(500, "Internal server error");
}
```

`src/lib/session.ts`:
```ts
import { createHash, randomBytes } from "crypto";
import SessionModel from "@/models/session";
import { dbConnect } from "./db";

export const SESSION_COOKIE = "aw_session";
const IDLE_MS = 60 * 60 * 1000; // 1h rolling, matches old express-session config
const ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, opts?: { absoluteMs?: number }) {
  await dbConnect();
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const absolute = new Date(now + (opts?.absoluteMs ?? ABSOLUTE_MS));
  const expiresAt = new Date(Math.min(now + IDLE_MS, absolute.getTime()));
  await SessionModel.create({ tokenHash: hash(token), userId, expiresAt, absoluteExpiresAt: absolute });
  return { token, expiresAt: absolute };
}

export async function getUserIdForToken(token: string): Promise<string | null> {
  await dbConnect();
  const now = new Date();
  const doc = await SessionModel.findOne({ tokenHash: hash(token), expiresAt: { $gt: now } }).exec();
  if (!doc) return null;
  const newExpiry = new Date(Math.min(now.getTime() + IDLE_MS, doc.absoluteExpiresAt.getTime()));
  await SessionModel.updateOne({ _id: doc._id }, { expiresAt: newExpiry });
  return doc.userId.toString();
}

export async function destroySession(token: string): Promise<void> {
  await dbConnect();
  await SessionModel.deleteOne({ tokenHash: hash(token) });
}

function cookieBase(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function serializeSessionCookie(token: string, expiresAt: Date): string {
  return `${SESSION_COOKIE}=${token}; ${cookieBase()}; Expires=${expiresAt.toUTCString()}`;
}

export function expiredSessionCookie(): string {
  return `${SESSION_COOKIE}=; ${cookieBase()}; Expires=${new Date(0).toUTCString()}`;
}
```

Run: `npm test -- session api-error` — Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api-error.ts src/lib/session.ts tests/unit
git commit -m "feat: api error contract and mongo-backed rolling sessions"
```

---

### Task 6: Rate limiter (Mongo fixed-window)

**Files:**
- Create: `src/lib/rate-limit.ts`
- Test: `tests/unit/rate-limit.test.ts`

**Interfaces:**
- Produces `consumeRateLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; retryAfterSec: number }>` — atomic upsert+`$inc`; new window when the stored one has lapsed.
- Produces preset configs: `RATE_LIMITS = { auth: { limit: 10, windowMs: 15*60_000 }, mutation: { limit: 120, windowMs: 60_000 }, demo: { limit: 5, windowMs: 60*60_000 }, parse: { limit: 20, windowMs: 60_000 } }`.

- [ ] **Step 1: Failing tests**

`tests/unit/rate-limit.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { setupTestDb } from "../helpers/db";
import { consumeRateLimit } from "@/lib/rate-limit";

setupTestDb();

describe("consumeRateLimit", () => {
  it("allows up to the limit then blocks with retryAfter", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await consumeRateLimit("k1", 3, 60_000)).allowed).toBe(true);
    }
    const blocked = await consumeRateLimit("k1", 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("separate keys do not interfere", async () => {
    await consumeRateLimit("a", 1, 60_000);
    expect((await consumeRateLimit("b", 1, 60_000)).allowed).toBe(true);
  });

  it("resets after the window lapses", async () => {
    await consumeRateLimit("c", 1, 50); // 50ms window
    await new Promise((r) => setTimeout(r, 80));
    expect((await consumeRateLimit("c", 1, 50)).allowed).toBe(true);
  });
});
```

Run: `npm test -- rate-limit` — Expected: FAIL.

- [ ] **Step 2: Implement `src/lib/rate-limit.ts`**

```ts
import RateLimitModel from "@/models/rate-limit";
import { dbConnect } from "./db";

export const RATE_LIMITS = {
  auth: { limit: 10, windowMs: 15 * 60_000 },
  mutation: { limit: 120, windowMs: 60_000 },
  demo: { limit: 5, windowMs: 60 * 60_000 },
  parse: { limit: 20, windowMs: 60_000 },
} as const;

export type RateLimitConfig = { limit: number; windowMs: number };

export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  await dbConnect();
  const now = new Date();

  // Try to increment an active window atomically.
  const active = await RateLimitModel.findOneAndUpdate(
    { key, windowStart: { $gt: new Date(now.getTime() - windowMs) } },
    { $inc: { count: 1 } },
    { new: true }
  ).exec();

  if (active) {
    if (active.count > limit) {
      const resetAt = active.windowStart.getTime() + windowMs;
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)) };
    }
    return { allowed: true, retryAfterSec: 0 };
  }

  // No active window: start a fresh one (upsert replaces a lapsed doc).
  await RateLimitModel.updateOne(
    { key },
    { $set: { count: 1, windowStart: now, expiresAt: new Date(now.getTime() + windowMs * 2) } },
    { upsert: true }
  ).exec();
  return { allowed: true, retryAfterSec: 0 };
}
```

Run: `npm test -- rate-limit` — Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/rate-limit.ts tests/unit/rate-limit.test.ts
git commit -m "feat: mongo-backed fixed-window rate limiter"
```

---

### Task 7: `withAuth` route wrapper (session + workspace + RBAC + CSRF origin check + rate limit)

**Files:**
- Create: `src/lib/with-auth.ts`
- Test: `tests/unit/with-auth.test.ts`

**Interfaces:**
- Produces:
```ts
export interface AuthCtx {
  user: { id: string; username: string; role: Role; workspaceId: string; isDemo: boolean };
  params: Record<string, string>;
}
type AuthedHandler = (req: NextRequest, ctx: AuthCtx) => Promise<Response>;
type PublicHandler = (req: NextRequest, params: Record<string, string>) => Promise<Response>;

export function withAuth(
  handler: AuthedHandler,
  opts?: { minRole?: Role; rateLimit?: RateLimitConfig & { scope: string } }
): (req: NextRequest, route: { params: Promise<Record<string, string>> }) => Promise<Response>;

export function withPublic(
  handler: PublicHandler,
  opts?: { rateLimit?: RateLimitConfig & { scope: string } }
): (req: NextRequest, route: { params: Promise<Record<string, string>> }) => Promise<Response>;

export function clientIp(req: NextRequest): string; // x-forwarded-for first hop or "local"
```
- Behavior (in order): (1) origin check for POST/PATCH/PUT/DELETE — if `Origin` header present and its host ≠ `Host` header → 403; (2) rate limit by `${scope}:${clientIp}` → 429 with `Retry-After`; (3) session cookie → `getUserIdForToken` → load user (+workspace `isDemo`) → 401 "You must be logged in" if missing; (4) `roleRank[user.role] >= roleRank[minRole]` else 403 "Insufficient role"; (5) run handler inside try/catch → `handleApiError`.

- [ ] **Step 1: Failing tests**

`tests/unit/with-auth.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { setupTestDb } from "../helpers/db";
import WorkspaceModel from "@/models/workspace";
import UserModel from "@/models/user";
import { createSession, SESSION_COOKIE } from "@/lib/session";
import { withAuth, withPublic } from "@/lib/with-auth";

setupTestDb();

async function makeUser(role: "admin" | "recruiter" | "interviewer") {
  const ws = await WorkspaceModel.create({ name: "W" });
  const user = await UserModel.create({
    username: `u-${role}-${Math.floor(Math.random() * 1e9)}`,
    email: `${role}-${Math.floor(Math.random() * 1e9)}@x.com`,
    passwordHash: "h", workspaceId: ws._id, role,
  });
  const { token } = await createSession(user._id.toString());
  return { user, token };
}

function req(method: string, token?: string, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/test", {
    method,
    headers: { ...(token ? { cookie: `${SESSION_COOKIE}=${token}` } : {}), host: "localhost", ...headers },
  });
}
const route = { params: Promise.resolve({}) };

describe("withAuth", () => {
  const ok = withAuth(async () => Response.json({ ok: true }));

  it("401s without a session", async () => {
    expect((await ok(req("GET"), route)).status).toBe(401);
  });

  it("passes ctx.user for a valid session", async () => {
    const { user, token } = await makeUser("recruiter");
    const handler = withAuth(async (_req, ctx) => Response.json(ctx.user));
    const res = await handler(req("GET", token), route);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(user._id.toString());
    expect(body.workspaceId).toBe(user.workspaceId.toString());
    expect(body.role).toBe("recruiter");
  });

  it("enforces minRole (interviewer blocked from recruiter route)", async () => {
    const { token } = await makeUser("interviewer");
    const guarded = withAuth(async () => Response.json({ ok: true }), { minRole: "recruiter" });
    expect((await guarded(req("POST", token), route)).status).toBe(403);
  });

  it("admin passes recruiter gate", async () => {
    const { token } = await makeUser("admin");
    const guarded = withAuth(async () => Response.json({ ok: true }), { minRole: "recruiter" });
    expect((await guarded(req("POST", token), route)).status).toBe(200);
  });

  it("rejects cross-origin mutations", async () => {
    const { token } = await makeUser("admin");
    const res = await ok(req("POST", token, { origin: "https://evil.example" }), route);
    expect(res.status).toBe(403);
  });

  it("allows same-origin mutations", async () => {
    const { token } = await makeUser("admin");
    const res = await ok(req("POST", token, { origin: "http://localhost" }), route);
    expect(res.status).toBe(200);
  });

  it("rate limits withPublic", async () => {
    const open = withPublic(async () => Response.json({ ok: true }), {
      rateLimit: { limit: 2, windowMs: 60_000, scope: "t" },
    });
    await open(req("POST", undefined, { origin: "http://localhost" }), route);
    await open(req("POST", undefined, { origin: "http://localhost" }), route);
    const res = await open(req("POST", undefined, { origin: "http://localhost" }), route);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});
```

Run: `npm test -- with-auth` — Expected: FAIL.

- [ ] **Step 2: Implement `src/lib/with-auth.ts`**

```ts
import { NextRequest } from "next/server";
import UserModel from "@/models/user";
import WorkspaceModel from "@/models/workspace";
import { ApiError, handleApiError, jsonError } from "./api-error";
import { dbConnect } from "./db";
import { consumeRateLimit, type RateLimitConfig } from "./rate-limit";
import { getUserIdForToken, SESSION_COOKIE } from "./session";
import { roleRank, type Role } from "./types";

export interface AuthCtx {
  user: { id: string; username: string; role: Role; workspaceId: string; isDemo: boolean };
  params: Record<string, string>;
}

type AuthedHandler = (req: NextRequest, ctx: AuthCtx) => Promise<Response>;
type PublicHandler = (req: NextRequest, params: Record<string, string>) => Promise<Response>;
type RouteContext = { params: Promise<Record<string, string>> };
type Guard = { rateLimit?: RateLimitConfig & { scope: string } };

const MUTATING = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "local";
}

async function runGuards(req: NextRequest, opts?: Guard): Promise<Response | null> {
  if (MUTATING.has(req.method)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) return jsonError(403, "Cross-origin request rejected");
      } catch {
        return jsonError(403, "Cross-origin request rejected");
      }
    }
  }
  if (opts?.rateLimit) {
    const { scope, limit, windowMs } = opts.rateLimit;
    const result = await consumeRateLimit(`${scope}:${clientIp(req)}`, limit, windowMs);
    if (!result.allowed) {
      return Response.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } }
      );
    }
  }
  return null;
}

export function withPublic(handler: PublicHandler, opts?: Guard) {
  return async (req: NextRequest, route: RouteContext): Promise<Response> => {
    try {
      const guarded = await runGuards(req, opts);
      if (guarded) return guarded;
      await dbConnect();
      return await handler(req, await route.params);
    } catch (err) {
      return handleApiError(err);
    }
  };
}

export function withAuth(handler: AuthedHandler, opts?: Guard & { minRole?: Role }) {
  return async (req: NextRequest, route: RouteContext): Promise<Response> => {
    try {
      const guarded = await runGuards(req, opts);
      if (guarded) return guarded;
      await dbConnect();

      const token = req.cookies.get(SESSION_COOKIE)?.value;
      const userId = token ? await getUserIdForToken(token) : null;
      if (!userId) throw new ApiError(401, "You must be logged in to access this resource");

      const user = await UserModel.findById(userId).exec();
      if (!user) throw new ApiError(401, "You must be logged in to access this resource");

      if (opts?.minRole && roleRank[user.role as Role] < roleRank[opts.minRole]) {
        throw new ApiError(403, "Insufficient role for this action");
      }

      const workspace = await WorkspaceModel.findById(user.workspaceId).exec();
      if (!workspace) throw new ApiError(401, "Workspace no longer exists");

      return await handler(req, {
        user: {
          id: user._id.toString(),
          username: user.username,
          role: user.role as Role,
          workspaceId: user.workspaceId.toString(),
          isDemo: workspace.isDemo,
        },
        params: await route.params,
      });
    } catch (err) {
      return handleApiError(err);
    }
  };
}
```

Run: `npm test -- with-auth` — Expected: PASS (7 tests). Then run the full suite: `npm test` — Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add src/lib/with-auth.ts tests/unit/with-auth.test.ts
git commit -m "feat: withAuth wrapper - session, RBAC, origin check, rate limiting"
```

---

## Phase B — API routes

All route files export `export const runtime = "nodejs";` and handlers built from `withAuth`/`withPublic`. Route handlers are unit-tested by importing them and calling with a constructed `NextRequest` (pattern established in Task 7's tests — reuse the `makeUser`/`req` helpers by extracting them in Task 8 Step 1).

### Task 8: DTOs + auth routes (signup / login / logout / me)

**Files:**
- Create: `src/lib/dto.ts`, `tests/helpers/api.ts`, `app/api/users/signup/route.ts`, `app/api/users/login/route.ts`, `app/api/users/logout/route.ts`, `app/api/users/me/route.ts`
- Test: `tests/unit/api-auth.test.ts`

**Interfaces:**
- Produces `tests/helpers/api.ts`:
```ts
export async function makeUser(role: Role, wsOpts?: { isDemo?: boolean }): Promise<{ user; workspace; token: string }>;
export function apiReq(method: string, url: string, opts?: { token?: string; body?: unknown; headers?: Record<string,string> }): NextRequest; // sets content-type json + cookie; host localhost, no origin header
export function routeParams(params?: Record<string,string>): { params: Promise<Record<string,string>> };
```
- Produces `src/lib/dto.ts` types consumed by ALL later API and frontend tasks:
```ts
export interface UserDto { id: string; username: string; email?: string; role: Role; workspaceId: string; isDemo: boolean; workspaceName: string; demoExpiresAt?: string; }
export interface JobDto { id: string; title: string; department: string; location: string; employmentType: EmploymentType; status: "open" | "closed"; description: string; createdAt: string; counts?: Record<Stage, number>; }
export interface CandidateDto {
  id: string; jobId: string; name: string; email: string; phone?: string; location?: string;
  avatarSeed: string; source: Source; stage: Stage; rejected: boolean;
  stageHistory: { stage: Stage; enteredAt: string }[];
  rating: number; tags: string[]; skills: string[];
  experience: { company: string; title: string; startDate: string; endDate?: string }[];
  education?: string; desiredPay?: string;
  notes: { authorId: string; authorName: string; body: string; createdAt: string }[];
  activity: { type: string; actorId: string; actorName: string; meta: string; createdAt: string }[];
  resume?: { text: string; parsedFields: { name?: string; email?: string; phone?: string; skills: string[] }; parsedAt: string };
  createdAt: string; updatedAt: string;
}
export function toCandidateDto(doc): CandidateDto;
export function toJobDto(doc, counts?): JobDto;
```
(Implement the mappers by explicit field copying with `.toString()` on ids and `.toISOString()` on dates — no `JSON.parse(JSON.stringify(...))`.)
- Routes produced:
  - `POST /api/users/signup` — public + auth rate limit; zod `signUpSchema`; 409 on duplicate username/email (same messages as old backend); creates Workspace (`name: "<username>'s workspace"`) + admin User (bcrypt cost 10) + session; 201 UserDto + Set-Cookie.
  - `POST /api/users/login` — public + auth rate limit; `loginSchema`; generic 401 "Invalid credentials" on unknown user OR bad password (port of existing behavior); 200 UserDto + Set-Cookie.
  - `POST /api/users/logout` — withAuth; destroys server session; 200 + expired cookie.
  - `GET /api/users/me` — withAuth; 200 UserDto (email included via `.select("+email")`).

- [ ] **Step 1: Extract test helpers, write failing tests**

`tests/helpers/api.ts`:
```ts
import { NextRequest } from "next/server";
import { Types } from "mongoose";
import bcrypt from "bcrypt";
import WorkspaceModel from "@/models/workspace";
import UserModel from "@/models/user";
import { createSession, SESSION_COOKIE } from "@/lib/session";
import type { Role } from "@/lib/types";

export async function makeUser(role: Role, wsOpts?: { isDemo?: boolean }) {
  const workspace = await WorkspaceModel.create({
    name: "Test WS", isDemo: wsOpts?.isDemo ?? false,
    ...(wsOpts?.isDemo ? { expiresAt: new Date(Date.now() + 86_400_000) } : {}),
  });
  const n = Math.floor(Math.random() * 1e9);
  const user = await UserModel.create({
    username: `user${n}`, email: `user${n}@x.com`,
    passwordHash: await bcrypt.hash("password-123", 4),
    workspaceId: workspace._id, role,
  });
  const { token } = await createSession(user._id.toString());
  return { user, workspace, token };
}

export function apiReq(
  method: string, url: string,
  opts?: { token?: string; body?: unknown; headers?: Record<string, string> }
) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: {
      host: "localhost",
      ...(opts?.body ? { "content-type": "application/json" } : {}),
      ...(opts?.token ? { cookie: `${SESSION_COOKIE}=${opts.token}` } : {}),
      ...opts?.headers,
    },
    ...(opts?.body ? { body: JSON.stringify(opts.body) } : {}),
  });
}

export function routeParams(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

export const someId = () => new Types.ObjectId().toString();
```

(Refactor `tests/unit/with-auth.test.ts` to import `makeUser` from this helper; keep its local `req` since it exercises origin headers.)

`tests/unit/api-auth.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { setupTestDb } from "../helpers/db";
import { apiReq, makeUser, routeParams } from "../helpers/api";
import { POST as signup } from "@/../app/api/users/signup/route";
import { POST as login } from "@/../app/api/users/login/route";
import { POST as logout } from "@/../app/api/users/logout/route";
import { GET as me } from "@/../app/api/users/me/route";

setupTestDb();
const P = routeParams();

function cookieToken(res: Response): string {
  const setCookie = res.headers.get("set-cookie") ?? "";
  return setCookie.match(/aw_session=([^;]*)/)![1];
}

describe("auth routes", () => {
  it("signup creates workspace + admin user and logs in", async () => {
    const res = await signup(apiReq("POST", "/api/users/signup", { body: { username: "jon", email: "jon@x.com", password: "longenough1" } }), P);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.role).toBe("admin");
    expect(body.workspaceName).toContain("jon");
    const meRes = await me(apiReq("GET", "/api/users/me", { token: cookieToken(res) }), P);
    expect(meRes.status).toBe(200);
    expect((await meRes.json()).username).toBe("jon");
  });

  it("signup 409s on duplicate username", async () => {
    const body = { username: "dup", email: "a@x.com", password: "longenough1" };
    await signup(apiReq("POST", "/api/users/signup", { body }), P);
    const res = await signup(apiReq("POST", "/api/users/signup", { body: { ...body, email: "b@x.com" } }), P);
    expect(res.status).toBe(409);
  });

  it("login succeeds with correct creds, generic 401 otherwise", async () => {
    await signup(apiReq("POST", "/api/users/signup", { body: { username: "kim", email: "kim@x.com", password: "longenough1" } }), P);
    const good = await login(apiReq("POST", "/api/users/login", { body: { username: "kim", password: "longenough1" } }), P);
    expect(good.status).toBe(200);
    const badPw = await login(apiReq("POST", "/api/users/login", { body: { username: "kim", password: "wrong-pass-1" } }), P);
    const badUser = await login(apiReq("POST", "/api/users/login", { body: { username: "ghost", password: "wrong-pass-1" } }), P);
    expect(badPw.status).toBe(401);
    expect(badUser.status).toBe(401);
    expect((await badPw.json()).error).toBe((await badUser.json()).error);
  });

  it("login rejects operator-injection payloads with 400", async () => {
    const res = await login(apiReq("POST", "/api/users/login", { body: { username: { $ne: "" }, password: { $ne: "" } } }), P);
    expect(res.status).toBe(400);
  });

  it("logout revokes the session", async () => {
    const { token } = await makeUser("admin");
    await logout(apiReq("POST", "/api/users/logout", { token }), P);
    const meRes = await me(apiReq("GET", "/api/users/me", { token }), P);
    expect(meRes.status).toBe(401);
  });
});
```

Run: `npm test -- api-auth` — Expected: FAIL (routes missing).

- [ ] **Step 2: Implement dto mapper + the four routes**

`src/lib/dto.ts` — implement `UserDto/JobDto/CandidateDto` and mappers exactly as in Interfaces above. `toCandidateDto` copies every field listed, mapping `_id → id`, ObjectIds via `.toString()`, Dates via `.toISOString()`; omit `workspaceId`/`createdBy` from the DTO.

`app/api/users/signup/route.ts`:
```ts
import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import UserModel from "@/models/user";
import WorkspaceModel from "@/models/workspace";
import { ApiError } from "@/lib/api-error";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { signUpSchema } from "@/lib/schemas/auth";
import { createSession, serializeSessionCookie } from "@/lib/session";
import { withPublic } from "@/lib/with-auth";
import type { UserDto } from "@/lib/dto";

export const runtime = "nodejs";

export const POST = withPublic(
  async (req: NextRequest) => {
    const { username, email, password } = signUpSchema.parse(await req.json());

    if (await UserModel.findOne({ username }).exec()) {
      throw new ApiError(409, "Username already exists. Please choose a different name or log in instead.");
    }
    if (await UserModel.findOne({ email }).select("+email").exec()) {
      throw new ApiError(409, "Email already exists. Please choose a different email or log in instead.");
    }

    const workspace = await WorkspaceModel.create({ name: `${username}'s workspace` });
    const user = await UserModel.create({
      username, email,
      passwordHash: await bcrypt.hash(password, 10),
      workspaceId: workspace._id, role: "admin",
    });

    const { token, expiresAt } = await createSession(user._id.toString());
    const dto: UserDto = {
      id: user._id.toString(), username, email, role: "admin",
      workspaceId: workspace._id.toString(), isDemo: false, workspaceName: workspace.name,
    };
    return Response.json(dto, { status: 201, headers: { "Set-Cookie": serializeSessionCookie(token, expiresAt) } });
  },
  { rateLimit: { ...RATE_LIMITS.auth, scope: "signup" } }
);
```

`app/api/users/login/route.ts`:
```ts
import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import UserModel from "@/models/user";
import WorkspaceModel from "@/models/workspace";
import { ApiError } from "@/lib/api-error";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/schemas/auth";
import { createSession, serializeSessionCookie } from "@/lib/session";
import { withPublic } from "@/lib/with-auth";
import type { UserDto } from "@/lib/dto";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";

export const POST = withPublic(
  async (req: NextRequest) => {
    const { username, password } = loginSchema.parse(await req.json());

    const user = await UserModel.findOne({ username }).select("+passwordHash +email").exec();
    // Generic message either way - do not reveal which part failed (ported behavior).
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new ApiError(401, "Invalid credentials");
    }
    const workspace = await WorkspaceModel.findById(user.workspaceId).exec();
    if (!workspace) throw new ApiError(401, "Invalid credentials");

    const { token, expiresAt } = await createSession(user._id.toString());
    const dto: UserDto = {
      id: user._id.toString(), username: user.username, email: user.email,
      role: user.role as Role, workspaceId: user.workspaceId.toString(),
      isDemo: workspace.isDemo, workspaceName: workspace.name,
      ...(workspace.expiresAt ? { demoExpiresAt: workspace.expiresAt.toISOString() } : {}),
    };
    return Response.json(dto, { status: 200, headers: { "Set-Cookie": serializeSessionCookie(token, expiresAt) } });
  },
  { rateLimit: { ...RATE_LIMITS.auth, scope: "login" } }
);
```

`app/api/users/logout/route.ts`:
```ts
import { NextRequest } from "next/server";
import { expiredSessionCookie, destroySession, SESSION_COOKIE } from "@/lib/session";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";

export const POST = withAuth(async (req: NextRequest) => {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": expiredSessionCookie() } });
});
```

`app/api/users/me/route.ts`:
```ts
import UserModel from "@/models/user";
import WorkspaceModel from "@/models/workspace";
import { ApiError } from "@/lib/api-error";
import { withAuth } from "@/lib/with-auth";
import type { UserDto } from "@/lib/dto";

export const runtime = "nodejs";

export const GET = withAuth(async (_req, ctx) => {
  const user = await UserModel.findById(ctx.user.id).select("+email").exec();
  const workspace = await WorkspaceModel.findById(ctx.user.workspaceId).exec();
  if (!user || !workspace) throw new ApiError(401, "You must be logged in to access this resource");
  const dto: UserDto = {
    id: ctx.user.id, username: user.username, email: user.email,
    role: ctx.user.role, workspaceId: ctx.user.workspaceId,
    isDemo: workspace.isDemo, workspaceName: workspace.name,
    ...(workspace.expiresAt ? { demoExpiresAt: workspace.expiresAt.toISOString() } : {}),
  };
  return Response.json(dto);
});
```

Run: `npm test -- api-auth` — Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/dto.ts app/api/users tests/helpers/api.ts tests/unit
git commit -m "feat: auth API routes ported to Next handlers with hardened sessions"
```

---

### Task 9: Jobs routes

**Files:**
- Create: `app/api/jobs/route.ts`, `app/api/jobs/[jobId]/route.ts`
- Test: `tests/unit/api-jobs.test.ts`

**Interfaces:**
- `GET /api/jobs` (interviewer+): all workspace jobs, each with `counts: Record<Stage, number>` of non-rejected candidates (single `$group` aggregation over candidates by jobId+stage, merged in TS). Sorted `createdAt` desc.
- `POST /api/jobs` (recruiter+, mutation rate limit): `createJobSchema` → 201 JobDto.
- `GET /api/jobs/[jobId]` (interviewer+): 404 if not found **in this workspace**.
- `PATCH /api/jobs/[jobId]` (recruiter+): `updateJobSchema` → 200 JobDto.
- `DELETE /api/jobs/[jobId]` (recruiter+): deletes the job **and its candidates** (workspace-scoped) → 204.

- [ ] **Step 1: Failing tests** — `tests/unit/api-jobs.test.ts` covering: recruiter creates job (201, defaults `status: "open"`); interviewer can GET list but POST → 403; list includes per-stage counts (create 2 candidates in "applied", 1 in "offer" via `CandidateModel.create` directly); GET by id from ANOTHER workspace's user → 404 (create two workspaces via `makeUser` twice); PATCH updates title; DELETE removes job and its candidates (`CandidateModel.countDocuments` → 0); invalid ObjectId param → 400. Use the Task 8 helpers; write each case as its own `it(...)` with real assertions (follow the exact style of `api-auth.test.ts`).

Run: `npm test -- api-jobs` — Expected: FAIL.

- [ ] **Step 2: Implement**

`app/api/jobs/route.ts`:
```ts
import { NextRequest } from "next/server";
import { Types } from "mongoose";
import CandidateModel from "@/models/candidate";
import JobModel from "@/models/job";
import { toJobDto } from "@/lib/dto";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { createJobSchema } from "@/lib/schemas/job";
import { STAGES, type Stage } from "@/lib/types";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";

export const GET = withAuth(async (_req, ctx) => {
  const workspaceId = new Types.ObjectId(ctx.user.workspaceId);
  const jobs = await JobModel.find({ workspaceId }).sort({ createdAt: -1 }).exec();
  const grouped = await CandidateModel.aggregate<{ _id: { jobId: Types.ObjectId; stage: Stage }; count: number }>([
    { $match: { workspaceId, rejected: false } },
    { $group: { _id: { jobId: "$jobId", stage: "$stage" }, count: { $sum: 1 } } },
  ]);
  const emptyCounts = () => Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  const countsByJob = new Map<string, Record<Stage, number>>();
  for (const g of grouped) {
    const key = g._id.jobId.toString();
    const counts = countsByJob.get(key) ?? emptyCounts();
    counts[g._id.stage] = g.count;
    countsByJob.set(key, counts);
  }
  return Response.json(jobs.map((j) => toJobDto(j, countsByJob.get(j._id.toString()) ?? emptyCounts())));
});

export const POST = withAuth(
  async (req: NextRequest, ctx) => {
    const input = createJobSchema.parse(await req.json());
    const job = await JobModel.create({ ...input, workspaceId: ctx.user.workspaceId, createdBy: ctx.user.id });
    return Response.json(toJobDto(job), { status: 201 });
  },
  { minRole: "recruiter", rateLimit: { ...RATE_LIMITS.mutation, scope: "jobs-write" } }
);
```

`app/api/jobs/[jobId]/route.ts`:
```ts
import { NextRequest } from "next/server";
import CandidateModel from "@/models/candidate";
import JobModel from "@/models/job";
import { ApiError } from "@/lib/api-error";
import { toJobDto } from "@/lib/dto";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { objectIdSchema } from "@/lib/schemas/common";
import { updateJobSchema } from "@/lib/schemas/job";
import { withAuth, type AuthCtx } from "@/lib/with-auth";

export const runtime = "nodejs";

async function findJobOr404(ctx: AuthCtx) {
  const jobId = objectIdSchema.parse(ctx.params.jobId);
  const job = await JobModel.findOne({ _id: jobId, workspaceId: ctx.user.workspaceId }).exec();
  if (!job) throw new ApiError(404, "Job not found");
  return job;
}

export const GET = withAuth(async (_req, ctx) => Response.json(toJobDto(await findJobOr404(ctx))));

export const PATCH = withAuth(
  async (req: NextRequest, ctx) => {
    const job = await findJobOr404(ctx);
    Object.assign(job, updateJobSchema.parse(await req.json()));
    await job.save();
    return Response.json(toJobDto(job));
  },
  { minRole: "recruiter", rateLimit: { ...RATE_LIMITS.mutation, scope: "jobs-write" } }
);

export const DELETE = withAuth(
  async (_req, ctx) => {
    const job = await findJobOr404(ctx);
    await CandidateModel.deleteMany({ workspaceId: ctx.user.workspaceId, jobId: job._id });
    await job.deleteOne();
    return new Response(null, { status: 204 });
  },
  { minRole: "recruiter", rateLimit: { ...RATE_LIMITS.mutation, scope: "jobs-write" } }
);
```

Run: `npm test -- api-jobs` — Expected: PASS.

- [ ] **Step 3: Commit** — `git add app/api/jobs tests/unit/api-jobs.test.ts && git commit -m "feat: jobs CRUD routes with per-stage counts and cascade delete"`

---

### Task 10: Candidates CRUD routes

**Files:**
- Create: `app/api/candidates/route.ts`, `app/api/candidates/[candidateId]/route.ts`, `src/lib/candidate-helpers.ts`
- Test: `tests/unit/api-candidates.test.ts`

**Interfaces:**
- Produces `src/lib/candidate-helpers.ts`:
```ts
export function escapeRegex(input: string): string; // escapes .*+?^${}()|[]\
export async function findCandidateOr404(ctx: AuthCtx, paramName?: string): Promise<HydratedDocument<Candidate>>; // workspace-scoped, validates ObjectId
export function activityEntry(ctx: AuthCtx, type: ActivityType, meta: string): { type; actorId; actorName; meta; createdAt: Date };
```
- `GET /api/candidates` (interviewer+): parses `candidateListQuerySchema` from `req.nextUrl.searchParams` (via `Object.fromEntries`); filter: `workspaceId` always; `rejected` defaults to `false` unless query says `"true"`; `jobId`/`stage` exact; `search` → case-insensitive escaped-regex `$or` over `name`, `email`, `skills`; `tag` → `tags: tag`. Sorted `updatedAt` desc. Returns `CandidateDto[]`.
- `POST /api/candidates` (recruiter+): `createCandidateSchema`; verifies `jobId` exists in workspace (404 otherwise); sets `avatarSeed` = name slug + random 4 chars, `stageHistory: [{ stage, enteredAt: now }]`, activity `created`; if `resumeText` present stores `resume: { text, parsedFields: {skills: []}, parsedAt: now }` and activity `resume-parsed`. 201 CandidateDto.
- `GET/PATCH/DELETE /api/candidates/[candidateId]` — PATCH takes `updateCandidateSchema`, appends activity `updated`; DELETE → 204.

- [ ] **Step 1: Failing tests** — `tests/unit/api-candidates.test.ts`: seed one workspace + job via helpers; cases: create → 201 with stageHistory length 1 and activity[0].type "created"; create with unknown jobId → 404; create with jobId from another workspace → 404; list defaults exclude rejected (create one rejected via model, one active); `?search=ali` matches name "Alice" case-insensitively; `?search=a.*b` matches literally (regex escaped — create candidate named "a.*b" and one named "aXb"; only the literal matches); `?jobId=`/`?stage=` filters; interviewer POST → 403; PATCH updates phone and appends "updated" activity; cross-workspace GET by id → 404; DELETE → 204 then GET → 404.

Run: `npm test -- api-candidates` — Expected: FAIL.

- [ ] **Step 2: Implement** `src/lib/candidate-helpers.ts`:
```ts
import { HydratedDocument } from "mongoose";
import CandidateModel, { type Candidate, ACTIVITY_TYPES } from "@/models/candidate";
import { ApiError } from "./api-error";
import { objectIdSchema } from "./schemas/common";
import type { AuthCtx } from "./with-auth";

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function findCandidateOr404(ctx: AuthCtx, paramName = "candidateId"): Promise<HydratedDocument<Candidate>> {
  const id = objectIdSchema.parse(ctx.params[paramName]);
  const candidate = await CandidateModel.findOne({ _id: id, workspaceId: ctx.user.workspaceId }).exec();
  if (!candidate) throw new ApiError(404, "Candidate not found");
  return candidate;
}

export function activityEntry(ctx: AuthCtx, type: ActivityType, meta: string) {
  return { type, actorId: ctx.user.id, actorName: ctx.user.username, meta, createdAt: new Date() };
}
```

`app/api/candidates/route.ts`:
```ts
import { NextRequest } from "next/server";
import { Types, type FilterQuery } from "mongoose";
import CandidateModel, { type Candidate } from "@/models/candidate";
import JobModel from "@/models/job";
import { ApiError } from "@/lib/api-error";
import { activityEntry, escapeRegex } from "@/lib/candidate-helpers";
import { toCandidateDto } from "@/lib/dto";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { candidateListQuerySchema, createCandidateSchema } from "@/lib/schemas/candidate";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";

export const GET = withAuth(async (req: NextRequest, ctx) => {
  const q = candidateListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const filter: FilterQuery<Candidate> = {
    workspaceId: new Types.ObjectId(ctx.user.workspaceId),
    rejected: q.rejected === "true",
  };
  if (q.jobId) filter.jobId = new Types.ObjectId(q.jobId);
  if (q.stage) filter.stage = q.stage;
  if (q.tag) filter.tags = q.tag;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), "i");
    filter.$or = [{ name: rx }, { email: rx }, { skills: rx }];
  }
  const candidates = await CandidateModel.find(filter).sort({ updatedAt: -1 }).exec();
  return Response.json(candidates.map(toCandidateDto));
});

export const POST = withAuth(
  async (req: NextRequest, ctx) => {
    const { resumeText, ...input } = createCandidateSchema.parse(await req.json());
    const job = await JobModel.findOne({ _id: input.jobId, workspaceId: ctx.user.workspaceId }).exec();
    if (!job) throw new ApiError(404, "Job not found");

    const now = new Date();
    const activity = [activityEntry(ctx, "created", `added to ${job.title}`)];
    if (resumeText) activity.push(activityEntry(ctx, "resume-parsed", "resume text attached"));

    const candidate = await CandidateModel.create({
      ...input,
      workspaceId: ctx.user.workspaceId,
      createdBy: ctx.user.id,
      avatarSeed: `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`,
      stageHistory: [{ stage: input.stage, enteredAt: now }],
      activity,
      ...(resumeText ? { resume: { text: resumeText, parsedFields: { skills: [] }, parsedAt: now } } : {}),
    });
    return Response.json(toCandidateDto(candidate), { status: 201 });
  },
  { minRole: "recruiter", rateLimit: { ...RATE_LIMITS.mutation, scope: "cand-write" } }
);
```

`app/api/candidates/[candidateId]/route.ts`:
```ts
import { NextRequest } from "next/server";
import { activityEntry, findCandidateOr404 } from "@/lib/candidate-helpers";
import { toCandidateDto } from "@/lib/dto";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { updateCandidateSchema } from "@/lib/schemas/candidate";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";
const writeGuard = { minRole: "recruiter" as const, rateLimit: { ...RATE_LIMITS.mutation, scope: "cand-write" } };

export const GET = withAuth(async (_req, ctx) => Response.json(toCandidateDto(await findCandidateOr404(ctx))));

export const PATCH = withAuth(async (req: NextRequest, ctx) => {
  const candidate = await findCandidateOr404(ctx);
  const input = updateCandidateSchema.parse(await req.json());
  Object.assign(candidate, input);
  candidate.activity.push(activityEntry(ctx, "updated", "profile updated"));
  await candidate.save();
  return Response.json(toCandidateDto(candidate));
}, writeGuard);

export const DELETE = withAuth(async (_req, ctx) => {
  const candidate = await findCandidateOr404(ctx);
  await candidate.deleteOne();
  return new Response(null, { status: 204 });
}, writeGuard);
```

Run: `npm test -- api-candidates` — Expected: PASS.

- [ ] **Step 3: Commit** — `git add app/api/candidates src/lib/candidate-helpers.ts tests/unit/api-candidates.test.ts && git commit -m "feat: candidates CRUD with scoped filters and escaped search"`

---

### Task 11: Stage move / notes / rating routes

**Files:**
- Create: `app/api/candidates/[candidateId]/stage/route.ts`, `app/api/candidates/[candidateId]/notes/route.ts`, `app/api/candidates/[candidateId]/rating/route.ts`
- Test: `tests/unit/api-candidate-actions.test.ts`

**Interfaces:**
- `PATCH .../stage` (recruiter+): `stageMoveSchema`. If `stage`: no-op guard (same stage → 200 unchanged, no history entry); else set `stage`, `rejected = false`, push `stageHistory { stage, enteredAt: now }`, push activity `stage-moved` with meta `"applied → screening"` style. If `rejected: true`: set flag, activity `stage-moved` meta `"rejected"`; `rejected: false` restores to board (flag off, activity meta `"restored"`). 200 CandidateDto.
- `POST .../notes` (any authed member — interviewers CAN add notes): `noteSchema`; pushes `{ authorId, authorName, body, createdAt }` + activity `note-added`. 201 CandidateDto.
- `PATCH .../rating` (any authed member): `ratingSchema`; sets rating + activity `rating-changed` meta `"3 → 5"`. 200 CandidateDto.

- [ ] **Step 1: Failing tests** — cases: recruiter moves applied→screening (stage updated, stageHistory length 2, activity last type "stage-moved", meta "applied → screening"); same-stage move adds NO history entry; interviewer stage move → 403; interviewer adds note → 201 with authorName; interviewer sets rating 4 → 200, activity meta "0 → 4"; reject then restore round-trip; body `{}` → 400; body `{ stage: "offer", rejected: true }` → 400.

Run: `npm test -- api-candidate-actions` — Expected: FAIL.

- [ ] **Step 2: Implement the three routes** (each imports `findCandidateOr404` + `activityEntry`; `stage/route.ts` shown, notes/rating follow the same shape):

```ts
import { NextRequest } from "next/server";
import { activityEntry, findCandidateOr404 } from "@/lib/candidate-helpers";
import { toCandidateDto } from "@/lib/dto";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { stageMoveSchema } from "@/lib/schemas/candidate";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";

export const PATCH = withAuth(
  async (req: NextRequest, ctx) => {
    const candidate = await findCandidateOr404(ctx);
    const input = stageMoveSchema.parse(await req.json());

    if (input.stage !== undefined) {
      if (input.stage !== candidate.stage) {
        const meta = `${candidate.stage} → ${input.stage}`;
        candidate.stage = input.stage;
        candidate.rejected = false;
        candidate.stageHistory.push({ stage: input.stage, enteredAt: new Date() });
        candidate.activity.push(activityEntry(ctx, "stage-moved", meta));
      }
    } else {
      candidate.rejected = input.rejected!;
      candidate.activity.push(activityEntry(ctx, "stage-moved", input.rejected ? "rejected" : "restored"));
    }
    await candidate.save();
    return Response.json(toCandidateDto(candidate));
  },
  { minRole: "recruiter", rateLimit: { ...RATE_LIMITS.mutation, scope: "cand-write" } }
);
```

`notes/route.ts`: `POST` with NO `minRole` (any authed member), body `noteSchema`, push `{ authorId: ctx.user.id, authorName: ctx.user.username, body, createdAt: new Date() }` + `activityEntry(ctx, "note-added", "")`, return 201.
`rating/route.ts`: `PATCH` with NO `minRole`, body `ratingSchema`, meta `` `${candidate.rating} → ${input.rating}` ``, set + save, return 200. Both use `rateLimit: { ...RATE_LIMITS.mutation, scope: "cand-write" }`.

Run: `npm test -- api-candidate-actions` — Expected: PASS.

- [ ] **Step 3: Commit** — `git add app/api/candidates tests/unit/api-candidate-actions.test.ts && git commit -m "feat: stage move, notes, rating endpoints with activity log"`

---

### Task 12: Resume parsing (lib + route)

**Files:**
- Create: `src/lib/resume.ts`, `src/types/pdf-parse.d.ts`, `app/api/resumes/parse/route.ts`
- Test: `tests/unit/resume.test.ts`, `tests/unit/api-resume.test.ts`
- Install: `npm install -D pdf-lib` (test-fixture builder only)

**Interfaces:**
- `extractResumeFields(text: string): { name?: string; email?: string; phone?: string; skills: string[] }`
  - email: first match of `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/`
  - phone: first match of `/(\+?\d[\d\s().-]{7,}\d)/` (trimmed)
  - name: first non-empty line if it is 2–5 words, ≤ 60 chars, contains no digits and no `@`
  - skills: case-insensitive whole-word matches against exported `KNOWN_SKILLS` (~60 entries: JavaScript, TypeScript, React, Next.js, Node.js, Python, Java, C#, Go, Rust, SQL, MongoDB, PostgreSQL, AWS, Azure, GCP, Docker, Kubernetes, Terraform, GraphQL, REST, HTML, CSS, Tailwind, Figma, Jira, Agile, Scrum, CI/CD, Git, Linux, Redis, Kafka, Spark, Pandas, Machine Learning, Data Analysis, Product Management, Marketing, SEO, Sales, Recruiting, Excel, Communication, Leadership, plus ~15 more of the executor's choice), returned in canonical casing, deduped.
- `parseResumeBuffer(buf: Buffer, filename: string): Promise<string>` — dispatch on magic bytes: `%PDF` → pdf-parse; `PK\x03\x04` + `.docx` name → mammoth `extractRawText`; else throw `ApiError(422, "Unsupported file type — upload a PDF or DOCX")`. Empty extracted text (< 20 chars) → `ApiError(422, "Couldn't read any text from that file")`.
- `POST /api/resumes/parse` (recruiter+, `parse` rate limit): multipart form field `file`; > 5 MB → 413; returns `{ text: string, fields: ExtractedFields }`. **Never persists anything.**

- [ ] **Step 1: Failing extraction tests** — `tests/unit/resume.test.ts`: multi-line fake resume text asserting name/email/phone/skills extraction; name skipped when first line is "RESUME 2024" (digits); skills dedup + canonical casing ("REACT, react" → ["React"]); no matches → `skills: []`.

- [ ] **Step 2: Implement `extractResumeFields` + `KNOWN_SKILLS`** in `src/lib/resume.ts`; run — PASS.

- [ ] **Step 3: Failing route tests** — `tests/unit/api-resume.test.ts`: build a real PDF in-test with pdf-lib:
```ts
import { PDFDocument, StandardFonts } from "pdf-lib";

async function makePdf(text: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let y = 700;
  for (const line of text.split("\n")) {
    page.drawText(line, { x: 40, y, size: 12, font });
    y -= 18;
  }
  return Buffer.from(await doc.save());
}

function formReq(buf: Buffer, name: string, token: string) {
  const fd = new FormData();
  fd.set("file", new File([buf], name, { type: name.endsWith(".pdf") ? "application/pdf" : "application/octet-stream" }));
  return new NextRequest("http://localhost/api/resumes/parse", {
    method: "POST", body: fd, headers: { host: "localhost", cookie: `aw_session=${token}` },
  });
}
```
Cases: recruiter uploads PDF containing `"Jane Doe\njane@example.com\n+1 555 123 4567\nSkills: React, TypeScript"` → 200 with `fields.email === "jane@example.com"` and `fields.skills` containing "React"; a plain-text buffer named `notes.txt` → 422; interviewer → 403.
Add `src/types/pdf-parse.d.ts`:
```ts
declare module "pdf-parse/lib/pdf-parse.js" {
  function pdfParse(buffer: Buffer): Promise<{ text: string }>;
  export default pdfParse;
}
```

- [ ] **Step 4: Implement `parseResumeBuffer` + route**

In `src/lib/resume.ts` (import pattern avoids pdf-parse's debug `module.parent` bug):
```ts
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { ApiError } from "./api-error";

export async function parseResumeBuffer(buf: Buffer, filename: string): Promise<string> {
  let text = "";
  try {
    if (buf.subarray(0, 4).toString("latin1") === "%PDF") {
      text = (await pdfParse(buf)).text;
    } else if (buf[0] === 0x50 && buf[1] === 0x4b && filename.toLowerCase().endsWith(".docx")) {
      text = (await mammoth.extractRawText({ buffer: buf })).value;
    } else {
      throw new ApiError(422, "Unsupported file type — upload a PDF or DOCX");
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(422, "Couldn't read that file — it may be corrupted or image-only");
  }
  if (text.trim().length < 20) throw new ApiError(422, "Couldn't read any text from that file");
  return text;
}
```

`app/api/resumes/parse/route.ts`:
```ts
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api-error";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { extractResumeFields, parseResumeBuffer } from "@/lib/resume";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";
const MAX_BYTES = 5 * 1024 * 1024;

export const POST = withAuth(
  async (req: NextRequest) => {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Attach a file field named 'file'");
    if (file.size > MAX_BYTES) throw new ApiError(413, "File too large (max 5 MB)");
    const buf = Buffer.from(await file.arrayBuffer());
    const text = await parseResumeBuffer(buf, file.name);
    return Response.json({ text, fields: extractResumeFields(text) });
  },
  { minRole: "recruiter", rateLimit: { ...RATE_LIMITS.parse, scope: "resume-parse" } }
);
```

Run: `npm test -- resume api-resume` — Expected: PASS.

- [ ] **Step 5: Commit** — `git add src/lib/resume.ts src/types app/api/resumes tests/unit package.json package-lock.json && git commit -m "feat: server-side resume parsing with graceful failure paths"`

---

### Task 13: Analytics (pure computation + route)

**Files:**
- Create: `src/lib/analytics.ts`, `app/api/analytics/route.ts`
- Test: `tests/unit/analytics.test.ts`

**Interfaces:**
- Produces:
```ts
export interface AnalyticsData {
  funnel: { stage: Stage; count: number }[];            // candidates whose stageHistory EVER reached stage
  timeInStage: { stage: Stage; avgDays: number }[];     // avg of (next entry enteredAt | now) - enteredAt, per stage; 1 decimal
  bySource: { source: Source; count: number }[];        // all sources present, desc by count
  velocity: { weekStart: string; moves: number }[];     // last 8 ISO weeks (Mon, YYYY-MM-DD), stageHistory entries beyond the first
  totals: { candidates: number; active: number; hired: number; rejected: number; openJobs: number };
}
export type AnalyticsCandidate = Pick<CandidateDto, "stage" | "rejected" | "source"> & {
  stageHistory: { stage: Stage; enteredAt: Date }[];
};
export function computeAnalytics(
  candidates: AnalyticsCandidate[],
  openJobs: number,
  now: Date
): AnalyticsData;
```
(`active` = not rejected and stage !== "hired". `totals.candidates` includes everyone.)
- `GET /api/analytics` (any role): loads workspace candidates with lean projection (`stage rejected source stageHistory`), open-jobs count, calls `computeAnalytics(..., new Date())`.

- [ ] **Step 1: Failing tests** — fixed `now = new Date("2026-07-20T00:00:00Z")`, hand-built candidates: one hired that walked all 5 stages over known day gaps (assert funnel counts every reached stage; assert `timeInStage` averages match hand-computed values to 1 decimal); one rejected at screening (excluded from `active`, counted in funnel for applied+screening); velocity buckets two known moves into the correct ISO weeks (assert `weekStart` strings); `bySource` sorted desc.
- [ ] **Step 2: Implement** — pure TS, no DB. ISO week start helper:
```ts
function weekStartUtc(d: Date): Date {
  const x = new Date(d);
  const day = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - day);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
```
Run — PASS.
- [ ] **Step 3: Route + a route test** (seed 3 candidates via model, expect 200 and `totals.candidates === 3`). Run — PASS.
- [ ] **Step 4: Commit** — `git add src/lib/analytics.ts app/api/analytics tests/unit/analytics.test.ts && git commit -m "feat: analytics computation and endpoint"`

---

### Task 14: Workspace members, demo mode (seed lib, start, role switch, sweep), seed CLI

**Files:**
- Create: `src/lib/seed.ts`, `src/lib/demo.ts`, `app/api/workspace/route.ts`, `app/api/workspace/members/route.ts`, `app/api/workspace/members/[userId]/route.ts`, `app/api/demo/start/route.ts`, `app/api/demo/role/route.ts`, `scripts/seed.ts`
- Test: `tests/unit/seed.test.ts`, `tests/unit/api-demo.test.ts`, `tests/unit/api-members.test.ts`

**Interfaces:**
- `src/lib/seed.ts`:
```ts
export const DEMO_JOBS: { title: string; department: string; location: string; employmentType: EmploymentType; description: string }[];
// exactly 5: Senior Frontend Engineer / Engineering / Remote / full-time;
// Product Designer / Design / New York, NY / full-time;
// Data Analyst / Data / Austin, TX / full-time;
// Engineering Manager / Engineering / San Francisco, CA / full-time;
// Customer Success Lead / GTM / Chicago, IL (Hybrid) / full-time
// each with a 2-3 sentence realistic description.
export async function seedWorkspace(
  workspaceId: Types.ObjectId | string,
  actorUserId: Types.ObjectId | string,
  opts?: { seed?: number; candidateCount?: number }
): Promise<{ jobs: number; candidates: number }>;
```
  Uses `faker.seed(opts.seed ?? 42)` for deterministic output. Default 60 candidates spread across the 5 jobs; stage weights `applied .30, screening .25, interview .20, offer .10, hired .10, rejected .05` (rejected ones keep a random reached stage + `rejected: true`); each candidate: faker name/email/phone/city, `avatarSeed` = name slug, 3–8 skills sampled from `KNOWN_SKILLS` (import from `@/lib/resume`), 1–3 tags from `["senior","junior","remote-ok","referral","fast-track","relocation"]`, rating 0–5 weighted toward 3–4, 1–4 experience entries with sequential past date ranges, education string, `stageHistory` built from a random application date 5–60 days ago with 1–9-day hops through each stage up to the current one (so time-in-stage analytics are alive), 0–2 notes and matching activity entries attributed to `actorUserId` with actorName `"Demo Recruiter"`.
- `src/lib/demo.ts`:
```ts
export async function sweepExpiredDemos(): Promise<void>;
// 1) find demo workspaces with expiresAt < now; collect their ids + user ids;
//    deleteMany children: Jobs/Candidates/Users by workspaceId, Sessions by userId; delete the workspaces.
// 2) orphan pass: distinct workspaceId over Jobs/Candidates/Users; delete docs whose
//    workspaceId is not in the surviving Workspace id set.
export async function startDemo(): Promise<{ token: string; expiresAt: Date }>;
// sweep → create Workspace { name: "Demo Workspace", isDemo: true, expiresAt: now+24h }
// → demo admin User (username `demo-<8 hex>`, email `<username>@demo.local`, random 32-hex password bcrypt-hashed)
// → seedWorkspace(ws, user) → createSession(userId, { absoluteMs: 24h })
```
- Routes:
  - `GET /api/workspace` (any role): `{ id, name, isDemo, expiresAt? }`.
  - `GET /api/workspace/members` (any role): `[{ id, username, role }]`.
  - `PATCH /api/workspace/members/[userId]` (admin, mutation limit): `memberRoleSchema`; 400 "You cannot change your own role" when target is self; target must be in same workspace (404).
  - `POST /api/demo/start` (public, demo rate limit): calls `startDemo()`, 200 `{ ok: true }` + session Set-Cookie (24h expiry).
  - `POST /api/demo/role` (any role, mutation limit): `memberRoleSchema`; 403 "Role switching is a demo feature" unless `ctx.user.isDemo`; updates own role; 200 `{ role }`.
- `scripts/seed.ts` (CLI, `npm run seed`): loads `.env.local` via `process.loadEnvFile(".env.local")`, connects with `dbConnect()`, deletes any workspace named `"Acme Talent"` + its children, creates it (non-demo) + admin user `demo` (email `demo@acmetalent.local`) with password `demo-password-123` (bcrypt) — prints the credentials and seeded counts — then `seedWorkspace`. Exits 0 via `process.exit(0)` after `mongoose.disconnect()`.

- [ ] **Step 1: Failing seed tests** — `tests/unit/seed.test.ts`: seeding creates 5 jobs and 60 candidates all in the target workspace; every candidate's first stageHistory entry is "applied"; deterministic: two workspaces seeded with `seed: 7` yield identical sorted candidate-name lists; every candidate has `skills.length >= 3` and non-empty `avatarSeed`.
- [ ] **Step 2: Implement `src/lib/seed.ts`** per interface. Run — PASS.
- [ ] **Step 3: Failing demo/member tests** — `tests/unit/api-demo.test.ts`: `demo/start` response Set-Cookie authenticates `GET /api/users/me` as admin with `isDemo: true`; the demo workspace has 60 candidates; expiring the workspace (`updateOne` expiresAt past) then calling `startDemo()` again removes the old workspace, its candidates, users, and sessions; `demo/role` flips own role to interviewer (me → interviewer) and 403s for a non-demo user. `tests/unit/api-members.test.ts`: admin PATCHes a second user's role (create the second user in the SAME workspace directly via UserModel); non-admin → 403; self-change → 400; target in another workspace → 404.
- [ ] **Step 4: Implement `demo.ts`, the five routes, `scripts/seed.ts`.** Run — PASS. Full suite `npm test` green.
- [ ] **Step 5: Manual CLI check** — with a real `MONGODB_URI` in `.env.local`: `npm run seed` — Expected output: credentials + "5 jobs, 60 candidates".
- [ ] **Step 6: Commit** — `git add src/lib/seed.ts src/lib/demo.ts app/api/workspace app/api/demo scripts tests/unit && git commit -m "feat: demo sandbox with seeded workspace, role switcher, TTL sweep, seed CLI"`

---

### Task 15: Security headers

**Files:**
- Modify: `next.config.ts`

**Interfaces:** none (config only).

- [ ] **Step 1: Add `headers()` to `next.config.ts`**

```ts
import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose", "bcrypt", "pdf-parse", "mammoth"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
```

(`'unsafe-inline'` for scripts is the pragmatic Next.js App Router trade-off; nonce-based CSP is out of scope per spec.)

- [ ] **Step 2: Verify** — `npm run dev`, then: `curl.exe -sI http://localhost:3000` — Expected: `Content-Security-Policy`, `X-Frame-Options: DENY`, `Strict-Transport-Security` all present. Stop dev server. `npm run typecheck && npm test` — green.

- [ ] **Step 3: Commit** — `git add next.config.ts && git commit -m "feat: CSP and security headers"`

---

## Phase C — Frontend foundation

UI tasks are verified by `npm run typecheck` + rendering in the dev server (Playwright e2e coverage lands in Phase F). Before writing any UI in this phase, the implementer MUST load the **frontend-design** skill (Skill tool) and follow the design direction from the spec: Linear/Ashby-style calm SaaS — data-dense, strong hierarchy, ONE restrained accent, generous whitespace, equally polished light and dark.

### Task 16: Design tokens, themes, contrast checker

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`
- Create: `src/components/theme/theme-script.tsx`, `src/components/theme/theme-toggle.tsx`, `src/lib/theme.ts`, `scripts/contrast-check.mjs`

**Interfaces:**
- CSS custom properties defined on `:root` (light) and `[data-theme="dark"]`, mapped into Tailwind v4 via `@theme inline` so utilities exist: `bg-bg`, `bg-surface`, `bg-surface-2`, `border-border`, `text-text`, `text-text-2`, `text-text-3`, `bg-accent`, `text-accent`, `text-accent-fg`, `bg-danger/success/warning` + per-stage `--stage-<stage>-bg` / `--stage-<stage>-fg` tokens.
- `src/lib/theme.ts`: `export type Theme = "light" | "dark"; export const THEME_COOKIE = "aw_theme"; export function applyTheme(t: Theme): void` (sets `document.documentElement.dataset.theme` + writes cookie, max-age 1 year, path=/, SameSite=Lax).
- `ThemeToggle` — labeled button (`aria-label="Switch to dark theme"` / light), renders sun/moon icon + visible label in menus.
- `npm run contrast` — validates every fg/bg token pair in both themes ≥ 4.5:1 (text) / ≥ 3:1 (large text & UI borders vs bg); exits 1 on failure.

- [ ] **Step 1: Write the token sheet in `app/globals.css`**

```css
@import "tailwindcss";

:root {
  color-scheme: light;
  --bg: #f6f6f7;
  --surface: #ffffff;
  --surface-2: #ededf0;
  --border: #e0e0e6;
  --text: #17171c;
  --text-2: #4b4b55;
  --text-3: #63636e;
  --accent: #4f46e5;
  --accent-hover: #4338ca;
  --accent-fg: #ffffff;
  --accent-soft: #eef2ff;
  --danger: #b91c1c;
  --success: #15803d;
  --warning: #a16207;
  --skeleton-base: #e8e8ec;
  --skeleton-highlight: #f6f6f7;
  --stage-applied-bg: #e4e4e9;   --stage-applied-fg: #3f3f46;
  --stage-screening-bg: #dbeafe; --stage-screening-fg: #1e40af;
  --stage-interview-bg: #ede9fe; --stage-interview-fg: #5b21b6;
  --stage-offer-bg: #fef3c7;     --stage-offer-fg: #92400e;
  --stage-hired-bg: #dcfce7;     --stage-hired-fg: #166534;
  --stage-rejected-bg: #fee2e2;  --stage-rejected-fg: #991b1b;
}

[data-theme="dark"] {
  color-scheme: dark;
  --bg: #101014;
  --surface: #17171c;
  --surface-2: #1f1f26;
  --border: #2b2b34;
  --text: #f4f4f6;
  --text-2: #b0b0bc;
  --text-3: #9494a1;
  --accent: #818cf8;
  --accent-hover: #a5b4fc;
  --accent-fg: #0f0f14;
  --accent-soft: #1e1e33;
  --danger: #f87171;
  --success: #4ade80;
  --warning: #fbbf24;
  --skeleton-base: #1f1f26;
  --skeleton-highlight: #2a2a33;
  --stage-applied-bg: #26262e;   --stage-applied-fg: #c9c9d4;
  --stage-screening-bg: #172a54; --stage-screening-fg: #a8c3ff;
  --stage-interview-bg: #2b1d54; --stage-interview-fg: #c9b8ff;
  --stage-offer-bg: #3a2c10;     --stage-offer-fg: #fcd34d;
  --stage-hired-bg: #10331d;     --stage-hired-fg: #6ee7a0;
  --stage-rejected-bg: #3c1518;  --stage-rejected-fg: #fda4a4;
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-border: var(--border);
  --color-text: var(--text);
  --color-text-2: var(--text-2);
  --color-text-3: var(--text-3);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-fg: var(--accent-fg);
  --color-accent-soft: var(--accent-soft);
  --color-danger: var(--danger);
  --color-success: var(--success);
  --color-warning: var(--warning);
}

html, body { background: var(--bg); color: var(--text); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: No-flash theme resolution**

`src/components/theme/theme-script.tsx` (inline script — runs before paint):
```tsx
export function ThemeScript() {
  const code = `(function(){try{
    var m = document.cookie.match(/(?:^|; )aw_theme=(light|dark)/);
    var t = m ? m[1] : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = t;
  }catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
```

Update `app/layout.tsx`: read the cookie server-side so SSR matches (`(await cookies()).get("aw_theme")`), set `data-theme` on `<html>` when present, add `suppressHydrationWarning` and `<ThemeScript />` in `<head>`.

`src/lib/theme.ts` and `theme-toggle.tsx` per the interface above (toggle reads `document.documentElement.dataset.theme`, applies the flipped theme, updates its own `aria-label`; a `"use client"` component).

- [ ] **Step 3: Contrast checker**

`scripts/contrast-check.mjs`: parse `app/globals.css` with a regex for `--token: #hex` pairs per theme block; compute WCAG relative luminance + ratio; assert: `text/text-2 vs bg & surface ≥ 4.5`, `text-3 vs surface ≥ 4.5`, `accent-fg vs accent ≥ 4.5`, every `--stage-*-fg vs --stage-*-bg ≥ 4.5`, `accent vs bg ≥ 3`, `border vs bg ≥ 1.2` (visibility only); print a table of ratios; `process.exit(1)` on any failure. (~60 lines; standard luminance formula `0.2126R+0.7152G+0.0722B` with sRGB linearization.)

Run: `npm run contrast` — Expected: table of ratios, all pass, exit 0. If any pair fails, adjust the token value (keep the hue, shift lightness) and re-run until green — the committed palette MUST pass.

- [ ] **Step 4: Verify + commit** — `npm run dev`: page renders with dark theme when OS is dark; toggling persists across reload (check the `aw_theme` cookie). `git add -A && git commit -m "feat: dual-theme design tokens with verified AA contrast"`

---

### Task 17: Query client, API client, hooks, UI store

**Files:**
- Create: `src/components/providers.tsx`, `src/lib/api-client.ts`, `src/hooks/queries.ts`, `src/hooks/use-debounced.ts`, `src/stores/ui.ts`
- Modify: `app/layout.tsx` (wrap children in `<Providers>`)

**Interfaces:**
- `api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T>` — sets JSON headers when `json` given, throws `ApiClientError { status, message }` parsed from `{ error }` bodies; returns `undefined as T` for 204.
- `queryKeys = { me: ["me"], jobs: ["jobs"], job: (id) => ["jobs", id], candidates: (f: CandidateFilters) => ["candidates", f], candidate: (id) => ["candidates", "detail", id], analytics: ["analytics"], members: ["members"], workspace: ["workspace"] }` where `CandidateFilters = { jobId?: string; search?: string; stage?: Stage; tag?: string; rejected?: boolean }`.
- Hooks (all in `src/hooks/queries.ts`, typed against the DTOs from `@/lib/dto`):
  - `useMe()` — `retry: false`, `staleTime: 60_000`; `useLogin()`, `useSignup()`, `useLogout()`, `useStartDemo()`, `useSwitchDemoRole()` (mutations invalidate `me` + everything on role switch: `queryClient.invalidateQueries()`)
  - `useJobs()`, `useJob(id)`, `useCreateJob()`, `useUpdateJob(id)`, `useDeleteJob()`
  - `useCandidates(filters)` — `placeholderData: keepPreviousData`; builds the query string by OMITTING undefined/empty values and stringifying `rejected` to `"true"`/`"false"` (matching `candidateListQuerySchema`); `useCandidate(id)`, `useCreateCandidate()`, `useUpdateCandidate(id)`, `useDeleteCandidate()`, `useAddNote(id)`, `useSetRating(id)`
  - `useMoveStage()` — THE optimistic one (full code below)
  - `useAnalytics()`, `useMembers()`, `useSetMemberRole()`, `useWorkspace()`, `useParseResume()` (mutation posting `FormData`)
- `useUiStore` (zustand): `{ drawerCandidateId: string | null; openDrawer(id): void; closeDrawer(): void; paletteOpen: boolean; setPaletteOpen(v): void; view: "board" | "table"; setView(v): void; addCandidateOpen: boolean; setAddCandidateOpen(v): void }` — ephemeral only, no persistence.
- `useDebounced<T>(value: T, ms = 250): T`.

- [ ] **Step 1: Implement `providers.tsx`** — `"use client"`; creates one `QueryClient` in `useState` (defaults: `staleTime: 30_000`, `retry: 1`, mutations `retry: 0`); wraps `QueryClientProvider` + `SkeletonTheme` (`baseColor="var(--skeleton-base)" highlightColor="var(--skeleton-highlight)"`) + Radix `Toast.Provider` + toast viewport.

- [ ] **Step 2: Implement `api-client.ts` and `queries.ts`.** `useMoveStage` exactly:

```ts
export interface MoveStagePayload { candidateId: string; stage?: Stage; rejected?: boolean }

export function useMoveStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ candidateId, ...body }: MoveStagePayload) =>
      api<CandidateDto>(`/api/candidates/${candidateId}/stage`, { method: "PATCH", json: body }),
    onMutate: async ({ candidateId, stage, rejected }) => {
      await queryClient.cancelQueries({ queryKey: ["candidates"] });
      const previous = queryClient.getQueriesData<CandidateDto[]>({ queryKey: ["candidates"] });
      queryClient.setQueriesData<CandidateDto[]>({ queryKey: ["candidates"] }, (old) =>
        old?.map((c) =>
          c.id === candidateId
            ? { ...c, ...(stage !== undefined ? { stage, rejected: false } : { rejected: rejected! }) }
            : c
        )
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast({ title: "Couldn't move candidate", description: "Your change was rolled back.", variant: "error" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] }); // stage counts
    },
  });
}
```

(`toast` comes from Task 18's toast module — declare the import; Task 18 must export `toast(opts: { title: string; description?: string; variant?: "default" | "error" | "success" }): void` from `src/components/ui/toast.tsx`.)

- [ ] **Step 3: Implement `ui.ts` store + `use-debounced.ts`** (plain `create<UiState>()(...)`, no middleware; debounce via `useEffect` + `setTimeout`).

- [ ] **Step 4: Verify + commit** — `npm run typecheck` green. `git add -A && git commit -m "feat: query/mutation hooks with optimistic stage moves, ui store"`

---

### Task 18: UI primitives

**Files:**
- Create in `src/components/ui/`: `button.tsx`, `field.tsx` (Label+Input+error, also `Textarea`, `Select` native), `badge.tsx`, `avatar.tsx`, `dialog.tsx`, `drawer.tsx`, `dropdown.tsx`, `tabs.tsx`, `toast.tsx`, `skeleton.tsx`, `empty-state.tsx`, `star-rating.tsx`, `stage-badge.tsx`, `spinner.tsx`

**Interfaces (props contracts later tasks rely on):**
- `Button`: `{ variant?: "primary"|"secondary"|"ghost"|"danger"; size?: "sm"|"md"; loading?: boolean } & ButtonHTMLAttributes` — visible `focus-visible` ring (`outline-2 outline-accent outline-offset-2`), `disabled` styling, `loading` shows `Spinner` + keeps label.
- `Field`: `{ label: string; error?: string; id: string; children? }` — renders `<label htmlFor>`, error in `<p role="alert" id="{id}-error">`, wires `aria-describedby`/`aria-invalid` onto the input via cloneElement or render-prop; exports `Input`, `Textarea`, `NativeSelect` styled primitives.
- `Avatar`: `{ seed: string; name: string; size?: number }` — DiceBear generated client-side, memoized: `useMemo(() => createAvatar(thumbs, { seed }).toDataUri(), [seed])`, `<img alt="" aria-hidden width={size} height={size} className="rounded-full">` (decorative — name is always adjacent text).
- `Dialog`: Radix wrapper `{ open, onOpenChange, title, description?, children, footer? }` — Radix gives focus trap + restore; overlay + panel styled with tokens; `DialogTitle` always rendered (a11y).
- `Drawer`: same contract, panel slides from right (`motion.div` with `x` spring, `useReducedMotion()` → no animation), full-height, `max-w-xl`, used by candidate profile.
- `toast(opts)` + `<Toaster />`: module-level emitter consumed by a listener component inside Providers; Radix Toast under the hood; `role="status"` polite.
- `StarRating`: `{ value: number; onChange?: (n: number) => void; readOnly?: boolean }` — radiogroup of 6 options (0–5): `<div role="radiogroup" aria-label="Rating">` with `<button role="radio" aria-checked aria-label="3 of 5 stars">`; arrow-key navigation; filled/outline star icons PLUS visible "3/5" text label (never color/icon alone).
- `StageBadge`: `{ stage: Stage; rejected?: boolean }` — `<span>` with stage tint tokens, a small stage-specific icon (inline SVG: applied=inbox, screening=filter, interview=chat, offer=doc, hired=check, rejected=x), and the visible label from `STAGE_LABELS`.
- `EmptyState`: `{ icon?, title: string, body?: string, action?: ReactNode }` — centered, used everywhere.
- `Skeleton`: re-export of react-loading-skeleton (theme comes from Providers' `SkeletonTheme`).
- Icons: create `src/components/ui/icons.tsx` — hand-written 16/20px inline SVG icon set (`IconPlus, IconSearch, IconBoard, IconTable, IconStar, IconStarFilled, IconInbox, IconFilter, IconChat, IconDoc, IconCheck, IconX, IconSun, IconMoon, IconUser, IconBriefcase, IconChart, IconSettings, IconLogout, IconUpload, IconDots, IconChevronDown, IconArrowRight, IconClock`), `stroke="currentColor"`, `aria-hidden`.

- [ ] **Step 1: Implement all files above.** Styling: tokens only (`bg-surface`, `border-border`, `text-text-2` …), 8px spacing grid, `rounded-lg` on cards / `rounded-md` on controls, subtle borders over heavy shadows (Linear-style). Follow the frontend-design skill guidance loaded at phase start.
- [ ] **Step 2: Verify** — temporary route `app/dev-kit/page.tsx` rendering every primitive in both themes; check keyboard focus rings, StarRating arrow keys, Dialog focus trap/restore (Tab cycles inside; Esc closes; focus returns to trigger). Delete `app/dev-kit` after checking.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: accessible UI primitive kit on design tokens"`

---

### Task 19: App shell, auth gate, command palette, demo banner

**Files:**
- Create: `app/(app)/layout.tsx`, `src/components/shell/app-shell.tsx`, `src/components/shell/sidebar.tsx`, `src/components/shell/topbar.tsx`, `src/components/shell/demo-banner.tsx`, `src/components/shell/command-palette.tsx`, `src/components/shell/auth-gate.tsx`

**Interfaces:**
- `app/(app)/layout.tsx` (server): `<AuthGate><AppShell>{children}</AppShell></AuthGate>`.
- `AuthGate` (client): `useMe()`; while loading → full-page centered `Spinner`; on `ApiClientError` 401 → `router.replace("/login")`; else render children.
- `AppShell`: landmarks — `<nav aria-label="Primary">` sidebar, `<header>` topbar, `<main id="main">`; skip link `<a href="#main" class="sr-only focus:not-sr-only ...">Skip to content</a>` first in DOM. Sidebar: logo, links (Dashboard `/dashboard`, Jobs `/jobs`, Candidates `/candidates`, Analytics `/analytics`, Settings `/settings`) with icons + `aria-current="page"` via `usePathname()`. Mobile (< md): sidebar hidden; hamburger in topbar opens it as a Drawer; bottom of drawer shows user + logout.
- `Topbar`: search-style button "Search or jump to… ⌘K" (opens palette), `ThemeToggle`, user `Dropdown` (username, role badge, Log out → `useLogout` → `router.push("/")`).
- `DemoBanner` (rendered above topbar when `me.isDemo`): text "Demo workspace — data resets automatically", countdown ("resets in 23h") from `demoExpiresAt`, and the role switcher: labeled `NativeSelect` "Viewing as: Admin/Recruiter/Interviewer" → `useSwitchDemoRole` → full query invalidation so UI capabilities update live.
- `CommandPalette`: `cmdk` inside a Radix Dialog; global `keydown` listener for `Ctrl/Cmd+K` (registered in AppShell); groups: Navigation (5 pages), Actions ("Add candidate" → `setAddCandidateOpen(true)`; "Toggle theme"; "Log out"), Jobs (from `useJobs()` cache → `/jobs/{id}`). Items announce via cmdk's built-in listbox semantics; `aria-label="Command menu"`.
- RBAC in UI: export `useCan()` hook from `src/hooks/use-can.ts`: `{ canEdit: role !== "interviewer", isAdmin: role === "admin" }` derived from `useMe()` — later tasks consume it to hide/disable actions.

- [ ] **Step 1: Implement all files**; placeholder-free — pages routed to may 404 until Phase D, that's fine.
- [ ] **Step 2: Verify** — log in via `npm run seed` credentials (`demo` / `demo-password-123`) on the dev server: shell renders, ⌘K opens palette and navigates, theme toggles, logout returns to landing, mobile viewport (devtools) shows hamburger drawer. Keyboard-only pass: skip link appears on first Tab; palette fully operable.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: app shell with auth gate, command palette, demo banner"`

---

## Phase D — Views

Same working mode as Phase C: frontend-design skill loaded, tokens only, typecheck + dev-server verification per task, Playwright/axe verification lands in Phase F.

### Task 20: Landing page, favicon, meta, OG image

**Files:**
- Create: `app/(marketing)/page.tsx`, `src/components/marketing/landing.tsx`, `app/icon.svg`, `app/opengraph-image.tsx`
- Modify: `app/layout.tsx` (metadata), delete the Task 1 placeholder `app/page.tsx`

**Interfaces:**
- Root metadata: `title: { default: "ApplicantWizard — modern applicant tracking", template: "%s · ApplicantWizard" }`, description, `openGraph` + `twitter` card fields (OG image is auto-wired by `opengraph-image.tsx`).
- `app/icon.svg`: simple funnel-with-spark mark, `currentColor`-free (uses `#4f46e5`), works at 16px.
- `app/opengraph-image.tsx`: `next/og` `ImageResponse`, 1200×630 — dark surface, product name, tagline, accent bar.
- Landing (client component): top nav (wordmark; "Sign in" ghost; "Get started" primary); hero: headline + subcopy + primary CTA **"View Live Demo"** + secondary "Create free account"; demo CTA runs `useStartDemo()` with loading state "Setting up your sandbox…" then `router.push("/dashboard")`; if `useMe()` succeeds, primary CTA becomes "Open dashboard". Below: a stylized mini pipeline mock built from real `StageBadge`/card components (static data, decorative `aria-hidden`), then a 6-item feature grid (Pipeline board / Resume parsing / Analytics / Role-based security / Command palette / Light & dark) with icons, then footer. All copy final — no lorem.

- [ ] **Step 1: Implement all files.**
- [ ] **Step 2: Verify** — `/` renders in both themes/viewports; "View Live Demo" lands in a populated dashboard shell (pages from later tasks may 404 — dashboard route exists in Task 22; for THIS task assert the redirect happens and the session cookie is set). Favicon appears; view-source shows OG tags.
- [ ] **Step 3: Commit** — `git commit -m "feat: landing page with one-click demo entry, favicon, OG image"`

---

### Task 21: Auth pages

**Files:**
- Create: `app/(auth)/layout.tsx` (centered card layout with wordmark + ThemeToggle), `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `src/components/auth/auth-form.tsx`

**Interfaces:**
- Both pages use react-hook-form + `zodResolver` reusing `loginSchema` / `signUpSchema` from `@/lib/schemas/auth` (isomorphic — no server imports there). Labeled `Field`s, inline zod errors, server `ApiClientError.message` shown in an `role="alert"` banner, submit `Button loading`. Success → `router.push("/dashboard")`. `useMe()` success on mount → redirect to `/dashboard`. Cross-links ("No account? Sign up"), and a tertiary "or try the live demo" link running the demo mutation.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify** — signup → dashboard redirect; duplicate username shows the 409 message; login with bad password shows "Invalid credentials"; keyboard-only submit works; labels announce.
- [ ] **Step 3: Commit** — `git commit -m "feat: login and signup pages"`

---

### Task 22: Dashboard

**Files:**
- Create: `app/(app)/dashboard/page.tsx`, `src/components/dashboard/dashboard-view.tsx`, `src/components/dashboard/kpi-tile.tsx`, `src/components/dashboard/activity-feed.tsx`, `src/lib/format.ts`

**Interfaces:**
- `src/lib/format.ts`: `formatRelative(iso: string, now?: Date): string` ("just now", "4h ago", "3d ago", "Jun 2"); `daysSince(iso: string): number`; `formatDate(iso: string): string`.
- KPI row (4 `KpiTile`s: label, big value, small icon): Open roles (`analytics.totals.openJobs`), Active candidates (`totals.active`), In interview (current-stage count from `useCandidates({})`), Hired (`totals.hired`).
- Stage overview: horizontal bar strip of current-stage counts (label + count + tinted bar, widths proportional; each row `aria-label="Interview: 12 candidates"`).
- `ActivityFeed`: flatten every candidate's `activity`, sort desc, take 10 → "**Demo Recruiter** moved **Ada Park** · applied → screening · 2h ago"; row click opens the candidate drawer (store). Empty → EmptyState.
- Loading: skeleton tiles + feed rows shaped identically (no layout shift). Error: retry button calling `refetch`.

- [ ] **Step 1: Implement.** — [ ] **Step 2: Verify** on seeded workspace (all tiles non-zero, feed alive) and on a fresh signup (empty states + CTA "Create your first job" linking `/jobs`). — [ ] **Step 3: Commit** — `git commit -m "feat: dashboard with KPIs, stage overview, activity feed"`

---

### Task 23: Jobs list + job detail shell

**Files:**
- Create: `app/(app)/jobs/page.tsx`, `app/(app)/jobs/[jobId]/page.tsx`, `src/components/jobs/jobs-view.tsx`, `src/components/jobs/job-card.tsx`, `src/components/jobs/job-form-dialog.tsx`, `src/components/jobs/job-header.tsx`

**Interfaces:**
- Jobs page: header row (title, count, `useCan().canEdit &&` "New job" Button); grid of `JobCard`s: title, department · location · employmentType, status Badge (open/closed — icon + label), per-stage mini-funnel (5 labeled counts from `job.counts`), overflow `Dropdown` (Edit / Close (or Reopen) / Delete w/ confirm Dialog warning it deletes its candidates). Card body links to `/jobs/{id}`. Empty state: "No open roles yet — create your first job". Skeleton cards.
- `JobFormDialog` (create + edit): react-hook-form + zodResolver on `createJobSchema`; fields title, department, location, employmentType (NativeSelect), description (Textarea).
- Job detail page: `JobHeader` (back link, title, meta, status, actions) + stage-count strip; below it renders `<PipelineView jobId={jobId} />` **from Task 24** — for THIS task render the header + strip only and pass; add the PipelineView line in Task 24.

- [ ] **Step 1: Implement.** — [ ] **Step 2: Verify** — create/edit/close/delete a job as admin; interviewer (demo role switcher) sees no New/Edit controls. — [ ] **Step 3: Commit** — `git commit -m "feat: job requisitions list and detail header"`

---

### Task 24: Pipeline board (dnd-kit) — the centerpiece

**Files:**
- Create: `app/(app)/candidates/page.tsx`, `src/components/pipeline/pipeline-view.tsx`, `src/components/pipeline/board-view.tsx`, `src/components/pipeline/board-column.tsx`, `src/components/pipeline/candidate-card.tsx`, `src/components/pipeline/board-skeleton.tsx`
- Modify: `app/(app)/jobs/[jobId]/page.tsx` (embed `<PipelineView jobId={...} />`)

**Interfaces:**
- `PipelineView({ jobId?: string })`: owns filter state — search `Input` (debounced 250ms, labeled "Search candidates"), job `NativeSelect` (only when no `jobId` prop), "Show rejected" toggle; `useCandidates({ jobId, search, rejected })`; header also holds "Add candidate" (recruiter+) and the board/table toggle (added Task 25). Opens drawer when `?candidate=` search param present (effect). Renders `BoardSkeleton` / error retry / `BoardView`.
- `BoardView({ candidates, jobsById, canEdit, onOpen(id), onMove(payload) })` — full DnD wiring:

```tsx
"use client";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
  type KeyboardCoordinateGetter } from "@dnd-kit/core";
import { useState } from "react";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/types";
import type { CandidateDto } from "@/lib/dto";
import { BoardColumn } from "./board-column";
import { CandidateCard } from "./candidate-card";

// Arrow keys jump the dragged card between column centers (true keyboard drag).
const columnCoordinates: KeyboardCoordinateGetter = (event, { droppableContainers, collisionRect }) => {
  if (!collisionRect) return;
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
  event.preventDefault();
  const columns = STAGES
    .map((s) => droppableContainers.get(s))
    .filter((c) => c?.rect.current)
    .map((c) => ({ id: c!.id as Stage, rect: c!.rect.current! }));
  const currentX = collisionRect.left + collisionRect.width / 2;
  const sorted = columns.sort((a, b) => a.rect.left - b.rect.left);
  const currentIdx = sorted.findIndex((c) => currentX >= c.rect.left && currentX <= c.rect.left + c.rect.width);
  const nextIdx = event.key === "ArrowLeft" ? Math.max(0, currentIdx - 1)
    : event.key === "ArrowRight" ? Math.min(sorted.length - 1, currentIdx + 1)
    : currentIdx;
  if (nextIdx === currentIdx || nextIdx < 0) return;
  const target = sorted[nextIdx].rect;
  return { x: target.left + target.width / 2 - collisionRect.width / 2, y: collisionRect.top };
};

export function BoardView({ candidates, jobsById, canEdit, onOpen, onMove }: BoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnCoordinates })
  );
  const byStage = (stage: Stage) => candidates.filter((c) => c.stage === stage && !c.rejected);
  const active = candidates.find((c) => c.id === activeId) ?? null;
  const name = (id: string | number) => candidates.find((c) => c.id === id)?.name ?? "Candidate";
  const col = (id: string | number | undefined) => (id && STAGE_LABELS[id as Stage]) || "the board";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Press space or enter to pick up a candidate. Use left and right arrow keys to choose a stage, then space or enter to drop, or escape to cancel. You can also use the card menu to move without dragging.",
        },
        announcements: {
          onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
          onDragOver: ({ active, over }) => (over ? `${name(active.id)} is over the ${col(over.id)} column.` : undefined),
          onDragEnd: ({ active, over }) =>
            over ? `${name(active.id)} dropped into ${col(over.id)}.` : `${name(active.id)} was dropped. No change.`,
          onDragCancel: ({ active }) => `Dragging ${name(active.id)} was cancelled.`,
        },
      }}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={(e: DragEndEvent) => {
        setActiveId(null);
        const targetStage = e.over?.id as Stage | undefined;
        const candidate = candidates.find((c) => c.id === e.active.id);
        if (targetStage && candidate && candidate.stage !== targetStage) {
          onMove({ candidateId: candidate.id, stage: targetStage });
        }
      }}
    >
      <ol className="flex gap-4 overflow-x-auto snap-x snap-mandatory md:snap-none pb-4" aria-label="Pipeline stages">
        {STAGES.map((stage) => (
          <BoardColumn key={stage} stage={stage} candidates={byStage(stage)}
            jobsById={jobsById} canEdit={canEdit} onOpen={onOpen} onMove={onMove} />
        ))}
      </ol>
      <DragOverlay>{active ? <CandidateCard candidate={active} jobsById={jobsById} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}
```

- `BoardColumn`: `<li>` with `useDroppable({ id: stage, disabled: !canEdit })`; `snap-center w-[82vw] sm:w-72 shrink-0`; header `<h2 class="text-sm">` = stage icon + `STAGE_LABELS[stage]` + count Badge; body ring highlight when `isOver`; empty column renders a dashed "Drop candidates here" zone (`aria-hidden`) sized like one card.
- `CandidateCard`: `useDraggable({ id: candidate.id, disabled: !canEdit || overlay })`; root `<div ref={setNodeRef} {...listeners} {...attributes}>` (dnd-kit supplies `role="button"`, tabIndex, `aria-describedby` instructions); contents: `Avatar` + name (`<button>` opening the drawer — `onPointerDown={e => e.stopPropagation()}` so click ≠ drag), job title (all-jobs view), `★ n/5` text, up to 2 tag chips, footer `IconClock` + `{daysSince(lastStageEntry.enteredAt)}d` + sr-only "12 days in this stage". Card `Dropdown` menu (recruiter+): "Move to →" submenu of the 5 stages (calls `onMove` — the no-drag fallback), "Reject", "View profile". While `activeId === id`, original renders at 40% opacity. Hover: border-accent + slight lift (`motion.div`, respects `useReducedMotion`).
- Optimistic behavior comes free: `onMove` = `useMoveStage().mutate` (Task 17) — card jumps instantly, rolls back with toast on failure.

- [ ] **Step 1: Implement all files; wire `/candidates` page + embed in job detail.**
- [ ] **Step 2: Verify (manual matrix)** — pointer drag applied→interview persists across reload; keyboard: Tab to card → Space → ArrowRight → Space → SR announcement text visible in the live region (inspect `[aria-live]` in devtools) and move persisted; Esc cancels; card menu "Move to" works; interviewer role: dragging disabled but cards/profiles open; kill the dev API (stop Mongo briefly) → drag rolls back + toast; mobile viewport: columns snap-scroll.
- [ ] **Step 3: Commit** — `git commit -m "feat: keyboard-accessible kanban pipeline with optimistic drag"`

---

### Task 25: Table view + board/table toggle

**Files:**
- Create: `src/components/pipeline/table-view.tsx`
- Modify: `src/components/pipeline/pipeline-view.tsx` (toggle + view switch)

**Interfaces:**
- Toggle: segmented control in PipelineView header — two `<button>`s (Board `IconBoard` / Table `IconTable`, visible labels) with `aria-pressed`, driven by `useUiStore().view`.
- `TableView({ candidates, jobsById, onOpen })`: TanStack Table + `@tanstack/react-virtual`:
  - Columns: Name (Avatar + name as a `<button>` → `onOpen(id)`), Job, Stage (`StageBadge`), Rating (`★ 4/5` + sr-only "rated 4 of 5"), Tags (chips, `+n` overflow), Source (label), Updated (`formatRelative`).
  - Sorting: `getSortedRowModel`; header cells `<th scope="col" aria-sort={...}>` containing a `<button>` with the column label + sort direction arrow.
  - Search/filters come from PipelineView's server-side filter state (shared with board) — the table does NOT re-implement filtering; it adds client-side sorting only.
  - Virtualization: scroll container `div` (max-h ~ `calc(100vh - 280px)`, `overflow-auto`); `useVirtualizer({ count: rows.length, estimateSize: () => 56, overscan: 10 })`; real `<table>` semantics preserved — `<tbody style={{ height: totalSize, position: "relative" }}>`, each `<tr style={{ position: "absolute", transform: translateY(start), width: "100%" }}>` with fixed-width `<td>`s (grid template shared between thead/tbody via `table-fixed` + `colgroup`).
  - `<caption class="sr-only">Candidates — sortable table</caption>`; zebra-free, row hover `bg-surface-2`; empty → EmptyState "No candidates match these filters" + Clear-filters button.

- [ ] **Step 1: Implement.** — [ ] **Step 2: Verify** — toggle persists while navigating (store), sorting works on all columns, 60-candidate demo scrolls smoothly, screen-reader table semantics intact (inspect a11y tree: table/rowgroup/row/columnheader), keyboard: sort buttons + name buttons reachable in order. — [ ] **Step 3: Commit** — `git commit -m "feat: virtualized sortable table view with real table semantics"`

---

### Task 26: Candidate drawer (profile)

**Files:**
- Create: `src/components/candidate/candidate-drawer.tsx`, `src/components/candidate/profile-tab.tsx`, `src/components/candidate/notes-tab.tsx`, `src/components/candidate/activity-tab.tsx`, `src/components/candidate/resume-tab.tsx`, `src/components/candidate/edit-candidate-dialog.tsx`
- Modify: `src/components/shell/app-shell.tsx` (mount `<CandidateDrawer />` once, globally)

**Interfaces:**
- `CandidateDrawer`: reads `drawerCandidateId` from the store; `useCandidate(id)`; Radix-based `Drawer` (Task 18) — focus trap + restore verified here. URL sync: opening sets `?candidate={id}` (`router.replace`, no scroll), closing removes it.
- Header: `Avatar` (size 48) + name (`<h2>`), email (mailto) · phone · location, job title link, `StageBadge` (+ "Rejected" badge when rejected). Stage `NativeSelect` (recruiter+, label "Stage") wired to `useMoveStage`; `StarRating` editable (all roles) wired to `useSetRating`; overflow `Dropdown` (recruiter+): Edit, Reject/Restore, Delete (confirm Dialog).
- `Tabs` (Radix): **Profile** — skills chips, tags chips, experience timeline (`<ol>` reverse-chron: title @ company, `formatDate(start)} – {end ?? "Present"`, vertical line + dot), education, desired pay, source. **Resume** — `resume.text` in `<pre class="whitespace-pre-wrap">` with "Parsed {formatDate}" caption, else EmptyState "No resume on file" (+ "Upload one" note that upload happens via Add candidate flow). **Notes** — list (author, relative time, body) + composer (`Textarea` + Add note Button, any role) via `useAddNote`; optimizes nothing — invalidates candidate. **Activity** — `<ol>` timeline of activity entries: icon per type, `actorName`, human text from type+meta ("moved applied → screening"), relative time.
- `EditCandidateDialog`: react-hook-form + zodResolver on a client schema = `updateCandidateSchema` fields (name, email, phone, location, source, education, desiredPay, skills TagInput, tags TagInput); `useUpdateCandidate`. `TagInput` (add to `src/components/ui/field.tsx`): chip list + text input, Enter/comma commits, Backspace removes last, each chip has a labeled remove button.
- Loading: drawer skeleton mirroring header+tabs. 404 (deleted meanwhile): toast + close.

- [ ] **Step 1: Implement.** — [ ] **Step 2: Verify** — open from board card, table row, dashboard feed; Tab stays inside drawer, Esc closes, focus returns to the opener; rating change appears in Activity; notes as interviewer role work, Edit hidden; URL with `?candidate=` deep-links after reload. — [ ] **Step 3: Commit** — `git commit -m "feat: candidate profile drawer with notes, activity, resume tabs"`

---

### Task 27: Add candidate + resume upload flow

**Files:**
- Create: `src/components/candidate/add-candidate-dialog.tsx`, `src/components/candidate/resume-dropzone.tsx`
- Modify: `src/components/shell/app-shell.tsx` (mount once; opens via `useUiStore().addCandidateOpen` — triggered from palette, PipelineView button, empty states)

**Interfaces:**
- Dialog with two entry paths as `Tabs`: **"From resume"** (default) and **"Manual"**.
- `ResumeDropzone`: visually-styled `<label>` wrapping `<input type="file" accept=".pdf,.docx" class="sr-only">` (fully keyboard/SR accessible), drag-over styling via `onDragOver/onDrop`; on file: client-side size check (5 MB → inline error), then `useParseResume().mutate(formData)`; pending state ("Reading resume…" + spinner); success → switch to the form with fields prefilled (`fields.name/email/phone`, `skills`, plus hidden `resumeText = text`) and a success banner "Parsed from resume — review before saving"; error → `role="alert"` inline message with the server's 422 text + "Enter manually instead" button (switches tab, keeps nothing).
- Form (shared by both paths): job (NativeSelect from `useJobs`, required), name, email, phone, location, source (NativeSelect), stage (NativeSelect, default Applied), skills TagInput, tags TagInput, education, desiredPay. Client zod schema derived from `createCandidateSchema` (`.omit({ resumeText: true })` merged with optional local fields). Submit → `useCreateCandidate` (includes `resumeText` when present) → toast "Candidate added" → close → `openDrawer(newId)`.
- RBAC: the triggers render only when `useCan().canEdit`; route-level protection already server-side.

- [ ] **Step 1: Implement.** — [ ] **Step 2: Verify** — upload a real PDF resume (make one via print-to-PDF) → fields prefill → save → drawer opens with Resume tab populated; upload a PNG renamed `.pdf` → graceful inline error; manual path works; keyboard-only: dropzone reachable, file dialog opens with Enter. — [ ] **Step 3: Commit** — `git commit -m "feat: resume-to-candidate flow with graceful parse failures"`

---

### Task 28: Analytics view (lazy Recharts)

**Files:**
- Create: `app/(app)/analytics/page.tsx`, `src/components/analytics/analytics-view.tsx`, `src/components/analytics/charts.tsx`, `src/components/analytics/chart-skeleton.tsx`

**Interfaces:**
- **Before writing any chart code, load the `dataviz` skill** (Skill tool) and follow it for form, palette usage, and accessibility; its guidance wins over the sketch below where they conflict, EXCEPT colors must remain the app tokens.
- Page: `const AnalyticsView = dynamic(() => import("@/components/analytics/analytics-view"), { ssr: false, loading: () => <ChartSkeleton /> })` — Recharts never enters the shared bundle.
- `AnalyticsView` (`useAnalytics()`): KPI row (Total candidates / Active / Hired / Rejected); 2×2 chart grid, each chart in `<figure>` with `<figcaption>` (title + one-line takeaway) and an sr-only `<table>` of the underlying numbers:
  1. **Hiring funnel** — horizontal `BarChart` of `funnel` (reached-stage counts), labeled bars.
  2. **Avg time in stage** — vertical `BarChart` of `timeInStage.avgDays`, y-axis "days".
  3. **Candidates by source** — donut `PieChart` of `bySource` with legend + counts (labels, never color-only).
  4. **Pipeline velocity** — `LineChart` of `velocity` (stage moves per week, 8 weeks).
- Theme: SVG fills/strokes use CSS var strings (`fill="var(--accent)"`, grid `stroke="var(--border)"`, text `fill="var(--text-2)"`); tooltip `contentStyle` uses surface/border/text vars. Stage-colored marks use the `--stage-*-bg/fg` pairs. `isAnimationActive={false}` when `useReducedMotion()`.
- Empty workspace: EmptyState "Analytics unlock once you add candidates".

- [ ] **Step 1: Load dataviz skill, implement.** — [ ] **Step 2: Verify** — seeded demo shows 4 live charts in both themes; `npm run build` then check `.next` route sizes: `/analytics` carries the Recharts chunk, `/dashboard` does not. — [ ] **Step 3: Commit** — `git commit -m "feat: lazy-loaded analytics with funnel, time-in-stage, source, velocity"`

---

### Task 29: Settings (profile, members/RBAC admin, workspace rename)

**Files:**
- Create: `app/(app)/settings/page.tsx`, `src/components/settings/settings-view.tsx`, `src/components/settings/members-section.tsx`
- Modify: `app/api/workspace/route.ts` (add `PATCH`), `tests/unit/api-members.test.ts` (rename cases)

**Interfaces:**
- Add `PATCH /api/workspace` (admin, mutation limit): zod `z.object({ name: z.string().trim().min(1).max(80) }).strict()` → 200 `{ id, name, isDemo }`. TDD: failing test (admin renames → 200 + persisted; recruiter → 403) → implement → pass.
- Settings sections (single column, `<h2>` per section): **Profile** (username, email read-only rows); **Workspace** (name — admin sees inline edit Field + Save via new `useRenameWorkspace()` hook; others read-only); **Members** — table (real `<table>`: Member / Role): each row Avatar-less username + role; admin sees `NativeSelect` per row (label sr-only "Role for {username}") wired to `useSetMemberRole` (self row: select disabled, title "You cannot change your own role"); non-admins see role Badges; **Appearance** — ThemeToggle + copy ("Follows your system preference until you choose"); **Demo** (only `isDemo`) — explains sandbox reset + the role switcher pointer.

- [ ] **Step 1: TDD the PATCH route; Step 2: implement UI; Step 3: Verify** — rename persists in topbar; demo role switch to interviewer collapses admin-only sections to read-only. **Step 4: Commit** — `git commit -m "feat: settings with member role management and workspace rename"`

---

## Phase E — Consolidation

### Task 30: "Before" screenshots, retire old apps, README

**Files:**
- Create: `docs/screenshots/before/` (PNGs), `README.md` (root, rewrite)
- Delete: `backend/`, `frontend/`

- [ ] **Step 1: Capture BEFORE screenshots while the old app still exists.** Start the legacy frontend: `npm --prefix frontend install; npm --prefix frontend run dev -- -p 3001` (it proxies to the deployed API — logged-out state is enough if login is dead). Then:
```
npx playwright screenshot --viewport-size=1440,900 http://localhost:3001 docs/screenshots/before/desktop-home.png
npx playwright screenshot --viewport-size=390,844  http://localhost:3001 docs/screenshots/before/mobile-home.png
```
If the old login works (any seeded legacy account), also capture the logged-in table view. Stop the server.
- [ ] **Step 2: Delete `backend/` and `frontend/`** (`git rm -r backend frontend`). Run `npm run typecheck && npm test && npm run build` — all green (tsconfig already excluded them, nothing should reference them).
- [ ] **Step 3: Rewrite root `README.md`**: what it is (portfolio ATS), live-demo callout, feature list, stack, architecture sketch (withAuth pipeline diagram in text), local setup (`.env.local` from `.env.example`, `npm install`, `npm run seed`, `npm run dev`), demo credentials note, security section (RBAC matrix, validation, rate limits, sessions, headers), testing commands, screenshots section linking `docs/screenshots/`.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "chore: retire legacy split apps, capture before screenshots, rewrite README"`

---

## Phase F — Verification & iteration

### Task 31: Playwright e2e suite

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/helpers.ts`, `tests/e2e/auth.spec.ts`, `tests/e2e/demo.spec.ts`, `tests/e2e/board.spec.ts`, `tests/e2e/resume.spec.ts`, `tests/e2e/rbac.spec.ts`
- Install: `npm i -D @playwright/test @axe-core/playwright` then `npx playwright install chromium`

**Interfaces:**
- `playwright.config.ts`: `testDir: "tests/e2e"`, chromium project only, `use: { baseURL: "http://localhost:3000" }`, `webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 }`. Requires `.env.local` pointing at a REAL Mongo (local or Atlas dev db) — document at top of config.
- `tests/e2e/helpers.ts`: `enterDemo(page)` — goto `/`, click "View Live Demo", `await page.waitForURL("**/dashboard")`; `uniqueUser()` — `u${Date.now()}`.

- [ ] **Step 1: Write the specs (each asserts real behavior):**
  - `auth.spec.ts`: signup (unique user) lands on dashboard; logout returns to landing; login round-trip; wrong password shows "Invalid credentials"; `/dashboard` unauthenticated redirects to `/login`.
  - `demo.spec.ts`: `enterDemo` → dashboard KPI tiles show non-zero numbers; `/candidates` board renders 5 column headings (Applied…Hired) each with cards; demo banner visible with role switcher.
  - `board.spec.ts`: `enterDemo` → `/candidates`; pick first card in Applied, record its name; pointer-drag to Interview (`card.hover(); mouse.down(); mouse.move(interviewColCenter, {steps: 12}); mouse.up()`); expect the name inside the Interview column; `page.reload()` → still there (persistence). Keyboard path: focus a card (Tab), `Space`, `ArrowRight`, `Space`; assert the dnd-kit live region (`#DndLiveRegion` or `[aria-live="assertive"]`) contains "dropped into"; card moved. Menu path: card menu → "Move to" → Offer → card in Offer.
  - `resume.spec.ts`: `enterDemo` → open Add candidate → From resume; generate a PDF fixture in-test with pdf-lib (same `makePdf` helper as unit tests, written to a temp path) containing name/email/skills; `setInputFiles`; expect name + email inputs prefilled; save; drawer opens with Resume tab text.
  - `rbac.spec.ts`: `enterDemo` (admin) → switch role to Interviewer in banner; expect "Add candidate" and "New job" absent, drag disabled (card has `aria-disabled` or no `role="button"` from dnd), but note composer in a candidate drawer still works; switch back to Admin → controls return.
- [ ] **Step 2: Run `npm run test:e2e`** — Expected: all pass (fix app bugs they surface — that is their job; do NOT weaken assertions to pass).
- [ ] **Step 3: Commit** — `git add -A && git commit -m "test: e2e coverage for auth, demo, drag persistence, resume, rbac"`

---

### Task 32: Screenshot matrix, self-critique iteration, axe pass

**Files:**
- Create: `tests/e2e/audit.spec.ts`, `docs/screenshots/after/` (output)

**Interfaces:**
- `audit.spec.ts` iterates the full matrix — views: landing, login, dashboard, jobs, job detail, candidates-board, candidates-table, candidate-drawer (open), add-candidate (resume tab), analytics, settings; themes: light + dark (set cookie `aw_theme` before `page.goto`); viewports: 1440×900 and 390×844. For each: `page.screenshot({ path: docs/screenshots/after/${view}-${theme}-${vp}.png, fullPage: true })`, and at desktop-size run axe:
```ts
const results = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
  .analyze();
expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
```
(Drawer/dialog states get their own axe run while open — overlays are where violations hide.)

- [ ] **Step 1: Run the matrix; fix every axe violation** (both themes — dark-mode contrast failures mean token adjustments + re-run `npm run contrast`). Re-run until zero violations across all view×theme combos.
- [ ] **Step 2: Design critique loop (2+ rounds).** Open the screenshot grid; with the frontend-design skill loaded, critique against the direction — hierarchy, spacing rhythm, alignment, density, dark-mode polish, hover states, "would a company pay for this?" — write the critique into the session, fix the top issues (spacing/type-scale/alignment first), re-screenshot, repeat until a round produces no material findings. Commit after each round (`style: polish pass N — <what changed>`).
- [ ] **Step 3: Commit final** — `git add -A && git commit -m "test: full-matrix screenshots and zero-violation axe audit"`

---

### Task 33: Production build, Lighthouse, final report

- [ ] **Step 1:** `npm run build` — zero type errors, note route JS sizes (analytics chunk must be isolated). `npm start`, then:
```
npx lighthouse http://localhost:3000 --preset=desktop --only-categories=performance,accessibility,best-practices,seo --output html --output-path docs/lighthouse-landing.html --chrome-flags="--headless=new"
```
Expected: Performance ≥ 90, Accessibility ≥ 95, near-zero CLS on landing. Fix regressions it flags (unsized images, render-blocking, etc.) and re-run.
- [ ] **Step 2:** Full gate: `npm run typecheck && npm test && npm run test:e2e && npm run contrast` — ALL green (superpowers:verification-before-completion — show the outputs, no claims without them).
- [ ] **Step 3: Final deliverable for the user** — `docs/screenshots/README.md` with a before/after table embedding `before/*` next to matching `after/*` shots; present it with a summary of what shipped. Commit: `git commit -m "docs: before/after gallery and lighthouse report"`.

---

## Execution notes

- Tasks are strictly ordered within phases; Phase B tasks 9–13 are independent of each other (parallelizable across subagents), as are Phase D tasks 20–23. Tasks 24→25→26→27 are sequential (shared files).
- Every task ends with the full unit suite green (`npm test`), not just the new file.
- Skills to load during execution: **frontend-design** (Phases C/D/Task 32), **dataviz** (Task 28), **superpowers:verification-before-completion** (Tasks 31–33).
- If Vercel deployment is exercised at the end: the root project deploys as-is (no `vercel.json` needed); set `MONGODB_URI` + `SESSION_SECRET` in Vercel env; the old two-project setup is retired.
