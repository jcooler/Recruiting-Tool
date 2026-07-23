import { describe, expect, it } from "vitest";
import { describeActivity } from "@/components/candidate/activity-text";

describe("describeActivity", () => {
  it("renders a stage move with the from → to detail", () => {
    expect(describeActivity("stage-moved", "applied → screening")).toEqual({
      verb: "moved",
      detail: "applied → screening",
    });
  });

  it("renders rejected/restored without a redundant detail clause", () => {
    expect(describeActivity("stage-moved", "rejected")).toEqual({ verb: "rejected this candidate" });
    expect(describeActivity("stage-moved", "restored")).toEqual({ verb: "restored this candidate" });
  });

  it("renders a rating change with the from → to detail", () => {
    expect(describeActivity("rating-changed", "0 → 3")).toEqual({ verb: "rated", detail: "0 → 3" });
  });

  it("renders profile creation with which job it was added to", () => {
    expect(describeActivity("created", "added to Backend Engineer")).toEqual({
      verb: "created this profile",
      detail: "added to Backend Engineer",
    });
  });

  it("drops meta for note/resume/updated entries since it only restates the verb", () => {
    expect(describeActivity("note-added", "")).toEqual({ verb: "added a note" });
    expect(describeActivity("resume-parsed", "resume text attached")).toEqual({ verb: "attached a resume" });
    expect(describeActivity("updated", "profile updated")).toEqual({ verb: "updated the profile" });
  });

  it("falls back to a generic verb for an unrecognized type", () => {
    expect(describeActivity("something-else", "whatever")).toEqual({ verb: "updated the profile" });
  });
});
