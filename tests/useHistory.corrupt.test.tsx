import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useHistory } from "@/lib/hooks/useHistory";
import { STORAGE_KEYS } from "@/lib/storage";

/**
 * Stored records outlive the code that wrote them. These cover the values a
 * real origin can end up holding (a truncated write, an older schema, another
 * script on the same origin), each of which used to reach React unchecked.
 */
describe("useHistory: malformed stored data", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  const MALFORMED: Array<[string, string]> = [
    ["a bare string", '"hello"'],
    ["a number", "42"],
    ["an object rather than an array", '{"id":1}'],
    ["null", "null"],
    ["truncated JSON", '[{"id":1,"ask":'],
    ["an array of the wrong shape", '[{"id":"not-a-number"}]'],
    ["an entry missing its images array", '[{"id":1,"timestamp":"t","mode":"cs","ask":"a","code":"c","aiText":"x"}]'],
  ];

  it.each(MALFORMED)("falls back to empty history for %s", async (_label, stored) => {
    window.localStorage.setItem(STORAGE_KEYS.history, stored);

    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.saveHistory).toBe(true));

    // The value React receives must always be a real array. A string's
    // truthy `.length` was what previously got it as far as `images.map`.
    expect(Array.isArray(result.current.history)).toBe(true);
    expect(result.current.history).toEqual([]);
  });

  it("still restores a well-formed array", async () => {
    const valid = [
      {
        id: 1,
        timestamp: "1/1/2025, 12:00:00 PM",
        mode: "cs",
        ask: "why null",
        code: "x.foo()",
        images: [],
        aiText: "trace where x is assigned",
      },
    ];
    window.localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(valid));

    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.history).toEqual(valid));
  });
});
