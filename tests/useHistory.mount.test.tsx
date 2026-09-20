import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useHistory } from "@/lib/hooks/useHistory";
import { STORAGE_KEYS } from "@/lib/storage";
import type { HistoryItem } from "@/lib/types";

function entry(id: number): HistoryItem {
  return {
    id,
    timestamp: "1/1/2025, 12:00:00 PM",
    mode: "cs",
    ask: `question ${id}`,
    code: "int x = 1",
    images: [],
    aiText: "check the loop bound",
  };
}

describe("useHistory — mount ordering", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  /**
   * The regression this hook was gated to prevent: the persist effect firing
   * on mount against the initial empty array and overwriting the stored
   * entries before the restore effect's state had been applied.
   *
   * Asserted by watching every write, not just the final value — the old
   * behaviour converged to the right answer a render later, so only the
   * sequence of writes distinguishes it.
   */
  it("never writes an empty array over stored entries during mount", async () => {
    const stored = [entry(2), entry(1)];
    window.localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(stored));

    const writes: string[] = [];
    const setItem = window.localStorage.setItem.bind(window.localStorage);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
      if (key === STORAGE_KEYS.history) writes.push(value);
      setItem(key, value);
    });

    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.history).toHaveLength(2));

    expect(writes).not.toContain("[]");
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.history)!)).toEqual(stored);
  });

  /** The same hazard on the preference key: the default clobbering a stored opt-out. */
  it("does not overwrite a stored 'off' preference with the default", async () => {
    window.localStorage.setItem(STORAGE_KEYS.saveHistory, "off");

    const writes: string[] = [];
    const setItem = window.localStorage.setItem.bind(window.localStorage);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
      if (key === STORAGE_KEYS.saveHistory) writes.push(value);
      setItem(key, value);
    });

    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.saveHistory).toBe(false));

    expect(writes).not.toContain("on");
    expect(window.localStorage.getItem(STORAGE_KEYS.saveHistory)).toBe("off");
  });

  it("still persists entries recorded after mount", async () => {
    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.saveHistory).toBe(true));

    act(() => {
      result.current.recordInteraction({
        mode: "cs",
        ask: "why is this null",
        code: "x.foo()",
        images: [],
        aiText: "trace where x is assigned",
      });
    });

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.history) ?? "[]");
      expect(saved).toHaveLength(1);
      expect(saved[0].ask).toBe("why is this null");
    });
  });

  it("purges stored entries when saving is switched off", async () => {
    window.localStorage.setItem(STORAGE_KEYS.history, JSON.stringify([entry(1)]));
    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.history).toHaveLength(1));

    act(() => result.current.toggleSaveHistory());

    await waitFor(() => {
      expect(result.current.history).toEqual([]);
      expect(window.localStorage.getItem(STORAGE_KEYS.history)).toBeNull();
      expect(window.localStorage.getItem(STORAGE_KEYS.saveHistory)).toBe("off");
    });
  });
});
