import { requestLocate } from "@/lib/server/ai/locate";
import { aiTextResponse } from "@/lib/server/http";
import { jsonPost } from "@/lib/server/route";
import type { LocateRequest } from "@/lib/types";

/** Node rather than edge: the prompt loader reads from the filesystem. */
export const runtime = "nodejs";

/**
 * Returns the line ranges worth inspecting, as plain text.
 *
 * The reply is deliberately not JSON. lib/locator.ts parses it tolerantly, so
 * a stray sentence or a missing header costs some highlights rather than the
 * whole feature. An empty reply is valid and means "no ranges".
 */
export const POST = jsonPost<LocateRequest>(async (body) => aiTextResponse(await requestLocate(body)));
