import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The prompt files under data/prompts/, by name. */
export type PromptName = "help" | "locate" | "extract";

/**
 * Prompts are read from disk on first use and cached for the process lifetime.
 *
 * Reading at runtime rather than importing a string constant is what makes the
 * prompts editable as content: a `.md` file can be reviewed as prose and
 * changed by someone who does not write TypeScript. Caching keeps that from
 * costing a synchronous read per request — on a warm serverless instance the
 * file is read once.
 *
 * `process.cwd()` is the project root in both `next dev` and the serverless
 * bundle. next.config.ts declares data/prompts in outputFileTracingIncludes so
 * the files are actually shipped; without that the bundler, which only traces
 * `import` statements, would have no reason to include them.
 */
const cache = new Map<PromptName, string>();

export function loadPrompt(name: PromptName): string {
  const cached = cache.get(name);
  if (cached !== undefined) return cached;

  const path = join(process.cwd(), "data", "prompts", `${name}.md`);
  // Trimmed to match the `.trim()` the inline template literals carried; the
  // files end with a newline for well-formedness, which must not reach the
  // model as trailing whitespace in the system message.
  const text = readFileSync(path, "utf8").trim();

  if (!text) {
    throw new Error(`Prompt "${name}" is empty at ${path}`);
  }

  cache.set(name, text);
  return text;
}
