import "server-only";
import type { AiTextResponse, ApiErrorResponse } from "@/lib/types";

/**
 * JSON response helpers.
 *
 * Each route hand-built `new Response(JSON.stringify(...), { status, headers })`
 * and two of the five error paths omitted the Content-Type header, so those
 * replies went out as `text/plain` even though the client called `.json()` on
 * them. It happened to work (fetch parses regardless), but it is the kind of
 * inconsistency that breaks the moment anything else consumes the endpoint.
 */

/** A successful reply carrying model output. */
export function aiTextResponse(aiText: string): Response {
  return jsonResponse<AiTextResponse>({ aiText }, 200);
}

/** A failure reply. The message is surfaced to the student, prefixed with strings.response.errorPrefix. */
export function errorResponse(message: string, status: number): Response {
  return jsonResponse<ApiErrorResponse>({ error: message }, status);
}

function jsonResponse<T>(body: T, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Extracts a message from an unknown thrown value.
 *
 * Handles the two shapes a route can realistically catch: an Error (or any
 * object with a string `message`, which is what the OpenAI SDK rejects
 * with), and a bare thrown string.
 *
 * The string case is the fix. This used to reproduce the original
 * `err?.message ?? fallback`, and a string has no `.message`, so a
 * `throw "quota exceeded"` from a dependency reached the student as
 * "Unknown error" with the actual reason thrown away. An empty-string
 * message still passes through unchanged, as before.
 */
export function messageFromError(error: unknown, fallback: string): string {
  if (typeof error === "string" && error) return error;
  const message =
    error !== null && error !== undefined
      ? (error as { message?: unknown }).message
      : undefined;
  return typeof message === "string" ? message : fallback;
}
