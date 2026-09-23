import { describe, expect, it } from "vitest";

import { stripCodeFences } from "@/lib/fences";

/**
 * Transcribed code goes straight into the student's textarea and then to the
 * locator, which numbers whatever it is given, so a stray fence does not just
 * look wrong, it shifts every line number by one.
 */
describe("stripCodeFences", () => {
  it("strips a fence with a language tag", () => {
    expect(stripCodeFences("```python\nprint(1)\n```")).toBe("print(1)");
  });

  it("strips a fence with no language tag", () => {
    expect(stripCodeFences("```\nprint(1)\n```")).toBe("print(1)");
  });

  it("strips a single-line bare fence", () => {
    expect(stripCodeFences("```print(1)```")).toBe("print(1)");
  });

  it("leaves unfenced text alone", () => {
    expect(stripCodeFences("print(1)")).toBe("print(1)");
  });

  it("preserves interior indentation", () => {
    expect(stripCodeFences("```java\nif (x) {\n    y();\n}\n```")).toBe(
      "if (x) {\n    y();\n}",
    );
  });

  it("leaves a fence that does not wrap the whole string", () => {
    // A student working on a Markdown document may legitimately have a fenced
    // block inside their submission; removing it would corrupt their content.
    const markdown = "Here is my answer:\n```\ncode\n```\nand my reasoning.";
    expect(stripCodeFences(markdown)).toBe(markdown);
  });

  it("removes only the outermost fence", () => {
    expect(stripCodeFences("```md\n```\ninner\n```\n```")).toBe("```\ninner\n```");
  });

  it("handles an empty string", () => {
    expect(stripCodeFences("")).toBe("");
  });

  it("keeps a hyphenated language tag", () => {
    expect(stripCodeFences("```objective-c\nint x;\n```")).toBe("int x;");
  });
});
