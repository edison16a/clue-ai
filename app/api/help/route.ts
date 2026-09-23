import { errorResponse, aiTextResponse, messageFromError } from "@/lib/server/http";
import { requestHelp } from "@/lib/server/services";
import strings from "@/data/strings.json";
import type { HelpRequest } from "@/lib/types";

/** Node rather than edge: the prompt loader reads from the filesystem. */
export const runtime = "nodejs";

/**
 * Returns coaching hints for a submission.
 *
 * A thin adapter by design: parse, delegate, serialise. The prompt and the
 * model call live in lib/server/services.ts so they can be read and tested
 * without a request.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as HelpRequest;
    return aiTextResponse(await requestHelp(body));
  } catch (error) {
    console.error(error);
    return errorResponse(messageFromError(error, strings.errors.unknownError), 500);
  }
}
