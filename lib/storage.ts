/**
 * Guarded localStorage access.
 *
 * Every call is wrapped because `localStorage` is not merely absent during
 * server rendering. It also *throws* on access in a Safari private window and
 * whenever a user has blocked site data. The original code hand-wrote a
 * `typeof window === "undefined"` guard plus a try/catch at each of the seven
 * call sites, and two of them swallowed the error with a bare `{}` while the
 * others logged it. Centralising it makes the behaviour uniform and means a
 * new caller cannot forget the guard.
 */

import configData from "@/data/config.json";

/** localStorage keys, from data/config.json so they are named in one place. */
export const STORAGE_KEYS = configData.storageKeys;

/** Whether storage is reachable at all. False during SSR and when blocked. */
function isAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Reads a raw string, returning null when storage is unavailable or empty. */
export function readRaw(key: string): string | null {
  if (!isAvailable()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to read "${key}" from localStorage:`, error);
    return null;
  }
}

/** Writes a raw string. Returns false if the write did not happen. */
export function writeRaw(key: string, value: string): boolean {
  if (!isAvailable()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // The common cause is QuotaExceededError: history entries embed images as
    // base64 data URLs, so a few screenshots can fill the ~5MB origin budget.
    console.error(`Failed to write "${key}" to localStorage:`, error);
    return false;
  }
}

/** Removes a key. Safe to call when the key was never set. */
export function removeRaw(key: string): void {
  if (!isAvailable()) return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove "${key}" from localStorage:`, error);
  }
}

/**
 * Reads and parses JSON, falling back when anything goes wrong.
 *
 * The `isValid` predicate is not optional decoration. Stored records outlive
 * the code that wrote them, so a value can be syntactically valid JSON and
 * still be the wrong shape: an older schema, or something another script on
 * the origin wrote. Without the check that value reaches React and renders as
 * a crash rather than a fallback.
 */
export function readJson<T>(
  key: string,
  isValid: (value: unknown) => value is T,
  fallback: T,
): T {
  const raw = readRaw(key);
  if (raw === null) return fallback;

  try {
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch (error) {
    console.error(`Failed to parse "${key}" from localStorage:`, error);
    return fallback;
  }
}

/** Serialises and writes a value. Returns false if the write did not happen. */
export function writeJson(key: string, value: unknown): boolean {
  try {
    return writeRaw(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to serialise "${key}" for localStorage:`, error);
    return false;
  }
}
