import { describe, expect, it } from "vitest";

import subjectsData from "@/data/subjects.json";
import { DEFAULT_SUBJECT, SUBJECTS, apiLabelFor, getSubject, isSubjectId } from "@/lib/subjects";

/**
 * The registry is the single source of truth that replaced seven separate
 * descriptions of the same subjects. These tests guard the property that
 * matters: adding a subject to the JSON is sufficient, and nothing enumerates
 * subjects anywhere else.
 */
describe("subject registry", () => {
  it("exposes every subject in the data file, in order", () => {
    expect(SUBJECTS.map((s) => s.id)).toEqual(subjectsData.subjects.map((s) => s.id));
  });

  it("defaults to the subject named in config", () => {
    expect(DEFAULT_SUBJECT.id).toBe("cs");
  });

  it("recognises known ids and rejects everything else", () => {
    expect(isSubjectId("math")).toBe(true);
    expect(isSubjectId("history")).toBe(false);
    expect(isSubjectId("")).toBe(false);
    expect(isSubjectId(null)).toBe(false);
    expect(isSubjectId(42)).toBe(false);
  });

  it("falls back to the default for an unknown id", () => {
    // A misconfigured or stale id should degrade to a working app rather than
    // a blank subject; validate-data.mjs catches the misconfiguration instead.
    expect(getSubject("history")).toBe(DEFAULT_SUBJECT);
    expect(getSubject(undefined)).toBe(DEFAULT_SUBJECT);
    expect(getSubject(null)).toBe(DEFAULT_SUBJECT);
  });

  it("returns the requested subject when it exists", () => {
    expect(getSubject("english").label).toBe("English");
  });
});

describe("apiLabelFor", () => {
  it("gives the model the subject's prompt label", () => {
    expect(apiLabelFor("cs")).toBe("Computer Science");
    expect(apiLabelFor("math")).toBe("Math");
  });

  it("says 'Not specified' rather than asserting a default", () => {
    // This string reaches the model, so it is behaviour: it tells the model no
    // subject was chosen, instead of silently claiming Computer Science.
    expect(apiLabelFor(undefined)).toBe("Not specified");
    expect(apiLabelFor("")).toBe("Not specified");
    expect(apiLabelFor("history")).toBe("Not specified");
  });
});

describe("subject data integrity", () => {
  it("gives every subject the copy the UI needs", () => {
    for (const subject of SUBJECTS) {
      expect(subject.label).not.toBe("");
      expect(subject.shortLabel).not.toBe("");
      expect(subject.codeLabel).not.toBe("");
      expect(subject.codePlaceholder).not.toBe("");
      expect(subject.uploadAriaLabel).not.toBe("");
      expect(subject.icon.value).not.toBe("");
    }
  });

  it("marks exactly one subject as fully supported", () => {
    // Every beta subject carries a BETA badge; the primary one does not.
    const stable = SUBJECTS.filter((s) => s.hint === "");
    expect(stable).toHaveLength(1);
    expect(stable[0].id).toBe(DEFAULT_SUBJECT.id);
  });
});
