import { errorResponse, aiTextResponse, messageFromError } from "@/lib/server/http";
import { requestExtract } from "@/lib/server/services";
import strings from "@/data/strings.json";
import type { ExtractRequest } from "@/lib/types";

/** Node rather than edge: the prompt loader reads from the filesystem. */
export const runtime = "nodejs";

/**
 * Transcribes code out of uploaded screenshots.
 *
 * Two distinct failures are reported separately because they mean different
 * things to a student: 400 means nothing was submitted, 422 means the images
 * arrived but nothing legible came back, so retry with a clearer photo.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ExtractRequest;

    if (!body.images || body.images.length === 0) {
      return errorResponse(strings.errors.noImagesProvided, 400);
    }

    const { aiText } = await requestExtract(body);
    if (!aiText) {
      return errorResponse(strings.errors.noTextExtractedServer, 422);
    }

    return aiTextResponse(aiText);
  } catch (error) {
    console.error(error);
    return errorResponse(messageFromError(error, strings.errors.unknownError), 500);
  }
}
