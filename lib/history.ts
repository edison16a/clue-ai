/**
 * Building and validating saved-history records.
 *
 * Split out from the component because the cap and the record shape are rules
 * about data, not about rendering — and because the original applied the cap
 * in two places (the success path and the error path) with the magic number
 * written out both times.
 */

import configData from "@/data/config.json";
import type { HistoryItem, ImageAttachment, SubjectId } from "@/lib/types";

/** How many interactions are retained. The UI copy quotes this same number. */
export const HISTORY_LIMIT = configData.limits.historyEntries;

/** The fields a new history record is built from. */
export interface HistoryDraft {
  mode: SubjectId;
  ask: string;
  code: string;
  images: readonly ImageAttachment[];
  aiText: string;
}

/**
 * Creates a record for one interaction.
 *
 * Images are copied rather than referenced so that later edits to the
 * live attachment list — removing a thumbnail, starting a new prompt — cannot
 * reach backwards and mutate an entry the student already saved.
 *
 * `now` is injectable so tests can assert on ids and timestamps instead of
 * racing the clock.
 */
export function createHistoryItem(draft: HistoryDraft, now: Date = new Date()): HistoryItem {
  return {
    id: now.getTime(),
    timestamp: now.toLocaleString(),
    mode: draft.mode,
    ask: draft.ask,
    code: draft.code,
    images: draft.images.map((image) => ({ ...image })),
    aiText: draft.aiText,
  };
}

/**
 * Prepends an entry and enforces the cap.
 *
 * Newest-first ordering is what the UI renders directly, so the cap drops the
 * oldest entries — trimming from the end rather than refusing to add.
 */
export function withNewEntry(
  history: readonly HistoryItem[],
  entry: HistoryItem,
): HistoryItem[] {
  return [entry, ...history].slice(0, HISTORY_LIMIT);
}

/**
 * Whether a parsed localStorage value is a usable history array.
 *
 * Checks each record's fields rather than trusting the array, because a
 * half-written or older-schema entry renders as a blank card or throws inside
 * `item.images.map` — both worse than dropping the stored history.
 */
export function isHistoryArray(value: unknown): value is HistoryItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        typeof (item as HistoryItem).id === "number" &&
        typeof (item as HistoryItem).timestamp === "string" &&
        typeof (item as HistoryItem).mode === "string" &&
        typeof (item as HistoryItem).ask === "string" &&
        typeof (item as HistoryItem).code === "string" &&
        typeof (item as HistoryItem).aiText === "string" &&
        Array.isArray((item as HistoryItem).images),
    )
  );
}
