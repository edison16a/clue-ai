#!/usr/bin/env node
/**
 * Proves the split stylesheet is equivalent to the pre-refactor globals.css.
 *
 * Comparing the files textually would prove nothing — they are deliberately
 * arranged differently. What must be identical is the *result*: for every
 * (media query, selector, property) the browser sees, the value that wins.
 *
 * So both versions are flattened into that map — walking declarations in
 * source order and letting later ones overwrite earlier, which is exactly what
 * the cascade does for rules of equal specificity — and the two maps are
 * diffed. A section moved across a duplicate selector, or a dropped rule,
 * shows up here as a changed or missing key.
 *
 * Usage: node scripts/verify-stylesheet.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BASELINE_REF = "ec79f2d";
const STYLES = new URL("../app/styles/", import.meta.url);

/** Removes comments so their text cannot be parsed as declarations. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * Flattens a stylesheet to `"<context>||<selector>||<property>" -> value`.
 *
 * Context is the enclosing at-rule (a media query) or "" at top level, so a
 * rule inside `@media (max-width: 640px)` never collides with the same
 * selector outside it.
 */
function flatten(css) {
  const result = new Map();
  const source = stripComments(css);
  let index = 0;

  function parseBlock(context) {
    while (index < source.length) {
      const brace = source.indexOf("{", index);
      const close = source.indexOf("}", index);

      // A closing brace before the next opening one ends the enclosing block.
      if (close !== -1 && (brace === -1 || close < brace)) {
        index = close + 1;
        return;
      }
      if (brace === -1) return;

      const prelude = source.slice(index, brace).trim();
      index = brace + 1;

      if (prelude.startsWith("@")) {
        // An at-rule with a body: recurse with it as the new context.
        parseBlock(context ? `${context} AND ${prelude}` : prelude);
        continue;
      }

      // A style rule: read declarations up to its closing brace.
      const end = source.indexOf("}", index);
      const body = source.slice(index, end === -1 ? source.length : end);
      index = end === -1 ? source.length : end + 1;

      // Each comma-separated selector gets its own entry, so a grouped rule
      // and the same selectors written separately flatten identically.
      for (const selector of prelude.split(",").map((s) => s.trim().replace(/\s+/g, " "))) {
        if (!selector) continue;
        for (const declaration of body.split(";")) {
          const colon = declaration.indexOf(":");
          if (colon === -1) continue;
          const property = declaration.slice(0, colon).trim();
          const value = declaration.slice(colon + 1).trim().replace(/\s+/g, " ");
          if (!property || !value) continue;
          // Later wins, which is the cascade for equal specificity.
          result.set(`${context}||${selector}||${property}`, value);
        }
      }
    }
  }

  parseBlock("");
  return result;
}

const before = flatten(
  execFileSync("git", ["show", `${BASELINE_REF}:app/globals.css`], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  }),
);

// Rebuild the bundle the way the browser will: follow globals.css's imports
// in order and concatenate.
const entry = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const importedFiles = [...entry.matchAll(/@import\s+"\.\/styles\/([^"]+)"/g)].map((m) => m[1]);
const after = flatten(
  importedFiles.map((file) => readFileSync(new URL(file, STYLES), "utf8")).join("\n"),
);

const problems = [];
for (const [key, value] of before) {
  if (!after.has(key)) problems.push(`MISSING  ${key} = ${value}`);
  else if (after.get(key) !== value) {
    problems.push(`CHANGED  ${key}\n           before: ${value}\n           after:  ${after.get(key)}`);
  }
}
for (const key of after.keys()) {
  if (!before.has(key)) problems.push(`ADDED    ${key} = ${after.get(key)}`);
}

console.log(`baseline declarations: ${before.size}`);
console.log(`split declarations:    ${after.size}`);
console.log(`stylesheets imported:  ${importedFiles.length}`);

if (problems.length) {
  console.error(`\n${problems.length} difference(s):`);
  for (const problem of problems.slice(0, 40)) console.error(`  ${problem}`);
  process.exit(1);
}
console.log("\nok  every winning declaration is identical — the split is a no-op");
