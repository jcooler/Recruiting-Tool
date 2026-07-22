import { describe, expect, it } from "vitest";
import { setupTestDb } from "../helpers/db";
import { apiReq, makeUser, routeParams } from "../helpers/api";
import CandidateModel from "@/models/candidate";
import { GET, POST } from "@/../app/api/jobs/route";
import { GET as getJob, PATCH as patchJob, DELETE as deleteJob } from "@/../app/api/jobs/[jobId]/route";

setupTestDb();
const P = routeParams();

const jobBody = {
  title: "Software Engineer",
  department: "Engineering",
  location: "Remote",
  employmentType: "full-time" as const,
};

describe("jobs routes", () => {
  it("recruiter creates a job (201, defaults status to open)", async () => {
    const { token } = await makeUser("recruiter");
    const res = await POST(apiReq("POST", "/api/jobs", { token, body: jobBody }), P);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("Software Engineer");
    expect(body.status).toBe("open");
  });

  it("interviewer can GET the job list but POST is forbidden (403)", async () => {
    const { token } = await makeUser("interviewer");
    const listRes = await GET(apiReq("GET", "/api/jobs", { token }), P);
    expect(listRes.status).toBe(200);
    const postRes = await POST(apiReq("POST", "/api/jobs", { token, body: jobBody }), P);
    expect(postRes.status).toBe(403);
  });

  it("list includes per-stage candidate counts, excluding rejected candidates", async () => {
    const { token, user, workspace } = await makeUser("recruiter");
    const createRes = await POST(apiReq("POST", "/api/jobs", { token, body: jobBody }), P);
    const job = await createRes.json();

    await CandidateModel.create({
      workspaceId: workspace._id, jobId: job.id, name: "Alice", email: "alice@x.com",
      avatarSeed: "alice", source: "referral", stage: "applied", createdBy: user._id,
    });
    await CandidateModel.create({
      workspaceId: workspace._id, jobId: job.id, name: "Bob", email: "bob@x.com",
      avatarSeed: "bob", source: "referral", stage: "applied", createdBy: user._id,
    });
    await CandidateModel.create({
      workspaceId: workspace._id, jobId: job.id, name: "Carol", email: "carol@x.com",
      avatarSeed: "carol", source: "referral", stage: "offer", createdBy: user._id,
    });
    await CandidateModel.create({
      workspaceId: workspace._id, jobId: job.id, name: "Erin", email: "erin@x.com",
      avatarSeed: "erin", source: "referral", stage: "offer", createdBy: user._id, rejected: true,
    });

    const listRes = await GET(apiReq("GET", "/api/jobs", { token }), P);
    expect(listRes.status).toBe(200);
    const jobs = await listRes.json();
    const found = jobs.find((j: { id: string }) => j.id === job.id);
    expect(found.counts.applied).toBe(2);
    // Erin is rejected, so the offer count must stay at 1, not 2.
    expect(found.counts.offer).toBe(1);
    expect(found.counts.screening).toBe(0);
    expect(found.counts.interview).toBe(0);
    expect(found.counts.hired).toBe(0);
  });

  it("list is sorted by createdAt desc", async () => {
    const { token } = await makeUser("recruiter");
    const resA = await POST(apiReq("POST", "/api/jobs", { token, body: { ...jobBody, title: "Job A" } }), P);
    const jobA = await resA.json();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const resB = await POST(apiReq("POST", "/api/jobs", { token, body: { ...jobBody, title: "Job B" } }), P);
    const jobB = await resB.json();

    const listRes = await GET(apiReq("GET", "/api/jobs", { token }), P);
    expect(listRes.status).toBe(200);
    const jobs = await listRes.json();
    expect(jobs.map((j: { id: string }) => j.id)).toEqual([jobB.id, jobA.id]);
  });

  it("GET by id from another workspace's user returns 404", async () => {
    const { token: ownerToken } = await makeUser("recruiter");
    const createRes = await POST(apiReq("POST", "/api/jobs", { token: ownerToken, body: jobBody }), P);
    const job = await createRes.json();

    const { token: otherToken } = await makeUser("interviewer");
    const res = await getJob(
      apiReq("GET", `/api/jobs/${job.id}`, { token: otherToken }),
      routeParams({ jobId: job.id })
    );
    expect(res.status).toBe(404);
  });

  it("PATCH updates the job title", async () => {
    const { token } = await makeUser("recruiter");
    const createRes = await POST(apiReq("POST", "/api/jobs", { token, body: jobBody }), P);
    const job = await createRes.json();

    const res = await patchJob(
      apiReq("PATCH", `/api/jobs/${job.id}`, { token, body: { title: "Staff Engineer" } }),
      routeParams({ jobId: job.id })
    );
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.title).toBe("Staff Engineer");
  });

  it("DELETE removes the job and cascades to its candidates, without touching another job's candidates", async () => {
    const { token, user, workspace } = await makeUser("recruiter");
    const createRes = await POST(apiReq("POST", "/api/jobs", { token, body: jobBody }), P);
    const job = await createRes.json();

    const otherCreateRes = await POST(
      apiReq("POST", "/api/jobs", { token, body: { ...jobBody, title: "Other Job" } }),
      P
    );
    const otherJob = await otherCreateRes.json();

    await CandidateModel.create({
      workspaceId: workspace._id, jobId: job.id, name: "Dana", email: "dana@x.com",
      avatarSeed: "dana", source: "referral", stage: "applied", createdBy: user._id,
    });
    await CandidateModel.create({
      workspaceId: workspace._id, jobId: otherJob.id, name: "Eve", email: "eve@x.com",
      avatarSeed: "eve", source: "referral", stage: "applied", createdBy: user._id,
    });

    const res = await deleteJob(
      apiReq("DELETE", `/api/jobs/${job.id}`, { token }),
      routeParams({ jobId: job.id })
    );
    expect(res.status).toBe(204);

    const remainingCandidates = await CandidateModel.countDocuments({ jobId: job.id });
    expect(remainingCandidates).toBe(0);

    // The other job (same workspace) must be untouched — proves deleteMany
    // is scoped by jobId, not just workspaceId.
    const otherJobCandidates = await CandidateModel.countDocuments({ jobId: otherJob.id });
    expect(otherJobCandidates).toBe(1);

    const getRes = await getJob(
      apiReq("GET", `/api/jobs/${job.id}`, { token }),
      routeParams({ jobId: job.id })
    );
    expect(getRes.status).toBe(404);
  });

  it("invalid ObjectId param returns 400", async () => {
    const { token } = await makeUser("recruiter");
    const res = await getJob(
      apiReq("GET", "/api/jobs/not-an-id", { token }),
      routeParams({ jobId: "not-an-id" })
    );
    expect(res.status).toBe(400);
  });
});
