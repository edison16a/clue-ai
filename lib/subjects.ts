/**
 * The subject registry: the single source of truth that replaced seven
 * separate descriptions of the same five subjects.
 *
 * Everything here is derived from data/subjects.json at module load. Nothing
 * in this file enumerates a subject, so appending one to the JSON is enough.
 */

import subjectsData from "@/data/subjects.json";
import configData from "@/data/config.json";
import type { Subject, SubjectId } from "@/lib/types";

/** All subjects, in the order the chips should render. */
export const SUBJECTS: readonly Subject[] = subjectsData.subjects as readonly Subject[];

/** Indexed for O(1) lookup; rebuilt once per process, not per render. */
const BY_ID = new Map<string, Subject>(SUBJECTS.map((subject) => [subject.id, subject]));

/**
 * The subject the app starts in, from config.json.
 *
 * Falls back to the first entry rather than throwing: a misconfigured default
 * should degrade to a working app, not a blank screen. validate-data.mjs
 * catches the misconfiguration at development time instead.
 */
export const DEFAULT_SUBJECT: Subject =
  BY_ID.get(configData.defaults.subject) ?? SUBJECTS[0];

/** Narrows an arbitrary string to a known subject id. */
export function isSubjectId(value: unknown): value is SubjectId {
  return typeof value === "string" && BY_ID.has(value);
}

/** Looks a subject up, falling back to the configured default. */
export function getSubject(id: string | undefined | null): Subject {
  return (id && BY_ID.get(id)) || DEFAULT_SUBJECT;
}

/**
 * The name given to the model for a subject, matching the server-side
 * SUBJECT_LABELS lookup the routes used to each carry their own copy of.
 *
 * Returns "Not specified" for an unknown or absent id. That exact wording was
 * the original fallback and it reaches the model, so it is behaviour rather
 * than a detail: it tells the model no subject was chosen instead of quietly
 * asserting the default one.
 */
export function apiLabelFor(id: string | undefined | null): string {
  const subject = id ? BY_ID.get(id) : undefined;
  return subject ? subject.apiLabel : "Not specified";
}
