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
