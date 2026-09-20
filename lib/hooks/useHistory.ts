"use client";

import { useCallback, useEffect, useState } from "react";
import configData from "@/data/config.json";
import { STORAGE_KEYS, readJson, readRaw, removeRaw, writeJson, writeRaw } from "@/lib/storage";
import {
  createHistoryItem,
  isHistoryArray,
  withNewEntry,
  type HistoryDraft,
} from "@/lib/history";
import type { HistoryItem } from "@/lib/types";

/** The stored opt-out is a sentinel string, not JSON; only "off" disables. */
const OFF = "off";
const ON = "on";

/**
 * Owns saved history and the opt-out that governs it.
 *
 * The two are one hook rather than two because they are not independent:
 * turning saving off must also purge what is already stored, and turning it on
 * must not resurrect it. Splitting them would put that rule in the component,
 * which is where it was, spread across three effects that had to run in the
 * right order to be correct.
 */
export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [saveHistory, setSaveHistory] = useState<boolean>(configData.defaults.saveHistory);

  /**
   * Whether stored values have been read back into state yet.
   *
   * This must be state rather than a ref. Effects in one commit run in
   * declaration order and share that render's values, so a ref set by the
   * restore effect is already true when the persist effects run immediately
   * after — the guard would do nothing. State is read from the render
   * snapshot, so the persist effects see `false` on mount and only run on the
   * subsequent render, by which point the restored values have been applied.
   */
  const [hasRestored, setHasRestored] = useState(false);

  // Restore the preference and, if saving is on, the stored entries.
  useEffect(() => {
    const preference = readRaw(STORAGE_KEYS.saveHistory);
    // Any value other than the explicit "off" sentinel means saving is on,
    // so a first-time visitor (null) opts in by default.
    const allowed = preference !== OFF;
    setSaveHistory(allowed);

    if (allowed) {
      // Validated, not just parsed. This used to be `JSON.parse(raw) as
      // HistoryItem[]` — a cast, which checks nothing at runtime. A stored
      // value that is valid JSON of the wrong shape therefore reached React
      // intact: a string has a truthy `.length`, so the history section
      // rendered and `item.images.map` threw, taking the whole page down with
      // an unrecoverable white screen. Nothing on the page could clear the bad
      // value, because the page could not render. Dropping it is strictly
      // better than that.
      setHistory(readJson(STORAGE_KEYS.history, isHistoryArray, []));
    } else {
      setHistory([]);
    }

    setHasRestored(true);
  }, []);

  /**
   * Mirrors entries into storage as they change.
   *
   * Gated on `hasRestored` to fix a real data-loss window. The effect used to
   * run on mount against the initial empty array — the restore effect's
   * setHistory having been queued but not applied — and wrote `[]` straight
   * over the stored entries before rewriting the real ones a render later.
   * Self-healing in the normal case, but the entries were genuinely gone for
   * that interval, on every page load, and permanently if the tab closed
   * inside it or the second write hit the storage quota.
   */
  useEffect(() => {
    if (!hasRestored || !saveHistory) return;
    writeJson(STORAGE_KEYS.history, history);
  }, [history, saveHistory, hasRestored]);

  /**
   * Persists the preference, and purges stored entries when it goes off.
   *
   * Gated for the same reason: on mount this held the default, not the stored
   * value, so a student who had turned saving off had "on" written back over
   * their choice before it was read.
   */
  useEffect(() => {
    if (!hasRestored) return;
    writeRaw(STORAGE_KEYS.saveHistory, saveHistory ? ON : OFF);
    if (!saveHistory) {
      removeRaw(STORAGE_KEYS.history);
      setHistory([]);
    }
  }, [saveHistory, hasRestored]);

  /** Records one interaction. A no-op when the student has opted out. */
  const recordInteraction = useCallback(
    (draft: HistoryDraft) => {
      if (!saveHistory) return;
      setHistory((previous) => withNewEntry(previous, createHistoryItem(draft)));
    },
    [saveHistory],
  );

  /**
   * Clears entries immediately, without waiting for the persist effect.
   *
   * The explicit remove matters: if saving is currently off, the persist
   * effect returns early and would leave whatever is in storage behind.
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    removeRaw(STORAGE_KEYS.history);
  }, []);

  const toggleSaveHistory = useCallback(() => {
    setSaveHistory((previous) => !previous);
  }, []);

  return { history, saveHistory, recordInteraction, clearHistory, toggleSaveHistory } as const;
}
