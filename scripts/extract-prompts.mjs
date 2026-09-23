#!/usr/bin/env node
/**
 * One-shot extractor: lifts the three `developer`-role system prompts out of
 * the pre-refactor API routes and writes them to `data/prompts/*.md`.
 *
 * WHY a script: these prompts are the product. The help prompt alone is ~20
 * lines of carefully-tuned instructions containing en-dashes, curly quotes and
 * nested quotation marks, and a single character changed by a careless paste
 * changes what students are told. Extracting them mechanically and then
 * asserting the result is byte-identical to the original is the only way to
 * move them with confidence.
 *
 * Usage: node scripts/extract-prompts.mjs
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

/** The last commit before the refactor began; the source of truth for behavior. */
export const BASELINE_REF = "ec79f2d";

/** Which template-literal constant in which route holds each prompt. */
const PROMPTS = [
  { name: "help", path: "app/api/help/route.ts", constant: "DEV_MESSAGE" },
  { name: "locate", path: "app/api/locate/route.ts", constant: "LOCATE_MESSAGE" },
  { name: "extract", path: "app/api/extract/route.ts", constant: "EXTRACT_DEV_MESSAGE" },
];

function readBaseline(path) {
  return execFileSync("git", ["show", `${BASELINE_REF}:${path}`], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

/**
 * Pulls `const NAME = \`...\`.trim();` apart.
 *
 * The original applied `.trim()` to each literal, so the stored file must be
 * the trimmed value, otherwise the leading newline every one of them starts
 * with would be sent to the model and the prompt would no longer be identical.
 */
function extractPrompt({ path, constant }) {
  const source = readBaseline(path);
  const match = source.match(
    new RegExp(String.raw`const ${constant}\s*=\s*\`([\s\S]*?)\`\s*\.trim\(\);`),
  );
  if (!match) throw new Error(`Could not find ${constant} in ${path}`);
  if (match[1].includes("${")) {
    throw new Error(`${constant} interpolates values and cannot be a static file`);
  }
  // Unescape the two sequences a template literal can carry: an escaped
  // backtick and an escaped dollar. Nothing else in these prompts is escaped.
  return match[1].replace(/\\`/g, "`").replace(/\\\$/g, "$").trim();
}

export function extractPrompts() {
  return Object.fromEntries(
    PROMPTS.map((spec) => [spec.name, extractPrompt(spec)]),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const [name, text] of Object.entries(extractPrompts())) {
    // A trailing newline so the files are well-formed text; the loader trims.
    writeFileSync(new URL(`../data/prompts/${name}.md`, import.meta.url), `${text}\n`);
    console.log(`Wrote data/prompts/${name}.md (${text.length} chars)`);
  }
}
