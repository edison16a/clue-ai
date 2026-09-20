import { errorResponse, aiTextResponse, messageFromError } from "@/lib/server/http";
import { requestLocate } from "@/lib/server/services";
import strings from "@/data/strings.json";
import type { LocateRequest } from "@/lib/types";

/** Node rather than edge: the prompt loader reads from the filesystem. */
export const runtime = "nodejs";

/**
 * Returns the line ranges worth inspecting, as plain text.
 *
 * The reply is deliberately not JSON. It is parsed client-side by
 * lib/locator.ts, which tolerates a stray sentence or a missing header — a
 * strict JSON contract would turn any formatting slip into a total failure,
 * and this feature degrades better than it fails.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LocateRequest;
    // An empty reply is valid here and means "no ranges"; the client renders
    // its own "No line ranges returned." note for it.
    return aiTextResponse(await requestLocate(body));
  } catch (error) {
    console.error(error);
    return errorResponse(messageFromError(error, strings.errors.unknownError), 500);
  }
}
