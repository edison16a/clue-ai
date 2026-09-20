#!/usr/bin/env node
/**
 * One-shot splitter: cuts the 1745-line globals.css into per-feature files.
 *
 * WHY mechanically: the cascade is positional. Two rules with equal
 * specificity are decided purely by which comes later in the concatenated
 * stylesheet, and this file relies on that — `.uploadRow` is declared three
 * times and only the last one's grid columns apply. Re-typing or re-ordering
 * the sections by hand would silently change which declarations win.
 *
 * The splitter therefore cuts only at section-comment boundaries, keeps each
 * slice byte-identical, and emits an import order that reproduces the original
 * sequence exactly. The two palette sections are dropped because
 * tokens.generated.css supplies them from data/theme.json.
 *
 * Usage: node scripts/split-stylesheet.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

/** The last commit before the refactor began; the source of truth for behavior. */
const BASELINE_REF = "ec79f2d";

/**
 * Contiguous, ordered slices. `startLine` is 1-based and inclusive; each slice
 * runs to the line before the next one starts.
 *
 * `drop: true` marks the two custom-property blocks now generated from
 * data/theme.json. They are safe to relocate to the top of the bundle: the
 * `:root.theme-*` blocks carry an extra class, so they beat the plain `:root`
 * rules from anywhere in the file.
 */
const SLICES = [
  { startLine: 1, file: "reset.css", title: "Reset and element defaults" },
  { startLine: 11, drop: true, title: "Palette — now data/theme.json" },
  { startLine: 40, file: "base.css", title: "Page background and body" },
  { startLine: 68, file: "layout.css", title: "Container, hero, panel grid" },
  { startLine: 229, file: "left-column.css", title: "Code box and drop zone" },
  { startLine: 365, file: "response.css", title: "AI response panel" },
  { startLine: 457, file: "footer.css", title: "Footer" },
  { startLine: 465, file: "upload-row.css", title: "Upload row, thumbnails, ask input" },
  { startLine: 663, file: "loader.css", title: "Indeterminate loading bar" },
  { startLine: 743, file: "codebox.css", title: "Code box scrollbar" },
  { startLine: 770, file: "subject-bar.css", title: "Subject mode chips" },
  { startLine: 931, file: "history.css", title: "Past questions section" },
  { startLine: 1186, drop: true, title: "Manual theme palettes — now data/theme.json" },
  { startLine: 1215, file: "theme-picker.css", title: "Theme picker bar" },
  { startLine: 1307, file: "buttons.css", title: "New Prompt button" },
  { startLine: 1373, file: "line-hints.css", title: "Line highlight overlay" },
  { startLine: 1535, file: "scrollbars.css", title: "Global scrollbars" },
  { startLine: 1555, file: "light-theme.css", title: "Light mode overrides" },
];

const baseline = execFileSync("git", ["show", `${BASELINE_REF}:app/globals.css`], {
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
});
const lines = baseline.split("\n");

mkdirSync(new URL("../app/styles/", import.meta.url), { recursive: true });

const imports = ['@import "./styles/tokens.generated.css";'];
let emitted = 0;

for (const [index, slice] of SLICES.entries()) {
  const start = slice.startLine - 1;
  const end = index + 1 < SLICES.length ? SLICES[index + 1].startLine - 1 : lines.length;
  const body = lines.slice(start, end).join("\n");

  if (slice.drop) continue;

  writeFileSync(
    new URL(`../app/styles/${slice.file}`, import.meta.url),
    `/* ${slice.title} */\n${body.replace(/^\s*\n/, "")}`.replace(/\n*$/, "\n"),
  );
  imports.push(`@import "./styles/${slice.file}";`);
  emitted += 1;
}

writeFileSync(
  new URL("../app/globals.css", import.meta.url),
  [
    "/*",
    " * Stylesheet entry point.",
    " *",
    " * Import order is the cascade. These files were cut from one 1745-line",
    " * stylesheet at its own section boundaries, and several selectors are",
    " * declared in more than one of them — `.uploadRow` appears three times,",
    " * and only the last declaration's grid columns take effect. Reordering",
    " * these lines changes which rules win, so keep them in this sequence.",
    " *",
    " * tokens.generated.css comes first and is generated from data/theme.json;",
    " * run `npm run generate:tokens` after editing a colour.",
    " */",
    "",
    ...imports,
    "",
  ].join("\n"),
);

console.log(`Wrote ${emitted} stylesheets and a globals.css of ${imports.length} imports`);
