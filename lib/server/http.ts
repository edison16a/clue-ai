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
 * Replaces the routes' `catch (err: any)` with a typed equivalent. The
 * behaviour is deliberately identical to the original `err?.message ?? fallback`,
 * including its quirks: a thrown string loses its text (strings have no
 * `.message`), and an empty-string message is returned as-is because `??` only
 * falls back on null/undefined. Both are preserved so this stays a pure move;
 * improving them is a separate change.
 *
 * One pathological input differs. `{ message: 42 }` used to be serialised
 * straight into the reply as `{"error": 42}`, because `any` let a number
 * escape through a field the client reads as a string. Returning the fallback
 * instead is the only divergence, and honouring it would mean typing the error
 * field as `unknown` to preserve a shape no real error has.
 */
export function messageFromError(error: unknown, fallback: string): string {
  const message =
    error !== null && error !== undefined
      ? (error as { message?: unknown }).message
      : undefined;
  return typeof message === "string" ? message : fallback;
}
