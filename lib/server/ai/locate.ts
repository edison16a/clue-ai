import "server-only";
import { apiLabelFor } from "@/lib/subjects";
import { buildNumberedListing, splitLines } from "@/lib/numbering";
import { getOpenAIClient, modelFor, storeFor } from "@/lib/server/openai";
import { loadPrompt } from "@/lib/server/prompts";
import { fragment, loadTemplate, renderTemplate } from "@/lib/server/templates";
import { MAX_PROMPT_CHARS, askLine } from "@/lib/server/ai/shared";
import type { LocateRequest } from "@/lib/types";

/**
 * The user turn for a locate request.
 *
 * The cap applies to the *numbered* listing, so the "  12 | " gutter counts
 * against it as well as the code. The "(none provided)" branch cannot
 * actually fire, because splitting any string yields at least one line; it
 * is kept because the original had it and removing it changes nothing.
 */
export function buildLocateUserText(body: LocateRequest): string {
  const code = typeof body.code === "string" ? body.code : "";
  return renderTemplate(loadTemplate("locate.user"), {
    ask: askLine(body.ask),
    subject: apiLabelFor(body.subjectMode),
    code: splitLines(code).length
      ? buildNumberedListing(code).slice(0, MAX_PROMPT_CHARS)
      : fragment("codeMissing"),
  });
}

/**
 * Line ranges worth inspecting, as the plain-text block lib/locator.ts parses.
 *
 * Images are not forwarded. The reply is line numbers against the text in
 * the code box, and a screenshot has no numbering that corresponds to it.
 */
export async function requestLocate(body: LocateRequest): Promise<string> {
  const response = await getOpenAIClient().responses.create({
    model: modelFor("locate"),
    store: storeFor("locate"),
    input: [
      { role: "developer", content: [{ type: "input_text", text: loadPrompt("locate") }] },
      { role: "user", content: [{ type: "input_text", text: buildLocateUserText(body) }] },
    ],
  });
  return response.output_text ?? "";
}
