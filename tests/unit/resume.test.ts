import { describe, expect, it } from "vitest";
import { extractResumeFields, KNOWN_SKILLS } from "@/lib/resume";

describe("KNOWN_SKILLS", () => {
  it("has roughly 60 unique, canonically-cased entries", () => {
    expect(KNOWN_SKILLS.length).toBeGreaterThanOrEqual(55);
    expect(KNOWN_SKILLS.length).toBeLessThanOrEqual(65);
    const lower = KNOWN_SKILLS.map((s) => s.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
    for (const required of ["JavaScript", "TypeScript", "React", "Next.js", "Node.js", "C#", "CI/CD"]) {
      expect(KNOWN_SKILLS).toContain(required);
    }
  });
});

describe("extractResumeFields", () => {
  it("extracts name, email, phone, and skills from a typical resume", () => {
    const text = [
      "Jane Doe",
      "jane@example.com",
      "+1 555 123 4567",
      "",
      "Skills: React, TypeScript, Docker",
    ].join("\n");

    const fields = extractResumeFields(text);

    expect(fields.name).toBe("Jane Doe");
    expect(fields.email).toBe("jane@example.com");
    expect(fields.phone).toBe("+1 555 123 4567");
    expect(fields.skills).toEqual(expect.arrayContaining(["React", "TypeScript", "Docker"]));
  });

  it("skips the name when the first line is a header containing digits", () => {
    const text = ["RESUME 2024", "John Smith", "john@example.com"].join("\n");

    const fields = extractResumeFields(text);

    expect(fields.name).toBeUndefined();
    expect(fields.email).toBe("john@example.com");
  });

  it("dedupes repeated skills and returns them in canonical casing", () => {
    const fields = extractResumeFields("REACT, react");

    expect(fields.skills).toEqual(["React"]);
  });

  it("returns an empty skills array when nothing recognizable is present", () => {
    const fields = extractResumeFields("Just a friendly note with no recognizable keywords at all.");

    expect(fields.skills).toEqual([]);
    expect(fields.email).toBeUndefined();
    expect(fields.phone).toBeUndefined();
  });

  it("does not match 'Java' inside 'JavaScript' (whole-word matching)", () => {
    const fields = extractResumeFields("Experienced in JavaScript development.");

    expect(fields.skills).toContain("JavaScript");
    expect(fields.skills).not.toContain("Java");
  });

  it("matches skills containing special characters standalone: C#, Next.js, CI/CD", () => {
    const fields = extractResumeFields("Stack: C#, Next.js, CI/CD pipelines.");

    expect(fields.skills).toEqual(expect.arrayContaining(["C#", "Next.js", "CI/CD"]));
  });

  it("name is undefined when the first line is too long or not name-shaped", () => {
    const text = [
      "A very long line that clearly is not a person's name at all, just filler text",
      "jane@example.com",
    ].join("\n");

    const fields = extractResumeFields(text);

    expect(fields.name).toBeUndefined();
  });
});
