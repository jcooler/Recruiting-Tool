import { describe, expect, it, vi } from "vitest";
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

  it("survives a module registry reset (hot-reload) via globalThis cache", async () => {
    const { dbConnect } = await import("@/lib/db");
    const first = await dbConnect();
    vi.resetModules();
    const fresh = await import("@/lib/db");
    const second = await fresh.dbConnect();
    expect(second).toBe(first);
  });
});
