import { afterEach, describe, expect, it, vi } from "vitest";
import strings from "@/data/strings.json";
import { fetchExtraction, fetchGuidance, fetchLocatorText } from "@/lib/api-client";

function reply(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
}

afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("posts JSON to the right route", async () => {
    reply(200, { aiText: "ok" });
    await fetchGuidance({ code: "x", ask: "q", subjectMode: "cs" });
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/help");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({ code: "x", ask: "q", subjectMode: "cs" });
  });

  it("throws the server's error message on a failed status", async () => {
    reply(500, { error: "rate limited" });
    await expect(fetchGuidance({})).rejects.toThrow("rate limited");
  });

  it("falls back to its own message when the server gave none", async () => {
    reply(500, {});
    await expect(fetchGuidance({})).rejects.toThrow(strings.errors.requestFailed);
    reply(500, {});
    await expect(fetchExtraction({})).rejects.toThrow(strings.errors.extractFailed);
  });

  it("trims only the start of guidance", async () => {
    reply(200, { aiText: "\n\n  Check it.  \n" });
    expect(await fetchGuidance({})).toBe("Check it.  \n");
  });

  it("rejects an extraction that came back empty", async () => {
    reply(200, { aiText: "   " });
    await expect(fetchExtraction({})).rejects.toThrow(strings.errors.noTextExtracted);
  });

  it("returns an empty locator reply rather than failing", async () => {
    reply(200, { aiText: 5 });
    expect(await fetchLocatorText({})).toBe("");
  });
});
