import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import strings from "@/data/strings.json";
import { getSubject } from "@/lib/subjects";
import { ResponsePanel } from "@/app/components/ResponsePanel";

describe("ResponsePanel", () => {
  const subject = getSubject("math");

  it("shows the empty state before any request", () => {
    render(<ResponsePanel subject={subject} aiText="" isLoading={false} />);
    // The lead sentence names the active subject.
    expect(screen.getByText(/math work/)).toBeDefined();
    for (const bullet of strings.response.placeholderBullets) {
      expect(screen.getByText(bullet)).toBeDefined();
    }
  });

  it("bolds the action name in the empty state", () => {
    const { container } = render(
      <ResponsePanel subject={subject} aiText="" isLoading={false} />,
    );
    expect(container.querySelector(".placeholder strong")?.textContent).toBe(
      strings.actions.helpIdle,
    );
  });

  it("shows the loading bar in place of guidance", () => {
    render(<ResponsePanel subject={subject} aiText="stale" isLoading />);
    expect(screen.getByText(strings.lineHints.generating)).toBeDefined();
    expect(screen.queryByText("stale")).toBeNull();
  });

  it("renders guidance as Markdown", () => {
    const { container } = render(
      <ResponsePanel
        subject={subject}
        aiText="Check the **bounds**:\n\n- is `i <= n` right?"
        isLoading={false}
      />,
    );
    expect(container.querySelector(".aiText strong")?.textContent).toBe("bounds");
  });

  it("announces updates politely", () => {
    // The student may still be reading their own code when the reply lands.
    const { container } = render(
      <ResponsePanel subject={subject} aiText="done" isLoading={false} />,
    );
    expect(container.querySelector(".aiCard")?.getAttribute("aria-live")).toBe("polite");
  });
});
