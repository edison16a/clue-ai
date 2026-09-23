import "server-only";
import strings from "@/data/strings.json";
import { errorResponse, messageFromError } from "@/lib/server/http";

/**
 * Wraps a POST handler with the JSON parsing and error handling all three
 * routes need.
 *
 * Each route used to repeat the same block: parse the body, run, catch,
 * log, reply 500 with the error's message. Three copies meant a change to
 * error handling (redacting messages, say) had to be made three times and
 * could easily be made twice. A malformed body lands in the same catch as
 * any other failure, as it always did.
 */
export function jsonPost<Body>(handler: (body: Body) => Promise<Response>) {
  return async function POST(req: Request): Promise<Response> {
    try {
      // `return await`, not `return`: a bare return would let a rejected
      // handler promise escape this catch and skip the 500 reply.
      return await handler((await req.json()) as Body);
    } catch (error) {
      console.error(error);
      return errorResponse(messageFromError(error, strings.errors.unknownError), 500);
    }
  };
}
