import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import strings from "@/data/strings.json";
import { SUBJECTS, getSubject } from "@/lib/subjects";
import { SubjectModeBar } from "@/app/components/header/SubjectModeBar";
import { LineHintOverlay } from "@/app/components/editor/LineHintOverlay";
import { HistorySection } from "@/app/components/history/HistorySection";
import type { HistoryItem } from "@/lib/types";

describe("SubjectModeBar", () => {
  function renderBar(overrides: Partial<React.ComponentProps<typeof SubjectModeBar>> = {}) {
    const props = {
      subjects: SUBJECTS,
      activeSubjectId: "cs" as const,
      onSelect: vi.fn(),
      showMore: false,
      onShowMoreChange: vi.fn(),
      ...overrides,
    };
    render(<SubjectModeBar {...props} />);
    return props;
  }

  it("shows only the primary subject when collapsed", () => {
    renderBar();
    expect(screen.getByText("Computer Science")).toBeDefined();
    expect(screen.queryByText("Math")).toBeNull();
    expect(screen.getByText(strings.subjectBar.showMore)).toBeDefined();
  });

  it("shows every subject when expanded", () => {
    renderBar({ showMore: true });
    for (const subject of SUBJECTS) {
      expect(screen.getByText(subject.label)).toBeDefined();
    }
    expect(screen.getByText(strings.subjectBar.showLess)).toBeDefined();
  });

  it("marks the active chip as pressed, and only that one", () => {
    renderBar({ showMore: true, activeSubjectId: "math" });
    const pressed = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(1);
    expect(pressed[0].textContent).toContain("Math");
  });

  it("reports the chosen subject's id", async () => {
    const { onSelect } = renderBar({ showMore: true });
    await userEvent.click(screen.getByText("Science"));
    expect(onSelect).toHaveBeenCalledWith("science");
  });

  it("renders each subject's configured icon", () => {
    // Guards the data binding: a glyph swapped in subjects.json must appear
    // without any code change.
    const { container } = render(
      <SubjectModeBar
        subjects={SUBJECTS}
        activeSubjectId="cs"
        onSelect={vi.fn()}
        showMore
        onShowMoreChange={vi.fn()}
      />,
    );
    for (const subject of SUBJECTS.filter((s) => s.icon.kind === "glyph")) {
      expect(container.textContent).toContain(subject.icon.value);
    }
    // The component-kind icon renders as an SVG rather than text.
    expect(container.querySelectorAll("svg").length).toBeGreaterThan(0);
  });
});

describe("LineHintOverlay", () => {
  const codeLines = ["int total = 0;", "for (int i = 0; i <= n; i++) {", "  total += i;", "}"];

  it("shades hit lines and their immediate neighbours differently", () => {
    const { container } = render(
      <LineHintOverlay
        codeLines={codeLines}
        hints={[{ start: 2, end: 2 }]}
        note=""
        isLocating={false}
        onClear={vi.fn()}
      />,
    );
    const rows = [...container.querySelectorAll(".hlLine")];
    expect(rows[1].className).toContain("isHit");
    expect(rows[0].className).toContain("isContext");
    expect(rows[2].className).toContain("isContext");
    expect(rows[3].className).not.toContain("isHit");
  });

  it("numbers every line, including blanks", () => {
    const { container } = render(
      <LineHintOverlay
        codeLines={["a", "", "b"]}
        hints={[{ start: 1, end: 1 }]}
        note=""
        isLocating={false}
        onClear={vi.fn()}
      />,
    );
    expect([...container.querySelectorAll(".hlNo")].map((n) => n.textContent)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("shows a real note but hides the 'none' sentinel", () => {
    const { rerender, container } = render(
      <LineHintOverlay
        codeLines={codeLines}
        hints={[{ start: 1, end: 1 }]}
        note="check the reset"
        isLocating={false}
        onClear={vi.fn()}
      />,
    );
    expect(container.querySelector(".codeHighlightNote")?.textContent).toBe("check the reset");

    rerender(
      <LineHintOverlay
        codeLines={codeLines}
        hints={[{ start: 1, end: 1 }]}
        note="none"
        isLocating={false}
        onClear={vi.fn()}
      />,
    );
    expect(container.querySelector(".codeHighlightNote")).toBeNull();
  });

  it("shows the loading bar instead of highlights while locating", () => {
    const { container } = render(
      <LineHintOverlay
        codeLines={codeLines}
        hints={[]}
        note=""
        isLocating
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText(strings.lineHints.locating)).toBeDefined();
    expect(container.querySelector(".hlLine")).toBeNull();
  });

  it("clears on request", async () => {
    const onClear = vi.fn();
    render(
      <LineHintOverlay
        codeLines={codeLines}
        hints={[{ start: 1, end: 1 }]}
        note=""
        isLocating={false}
        onClear={onClear}
      />,
    );
    await userEvent.click(screen.getByText(strings.lineHints.clear));
    expect(onClear).toHaveBeenCalledOnce();
  });
});

describe("HistorySection", () => {
  const entry: HistoryItem = {
    id: 1,
    timestamp: "1/1/2025, 12:00:00 PM",
    mode: "math",
    ask: "why does this integral diverge",
    code: "∫ 1/x dx",
    images: [],
    aiText: "Check the **bounds** first.",
  };

  it("renders nothing when empty", () => {
    const { container } = render(<HistorySection history={[]} onClear={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("labels an entry with its subject's short name", () => {
    render(<HistorySection history={[entry]} onClear={vi.fn()} />);
    // Looked up from the registry rather than stored, so renaming a subject
    // updates old entries instead of leaving them stale.
    expect(screen.getAllByText(getSubject("math").shortLabel).length).toBeGreaterThan(0);
  });

  it("substitutes the configured cap into the description", () => {
    render(<HistorySection history={[entry]} onClear={vi.fn()} />);
    expect(screen.getByText(/past 10 questions/)).toBeDefined();
  });

  it("falls back when no question was typed", () => {
    render(<HistorySection history={[{ ...entry, ask: "" }]} onClear={vi.fn()} />);
    expect(screen.getByText(strings.history.noQuestion)).toBeDefined();
  });

  it("renders the guidance as Markdown", () => {
    const { container } = render(<HistorySection history={[entry]} onClear={vi.fn()} />);
    expect(container.querySelector(".historyResponseText strong")?.textContent).toBe("bounds");
  });
});
