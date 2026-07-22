import { describe, expect, it } from "vitest";
import { buildCandidateQuery } from "@/hooks/queries";

describe("buildCandidateQuery", () => {
  it("returns an empty string when no filters are set", () => {
    expect(buildCandidateQuery({})).toBe("");
  });

  it("omits undefined values", () => {
    expect(buildCandidateQuery({ jobId: undefined, search: undefined })).toBe("");
  });

  it("omits empty-string values", () => {
    expect(buildCandidateQuery({ search: "", tag: "" })).toBe("");
  });

  it("includes only the filters that are set", () => {
    const qs = buildCandidateQuery({ jobId: "507f1f77bcf86cd799439011" });
    expect(qs).toBe("?jobId=507f1f77bcf86cd799439011");
  });

  it("combines multiple filters", () => {
    const qs = buildCandidateQuery({ search: "ada", stage: "screening", tag: "remote" });
    const params = new URLSearchParams(qs.slice(1));
    expect(params.get("search")).toBe("ada");
    expect(params.get("stage")).toBe("screening");
    expect(params.get("tag")).toBe("remote");
  });

  it("stringifies rejected to 'true'/'false' (matching candidateListQuerySchema)", () => {
    expect(buildCandidateQuery({ rejected: true })).toBe("?rejected=true");
    expect(buildCandidateQuery({ rejected: false })).toBe("?rejected=false");
  });

  it("URL-encodes special characters in search", () => {
    const qs = buildCandidateQuery({ search: "a b&c" });
    const params = new URLSearchParams(qs.slice(1));
    expect(params.get("search")).toBe("a b&c");
  });
});
