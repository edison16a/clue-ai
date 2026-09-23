import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import strings from "@/data/strings.json";
import { useAttachments } from "@/lib/hooks/useAttachments";
import { useGuidance, type GuidanceInputs } from "@/lib/hooks/useGuidance";
import { useLineHints } from "@/lib/hooks/useLineHints";

afterEach(() => vi.unstubAllGlobals());

/** Answers each API route with a fixed status and body. */
function routes(map: Record<string, [number, unknown]>) {
  const spy = vi.fn(async (url: string) => {
    const [status, body] = map[url] ?? [500, { error: "unexpected " + url }];
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

function fileList(...files: File[]): FileList {
  return Object.assign(files, { item: (i: number) => files[i] }) as unknown as FileList;
}

describe("useAttachments", () => {
  it("attaches images and appends source files to the code", async () => {
    let code = "existing";
    const setCode = vi.fn((update: (prev: string) => string) => { code = update(code); });
    const { result } = renderHook(() => useAttachments(setCode as never));

    act(() => result.current.addFiles(fileList(
      new File(["png"], "shot.png", { type: "image/png" }),
      new File(["int x;"], "Main.java", { type: "" }),
      new File(["zip"], "a.zip", { type: "application/zip" }),
    )));

    await waitFor(() => expect(result.current.images).toHaveLength(1));
    await waitFor(() => expect(code).toBe("existing\n\nint x;"));
    expect(result.current.imageName).toBe("shot.png");
  });

  it("updates the label when the first image is removed", async () => {
    const { result } = renderHook(() => useAttachments(vi.fn()));
    act(() => result.current.addFiles(fileList(
      new File(["1"], "one.png", { type: "image/png" }),
      new File(["2"], "two.png", { type: "image/png" }),
    )));
    await waitFor(() => expect(result.current.images).toHaveLength(2));

    act(() => result.current.removeImage(0));
    expect(result.current.images).toHaveLength(1);
    expect(result.current.imageName).toBe(result.current.images[0].name);
  });

  it("forgets everything on reset", async () => {
    const { result } = renderHook(() => useAttachments(vi.fn()));
    act(() => result.current.addFiles(fileList(new File(["1"], "a.png", { type: "image/png" }))));
    await waitFor(() => expect(result.current.images).toHaveLength(1));
    act(() => result.current.resetAttachments());
    expect(result.current).toMatchObject({ images: [], imageName: "", imagePreview: null });
  });
});

describe("useLineHints", () => {
  it("parses ranges from the locator", async () => {
    routes({ "/api/locate": [200, { aiText: "LINES:\n- 2-2 | here\nNOTE: look" }] });
    const { result } = renderHook(() => useLineHints());
    await act(() => result.current.locateLines("a\nb\nc", "q", "cs"));
    expect(result.current.lineHints).toEqual([{ start: 1, end: 3, reason: "here" }]);
    expect(result.current.lineHintNote).toBe("look");
    expect(result.current.isLocating).toBe(false);
  });

  it("says so when nothing was found", async () => {
    routes({ "/api/locate": [200, { aiText: "no idea" }] });
    const { result } = renderHook(() => useLineHints());
    await act(() => result.current.locateLines("a", "", "cs"));
    expect(result.current.lineHintNote).toBe(strings.lineHints.noRanges);
  });

  it("turns a failure into a note instead of an error", async () => {
    routes({ "/api/locate": [500, { error: "boom" }] });
    const { result } = renderHook(() => useLineHints());
    await act(() => result.current.locateLines("a", "", "cs"));
    expect(result.current.lineHintNote).toBe(`${strings.lineHints.failurePrefix}boom`);
    expect(result.current.lineHints).toEqual([]);
  });

  it("does not call the server for empty code", async () => {
    const spy = routes({});
    const { result } = renderHook(() => useLineHints());
    await act(() => result.current.locateLines("", "", "cs"));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("useGuidance", () => {
  function inputs(overrides: Partial<GuidanceInputs> = {}): GuidanceInputs {
    return {
      code: "int x;",
      setCode: vi.fn(),
      ask: "q",
      subjectId: "cs",
      images: [],
      recordInteraction: vi.fn(),
      locateLines: vi.fn(async () => {}),
      ...overrides,
    };
  }

  it("fetches guidance, records it, then locates lines", async () => {
    routes({ "/api/help": [200, { aiText: "Check the bound." }] });
    const args = inputs();
    const { result } = renderHook(() => useGuidance(args));
    await act(() => result.current.requestGuidance());

    expect(result.current.aiText).toBe("Check the bound.");
    expect(args.recordInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ code: "int x;", aiText: "Check the bound." }),
    );
    expect(args.locateLines).toHaveBeenCalledWith("int x;", "q", "cs");
  });

  it("extracts first when there are images and no code", async () => {
    const spy = routes({
      "/api/extract": [200, { aiText: "int y;" }],
      "/api/help": [200, { aiText: "ok" }],
    });
    const args = inputs({ code: "", images: [{ name: "a.png", src: "data:x" }] });
    const { result } = renderHook(() => useGuidance(args));
    await act(() => result.current.requestGuidance());

    expect(spy.mock.calls.map((c) => c[0])).toEqual(["/api/extract", "/api/help"]);
    expect(args.setCode).toHaveBeenCalledWith("int y;");
    expect(args.locateLines).toHaveBeenCalledWith("int y;", "q", "cs");
  });

  it("never overwrites pasted code with an extraction", async () => {
    const spy = routes({ "/api/help": [200, { aiText: "ok" }] });
    const args = inputs({ images: [{ name: "a.png", src: "data:x" }] });
    const { result } = renderHook(() => useGuidance(args));
    await act(() => result.current.requestGuidance());
    expect(spy.mock.calls.map((c) => c[0])).toEqual(["/api/help"]);
  });

  it("shows and records a failure", async () => {
    routes({ "/api/help": [500, { error: "down" }] });
    const args = inputs();
    const { result } = renderHook(() => useGuidance(args));
    await act(() => result.current.requestGuidance());

    expect(result.current.aiText).toBe(`${strings.response.errorPrefix}down`);
    expect(result.current.isLoading).toBe(false);
    expect(args.locateLines).not.toHaveBeenCalled();
  });

  it("records the transcribed code when help fails after extraction", async () => {
    // Regression: the failure branch used to record the pre-extraction code,
    // which was empty, so the history card showed nothing submitted.
    routes({ "/api/extract": [200, { aiText: "int y;" }], "/api/help": [500, { error: "down" }] });
    const args = inputs({ code: "", images: [{ name: "a.png", src: "data:x" }] });
    const { result } = renderHook(() => useGuidance(args));
    await act(() => result.current.requestGuidance());
    expect(args.recordInteraction).toHaveBeenCalledWith(expect.objectContaining({ code: "int y;" }));
  });
});
