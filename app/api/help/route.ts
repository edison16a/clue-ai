import { requestHelp } from "@/lib/server/ai/help";
import { aiTextResponse } from "@/lib/server/http";
import { jsonPost } from "@/lib/server/route";
import type { HelpRequest } from "@/lib/types";

/** Node rather than edge: the prompt loader reads from the filesystem. */
export const runtime = "nodejs";

/** Returns coaching hints for a submission. */
export const POST = jsonPost<HelpRequest>(async (body) => aiTextResponse(await requestHelp(body)));
