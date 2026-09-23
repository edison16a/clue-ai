import "server-only";
import { stripCodeFences } from "@/lib/fences";
import { getOpenAIClient, modelFor, storeFor } from "@/lib/server/openai";
import { loadPrompt } from "@/lib/server/prompts";
import { fragment, loadTemplate, renderTemplate } from "@/lib/server/templates";
import { askLine, imageParts } from "@/lib/server/ai/shared";
import type { ExtractRequest } from "@/lib/types";

/**
 * The user turn for an extract request.
 *
 * Unlike help and locate, this sends the raw subject id ("cs"), not its
 * label ("Computer Science"). That is how the original behaved and the model
 * copes either way, so it is flagged rather than changed.
 */
export function buildExtractUserText(body: ExtractRequest): string {
  return renderTemplate(loadTemplate("extract.user"), {
    ask: askLine(body.ask),
    subject: body.subjectMode ? fragment("extractSubject", body.subjectMode) : "",
  });
}

/** Result of transcribing images, after fences are stripped. */
export interface ExtractResult {
  /** Transcribed text; empty when the model found nothing to read. */
  aiText: string;
}

/**
 * Transcribes code out of uploaded screenshots, keeping the student's
 * mistakes. Correcting them here would hand back an answer.
 */
export async function requestExtract(body: ExtractRequest): Promise<ExtractResult> {
  const response = await getOpenAIClient().responses.create({
    model: modelFor("extract"),
    store: storeFor("extract"),
    text: { format: { type: "text" } },
    input: [
      { role: "developer", content: [{ type: "input_text", text: loadPrompt("extract") }] },
      {
        role: "user",
        content: [{ type: "input_text", text: buildExtractUserText(body) }, ...imageParts(body.images)],
      },
    ],
  });
  return { aiText: stripCodeFences(response.output_text?.trim() ?? "") };
}
