import { describe, expect, it } from "vitest";

import { aiTextResponse, errorResponse, messageFromError } from "@/lib/server/http";
import { loadPrompt } from "@/lib/server/prompts";
import { modelFor, storeFor } from "@/lib/server/openai";

describe("loadPrompt", () => {
  /**
   * Prompts are read from disk at runtime rather than imported, which is what
   * makes them editable as content. That also means nothing in the module
   * graph references them, so a missing or unshipped file fails at request
   * time. These tests are the compile-time check that no longer exists.
   */
  it("loads each prompt with content", () => {
    for (const name of ["help", "locate", "extract"] as const) {
      expect(loadPrompt(name).length).toBeGreaterThan(0);
    }
  });

  it("trims the trailing newline the files carry", () => {
    // The files end with a newline for well-formedness; that must not reach
    // the model as trailing whitespace in the system message.
    expect(loadPrompt("help")).toBe(loadPrompt("help").trim());
  });

  it("caches after the first read", () => {
    expect(loadPrompt("locate")).toBe(loadPrompt("locate"));
  });

  it("keeps the locate prompt's output contract intact", () => {
    // lib/locator.ts parses what this prompt asks for. The two halves of that
    // contract now live in different files and can drift independently.
    const prompt = loadPrompt("locate");
    expect(prompt).toContain("LINES:");
    expect(prompt).toContain("NOTE:");
    expect(prompt).toMatch(/-\s*\d+-\d+\s*\|/);
  });

  it("keeps the no-solutions rule in the help prompt", () => {
    // This is the product's entire premise; a prompt edit that loses it should
    // fail the build rather than quietly start handing out answers.
    expect(loadPrompt("help").toLowerCase()).toContain("never output full solutions");
  });

  it("keeps the do-not-correct rule in the extract prompt", () => {
    // Transcription must preserve the student's mistakes; fixing them during
    // OCR would hand back the answer.
    expect(loadPrompt("extract").toLowerCase()).toContain("do not correct");
  });
});

describe("endpoint configuration", () => {
  it("names a model for every endpoint", () => {
    for (const endpoint of ["help", "locate", "extract"] as const) {
      expect(modelFor(endpoint)).toBeTruthy();
    }
  });

  it("records the retention flag explicitly for every endpoint", () => {
    // Two of these used to be implicit: the field was omitted and the API
    // default (true) applied, which read as "not stored".
    for (const endpoint of ["help", "locate", "extract"] as const) {
      expect(typeof storeFor(endpoint)).toBe("boolean");
    }
  });
});

describe("messageFromError", () => {
  it("uses an Error's message", () => {
    expect(messageFromError(new Error("rate limited"), "fallback")).toBe("rate limited");
  });

  it("uses a message property on a plain object", () => {
    expect(messageFromError({ message: "bad request" }, "fallback")).toBe("bad request");
  });

  it("falls back for values with no usable message", () => {
    expect(messageFromError(null, "fallback")).toBe("fallback");
    expect(messageFromError(undefined, "fallback")).toBe("fallback");
    expect(messageFromError({}, "fallback")).toBe("fallback");
    // A thrown string has no `.message`; this reproduces the original
    // `err?.message ?? fallback` rather than improving on it.
    expect(messageFromError("boom", "fallback")).toBe("fallback");
  });

  it("passes an empty message through rather than falling back", () => {
    // `??` only falls back on null/undefined, which is the original behaviour.
    expect(messageFromError({ message: "" }, "fallback")).toBe("");
  });
});

describe("http responses", () => {
  it("returns 200 with a JSON content type", async () => {
    const response = aiTextResponse("guidance");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(await response.json()).toEqual({ aiText: "guidance" });
  });

  it("sets the content type on errors too", async () => {
    // Two of the original's five error paths omitted this header and replied
    // as text/plain to a client calling .json().
    const response = errorResponse("No images provided", 400);
    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(await response.json()).toEqual({ error: "No images provided" });
  });
});
