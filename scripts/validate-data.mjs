#!/usr/bin/env node
/**
 * Validates every file under `data/` — structurally, and where the data was
 * machine-extracted, against a fresh re-extraction from the pre-refactor
 * source.
 *
 * WHY: the data files are the app's only copy of content that used to live in
 * source, where the TypeScript compiler policed it. Moving it to JSON traded
 * that safety net for flexibility, so this script is what replaces it. The
 * round-trip checks in particular are the proof that extraction introduced no
 * drift: if `data/subjects.json` ever stops matching what the baseline commit
 * rendered, that is a behavior change and the check fails.
 *
 * Run with `npm run validate:data`. Exits non-zero on the first failure.
 */
import { readFileSync } from "node:fs";
import { extractSubjects } from "./extract-subjects.mjs";
import { extractPrompts } from "./extract-prompts.mjs";
import { extractUploads } from "./extract-uploads.mjs";
import { execFileSync } from "node:child_process";

let failures = 0;
let checks = 0;

function check(name, fn) {
  checks += 1;
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  FAIL ${name}\n       ${err.message}`);
  }
}

function readData(relativePath) {
  return JSON.parse(
    readFileSync(new URL(`../data/${relativePath}`, import.meta.url), "utf8"),
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${message}\n       got:  ${a}\n       want: ${b}`);
}

// ---------------------------------------------------------------- subjects

console.log("data/subjects.json");
const subjectsFile = readData("subjects.json");
const SUBJECT_FIELDS = [
  "id",
  "label",
  "shortLabel",
  "apiLabel",
  "hint",
  "codeLabel",
  "codePlaceholder",
  "uploadAriaLabel",
];

check("is a non-empty array of subjects", () => {
  assert(Array.isArray(subjectsFile.subjects), "`subjects` must be an array");
  assert(subjectsFile.subjects.length > 0, "`subjects` must not be empty");
});

check("every subject carries every field", () => {
  for (const subject of subjectsFile.subjects) {
    for (const field of SUBJECT_FIELDS) {
      assert(
        typeof subject[field] === "string",
        `subject ${JSON.stringify(subject.id)} is missing a string "${field}"`,
      );
    }
    // `hint` is the one field allowed to be empty (CS has no BETA badge);
    // an empty label or placeholder would render a blank control instead.
    for (const field of SUBJECT_FIELDS.filter((f) => f !== "hint")) {
      assert(
        subject[field].length > 0,
        `subject ${JSON.stringify(subject.id)} has an empty "${field}"`,
      );
    }
  }
});

check("subject ids are unique and id-shaped", () => {
  const seen = new Set();
  for (const { id } of subjectsFile.subjects) {
    assert(/^[a-z][a-z0-9-]*$/.test(id), `id ${JSON.stringify(id)} is not slug-shaped`);
    assert(!seen.has(id), `duplicate subject id ${JSON.stringify(id)}`);
    seen.add(id);
  }
});

check("round-trips against the pre-refactor source", () => {
  assertDeepEqual(
    subjectsFile.subjects,
    extractSubjects().subjects,
    "data/subjects.json has drifted from what the baseline commit rendered",
  );
});

// ----------------------------------------------------------------- uploads

console.log("\ndata/uploads.json");
const uploadsFile = readData("uploads.json");

check("lists extensions without dots and without duplicates", () => {
  assert(Array.isArray(uploadsFile.textExtensions), "textExtensions must be an array");
  assert(uploadsFile.textExtensions.length > 0, "textExtensions must not be empty");
  const seen = new Set();
  for (const ext of uploadsFile.textExtensions) {
    // A leading dot here would produce `accept=".​.java"` and a regex that
    // matches nothing, so reject the shape rather than the symptom.
    assert(/^[a-z0-9]+$/.test(ext), `extension ${JSON.stringify(ext)} must be bare and lowercase`);
    assert(!seen.has(ext), `duplicate extension ${JSON.stringify(ext)}`);
    seen.add(ext);
  }
});

check("round-trips against the pre-refactor source", () => {
  const baseline = extractUploads();
  assertDeepEqual(
    uploadsFile.textExtensions,
    baseline.textExtensions,
    "data/uploads.json has drifted from the original accept attribute",
  );
  assertDeepEqual(
    uploadsFile.imageAcceptWildcards,
    baseline.imageAcceptWildcards,
    "data/uploads.json has drifted from the original accept attribute",
  );
});

// ------------------------------------------------------------------ config

console.log("\ndata/config.json");
const configFile = readData("config.json");
const ENDPOINTS = ["help", "locate", "extract"];

check("names a model and a store flag for every endpoint", () => {
  for (const endpoint of ENDPOINTS) {
    assert(
      typeof configFile.openai.models[endpoint] === "string" &&
        configFile.openai.models[endpoint].length > 0,
      `openai.models.${endpoint} is missing`,
    );
    assert(
      typeof configFile.openai.store[endpoint] === "boolean",
      `openai.store.${endpoint} is missing`,
    );
  }
});

check("limits are positive integers", () => {
  for (const [name, value] of Object.entries(configFile.limits)) {
    if (name.startsWith("$")) continue;
    assert(Number.isInteger(value) && value > 0, `limits.${name} must be a positive integer`);
  }
});

check("storage keys are distinct", () => {
  const keys = Object.entries(configFile.storageKeys)
    .filter(([name]) => !name.startsWith("$"))
    .map(([, value]) => value);
  assert(new Set(keys).size === keys.length, "two storage keys collide");
});

check("the default subject exists in data/subjects.json", () => {
  // A default naming a subject that was since renamed would leave the app
  // booting into a mode with no label, so bind the two files together here.
  assert(
    subjectsFile.subjects.some((s) => s.id === configFile.defaults.subject),
    `defaults.subject "${configFile.defaults.subject}" is not a known subject id`,
  );
});

