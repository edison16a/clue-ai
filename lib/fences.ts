/**
 * Strips Markdown code fences from model output.
 *
 * WHY this is needed: the extract prompt asks for raw transcribed code and
 * nothing else, but models wrap code in ``` fences by reflex. Left in place
 * the fences would be pasted into the student's textarea as if they were part
 * of their own submission, and then sent to the locator, which would number
 * them as real lines and point at the wrong places.
 */

/** A fence carrying a language tag: ```python\n...\n``` */
const TAGGED_FENCE = /^```[\w-]*\s*[\r\n]+([\s\S]*?)\s*```$/;

/** A bare fence with no language tag and no leading newline: ```...``` */
const BARE_FENCE = /^```\s*([\s\S]*?)\s*```$/;

/**
 * Removes one pair of surrounding fences, preserving the text between them.
 *
 * Only strips a fence that wraps the *entire* string — both patterns are
 * anchored. Code containing a fenced block in the middle (a Markdown file a
 * student is working on, say) is returned untouched, because removing an
 * interior fence would corrupt their content.
 */
export function stripCodeFences(text: string): string {
  const tagged = text.match(TAGGED_FENCE);
  if (tagged) return tagged[1].trim();

  const bare = text.match(BARE_FENCE);
  if (bare) return bare[1].trim();

  return text;
}
