import "server-only";
import configData from "@/data/config.json";
import { fragment } from "@/lib/server/templates";

/** How many characters of submitted work reach the prompt. */
export const MAX_PROMPT_CHARS = configData.limits.maxPromptChars;

/**
 * The student's free-text context as a prompt line.
 *
 * An empty box says so explicitly rather than leaving an empty bullet, which
 * reads to the model like a truncated message.
 */
export function askLine(ask: string | undefined): string {
  return ask?.trim() ? fragment("askPresent", ask.trim()) : fragment("askMissing");
}

/** One entry in a Responses API `content` array. */
export type ContentPart =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string; detail: "auto" };

/**
 * The image parts of a user turn.
 *
 * Entries without a `src` are skipped rather than rejected: the client builds
 * this array from FileReader results, and a read that failed should cost one
 * image, not the whole request. `detail` is required by the SDK's type; the
 * original omitted it from an untyped array, which the API resolves to
 * "auto", so stating it sends the identical request.
 */
export function imageParts(images: ReadonlyArray<{ src?: string }> | undefined): ContentPart[] {
  return (images ?? [])
    .filter((image): image is { src: string } => Boolean(image?.src))
    .map((image) => ({ type: "input_image", image_url: image.src, detail: "auto" }));
}
