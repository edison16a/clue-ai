/**
 * Renders a submission as a numbered listing for the locator prompt.
 *
 * The locator is asked to reply with line numbers, so the model has to see the
 * same numbering the browser will apply to the highlight overlay. Any
 * disagreement between the two shifts every highlight — which is why this is a
 * shared, tested function rather than an inline `map` in the route.
 */

/** Splits on either line ending, matching how the client counts lines. */
const LINE_BREAK = /\r?\n/;

/** Splits text into lines using the same rule the overlay does. */
export function splitLines(text: string): string[] {
  return text.split(LINE_BREAK);
}

/**
 * Formats `code` as `  1 | text` rows.
 *
 * Two details are load-bearing:
 *
 * - Empty lines are rendered as the literal `(blank)` rather than left bare.
 *   Trailing whitespace is invisible to the model, and a run of empty rows
 *   reads as a formatting artifact it might skip over; naming them keeps the
 *   numbering honest, which is what the prompt's "include blank lines" rule
 *   depends on.
 * - Numbers are right-aligned to a fixed width so the `|` separators line up.
 *   A ragged column invites the model to mis-associate a number with the row
 *   above or below it.
 */
export function buildNumberedListing(code: string): string {
  const lines = splitLines(code);
  const width = String(Math.max(1, lines.length)).length;

  return lines
    .map((line, index) => {
      const number = String(index + 1).padStart(width, " ");
      return `${number} | ${line === "" ? "(blank)" : line}`;
    })
    .join("\n");
}
