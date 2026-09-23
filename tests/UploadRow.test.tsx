import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getSubject } from "@/lib/subjects";
import { UploadRow } from "@/app/components/editor/UploadRow";

function renderRow() {
  return render(
    <UploadRow
      subject={getSubject("cs")}
      images={[]}
      imageName=""
      imagePreview={null}
      onFilesSelected={vi.fn()}
      onRemoveImage={vi.fn()}
      onHelp={vi.fn()}
      onNewPrompt={vi.fn()}
      isLoading={false}
    />,
  );
}

describe("UploadRow drop zone keyboard", () => {
  it.each([" ", "Enter"])("opens the file picker on %j without the browser default", (key) => {
    const { container } = renderRow();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, "click").mockImplementation(() => {});

    // fireEvent returns false when the handler called preventDefault.
    // Regression for Space: it used to open the picker and also scroll the page.
    const notPrevented = fireEvent.keyDown(container.querySelector(".dropzone")!, { key });
    expect(click).toHaveBeenCalledOnce();
    expect(notPrevented).toBe(false);
  });

  it("leaves other keys alone", () => {
    const { container } = renderRow();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, "click").mockImplementation(() => {});
    const notPrevented = fireEvent.keyDown(container.querySelector(".dropzone")!, { key: "Tab" });
    expect(click).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });
});
