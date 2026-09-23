import "server-only";
import strings from "@/data/strings.json";
import { apiLabelFor } from "@/lib/subjects";
import { getOpenAIClient, modelFor, storeFor } from "@/lib/server/openai";
import { loadPrompt } from "@/lib/server/prompts";
import { fragment, loadTemplate, renderTemplate } from "@/lib/server/templates";
import { MAX_PROMPT_CHARS, askLine, imageParts } from "@/lib/server/ai/shared";
import type { HelpRequest } from "@/lib/types";

/**
 * The user turn for a help request.
 *
 * Truncation is a hard character slice rather than a line-aware cut, so a
 * submission longer than the cap loses its tail instead of being rejected.
 */
export function buildHelpUserText(body: HelpRequest): string {
  return renderTemplate(loadTemplate("help.user"), {
    ask: askLine(body.ask),
    subject: apiLabelFor(body.subjectMode),
    code: body.code?.trim() ? body.code.slice(0, MAX_PROMPT_CHARS) : fragment("codeMissing"),
  });
}

/**
 * Coaching hints for a submission. The rule against handing out a solution
 * lives in data/prompts/help.md, not here.
 */
export async function requestHelp(body: HelpRequest): Promise<string> {
  const response = await getOpenAIClient().responses.create({
    model: modelFor("help"),
    store: storeFor("help"),
    text: { format: { type: "text" } },
    input: [
      { role: "developer", content: [{ type: "input_text", text: loadPrompt("help") }] },
      {
        role: "user",
        content: [{ type: "input_text", text: buildHelpUserText(body) }, ...imageParts(body.images)],
      },
    ],
  });

  // `??` rather than `||`: an empty string is a real, if unhelpful, reply and
  // is passed through. Only a missing field falls back.
  return response.output_text ?? strings.response.emptyResponseFallback;
}
