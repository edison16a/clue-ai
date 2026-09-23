#!/usr/bin/env node
/**
 * Generates `app/styles/tokens.generated.css` from `data/theme.json`.
 *
 * WHY generate rather than hand-write: CSS has no way to import values from
 * JSON, so the palette has to exist as CSS somewhere. Generating it keeps
 * data/theme.json the single source of truth. A designer edits one file and
 * reruns `npm run generate:tokens` instead of hunting four blocks spread over
 * 1200 lines of stylesheet and working out which one the cascade picks.
 *
 * The output is committed so the build needs no extra step; validate-data.mjs
 * regenerates it in memory and fails if the committed copy has gone stale.
 *
 * Usage: node scripts/generate-tokens.mjs [--check]
 */
import { readFileSync, writeFileSync } from "node:fs";

const OUTPUT = new URL("../app/styles/tokens.generated.css", import.meta.url);

/** Renders one palette block, restoring its `@media` wrapper if it had one. */
function renderBlock({ selector, media, tokens }) {
  const body = Object.entries(tokens)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");

  if (!media) return `${selector} {\n${body}\n}`;
  return `@media ${media} {\n  ${selector} {\n${body
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n")}\n  }\n}`;
}

export function renderTokens(theme) {
  const blocks = Object.entries(theme.palettes).map(([key, block]) => {
    const scope = block.media ? `${block.selector} under @media ${block.media}` : block.selector;
    return `/* ${key}: ${scope} */\n${renderBlock(block)}`;
  });

  return [
    "/*",
    " * GENERATED FILE. DO NOT EDIT.",
    " *",
    " * Produced from data/theme.json by scripts/generate-tokens.mjs.",
    " * Run `npm run generate:tokens` after changing a colour.",
    " *",
    " * Block order matters: `:root` and the prefers-color-scheme override",
    " * have identical specificity, so only source order decides between",
    " * them. The `:root.theme-*` blocks carry an extra class and beat both",
    " * wherever they sit, which is how the manual toggle overrides the",
    " * operating system's preference.",
    " */",
    "",
    ...blocks,
    "",
  ].join("\n");
}

export function loadTheme() {
  return JSON.parse(readFileSync(new URL("../data/theme.json", import.meta.url), "utf8"));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const css = renderTokens(loadTheme());
  if (process.argv.includes("--check")) {
    const onDisk = readFileSync(OUTPUT, "utf8");
    if (onDisk !== css) {
      console.error("tokens.generated.css is stale; run `npm run generate:tokens`");
      process.exit(1);
    }
    console.log("tokens.generated.css is up to date");
  } else {
    writeFileSync(OUTPUT, css);
    console.log("Wrote app/styles/tokens.generated.css");
  }
}
