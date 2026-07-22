import { describe, expect, it } from "vitest";
import { setupTestDb } from "../helpers/db";
import { apiReq, makeUser, routeParams } from "../helpers/api";
import JobModel from "@/models/job";
import CandidateModel from "@/models/candidate";
import { PATCH as moveStage } from "@/../app/api/candidates/[candidateId]/stage/route";
import { POST as addNote } from "@/../app/api/candidates/[candidateId]/notes/route";
import { PATCH as setRating } from "@/../app/api/candidates/[candidateId]/rating/route";

setupTestDb();

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

async function createCandidate(
  workspaceId: unknown,
  jobId: unknown,
  createdBy: unknown,
  overrides: Record<string, unknown> = {}
) {
  return CandidateModel.create({
    workspaceId,
    jobId,
    name: "Alice",
    email: "alice@x.com",
    avatarSeed: "alice",
    source: "referral",
    stage: "applied",
    createdBy,
    stageHistory: [{ stage: "applied", enteredAt: new Date() }],
    ...overrides,
  });
}

describe("candidate action routes", () => {
  describe("PATCH .../stage", () => {
    it("recruiter moves applied -> screening (stage updated, stageHistory length 2, activity records stage-moved)", async () => {
      const { token, user, workspace } = await makeUser("recruiter");
      const job = await createJob(workspace._id, user._id);
      const candidate = await createCandidate(workspace._id, job._id, user._id);

      const res = await moveStage(
        apiReq("PATCH", `/api/candidates/${candidate._id}/stage`, { token, body: { stage: "screening" } }),
        routeParams({ candidateId: candidate._id.toString() })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.stage).toBe("screening");
      expect(body.stageHistory).toHaveLength(2);
      expect(body.activity).toHaveLength(1);
      expect(body.activity[0].type).toBe("stage-moved");
      expect(body.activity[0].meta).toBe("applied → screening");
    });

    it("same-stage move is a no-op: 200 but stageHistory length is unchanged", async () => {
      const { token, user, workspace } = await makeUser("recruiter");
      const job = await createJob(workspace._id, user._id);
      const candidate = await createCandidate(workspace._id, job._id, user._id);

      const res = await moveStage(
        apiReq("PATCH", `/api/candidates/${candidate._id}/stage`, { token, body: { stage: "applied" } }),
        routeParams({ candidateId: candidate._id.toString() })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.stage).toBe("applied");
      expect(body.stageHistory).toHaveLength(1);
      expect(body.activity).toHaveLength(0);
    });

    it("interviewer stage move is forbidden (403)", async () => {
      const { token, user, workspace } = await makeUser("interviewer");
      const job = await createJob(workspace._id, user._id);
      const candidate = await createCandidate(workspace._id, job._id, user._id);

      const res = await moveStage(
        apiReq("PATCH", `/api/candidates/${candidate._id}/stage`, { token, body: { stage: "screening" } }),
        routeParams({ candidateId: candidate._id.toString() })
      );
      expect(res.status).toBe(403);
    });

    it("reject then restore round-trip: flag flips and activity metas are 'rejected' then 'restored'", async () => {
      const { token, user, workspace } = await makeUser("recruiter");
      const job = await createJob(workspace._id, user._id);
      const candidate = await createCandidate(workspace._id, job._id, user._id);

      const rejectRes = await moveStage(
        apiReq("PATCH", `/api/candidates/${candidate._id}/stage`, { token, body: { rejected: true } }),
        routeParams({ candidateId: candidate._id.toString() })
      );
      expect(rejectRes.status).toBe(200);
      const rejectedBody = await rejectRes.json();
      expect(rejectedBody.rejected).toBe(true);
      expect(rejectedBody.activity).toHaveLength(1);
      expect(rejectedBody.activity[0].meta).toBe("rejected");

      const restoreRes = await moveStage(
        apiReq("PATCH", `/api/candidates/${candidate._id}/stage`, { token, body: { rejected: false } }),
        routeParams({ candidateId: candidate._id.toString() })
      );
      expect(restoreRes.status).toBe(200);
      const restoredBody = await restoreRes.json();
      expect(restoredBody.rejected).toBe(false);
      expect(restoredBody.activity).toHaveLength(2);
      expect(restoredBody.activity[1].meta).toBe("restored");
    });

    it("body {} returns 400", async () => {
      const { token, user, workspace } = await makeUser("recruiter");
      const job = await createJob(workspace._id, user._id);
      const candidate = await createCandidate(workspace._id, job._id, user._id);

      const res = await moveStage(
        apiReq("PATCH", `/api/candidates/${candidate._id}/stage`, { token, body: {} }),
        routeParams({ candidateId: candidate._id.toString() })
      );
      expect(res.status).toBe(400);
    });

    it("body { stage: 'offer', rejected: true } (both provided) returns 400", async () => {
      const { token, user, workspace } = await makeUser("recruiter");
      const job = await createJob(workspace._id, user._id);
      const candidate = await createCandidate(workspace._id, job._id, user._id);

      const res = await moveStage(
        apiReq("PATCH", `/api/candidates/${candidate._id}/stage`, {
          token,
          body: { stage: "offer", rejected: true },
        }),
        routeParams({ candidateId: candidate._id.toString() })
      );
      expect(res.status).toBe(400);
    });
  });

  describe("POST .../notes", () => {
    it("interviewer adds a note (201, authorName set, activity records note-added)", async () => {
      const { token, user, workspace } = await makeUser("interviewer");
      const job = await createJob(workspace._id, user._id);
      const candidate = await createCandidate(workspace._id, job._id, user._id);

      const res = await addNote(
        apiReq("POST", `/api/candidates/${candidate._id}/notes`, { token, body: { body: "Strong candidate" } }),
        routeParams({ candidateId: candidate._id.toString() })
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.notes).toHaveLength(1);
      expect(body.notes[0].authorName).toBe(user.username);
      expect(body.notes[0].body).toBe("Strong candidate");
      expect(body.activity).toHaveLength(1);
      expect(body.activity[0].type).toBe("note-added");
    });
  });

  describe("PATCH .../rating", () => {
    it("interviewer sets rating 4 (200, activity meta '0 → 4')", async () => {
      const { token, user, workspace } = await makeUser("interviewer");
      const job = await createJob(workspace._id, user._id);
      const candidate = await createCandidate(workspace._id, job._id, user._id);

      const res = await setRating(
        apiReq("PATCH", `/api/candidates/${candidate._id}/rating`, { token, body: { rating: 4 } }),
        routeParams({ candidateId: candidate._id.toString() })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.rating).toBe(4);
      expect(body.activity).toHaveLength(1);
      expect(body.activity[0].type).toBe("rating-changed");
      expect(body.activity[0].meta).toBe("0 → 4");
    });
  });
});
