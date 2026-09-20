import "server-only";
import configData from "@/data/config.json";
import { apiLabelFor } from "@/lib/subjects";
import { stripCodeFences } from "@/lib/fences";
import { buildNumberedListing, splitLines } from "@/lib/numbering";
import { getOpenAIClient, modelFor, storeFor } from "@/lib/server/openai";
import { loadPrompt } from "@/lib/server/prompts";
import type { ExtractRequest, HelpRequest, LocateRequest } from "@/lib/types";

/**
 * The three model calls, separated from their HTTP wrappers.
 *
 * Prompt assembly is the part of this app most worth reading and most likely
 * to be changed, and it was previously buried between `await req.json()` and
 * `new Response(...)` in each route. Isolating it means the interesting logic
 * can be read — and tested — without standing up a request.
 */

/** How many characters of submitted work reach the prompt. */
const MAX_PROMPT_CHARS = configData.limits.maxPromptChars;

/**
 * The line the prompts use when the student typed nothing in the "what do you
 * need help with" box. Saying so explicitly is better than an empty bullet,
 * which reads to the model as a truncated message.
 */
const NO_DESCRIPTION = "• (no extra description provided)";

/** Formats the student's free-text context as a prompt bullet. */
function askBullet(ask: string | undefined): string {
  return ask?.trim() ? `• ${ask.trim()}` : NO_DESCRIPTION;
}

/** One entry in a Responses-API `content` array. */
type ContentPart =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string; detail: "auto" };

/**
 * Builds the image parts of a user turn.
 *
 * Entries without a `src` are skipped rather than rejected: the client builds
 * this array from FileReader results, and a read that failed leaves a hole
 * that should cost one image, not the whole request.
 */
function imageParts(images: ReadonlyArray<{ src?: string }> | undefined): ContentPart[] {
  return (images ?? [])
    .filter((image): image is { src: string } => Boolean(image?.src))
    // `detail` is required by the SDK's type. The original built this array
    // as `any[]` and omitted the field, which the API resolves to "auto" —
    // so stating it explicitly sends the identical request.
    .map((image) => ({ type: "input_image", image_url: image.src, detail: "auto" }));
}

/**
 * Coaching hints for a submission. Never returns a solution — that constraint
 * lives in data/prompts/help.md, not here.
 */
export async function requestHelp(body: HelpRequest): Promise<string> {
  const userText = [
    "Student request/context:",
    askBullet(body.ask),
    "",
    "Subject:",
    `• ${apiLabelFor(body.subjectMode)}`,
    "",
    "Code snippet (may be partial):",
    // Truncation guards the context window. It is a hard slice rather than a
    // line-aware cut, matching the original; a submission longer than the cap
    // loses its tail rather than being rejected.
    body.code?.trim() ? body.code.slice(0, MAX_PROMPT_CHARS) : "(none provided)",
    "",
    "Task: Give concrete, location-specific coaching-only hints and questions. Do NOT provide solutions or final code. Highlight the next spots to inspect and what to verify there.",
  ].join("\n");

  const response = await getOpenAIClient().responses.create({
    model: modelFor("help"),
    store: storeFor("help"),
    text: { format: { type: "text" } },
    input: [
      { role: "developer", content: [{ type: "input_text", text: loadPrompt("help") }] },
      {
        role: "user",
        content: [{ type: "input_text", text: userText }, ...imageParts(body.images)],
      },
    ],
  });

  return response.output_text ?? "";
}

/**
 * Line ranges worth inspecting, as the plain-text block lib/locator.ts parses.
 *
 * Images are deliberately not forwarded: the reply is line numbers against the
 * text in the code box, and a screenshot has no line numbers that correspond
 * to it. Sending one would invite the model to number the image instead.
 */
export async function requestLocate(body: LocateRequest): Promise<string> {
  const code = typeof body.code === "string" ? body.code : "";
  const lines = splitLines(code);
  const numbered = buildNumberedListing(code);

  const userText = [
    "Student request/context:",
    askBullet(body.ask),
    "",
    "Subject:",
    `• ${apiLabelFor(body.subjectMode)}`,
    "",
    "Code with line numbers (include blank lines as shown):",
    // Truncation is applied to the *numbered* text, so the cap counts the
    // "  12 | " gutter as well as the code. Matches the original.
    lines.length ? numbered.slice(0, MAX_PROMPT_CHARS) : "(none provided)",
    "",
    "Return only the specified text format. No fixes.",
  ].join("\n");

  const response = await getOpenAIClient().responses.create({
    model: modelFor("locate"),
    store: storeFor("locate"),
    input: [
      { role: "developer", content: [{ type: "input_text", text: loadPrompt("locate") }] },
      { role: "user", content: [{ type: "input_text", text: userText }] },
    ],
  });

  return response.output_text ?? "";
}

/** Result of transcribing images, after fences are stripped. */
export interface ExtractResult {
  /** Transcribed text; empty when the model found nothing to read. */
  aiText: string;
}

/**
 * Transcribes code out of uploaded screenshots, preserving the student's
 * mistakes — correcting them here would hand back an answer.
 */
export async function requestExtract(body: ExtractRequest): Promise<ExtractResult> {
  const userText = [
    "If relevant, context from the student:",
    askBullet(body.ask),
    // An unset subject contributes no line at all, rather than an empty one.
    body.subjectMode ? `Subject: ${body.subjectMode}` : "",
    "",
    "Extract ONLY the raw text/code. Do not fix errors.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await getOpenAIClient().responses.create({
    model: modelFor("extract"),
    store: storeFor("extract"),
    text: { format: { type: "text" } },
    input: [
      { role: "developer", content: [{ type: "input_text", text: loadPrompt("extract") }] },
      {
        role: "user",
        content: [{ type: "input_text", text: userText }, ...imageParts(body.images)],
      },
    ],
  });

  return { aiText: stripCodeFences(response.output_text?.trim() ?? "") };
}
