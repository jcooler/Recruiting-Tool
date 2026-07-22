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
    const { resetDbCache } = await import("@/lib/db");
    resetDbCache();
    const { dbConnect } = await import("@/lib/db");
    await dbConnect();
  });

  afterEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    const { resetDbCache } = await import("@/lib/db");
    resetDbCache();
    await mongod.stop();
    vi.unstubAllEnvs();
  });
}
