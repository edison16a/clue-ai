import { beforeEach, describe, expect, it, vi } from "vitest";

import { readJson, readRaw, removeRaw, writeJson, writeRaw } from "@/lib/storage";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

/**
 * Every call is guarded because localStorage does not merely go missing when
 * site data is blocked. It throws on access, in Safari private windows and
 * under some enterprise policies. These tests cover that, since it is the case
 * nobody reproduces by hand.
 */
describe("storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("round-trips a value", () => {
    writeRaw("k", "v");
    expect(readRaw("k")).toBe("v");
  });

  it("returns null for a key that was never set", () => {
    expect(readRaw("missing")).toBeNull();
  });

  it("returns the fallback when reads throw", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(readRaw("k")).toBeNull();
    expect(readJson("k", isStringArray, ["fallback"])).toEqual(["fallback"]);
  });

  it("reports failure rather than throwing when writes are rejected", () => {
    // The realistic cause is QuotaExceededError: history entries embed images
    // as base64, so a few screenshots fill the origin budget.
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    expect(writeRaw("k", "v")).toBe(false);
    expect(writeJson("k", ["a"])).toBe(false);
  });

  it("survives a remove that throws", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(() => removeRaw("k")).not.toThrow();
  });

  it("falls back on malformed JSON", () => {
    window.localStorage.setItem("k", "{not json");
    expect(readJson("k", isStringArray, [])).toEqual([]);
  });

  it("falls back on JSON of the wrong shape", () => {
    // Valid JSON is not the same as valid data; this is the check that a bare
    // cast skipped.
    window.localStorage.setItem("k", '{"a":1}');
    expect(readJson("k", isStringArray, [])).toEqual([]);
  });

  it("accepts JSON that passes the predicate", () => {
    window.localStorage.setItem("k", '["a","b"]');
    expect(readJson("k", isStringArray, [])).toEqual(["a", "b"]);
  });
});
