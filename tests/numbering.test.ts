import { describe, expect, it } from "vitest";

import { buildNumberedListing, splitLines } from "@/lib/numbering";
import { parseLocatorText } from "@/lib/locator";

describe("splitLines", () => {
  it("splits on LF and CRLF alike", () => {
    expect(splitLines("a\nb\r\nc")).toEqual(["a", "b", "c"]);
  });

  it("treats empty input as one empty line", () => {
    // Matches String.prototype.split; callers rely on this, which is why the
    // locate flow guards on the string's length rather than the array's.
    expect(splitLines("")).toEqual([""]);
  });

  it("keeps a trailing empty line", () => {
    expect(splitLines("a\n")).toEqual(["a", ""]);
  });
});

describe("buildNumberedListing", () => {
  it("numbers from one", () => {
    expect(buildNumberedListing("first\nsecond")).toBe("1 | first\n2 | second");
  });

  it("names blank lines rather than leaving them bare", () => {
    // Invisible whitespace reads to the model as a formatting artifact it can
    // skip, which would desynchronise its numbering from the overlay's.
    expect(buildNumberedListing("a\n\nb")).toBe("1 | a\n2 | (blank)\n3 | b");
  });

  it("right-aligns numbers to a fixed width", () => {
    // A ragged column invites the model to associate a number with the wrong
    // row.
    const listing = buildNumberedListing(Array.from({ length: 12 }, (_, i) => `l${i}`).join("\n"));
    const lines = listing.split("\n");
    expect(lines[0]).toBe(" 1 | l0");
    expect(lines[11]).toBe("12 | l11");
  });

  it("preserves indentation exactly", () => {
    // The whole feature is about pointing at the student's real code; a
    // normalised listing would describe something they cannot see.
    expect(buildNumberedListing("    indented")).toBe("1 |     indented");
  });

  it("numbers a single empty submission as one blank line", () => {
    expect(buildNumberedListing("")).toBe("1 | (blank)");
  });
});

describe("numbering and locating agree", () => {
  /**
   * The contract that matters: the route numbers the lines the model sees and
   * the client numbers the lines it highlights. If those ever disagree, every
   * highlight lands on the wrong row and nothing errors — so pin them
   * together rather than testing each in isolation.
   */
  it("a line number in the listing selects that same line in the overlay", () => {
    const code = "int total = 0;\n\nfor (int i = 0; i <= n; i++) {\n  total += i;\n}";
    const listing = buildNumberedListing(code);
    const lines = splitLines(code);

    // Line 3 in the listing is the loop header.
    expect(listing.split("\n")[2]).toBe("3 | for (int i = 0; i <= n; i++) {");

    // A hint naming line 3 must resolve to that same text client-side.
    const { ranges } = parseLocatorText("LINES:\n- 3-3 | check the bound", lines.length);
    const hit = lines.slice(ranges[0].start - 1, ranges[0].end);
    expect(hit).toContain("for (int i = 0; i <= n; i++) {");
  });
});
