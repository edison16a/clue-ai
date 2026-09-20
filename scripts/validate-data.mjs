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
