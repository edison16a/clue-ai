"use client";

import { useCallback, useEffect, useState } from "react";
import configData from "@/data/config.json";
import { STORAGE_KEYS, readRaw, removeRaw, writeJson, writeRaw } from "@/lib/storage";
import { createHistoryItem, withNewEntry, type HistoryDraft } from "@/lib/history";
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
 * right order.
 */
export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [saveHistory, setSaveHistory] = useState<boolean>(configData.defaults.saveHistory);

  // Restore the preference and, if saving is on, the stored entries.
  useEffect(() => {
    const preference = readRaw(STORAGE_KEYS.saveHistory);
    // Any value other than the explicit "off" sentinel means saving is on,
    // so a first-time visitor (null) opts in by default.
    const allowed = preference !== OFF;
    setSaveHistory(allowed);

    if (!allowed) {
      setHistory([]);
      return;
    }

    const raw = readRaw(STORAGE_KEYS.history);
    if (raw) {
      try {
        setHistory(JSON.parse(raw) as HistoryItem[]);
      } catch (error) {
        console.error("Failed to load history from localStorage:", error);
      }
    }
  }, []);

  // Mirror entries into storage as they change.
  useEffect(() => {
    if (!saveHistory) return;
    writeJson(STORAGE_KEYS.history, history);
  }, [history, saveHistory]);

  // Persist the preference, and purge stored entries when it goes off.
  useEffect(() => {
    writeRaw(STORAGE_KEYS.saveHistory, saveHistory ? ON : OFF);
    if (!saveHistory) {
      removeRaw(STORAGE_KEYS.history);
      setHistory([]);
    }
  }, [saveHistory]);

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
