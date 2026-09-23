import { describe, expect, it } from "vitest";
import { fragment, loadTemplate, renderTemplate } from "@/lib/server/templates";

describe("renderTemplate", () => {
  it("fills named slots", () => {
    expect(renderTemplate("a {x} b {y}", { x: "1", y: "2" })).toBe("a 1 b 2");
  });

  it("drops a line that is only an empty slot", () => {
    // This is how the extract prompt loses its subject line when none was
    // sent. The original built it with `.filter(Boolean)`.
    expect(renderTemplate("top\n{subject}\nbottom", { subject: "" })).toBe("top\nbottom");
  });

  it("keeps a line where an empty slot sits beside other text", () => {
    expect(renderTemplate("Subject: {subject}", { subject: "" })).toBe("Subject: ");
  });

  it("keeps deliberate blank lines", () => {
    expect(renderTemplate("a\n\nb", {})).toBe("a\n\nb");
  });

  it("does not expand braces inside a substituted value", () => {
    // Student code is full of braces; `{code}` inside it must stay literal.
    expect(renderTemplate("{code}", { code: "if (x) { return {code}; }" })).toBe(
      "if (x) { return {code}; }",
    );
  });

  it("leaves an unknown slot visible so a template typo is noticed", () => {
    expect(renderTemplate("{cdoe}", { code: "x" })).toBe("{cdoe}");
  });
});

describe("templates on disk", () => {
  it("loads each template without its trailing newline", () => {
    for (const name of ["help.user", "locate.user", "extract.user"] as const) {
      const text = loadTemplate(name);
      expect(text.length).toBeGreaterThan(0);
      expect(text.endsWith("\n")).toBe(false);
    }
  });

  it("fills fragments", () => {
    expect(fragment("askPresent", "why")).toBe("• why");
    expect(fragment("askMissing")).toBe("• (no extra description provided)");
  });
});
