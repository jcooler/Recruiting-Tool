import { describe, expect, it } from "vitest";
import { STAGES, ROLES, roleRank, SOURCES } from "@/lib/types";

describe("domain constants", () => {
  it("defines the five pipeline stages in order", () => {
    expect(STAGES).toEqual(["applied", "screening", "interview", "offer", "hired"]);
  });
  it("ranks roles admin > recruiter > interviewer", () => {
    expect(roleRank.admin).toBeGreaterThan(roleRank.recruiter);
    expect(roleRank.recruiter).toBeGreaterThan(roleRank.interviewer);
  });
  it("defines candidate sources", () => {
    expect(SOURCES).toContain("referral");
    expect(ROLES).toEqual(["admin", "recruiter", "interviewer"]);
  });
});
