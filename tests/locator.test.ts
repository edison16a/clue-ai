import { describe, expect, it } from "vitest";

import { emphasisForLine, isMeaningfulNote, parseLocatorText } from "@/lib/locator";

/**
 * The locator asks the model for plain text rather than JSON, so this parser
 * is the only thing standing between a loosely-formatted reply and the
 * highlight overlay. Most of these cases are shapes a model actually produces.
 */
describe("parseLocatorText", () => {
  it("parses a well-formed reply", () => {
    const { ranges, note } = parseLocatorText(
      "LINES:\n- 4-6 | check the loop header separators\nNOTE: trace the accumulator",
      20,
    );

    expect(ranges).toHaveLength(1);
    expect(ranges[0].reason).toBe("check the loop header separators");
    expect(note).toBe("trace the accumulator");
  });

  it("widens each range by one line either side", () => {
    // The model names the line it suspects; the surrounding statement is what
    // a student can actually read as a unit.
    const { ranges } = parseLocatorText("LINES:\n- 5-5 | here", 20);
    expect(ranges[0]).toMatchObject({ start: 4, end: 6 });
  });

  it("clamps the widened range to the document", () => {
    const { ranges } = parseLocatorText("LINES:\n- 1-3 | here", 3);
    expect(ranges[0]).toMatchObject({ start: 1, end: 3 });
  });

  it("treats a bare line number as a single-line range", () => {
    const { ranges } = parseLocatorText("LINES:\n- 7 | here", 20);
    expect(ranges[0]).toMatchObject({ start: 6, end: 8 });
  });

  it("accepts an en-dash range", () => {
    // The prompt writes hyphens in its examples but en-dashes in its prose
    // ("1–3 bullets max"), and models echo the typographic form back.
    const { ranges } = parseLocatorText("LINES:\n- 4–6 | here", 20);
    expect(ranges[0]).toMatchObject({ start: 3, end: 7 });
  });

  it("accepts CRLF line endings", () => {
    const { ranges, note } = parseLocatorText("LINES:\r\n- 2-3 | here\r\nNOTE: ok", 20);
    expect(ranges).toHaveLength(1);
    expect(note).toBe("ok");
  });

  it("reads a NOTE: that has leading whitespace", () => {
    // Regression: the prompt's own "if unsure" example indents NOTE: by two
    // spaces, so an untrimmed check dropped the note in exactly the case it
    // exists to convey.
    expect(parseLocatorText("LINES:\n  NOTE: none", 10).note).toBe("none");
  });

  it("ignores a preamble and a missing header", () => {
    // A strict parser would discard perfectly good bullets over a stray
    // sentence, which is worse than tolerating one.
    const withPreamble = parseLocatorText("Sure! Here you go.\nLINES:\n- 2-3 | here", 20);
    const withoutHeader = parseLocatorText("- 2-3 | here", 20);
    expect(withPreamble.ranges).toHaveLength(1);
    expect(withoutHeader.ranges).toHaveLength(1);
  });

  it("drops a range that starts at or below line zero", () => {
    // There is no line 0 to point at.
    expect(parseLocatorText("LINES:\n- 0-3 | here", 20).ranges).toHaveLength(0);
  });

  it("collapses a reversed range to a single line rather than dropping it", () => {
    // The model clearly meant somewhere; losing the hint helps nobody.
    const { ranges } = parseLocatorText("LINES:\n- 8-2 | here", 20);
    expect(ranges[0]).toMatchObject({ start: 7, end: 9 });
  });

  it("keeps a pipe that appears inside the reason", () => {
    const { ranges } = parseLocatorText("LINES:\n- 3-3 | is `a || b` right here?", 20);
    expect(ranges[0].reason).toBe("is `a || b` right here?");
  });

  it("lets a later NOTE: line win", () => {
    expect(parseLocatorText("NOTE: first\nNOTE: second", 10).note).toBe("second");
  });

  it("returns nothing for unstructured prose", () => {
    const { ranges, note } = parseLocatorText("I could not identify any issues.", 10);
    expect(ranges).toEqual([]);
    expect(note).toBe("");
  });

  it("parses multiple bullets", () => {
    const { ranges } = parseLocatorText(
      "LINES:\n- 2-3 | first\n- 9-10 | second\n- 15 | third",
      40,
    );
    expect(ranges.map((r) => r.reason)).toEqual(["first", "second", "third"]);
  });
});

describe("isMeaningfulNote", () => {
  it("rejects the sentinel the prompt asks for when there is nothing to say", () => {
    expect(isMeaningfulNote("none")).toBe(false);
    expect(isMeaningfulNote("NONE")).toBe(false);
    expect(isMeaningfulNote("")).toBe(false);
  });

  it("accepts real content", () => {
    expect(isMeaningfulNote("check the reset before the loop")).toBe(true);
  });
});

describe("emphasisForLine", () => {
  const ranges = [{ start: 4, end: 6 }];

  it("marks lines inside a range as hits", () => {
    expect(emphasisForLine(4, ranges, 20)).toBe("hit");
    expect(emphasisForLine(5, ranges, 20)).toBe("hit");
    expect(emphasisForLine(6, ranges, 20)).toBe("hit");
  });

  it("marks the line immediately outside as context", () => {
    expect(emphasisForLine(3, ranges, 20)).toBe("context");
    expect(emphasisForLine(7, ranges, 20)).toBe("context");
  });

  it("leaves everything else unshaded", () => {
    expect(emphasisForLine(2, ranges, 20)).toBe("none");
    expect(emphasisForLine(8, ranges, 20)).toBe("none");
  });

  it("does not shade past the end of the document", () => {
    expect(emphasisForLine(21, [{ start: 18, end: 20 }], 20)).toBe("none");
  });

  it("returns none when there are no ranges", () => {
    expect(emphasisForLine(1, [], 20)).toBe("none");
  });
});
