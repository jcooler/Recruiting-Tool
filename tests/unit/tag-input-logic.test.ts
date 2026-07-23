import { describe, expect, it } from "vitest";
import { resolveTagCommit } from "@/components/ui/tag-input-logic";

describe("resolveTagCommit", () => {
  it("commits a trimmed, novel tag", () => {
    expect(resolveTagCommit("  Kafka  ", ["Rust"])).toEqual({ next: ["Rust", "Kafka"], tooLong: false });
  });

  it("commits nothing for an empty/whitespace-only draft, without flagging tooLong", () => {
    expect(resolveTagCommit("   ", ["Rust"])).toEqual({ next: null, tooLong: false });
  });

  it("commits nothing for an exact duplicate, without flagging tooLong", () => {
    expect(resolveTagCommit("Rust", ["Rust"])).toEqual({ next: null, tooLong: false });
  });

  it("rejects and flags tooLong when the trimmed draft exceeds maxItemLength", () => {
    const overLong = "x".repeat(41);
    expect(resolveTagCommit(overLong, [], 40)).toEqual({ next: null, tooLong: true });
  });

  it("accepts a draft exactly at maxItemLength (boundary, not off-by-one)", () => {
    const exact = "x".repeat(40);
    expect(resolveTagCommit(exact, [], 40)).toEqual({ next: [exact], tooLong: false });
  });

  it("measures the trimmed length against maxItemLength, not the raw draft's", () => {
    // 40 x's plus surrounding whitespace: the trimmed tag is exactly at the
    // limit and must be accepted, not rejected for the untrimmed length.
    const padded = `  ${"x".repeat(40)}  `;
    expect(resolveTagCommit(padded, [], 40)).toEqual({ next: ["x".repeat(40)], tooLong: false });
  });

  it("never rejects for length when maxItemLength is not provided", () => {
    const long = "x".repeat(500);
    expect(resolveTagCommit(long, [])).toEqual({ next: [long], tooLong: false });
  });
});