check("the default theme is one the stylesheet defines", () => {
  assert(
    ["dark", "light"].includes(configFile.defaults.theme),
    `defaults.theme "${configFile.defaults.theme}" has no :root.theme-* rules`,
  );
});

// ----------------------------------------------------------------- strings

console.log("\ndata/strings.json");
const stringsFile = readData("strings.json");

/**
 * The whole pre-refactor UI, whitespace-normalised.
 *
 * JSX collapses runs of whitespace when it renders, so a string that sits on
 * three source lines renders as one. Comparing normalised forms is what lets a
 * literal grep of the original source prove the extracted copy is unchanged.
 */
const baselineUi = ["app/page.tsx", "app/layout.tsx", "app/api/help/route.ts",
  "app/api/extract/route.ts", "app/api/locate/route.ts"]
  .map((path) =>
    execFileSync("git", ["show", `ec79f2d:${path}`], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    }),
  )
  .join("\n")
  .replace(/\s+/g, " ");

/** Walks every leaf string in the strings file, skipping `$comment` keys. */
function* leafStrings(node, path = []) {
  if (typeof node === "string") {
    yield [path.join("."), node];
    return;
  }
  if (Array.isArray(node)) {
    for (const [i, child] of node.entries()) yield* leafStrings(child, [...path, i]);
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$")) continue; // documentation, not content
      yield* leafStrings(child, [...path, key]);
    }
  }
}

check("no leaf string is empty", () => {
  for (const [path, value] of leafStrings(stringsFile)) {
    assert(value.length > 0, `strings.${path} is empty`);
  }
});

/**
 * Strings the original never stored whole, so a verbatim grep cannot find
 * them. Each maps to the source fragments it was built from; those fragments
 * are asserted instead, which is the same proof one level down.
 *
 * Storing the assembled sentence here (rather than the fragments) is the point
 * of the extraction: `{theme === "light" ? "Light" : "Dark"} mode` is not a
 * string anyone can translate or copy-edit.
 */
const COMPOSED_IN_SOURCE = {
  "toggles.themeLight": ['"Light" : "Dark"} mode'],
  "toggles.themeDark": ['"Light" : "Dark"} mode'],
  "toggles.themeTitleToLight": ['Switch to ${theme === "light" ? "dark" : "light"} mode'],
  "toggles.themeTitleToDark": ['Switch to ${theme === "light" ? "dark" : "light"} mode'],
};

check("composed strings match the fragments the baseline built them from", () => {
  for (const [path, fragments] of Object.entries(COMPOSED_IN_SOURCE)) {
    for (const fragment of fragments) {
      assert(
        baselineUi.includes(fragment.replace(/\s+/g, " ")),
        `strings.${path} claims to come from ${JSON.stringify(fragment)}, ` +
          "which is not in the baseline source",
      );
    }
  }
});

check("every string appears verbatim in the pre-refactor UI", () => {
  // Strings assembled at runtime cannot appear whole in the source, so each is
  // split on its `{placeholder}` slots and every literal fragment is checked
  // independently. Fragments under 8 characters ("Mode:", "Clear") are too
  // short for a substring match to mean anything, so they are skipped rather
  // than producing false confidence.
  const misses = [];
  for (const [path, value] of leafStrings(stringsFile)) {
    if (path in COMPOSED_IN_SOURCE) continue; // proven by the check above
    for (const fragment of value.split(/\{[a-z]+\}/i)) {
      const needle = fragment.replace(/\s+/g, " ").trim();
      if (needle.length < 8) continue;
      if (!baselineUi.includes(needle)) misses.push(`${path}: ${JSON.stringify(needle)}`);
    }
  }
  assert(
    misses.length === 0,
    `${misses.length} string(s) are not present in the baseline source:\n       ` +
      misses.join("\n       "),
  );
});

check("the history description's {count} matches the configured cap", () => {
  // The original hard-coded the word "10" into this sentence while the cap
  // itself lived in a `.slice(0, 10)`. They are now one value; assert the
  // baseline's wording is still reproducible from it.
  const rendered = stringsFile.history.description.replace(
    "{count}",
    String(configFile.limits.historyEntries),
  );
  assert(
    baselineUi.includes(rendered.replace(/\s+/g, " ")),
    `"${rendered}" does not match the sentence the baseline rendered`,
  );
});

// ----------------------------------------------------------------- prompts

console.log("\ndata/prompts/");
const baselinePrompts = extractPrompts();

for (const [name, expected] of Object.entries(baselinePrompts)) {
  const file = `../data/prompts/${name}.md`;
  check(`${name}.md is byte-identical to the baseline prompt`, () => {
    const onDisk = readFileSync(new URL(file, import.meta.url), "utf8").trim();
    assert(
      onDisk === expected,
      `${name}.md differs from the prompt the pre-refactor route sent ` +
        `(${onDisk.length} chars on disk vs ${expected.length} in the baseline)`,
    );
  });
}

check("the locate prompt still documents the format the parser expects", () => {
  // lib/locator.ts parses `- <start>-<end> | <reason>` bullets under a LINES:
  // header plus an optional NOTE: line. The prompt is what makes the model
  // emit that shape, so the two must not drift apart independently.
  const locate = readFileSync(
    new URL("../data/prompts/locate.md", import.meta.url),
    "utf8",
  );
  assert(locate.includes("LINES:"), "locate prompt no longer asks for a LINES: header");
  assert(locate.includes("NOTE:"), "locate prompt no longer asks for a NOTE: line");
  assert(
    /-\s*\d+-\d+\s*\|/.test(locate),
    "locate prompt no longer shows the `- start-end | reason` bullet form",
  );
});

// ------------------------------------------------------------------ result

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
