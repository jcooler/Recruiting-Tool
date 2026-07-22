import { describe, expect, it } from "vitest";
import { applyStageMove } from "@/hooks/queries";
import type { CandidateDto } from "@/lib/dto";

function makeCandidate(overrides: Partial<CandidateDto> = {}): CandidateDto {
  return {
    id: "c1",
    jobId: "j1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    source: "referral",
    stage: "applied",
    rejected: false,
    tags: [],
    skills: [],
    experience: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as CandidateDto;
}

describe("applyStageMove", () => {
  it("patches the matching candidate in an array-shaped cache (candidate list)", () => {
    const list = [makeCandidate({ id: "c1", stage: "applied" }), makeCandidate({ id: "c2", stage: "screening" })];

    const result = applyStageMove(list, "c1", { stage: "screening" }) as CandidateDto[];

    expect(result).not.toBe(list); // new array returned
    expect(result[0]).toMatchObject({ id: "c1", stage: "screening", rejected: false });
    expect(result[1]).toMatchObject({ id: "c2", stage: "screening" }); // untouched
  });

  it("sets rejected without touching stage when patch.stage is undefined", () => {
    const list = [makeCandidate({ id: "c1", stage: "applied", rejected: false })];

    const result = applyStageMove(list, "c1", { rejected: true }) as CandidateDto[];

    expect(result[0]).toMatchObject({ id: "c1", stage: "applied", rejected: true });
  });

  it("leaves a non-array (candidate-detail) cache entry untouched instead of throwing", () => {
    // This is the exact shape TanStack Query's prefix matching hands us for the
    // ["candidates", "detail", id] cache entry when setQueriesData is scoped to
    // ["candidates"]: a single CandidateDto object, not an array.
    const detail = makeCandidate({ id: "c1", stage: "applied" });

    expect(() => applyStageMove(detail, "c1", { stage: "screening" })).not.toThrow();
    expect(applyStageMove(detail, "c1", { stage: "screening" })).toBe(detail);
  });

  it("returns undefined unchanged (cache miss)", () => {
    expect(applyStageMove(undefined, "c1", { stage: "screening" })).toBeUndefined();
  });

  it("leaves non-matching candidates in the array unchanged", () => {
    const other = makeCandidate({ id: "c2", stage: "offer" });
    const list = [other];

    const result = applyStageMove(list, "c1", { stage: "screening" }) as CandidateDto[];

    expect(result[0]).toBe(other);
  });
});
