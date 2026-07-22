// Loaded before any other statement runs (see the module-evaluation note
// below) so MONGODB_URI is set by the time dbConnect() reads it.
process.loadEnvFile(".env.local");

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { dbConnect } from "@/lib/db";
import { seedWorkspace } from "@/lib/seed";
import WorkspaceModel from "@/models/workspace";
import UserModel from "@/models/user";
import JobModel from "@/models/job";
import CandidateModel from "@/models/candidate";

// Note: `import` declarations above are hoisted per ESM semantics (their
// modules evaluate before the `process.loadEnvFile` line above runs), but
// none of them read env vars at module-evaluation time -- only lazily, inside
// the async functions called below -- so the hoisting is harmless here.

const WORKSPACE_NAME = "Acme Talent";
const ADMIN_USERNAME = "demo";
const ADMIN_EMAIL = "demo@acmetalent.local";
const ADMIN_PASSWORD = "demo-password-123";

async function main() {
  await dbConnect();

  const existing = await WorkspaceModel.findOne({ name: WORKSPACE_NAME }).exec();
  if (existing) {
    await Promise.all([
      JobModel.deleteMany({ workspaceId: existing._id }),
      CandidateModel.deleteMany({ workspaceId: existing._id }),
      UserModel.deleteMany({ workspaceId: existing._id }),
    ]);
    await existing.deleteOne();
  }

  const workspace = await WorkspaceModel.create({ name: WORKSPACE_NAME, isDemo: false });
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await UserModel.create({
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    passwordHash,
    workspaceId: workspace._id,
    role: "admin",
  });

  const { jobs, candidates } = await seedWorkspace(workspace._id, admin._id);

  console.log(`Seeded workspace "${WORKSPACE_NAME}"`);
  console.log(`  Admin username: ${ADMIN_USERNAME}`);
  console.log(`  Admin email:    ${ADMIN_EMAIL}`);
  console.log(`  Admin password: ${ADMIN_PASSWORD}`);
  console.log(`  ${jobs} jobs, ${candidates} candidates`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
