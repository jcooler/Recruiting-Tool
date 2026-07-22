import { describe, expect, it } from "vitest";
import { setupTestDb } from "../helpers/db";
import { apiReq, makeUser, routeParams, someId } from "../helpers/api";
import JobModel from "@/models/job";
import CandidateModel from "@/models/candidate";
import { GET, POST } from "@/../app/api/candidates/route";
import {
  GET as getCandidate,
  PATCH as patchCandidate,
  DELETE as deleteCandidate,
} from "@/../app/api/candidates/[candidateId]/route";

setupTestDb();
const P = routeParams();

async function createJob(workspaceId: unknown, createdBy: unknown, overrides: Record<string, unknown> = {}) {
  return JobModel.create({
    workspaceId,
    title: "Software Engineer",
    department: "Engineering",
    location: "Remote",
    employmentType: "full-time",
    createdBy,
    ...overrides,
  });
}

const candidateBody = (jobId: string, overrides: Record<string, unknown> = {}) => ({
  jobId,
  name: "Alice",
  email: "alice@x.com",
  source: "referral" as const,
  ...overrides,
});

describe("candidates routes", () => {
  it("recruiter creates a candidate (201, stageHistory seeded, activity records creation)", async () => {
    const { token, user, workspace } = await makeUser("recruiter");
    const job = await createJob(workspace._id, user._id);

    const res = await POST(
      apiReq("POST", "/api/candidates", { token, body: candidateBody(job._id.toString()) }),
      P
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Alice");
    expect(body.stageHistory).toHaveLength(1);
    expect(body.stageHistory[0].stage).toBe("applied");
    expect(body.activity).toHaveLength(1);
    expect(body.activity[0].type).toBe("created");
  });

  it("create with an unknown jobId returns 404", async () => {
    const { token } = await makeUser("recruiter");
    const res = await POST(
      apiReq("POST", "/api/candidates", { token, body: candidateBody(someId()) }),
      P
    );
    expect(res.status).toBe(404);
  });

  it("create with a jobId belonging to another workspace returns 404", async () => {
    const { token } = await makeUser("recruiter");
    const other = await makeUser("recruiter");
    const otherJob = await createJob(other.workspace._id, other.user._id);

    const res = await POST(
      apiReq("POST", "/api/candidates", { token, body: candidateBody(otherJob._id.toString()) }),
      P
    );
    expect(res.status).toBe(404);
  });

  it("list defaults to excluding rejected candidates", async () => {
    const { token, user, workspace } = await makeUser("recruiter");
    const job = await createJob(workspace._id, user._id);
    const active = await CandidateModel.create({
      workspaceId: workspace._id, jobId: job._id, name: "Active Andy", email: "andy@x.com",
      avatarSeed: "andy", source: "referral", stage: "applied", createdBy: user._id,
    });
    const rejected = await CandidateModel.create({
      workspaceId: workspace._id, jobId: job._id, name: "Rejected Rita", email: "rita@x.com",
      avatarSeed: "rita", source: "referral", stage: "applied", createdBy: user._id, rejected: true,
    });

    const res = await GET(apiReq("GET", "/api/candidates", { token }), P);
    expect(res.status).toBe(200);
    const candidates = await res.json();
    const ids = candidates.map((c: { id: string }) => c.id);
    expect(ids).toContain(active._id.toString());
    // Rita is rejected, so the default (no ?rejected= query) listing must not surface her.
    expect(ids).not.toContain(rejected._id.toString());
  });

  it("?search= matches candidate name case-insensitively", async () => {
    const { token, user, workspace } = await makeUser("recruiter");
    const job = await createJob(workspace._id, user._id);
    const alice = await CandidateModel.create({
      workspaceId: workspace._id, jobId: job._id, name: "Alice", email: "alice@x.com",
      avatarSeed: "alice", source: "referral", stage: "applied", createdBy: user._id,
    });
    const bob = await CandidateModel.create({
      workspaceId: workspace._id, jobId: job._id, name: "Bob", email: "bob@x.com",
      avatarSeed: "bob", source: "referral", stage: "applied", createdBy: user._id,
    });

    const res = await GET(apiReq("GET", "/api/candidates?search=ali", { token }), P);
    expect(res.status).toBe(200);
    const candidates = await res.json();
    const ids = candidates.map((c: { id: string }) => c.id);
    expect(ids).toContain(alice._id.toString());
    expect(ids).not.toContain(bob._id.toString());
  });

  it("?search= escapes regex metacharacters so it matches literally, not as a pattern", async () => {
    const { token, user, workspace } = await makeUser("recruiter");
    const job = await createJob(workspace._id, user._id);
    const literal = await CandidateModel.create({
      workspaceId: workspace._id, jobId: job._id, name: "a.*b", email: "literal@x.com",
      avatarSeed: "literal", source: "referral", stage: "applied", createdBy: user._id,
    });
    const wouldMatchIfUnescaped = await CandidateModel.create({
      workspaceId: workspace._id, jobId: job._id, name: "aXb", email: "axb@x.com",
      avatarSeed: "axb", source: "referral", stage: "applied", createdBy: user._id,
    });

    const res = await GET(
      apiReq("GET", `/api/candidates?search=${encodeURIComponent("a.*b")}`, { token }),
      P
    );
    expect(res.status).toBe(200);
    const candidates = await res.json();
    const ids = candidates.map((c: { id: string }) => c.id);
    expect(ids).toContain(literal._id.toString());
    // If "." and "*" were left as live regex metacharacters, "a.*b" would also match "aXb".
    expect(ids).not.toContain(wouldMatchIfUnescaped._id.toString());
  });

  it("?jobId= filters candidates to that job only", async () => {
    const { token, user, workspace } = await makeUser("recruiter");
    const jobA = await createJob(workspace._id, user._id, { title: "Job A" });
    const jobB = await createJob(workspace._id, user._id, { title: "Job B" });
    const inA = await CandidateModel.create({
      workspaceId: workspace._id, jobId: jobA._id, name: "In A", email: "ina@x.com",
      avatarSeed: "ina", source: "referral", stage: "applied", createdBy: user._id,
    });
    const inB = await CandidateModel.create({
      workspaceId: workspace._id, jobId: jobB._id, name: "In B", email: "inb@x.com",
      avatarSeed: "inb", source: "referral", stage: "applied", createdBy: user._id,
    });

    const res = await GET(apiReq("GET", `/api/candidates?jobId=${jobA._id.toString()}`, { token }), P);
    expect(res.status).toBe(200);
    const candidates = await res.json();
    const ids = candidates.map((c: { id: string }) => c.id);
    expect(ids).toContain(inA._id.toString());
    expect(ids).not.toContain(inB._id.toString());
  });

  it("?stage= filters candidates to that stage only", async () => {
    const { token, user, workspace } = await makeUser("recruiter");
    const job = await createJob(workspace._id, user._id);
    const applied = await CandidateModel.create({
      workspaceId: workspace._id, jobId: job._id, name: "Applied Amy", email: "amy@x.com",
      avatarSeed: "amy", source: "referral", stage: "applied", createdBy: user._id,
    });
    const offer = await CandidateModel.create({
      workspaceId: workspace._id, jobId: job._id, name: "Offer Omar", email: "omar@x.com",
      avatarSeed: "omar", source: "referral", stage: "offer", createdBy: user._id,
    });

    const res = await GET(apiReq("GET", "/api/candidates?stage=offer", { token }), P);
    expect(res.status).toBe(200);
    const candidates = await res.json();
    const ids = candidates.map((c: { id: string }) => c.id);
    expect(ids).toContain(offer._id.toString());
    expect(ids).not.toContain(applied._id.toString());
  });

  it("interviewer POST is forbidden (403)", async () => {
    const { token, user, workspace } = await makeUser("interviewer");
    const job = await createJob(workspace._id, user._id);
    const res = await POST(
      apiReq("POST", "/api/candidates", { token, body: candidateBody(job._id.toString()) }),
      P
    );
    expect(res.status).toBe(403);
  });

  it("PATCH updates phone and appends an 'updated' activity entry", async () => {
    const { token, user, workspace } = await makeUser("recruiter");
    const job = await createJob(workspace._id, user._id);
    const createRes = await POST(
      apiReq("POST", "/api/candidates", { token, body: candidateBody(job._id.toString()) }),
      P
    );
    const candidate = await createRes.json();

    const res = await patchCandidate(
      apiReq("PATCH", `/api/candidates/${candidate.id}`, { token, body: { phone: "555-1234" } }),
      routeParams({ candidateId: candidate.id })
    );
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.phone).toBe("555-1234");
    expect(updated.activity).toHaveLength(2);
    expect(updated.activity[1].type).toBe("updated");
  });

  it("GET by id from another workspace's user returns 404", async () => {
    const { token: ownerToken, user, workspace } = await makeUser("recruiter");
    const job = await createJob(workspace._id, user._id);
    const createRes = await POST(
      apiReq("POST", "/api/candidates", { token: ownerToken, body: candidateBody(job._id.toString()) }),
      P
    );
    const candidate = await createRes.json();

    const { token: otherToken } = await makeUser("interviewer");
    const res = await getCandidate(
      apiReq("GET", `/api/candidates/${candidate.id}`, { token: otherToken }),
      routeParams({ candidateId: candidate.id })
    );
    expect(res.status).toBe(404);
  });

  it("DELETE removes the candidate (204), subsequent GET returns 404", async () => {
    const { token, user, workspace } = await makeUser("recruiter");
    const job = await createJob(workspace._id, user._id);
    const createRes = await POST(
      apiReq("POST", "/api/candidates", { token, body: candidateBody(job._id.toString()) }),
      P
    );
    const candidate = await createRes.json();

    const delRes = await deleteCandidate(
      apiReq("DELETE", `/api/candidates/${candidate.id}`, { token }),
      routeParams({ candidateId: candidate.id })
    );
    expect(delRes.status).toBe(204);

    const getRes = await getCandidate(
      apiReq("GET", `/api/candidates/${candidate.id}`, { token }),
      routeParams({ candidateId: candidate.id })
    );
    expect(getRes.status).toBe(404);
  });
});
