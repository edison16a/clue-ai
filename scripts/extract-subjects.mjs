#!/usr/bin/env node
/**
 * One-shot extractor: lifts the subject-mode table out of the pre-refactor
 * source and emits it as `data/subjects.json`.
 *
 * WHY this is a script and not a copy-paste job: the same five subjects were
 * described in seven different places in the original code (a SUBJECT_MODES
 * array, three parallel ternary chains for labels/placeholders/aria-labels, a
 * `modeReadable` switch, a per-mode block of inline icon JSX, and a
 * SUBJECT_LABELS map duplicated across two API routes). Retyping ~35 strings
 * by hand — several of which contain escapes, smart quotes and embedded
 * newlines — is exactly the kind of work that produces silent one-character
 * drift. Parsing them out guarantees the JSON is byte-identical to what the
 * app used to render.
 *
 * It reads from git rather than the working tree so it keeps producing the
 * same answer after the monolith is deleted, which is what lets
 * `validate-data.mjs` re-run it as a regression check forever.
 *
 * Usage: node scripts/extract-subjects.mjs [--stdout]
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

/** The last commit before the refactor began; the source of truth for behavior. */
export const BASELINE_REF = "ec79f2d";

const ORDER = ["cs", "math", "science", "english", "other"];

/** Reads a file as it existed at the baseline commit. */
function readBaseline(path) {
  return execFileSync("git", ["show", `${BASELINE_REF}:${path}`], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

/**
 * Turns a JS string/template literal (with its surrounding quotes) into its
 * runtime value. `JSON.parse` cannot do this: the source uses backticks and
 * `\n` escapes that JSON rejects. The literals here are static content with no
 * interpolation, so evaluating them is safe and exact.
 */
function literalValue(literal) {
  if (literal.includes("${")) {
    throw new Error(`Refusing to evaluate an interpolated literal: ${literal}`);
  }
  return new Function(`return ${literal};`)();
}

/** Matches any single- or double-quoted string, or a backtick template. */
const LITERAL = String.raw`(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\`(?:[^\`\\]|\\.)*\`)`;

/**
 * Pulls one of the `subjectMode === "x" ? <literal> : ...` chains apart.
 *
 * The chains are exhaustive but write the final arm as a bare `else` rather
 * than a fifth comparison, so the trailing literal belongs to "other".
 */
function parseTernaryChain(source, variableName) {
  const chain = source.match(
    new RegExp(String.raw`const ${variableName}\s*=\s*([\s\S]*?);\n`),
  );
  if (!chain) throw new Error(`Could not find the ${variableName} chain`);
  const body = chain[1];

  const result = {};
  const armRe = new RegExp(
    String.raw`subjectMode === "(\w+)"\s*\?\s*(${LITERAL})`,
    "g",
  );
  for (const [, id, literal] of body.matchAll(armRe)) {
    result[id] = literalValue(literal);
  }

  // The fallback arm: the last `: <literal>` in the chain, which no
  // comparison guards. Everything not named explicitly lands here, and the
  // only unnamed id is "other".
  const fallbackRe = new RegExp(String.raw`:\s*(${LITERAL})\s*;?\s*$`);
  const fallback = body.trim().match(fallbackRe);
  if (!fallback) throw new Error(`Could not find the ${variableName} fallback`);
  result.other = literalValue(fallback[1]);

  return result;
}

/** Extracts the `{ id, label, hint }` entries from the SUBJECT_MODES array. */
function parseSubjectModes(source) {
  const block = source.match(/const SUBJECT_MODES[^=]*=\s*\[([\s\S]*?)\];/);
  if (!block) throw new Error("Could not find SUBJECT_MODES");

  const entries = {};
  const entryRe = new RegExp(
    String.raw`\{\s*id:\s*"(\w+)",\s*label:\s*(${LITERAL}),\s*hint:\s*(${LITERAL})\s*\}`,
    "g",
  );
  for (const [, id, label, hint] of block[1].matchAll(entryRe)) {
    entries[id] = { label: literalValue(label), hint: literalValue(hint) };
  }
  return entries;
}

/**
 * Extracts the short display names from the `modeReadable` switch. The
 * "other" arm is written as `default:`, matching the ternary chains' shape.
 */
function parseModeReadable(source) {
  const block = source.match(/const modeReadable[\s\S]*?\n  \};/);
  if (!block) throw new Error("Could not find modeReadable");

  const short = {};
  const caseRe = new RegExp(
    String.raw`case "(\w+)":\s*\n\s*return (${LITERAL});`,
    "g",
  );
  for (const [, id, literal] of block[0].matchAll(caseRe)) {
    short[id] = literalValue(literal);
  }
  const fallback = block[0].match(
    new RegExp(String.raw`default:\s*\n\s*return (${LITERAL});`),
  );
  if (!fallback) throw new Error("Could not find the modeReadable default arm");
  short.other = literalValue(fallback[1]);
  return short;
}

/** Extracts the server-side SUBJECT_LABELS map used to caption prompts. */
function parseApiLabels(source) {
  const block = source.match(/const SUBJECT_LABELS[^=]*=\s*\{([\s\S]*?)\};/);
  if (!block) throw new Error("Could not find SUBJECT_LABELS");

  const labels = {};
  const entryRe = new RegExp(String.raw`(\w+):\s*(${LITERAL})`, "g");
  for (const [, id, literal] of block[1].matchAll(entryRe)) {
    labels[id] = literalValue(literal);
  }
  return labels;
}

export function extractSubjects() {
  const page = readBaseline("app/page.tsx");
  const helpRoute = readBaseline("app/api/help/route.ts");
  const locateRoute = readBaseline("app/api/locate/route.ts");

  const modes = parseSubjectModes(page);
  const codeLabel = parseTernaryChain(page, "codeLabel");
  const codePlaceholder = parseTernaryChain(page, "codePlaceholder");
  const uploadAriaLabel = parseTernaryChain(page, "uploadAriaLabel");
  const shortLabel = parseModeReadable(page);
  const apiLabels = parseApiLabels(helpRoute);

  // The two routes each carried their own copy of the map. Extraction is only
  // sound if they agreed; if they ever diverged, collapsing them to one entry
  // would silently pick a winner, so fail loudly instead.
  const locateLabels = parseApiLabels(locateRoute);
  for (const id of Object.keys(apiLabels)) {
    if (apiLabels[id] !== locateLabels[id]) {
      throw new Error(
        `help and locate disagree on the label for "${id}": ` +
          `${JSON.stringify(apiLabels[id])} vs ${JSON.stringify(locateLabels[id])}`,
      );
    }
  }

  const found = Object.keys(modes);
  if (found.length !== ORDER.length || found.some((id, i) => id !== ORDER[i])) {
    throw new Error(
      `Unexpected subject set/order: got ${found.join(",")}, want ${ORDER.join(",")}`,
    );
  }

  return {
    $comment:
      "Generated by scripts/extract-subjects.mjs from the pre-refactor source. " +
      "Add a subject by appending an entry here; no code change is required.",
    subjects: ORDER.map((id) => ({
      id,
      label: modes[id].label,
      shortLabel: shortLabel[id],
      apiLabel: apiLabels[id],
      hint: modes[id].hint,
      codeLabel: codeLabel[id],
      codePlaceholder: codePlaceholder[id],
      uploadAriaLabel: uploadAriaLabel[id],
    })),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const data = extractSubjects();
  const json = `${JSON.stringify(data, null, 2)}\n`;
  if (process.argv.includes("--stdout")) {
    process.stdout.write(json);
  } else {
    writeFileSync(new URL("../data/subjects.json", import.meta.url), json);
    console.log(`Wrote data/subjects.json (${data.subjects.length} subjects)`);
  }
}
