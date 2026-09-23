import strings from "@/data/strings.json";
import { requestExtract } from "@/lib/server/ai/extract";
import { aiTextResponse, errorResponse } from "@/lib/server/http";
import { jsonPost } from "@/lib/server/route";
import type { ExtractRequest } from "@/lib/types";

/** Node rather than edge: the prompt loader reads from the filesystem. */
export const runtime = "nodejs";

/**
 * Transcribes code out of uploaded screenshots.
 *
 * The two failures get different statuses because they mean different
 * things to a student: 400 means nothing was sent, 422 means the images
 * arrived but nothing legible came back, so a clearer photo might work.
 */
export const POST = jsonPost<ExtractRequest>(async (body) => {
  if (!body.images || body.images.length === 0) {
    return errorResponse(strings.errors.noImagesProvided, 400);
  }
  const { aiText } = await requestExtract(body);
  if (!aiText) {
    return errorResponse(strings.errors.noTextExtractedServer, 422);
  }
  return aiTextResponse(aiText);
});
