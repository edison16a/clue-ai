import strings from "@/data/strings.json";
import type { ExtractRequest, HelpRequest, LocateRequest } from "@/lib/types";

/**
 * Browser-side calls to the three API routes.
 *
 * The workspace component used to write each fetch out in full, three times:
 * POST the JSON, parse the reply, throw the server's `error` message or a
 * fallback. The copies had already drifted in small ways (one read
 * `data.aiText`, another `data?.aiText`), which is how a later change ends up
 * applied to two of them. Each exported function keeps its own post-processing
 * exactly as the component had it.
 */

/**
 * POSTs a JSON body and returns the parsed reply.
 *
 * A non-2xx status throws with the server's `error` field when it sent one,
 * otherwise with `failureMessage`. A body that is not JSON throws the parser's
 * own error, as before.
 */
async function postJson(url: string, body: unknown, failureMessage: string): Promise<any> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || failureMessage);
  return data;
}

/** Transcribed text from uploaded images. Throws when nothing legible came back. */
export async function fetchExtraction(body: ExtractRequest): Promise<string> {
  const data = await postJson("/api/extract", body, strings.errors.extractFailed);
  const extracted = (data.aiText ?? "").trim();
  if (!extracted) throw new Error(strings.errors.noTextExtracted);
  return extracted;
}

/**
 * Coaching text for a submission. Leading whitespace is trimmed so a reply
 * that opens with a blank line does not push the Markdown down the panel.
 */
export async function fetchGuidance(body: HelpRequest): Promise<string> {
  const data = await postJson("/api/help", body, strings.errors.requestFailed);
  return (data.aiText ?? "").trimStart();
}

/** The locator's raw plain-text reply, for lib/locator.ts to parse. */
export async function fetchLocatorText(body: LocateRequest): Promise<string> {
  const data = await postJson("/api/locate", body, strings.errors.requestFailed);
  return typeof data?.aiText === "string" ? data.aiText : "";
}
