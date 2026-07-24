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
