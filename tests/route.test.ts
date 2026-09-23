import { describe, expect, it, vi } from "vitest";
import { jsonPost } from "@/lib/server/route";

function post(body: string) {
  return new Request("http://x/api", { method: "POST", body });
}

describe("jsonPost", () => {
  it("passes the parsed body to the handler", async () => {
    const handler = vi.fn(async (body: { a: number }) => new Response(String(body.a)));
    const response = await jsonPost(handler)(post('{"a":7}'));
    expect(await response.text()).toBe("7");
  });

  it("turns a rejected handler into a 500 with the message", async () => {
    // The `return await` inside the wrapper is what makes this work; a bare
    // `return` would let the rejection escape the catch.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await jsonPost(async () => { throw new Error("upstream down"); })(post("{}"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "upstream down" });
  });

  it("answers a malformed body with a 500, as the routes always did", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await jsonPost(async () => new Response("unreached"))(post("not json"));
    expect(response.status).toBe(500);
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });
});
