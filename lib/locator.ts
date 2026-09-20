/**
 * Parsing and rendering support for the line-locator feature.
 *
 * `/api/locate` asks the model for plain text in a fixed shape rather than
 * JSON, and this module turns that text back into structured ranges. Keeping
 * it here — pure, with no React and no fetch — is what makes it testable; it
 * previously sat at the top of a 970-line client component where the only way
 * to exercise it was to run the app against a live model.
 */

import type { LineHint } from "@/lib/types";

/**
 * One `- <start>[-<end>] | <reason>` bullet.
 *
 * The dash class covers both ASCII hyphen and en-dash: the prompt writes its
 * example ranges with a hyphen but also uses en-dashes in its prose ("1–3
 * bullets max"), and models routinely echo the typographic form back.
 */
const BULLET = /^\s*-\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*\|\s*(.+)$/i;

/** The trailing `NOTE:` line, which carries a pointer or a clarifying question. */
const NOTE_PREFIX = "NOTE:";

/** Splits on either line ending; model output is not guaranteed to use \n. */
const LINE_BREAK = /\r?\n/;

/** Parsed locator output: the spans to highlight plus the model's closing note. */
export interface LocatorResult {
  ranges: LineHint[];
  note: string;
}

/**
 * Widens a range by one line either side, clamped to the document.
 *
 * WHY widen: the model names the line it believes is wrong, but the cause is
 * usually the statement around it — a loop header's bound, the declaration
 * above the use. Showing one extra line either way is what makes the highlight
 * land on something a student can read as a unit rather than a lone token.
 */
function widenToContext(range: LineHint, totalLines: number): LineHint {
  if (totalLines <= 0) return range;
  return {
    ...range,
    start: Math.max(1, range.start - 1),
    end: Math.min(totalLines, Math.max(range.end, range.start) + 1),
  };
}

/**
 * Parses the locator's plain-text reply.
 *
 * Unrecognised lines — the `LINES:` header, blank lines, any preamble the
 * model adds — are ignored rather than treated as errors, because a strict
 * parser would discard a perfectly good set of bullets over a stray sentence.
 *
 * @param text       Raw `aiText` from /api/locate.
 * @param totalLines Line count of the submission, used to clamp ranges.
 */
export function parseLocatorText(text: string, totalLines: number): LocatorResult {
  const ranges: LineHint[] = [];
  let note = "";

  for (const line of text.split(LINE_BREAK)) {
    const bullet = line.match(BULLET);
    if (bullet) {
      const start = Number(bullet[1]);
      const parsedEnd = bullet[2] ? Number(bullet[2]) : start;
      // A line number of 0 or below cannot be pointed at, and a reversed range
      // (end < start) is taken as a single-line hit rather than dropped — the
      // model clearly meant *somewhere*, and losing the hint helps nobody.
      if (Number.isFinite(start) && start > 0) {
        const end = Number.isFinite(parsedEnd) && parsedEnd >= start ? parsedEnd : start;
        ranges.push({ start, end, reason: bullet[3]?.trim() });
      }
      continue;
    }

    // Trimmed before matching. This previously tested the raw line, so a
    // NOTE: with any leading whitespace was skipped — and the prompt's own
    // "if unsure" example indents it by two spaces, which means the note was
    // most likely to be dropped in exactly the case it exists to convey: the
    // model having nothing confident to point at. The student then saw
    // "No line ranges returned." with no explanation instead of the note.
    const trimmed = line.trim();
    if (trimmed.toUpperCase().startsWith(NOTE_PREFIX)) {
      note = trimmed.slice(NOTE_PREFIX.length).trim();
    }
  }

  return {
    ranges: ranges.map((range) => widenToContext(range, totalLines)),
    note,
  };
}

/**
 * Whether a note should be shown to the student.
 *
 * The prompt instructs the model to write `NOTE: none` when it has nothing to
 * add, so that literal is a sentinel rather than content and rendering it
 * would show the word "none" under the highlights.
 */
export function isMeaningfulNote(note: string): boolean {
  return note.length > 0 && note.toLowerCase() !== "none";
}

/** How a single line of the submission should be shaded in the overlay. */
export type LineEmphasis = "hit" | "context" | "none";

/**
 * Classifies one line against the parsed ranges.
 *
 * "context" is the line immediately outside a range. Because ranges have
 * already been widened by `widenToContext`, this shades a *second* line either
 * side — the effect is a bright core with a softer halo, which is why the two
 * widenings are not redundant.
 */
export function emphasisForLine(
  lineNumber: number,
  ranges: readonly LineHint[],
  totalLines: number,
): LineEmphasis {
  if (ranges.some((range) => lineNumber >= range.start && lineNumber <= range.end)) {
    return "hit";
  }
  const isContext = ranges.some(
    (range) =>
      (lineNumber === range.start - 1 && lineNumber >= 1) ||
      (lineNumber === range.end + 1 && lineNumber <= totalLines),
  );
  return isContext ? "context" : "none";
}
