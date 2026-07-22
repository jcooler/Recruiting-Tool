import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { Types } from "mongoose";
import CandidateModel from "@/models/candidate";
import JobModel from "@/models/job";
import SessionModel from "@/models/session";
import UserModel from "@/models/user";
import WorkspaceModel from "@/models/workspace";
import { createSession } from "./session";
import { seedWorkspace } from "./seed";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 1) Finds demo workspaces past their expiresAt, deletes every child document
 *    (Jobs/Candidates/Users by workspaceId, Sessions by userId), then deletes
 *    the workspaces themselves.
 * 2) Orphan pass: Workspace also carries its own TTL index on expiresAt, so
 *    Mongo's background TTL monitor can delete an expired workspace document
 *    on its own schedule without going through step 1 at all. This second
 *    pass catches that case by diffing distinct workspaceIds on Jobs /
 *    Candidates / Users against the surviving Workspace id set and deleting
 *    anything left pointing at a workspace that no longer exists.
 */
export async function sweepExpiredDemos(): Promise<void> {
  const now = new Date();
  const expired = await WorkspaceModel.find({ isDemo: true, expiresAt: { $lt: now } })
    .select("_id")
    .exec();

  if (expired.length) {
    const workspaceIds = expired.map((w) => w._id);
    const users = await UserModel.find({ workspaceId: { $in: workspaceIds } }).select("_id").exec();
    const userIds = users.map((u) => u._id);

    await Promise.all([
      JobModel.deleteMany({ workspaceId: { $in: workspaceIds } }),
      CandidateModel.deleteMany({ workspaceId: { $in: workspaceIds } }),
      UserModel.deleteMany({ workspaceId: { $in: workspaceIds } }),
      SessionModel.deleteMany({ userId: { $in: userIds } }),
    ]);
    await WorkspaceModel.deleteMany({ _id: { $in: workspaceIds } });
  }

  const survivingIds = new Set(
    (await WorkspaceModel.find().select("_id").exec()).map((w) => w._id.toString())
  );
  const orphansOf = (ids: Types.ObjectId[]) => ids.filter((id) => !survivingIds.has(id.toString()));

  const [jobWsIds, candidateWsIds, userWsIds] = await Promise.all([
    JobModel.distinct("workspaceId"),
    CandidateModel.distinct("workspaceId"),
    UserModel.distinct("workspaceId"),
  ]);

  const orphanJobIds = orphansOf(jobWsIds);
  const orphanCandidateIds = orphansOf(candidateWsIds);
  const orphanUserIds = orphansOf(userWsIds);

  await Promise.all([
    orphanJobIds.length ? JobModel.deleteMany({ workspaceId: { $in: orphanJobIds } }) : Promise.resolve(),
    orphanCandidateIds.length
      ? CandidateModel.deleteMany({ workspaceId: { $in: orphanCandidateIds } })
      : Promise.resolve(),
    orphanUserIds.length ? UserModel.deleteMany({ workspaceId: { $in: orphanUserIds } }) : Promise.resolve(),
  ]);
}

export async function startDemo(): Promise<{ token: string; expiresAt: Date }> {
  await sweepExpiredDemos();

  const expiresAt = new Date(Date.now() + DAY_MS);
  const workspace = await WorkspaceModel.create({ name: "Demo Workspace", isDemo: true, expiresAt });

  const username = `demo-${randomBytes(4).toString("hex")}`;
  const email = `${username}@demo.local`;
  const password = randomBytes(16).toString("hex");
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({
    username,
    email,
    passwordHash,
    workspaceId: workspace._id,
    role: "admin",
  });

  await seedWorkspace(workspace._id, user._id);

  const session = await createSession(user._id.toString(), { absoluteMs: DAY_MS });
  return { token: session.token, expiresAt: session.expiresAt };
}
