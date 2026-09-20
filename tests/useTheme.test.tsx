import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTheme } from "@/lib/hooks/useTheme";
import { STORAGE_KEYS } from "@/lib/storage";

describe("useTheme", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = "";
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("starts on the configured default", async () => {
    const { result } = renderHook(() => useTheme());
    await waitFor(() => expect(result.current.theme).toBe("dark"));
  });

  it("restores a stored preference", async () => {
    window.localStorage.setItem(STORAGE_KEYS.theme, "light");
    const { result } = renderHook(() => useTheme());
    await waitFor(() => expect(result.current.theme).toBe("light"));
  });

  it("ignores a stored value that is not a theme", async () => {
    window.localStorage.setItem(STORAGE_KEYS.theme, "solarized");
    const { result } = renderHook(() => useTheme());
    await waitFor(() => expect(result.current.theme).toBe("dark"));
  });

  it("puts exactly one theme class on <html>", async () => {
    // Both classes are toggled rather than one being set: an element carrying
    // neither falls through to the OS prefers-color-scheme rules instead.
    const { result } = renderHook(() => useTheme());
    await waitFor(() => {
      expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
      expect(document.documentElement.classList.contains("theme-light")).toBe(false);
    });

    act(() => result.current.toggleTheme());

    await waitFor(() => {
      expect(document.documentElement.classList.contains("theme-light")).toBe(true);
      expect(document.documentElement.classList.contains("theme-dark")).toBe(false);
    });
  });

  it("persists the theme when toggled", async () => {
    const { result } = renderHook(() => useTheme());
    await waitFor(() => expect(result.current.theme).toBe("dark"));

    act(() => result.current.toggleTheme());
    await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBe("light"));

    act(() => result.current.toggleTheme());
    await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBe("dark"));
  });

  it("still applies a theme when storage is blocked", async () => {
    // Safari private windows throw on localStorage access; the theme must
    // still render rather than the page failing.
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    const { result } = renderHook(() => useTheme());
    await waitFor(() => {
      expect(result.current.theme).toBe("dark");
      expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
    });
  });
});
