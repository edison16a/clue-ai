"use client";

import { useCallback, useEffect, useState } from "react";
import configData from "@/data/config.json";
import { STORAGE_KEYS, readRaw, writeRaw } from "@/lib/storage";
import type { ThemeMode } from "@/lib/types";

const DEFAULT_THEME = configData.defaults.theme as ThemeMode;

/** Narrows a stored value; anything else falls back to the configured default. */
function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

/**
 * Owns the dark/light theme: the stored preference, and the class on `<html>`
 * that the stylesheet's `:root.theme-*` blocks key off.
 *
 * Reading the preference in an effect rather than during render is deliberate
 * and unavoidable here: the page is statically prerendered, so there is no
 * request-time opportunity to read localStorage, and touching it during render
 * would make the server and client markup disagree. The cost is a brief flash
 * of the default theme on first paint, which `suppressHydrationWarning` on
 * `<html>` keeps from becoming a console error. Eliminating the flash needs a
 * blocking inline script in `<head>`, which is a design change rather than a
 * refactor, so the existing behaviour is preserved.
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(DEFAULT_THEME);

  // Restore the stored preference once, after mount.
  useEffect(() => {
    const stored = readRaw(STORAGE_KEYS.theme);
    setTheme(isThemeMode(stored) ? stored : DEFAULT_THEME);
  }, []);

  // Reflect the theme onto <html> and persist it.
  useEffect(() => {
    if (typeof document === "undefined") return;

    // Both classes are toggled rather than one being set, because the
    // stylesheet defines a block for each and an element carrying neither
    // falls through to the OS `prefers-color-scheme` rules instead.
    const root = document.documentElement;
    root.classList.toggle("theme-light", theme === "light");
    root.classList.toggle("theme-dark", theme === "dark");

    writeRaw(STORAGE_KEYS.theme, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((previous) => (previous === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme } as const;
}
