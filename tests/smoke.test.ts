import { describe, expect, it } from "vitest";

/**
 * Proves the runner, the jsdom environment and the `@/` alias are all wired
 * before any real suite depends on them. If this fails, the failure is in the
 * toolchain rather than in the code under test.
 */
describe("test harness", () => {
  it("runs in a DOM environment", () => {
    expect(typeof window).toBe("object");
    expect(typeof window.localStorage.getItem).toBe("function");
  });
});
