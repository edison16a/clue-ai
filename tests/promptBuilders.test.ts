import { describe, expect, it } from "vitest";
import { buildExtractUserText } from "@/lib/server/ai/extract";
import { buildHelpUserText } from "@/lib/server/ai/help";
import { buildLocateUserText } from "@/lib/server/ai/locate";

/**
 * The exact text each endpoint sends as its user turn. The expected strings
 * were taken from what the pre-template services.ts produced, so these pin
 * the prompts to the byte and catch any template or fragment edit that
 * changes what the model reads.
 */
describe("help user turn", () => {
  it("matches the recorded prompt for a normal request", () => {
    expect(buildHelpUserText({ code: "int x = 1;", ask: " why? ", subjectMode: "cs" })).toBe(
      [
        "Student request/context:",
        "• why?",
        "",
        "Subject:",
        "• Computer Science",
        "",
        "Code snippet (may be partial):",
        "int x = 1;",
        "",
        "Task: Give concrete, location-specific coaching-only hints and questions. Do NOT provide solutions or final code. Highlight the next spots to inspect and what to verify there.",
      ].join("\n"),
    );
  });

  it("says when nothing was provided", () => {
    const text = buildHelpUserText({ code: "   ", ask: "" });
    expect(text).toContain("• (no extra description provided)");
    expect(text).toContain("• Not specified");
    expect(text).toContain("Code snippet (may be partial):\n(none provided)");
  });

  it("truncates code at the configured cap", () => {
    const text = buildHelpUserText({ code: "x".repeat(9000) });
    expect(text).toContain("x".repeat(8000) + "\n");
    expect(text).not.toContain("x".repeat(8001));
  });
});

describe("locate user turn", () => {
  it("numbers the code, blank lines included", () => {
    expect(buildLocateUserText({ code: "a\n\nb", ask: "q", subjectMode: "math" })).toBe(
      [
        "Student request/context:",
        "• q",
        "",
        "Subject:",
        "• Math",
        "",
        "Code with line numbers (include blank lines as shown):",
        "1 | a",
        "2 | (blank)",
        "3 | b",
        "",
        "Return only the specified text format. No fixes.",
      ].join("\n"),
    );
  });

  it("treats a non-string code field as empty", () => {
    expect(buildLocateUserText({ code: 42 as unknown as string })).toContain("1 | (blank)");
  });
});

describe("extract user turn", () => {
  it("includes the raw subject id when one is sent", () => {
    expect(buildExtractUserText({ ask: "q", subjectMode: "cs" })).toBe(
      [
        "If relevant, context from the student:",
        "• q",
        "Subject: cs",
        "Extract ONLY the raw text/code. Do not fix errors.",
      ].join("\n"),
    );
  });

  it("drops the subject line entirely when none is sent", () => {
    expect(buildExtractUserText({})).toBe(
      [
        "If relevant, context from the student:",
        "• (no extra description provided)",
        "Extract ONLY the raw text/code. Do not fix errors.",
      ].join("\n"),
    );
  });
});
