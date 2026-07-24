import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { setupTestDb } from "../helpers/db";
import WorkspaceModel from "@/models/workspace";
import UserModel from "@/models/user";
import JobModel from "@/models/job";
import CandidateModel from "@/models/candidate";
import { seedWorkspace } from "@/lib/seed";
import { STAGES } from "@/lib/types";

setupTestDb();

async function makeWorkspaceAndActor() {
  const workspace = await WorkspaceModel.create({ name: "Seed Test WS" });
  const user = await UserModel.create({
    username: `actor${Math.floor(Math.random() * 1e9)}`,
    email: `actor${Math.floor(Math.random() * 1e9)}@x.com`,
    passwordHash: "h",
    workspaceId: workspace._id,
    role: "admin",
  });
  return { workspace, user };
}

describe("seedWorkspace", () => {
  it("creates 5 jobs and 60 candidates, all scoped to the target workspace", async () => {
    const { workspace, user } = await makeWorkspaceAndActor();

    const result = await seedWorkspace(workspace._id, user._id);
    expect(result).toEqual({ jobs: 5, candidates: 60 });

    const jobCount = await JobModel.countDocuments({ workspaceId: workspace._id });
    const candidateCount = await CandidateModel.countDocuments({ workspaceId: workspace._id });
    expect(jobCount).toBe(5);
    expect(candidateCount).toBe(60);
  });

  it("every candidate's first stageHistory entry is 'applied'", async () => {
    const { workspace, user } = await makeWorkspaceAndActor();
    await seedWorkspace(workspace._id, user._id);

    const candidates = await CandidateModel.find({ workspaceId: workspace._id }).exec();
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      expect(c.stageHistory[0]?.stage).toBe("applied");
    }
  });

  it("is deterministic: seed:7 on two different workspaces yields identical sorted candidate-name lists", async () => {
    const { workspace: wsA, user: userA } = await makeWorkspaceAndActor();
    const { workspace: wsB, user: userB } = await makeWorkspaceAndActor();

    await seedWorkspace(wsA._id, userA._id, { seed: 7 });
    await seedWorkspace(wsB._id, userB._id, { seed: 7 });

    const namesA = (await CandidateModel.find({ workspaceId: wsA._id }).exec()).map((c) => c.name).sort();
    const namesB = (await CandidateModel.find({ workspaceId: wsB._id }).exec()).map((c) => c.name).sort();
    expect(namesA).toEqual(namesB);
    expect(namesA.length).toBe(60);
  });

  it("every candidate has skills.length >= 3 and a non-empty avatarSeed", async () => {
    const { workspace, user } = await makeWorkspaceAndActor();
    await seedWorkspace(workspace._id, user._id);

    const candidates = await CandidateModel.find({ workspaceId: workspace._id }).exec();
    for (const c of candidates) {
      expect(c.skills.length).toBeGreaterThanOrEqual(3);
      expect(c.avatarSeed.length).toBeGreaterThan(0);
    }
  });

  it("the default 60-candidate spread populates every stage of every job (rejected candidates keep a reached stage)", async () => {
    const { workspace, user } = await makeWorkspaceAndActor();
    await seedWorkspace(workspace._id, user._id);

    const jobs = await JobModel.find({ workspaceId: workspace._id }).exec();
    expect(jobs).toHaveLength(5);

    for (const job of jobs) {
      const candidates = await CandidateModel.find({ workspaceId: workspace._id, jobId: job._id }).exec();
      for (const stage of STAGES) {
        const hasNonRejectedAtStage = candidates.some((c) => c.stage === stage && !c.rejected);
        expect(hasNonRejectedAtStage).toBe(true);
      }
      const hasRejected = candidates.some((c) => c.rejected);
      expect(hasRejected).toBe(true);
    }
  });

  it("no stageHistory entry is in the future, and entries are chronologically non-decreasing", async () => {
    const { workspace, user } = await makeWorkspaceAndActor();
    await seedWorkspace(workspace._id, user._id);

    const now = Date.now();
    const candidates = await CandidateModel.find({ workspaceId: workspace._id }).exec();
    for (const c of candidates) {
      let prev = -Infinity;
      for (const entry of c.stageHistory) {
        expect(entry.enteredAt.getTime()).toBeLessThanOrEqual(now);
        expect(entry.enteredAt.getTime()).toBeGreaterThanOrEqual(prev);
        prev = entry.enteredAt.getTime();
      }
    }
  });

  it("respects a custom candidateCount option", async () => {
    const { workspace, user } = await makeWorkspaceAndActor();
    const result = await seedWorkspace(workspace._id, user._id, { candidateCount: 10 });
    expect(result).toEqual({ jobs: 5, candidates: 10 });
  });

  it("notes and activity are attributed to the actor with actorName 'Demo Recruiter'", async () => {
    const { workspace, user } = await makeWorkspaceAndActor();
    await seedWorkspace(workspace._id, user._id);

    const candidates = await CandidateModel.find({ workspaceId: workspace._id }).exec();
    const withNotes = candidates.filter((c) => c.notes.length > 0);
    expect(withNotes.length).toBeGreaterThan(0);
    for (const c of withNotes) {
      for (const note of c.notes) {
        expect(note.authorId.toString()).toBe(user._id.toString());
        expect(note.authorName).toBe("Demo Recruiter");
      }
    }
    for (const c of candidates) {
      expect(c.activity.length).toBeGreaterThan(0);
      for (const a of c.activity) {
        expect(a.actorId.toString()).toBe(user._id.toString());
        expect(a.actorName).toBe("Demo Recruiter");
      }
    }
  });
});
