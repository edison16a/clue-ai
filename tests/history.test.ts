import { describe, expect, it } from "vitest";

import { HISTORY_LIMIT, createHistoryItem, isHistoryArray, withNewEntry } from "@/lib/history";
import type { HistoryItem } from "@/lib/types";

const draft = {
  mode: "cs" as const,
  ask: "why is this null",
  code: "x.foo()",
  images: [{ name: "shot.png", src: "data:image/png;base64,AAA" }],
  aiText: "trace where x is assigned",
};

function item(id: number): HistoryItem {
  return {
    id,
    timestamp: "t",
    mode: "cs",
    ask: `q${id}`,
    code: "",
    images: [],
    aiText: "",
  };
}

describe("createHistoryItem", () => {
  it("stamps the record from the injected clock", () => {
    // Injectable so tests assert rather than race the clock.
    const at = new Date("2025-06-01T12:00:00Z");
    expect(createHistoryItem(draft, at).id).toBe(at.getTime());
  });

  it("copies images rather than referencing them", () => {
    // Later edits to the live attachment list must not reach backwards and
    // mutate an entry the student already saved.
    const images = [{ name: "a.png", src: "data:a" }];
    const saved = createHistoryItem({ ...draft, images });
    images[0].name = "renamed.png";
    expect(saved.images[0].name).toBe("a.png");
  });

  it("carries the submission through unchanged", () => {
    const saved = createHistoryItem(draft);
    expect(saved).toMatchObject({ mode: "cs", ask: draft.ask, code: draft.code });
  });
});

describe("withNewEntry", () => {
  it("puts the newest entry first", () => {
    const result = withNewEntry([item(1)], item(2));
    expect(result.map((e) => e.id)).toEqual([2, 1]);
  });

  it("caps the list at the configured limit", () => {
    const full = Array.from({ length: HISTORY_LIMIT }, (_, i) => item(i));
    const result = withNewEntry(full, item(999));
    expect(result).toHaveLength(HISTORY_LIMIT);
    expect(result[0].id).toBe(999);
  });

  it("drops the oldest entry, not the newest", () => {
    const full = Array.from({ length: HISTORY_LIMIT }, (_, i) => item(i));
    const oldest = full[full.length - 1].id;
    const result = withNewEntry(full, item(999));
    expect(result.map((e) => e.id)).not.toContain(oldest);
  });

  it("does not mutate the array it was given", () => {
    const original = [item(1)];
    withNewEntry(original, item(2));
    expect(original).toHaveLength(1);
  });
});

describe("isHistoryArray", () => {
  it("accepts a well-formed array", () => {
    expect(isHistoryArray([item(1), item(2)])).toBe(true);
    expect(isHistoryArray([])).toBe(true);
  });

  it("rejects values that are not arrays", () => {
    // A string has a truthy `.length`, which is how one used to get as far as
    // `item.images.map` and white-screen the page.
    expect(isHistoryArray("hello")).toBe(false);
    expect(isHistoryArray(42)).toBe(false);
    expect(isHistoryArray(null)).toBe(false);
    expect(isHistoryArray(undefined)).toBe(false);
    expect(isHistoryArray({ id: 1 })).toBe(false);
  });

  it("rejects entries with fields of the wrong type", () => {
    expect(isHistoryArray([{ ...item(1), id: "1" }])).toBe(false);
    expect(isHistoryArray([{ ...item(1), images: "none" }])).toBe(false);
  });

  it("rejects entries missing a field the renderer reads", () => {
    const { images: _dropped, ...withoutImages } = item(1);
    expect(isHistoryArray([withoutImages])).toBe(false);
  });

  it("rejects an array containing a null", () => {
    expect(isHistoryArray([item(1), null])).toBe(false);
  });
});
