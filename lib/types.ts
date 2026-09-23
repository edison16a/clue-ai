/**
 * Types shared by the browser and the API routes.
 *
 * These live in one module rather than beside their consumers because the
 * request/response shapes are a contract between two sides that are compiled
 * separately: before this file existed, each route re-declared its own inline
 * body type and the client re-declared a matching literal at every `fetch`
 * call, so a field renamed on the server produced `undefined` at runtime
 * instead of a type error at build time.
 */

import subjectsData from "@/data/subjects.json";

/**
 * A subject id, derived from data/subjects.json rather than hand-written.
 *
 * Deriving it means adding a subject to the JSON widens the type
 * automatically, which is the point of the data extraction. It also means a typo in
 * the JSON surfaces as a type error at every use site.
 */
export type SubjectId = (typeof subjectsData.subjects)[number]["id"];

/**
 * How a subject chip's icon is drawn.
 *
 * "glyph" is a character rendered as text and is pure content: swap it by
 * editing the JSON. "component" names an entry in the icon registry, used
 * where the icon must be an SVG that inherits `currentColor` so it recolours
 * with the theme and with button states.
 */
export type SubjectIcon =
  | { readonly kind: "glyph"; readonly value: string }
  | { readonly kind: "component"; readonly value: string };

/** Everything the UI and the prompts need to know about one subject. */
export interface Subject {
  /** Stable slug; sent to the API and stored in history records. */
  readonly id: SubjectId;
  /** Full name on the subject chip, e.g. "Computer Science". */
  readonly label: string;
  /** Abbreviated name for history tags and inline prose, e.g. "CS". */
  readonly shortLabel: string;
  /** Name given to the model in the prompt; may differ from the chip label. */
  readonly apiLabel: string;
  /** Badge text on the chip, e.g. "BETA". Empty for a fully-supported subject. */
  readonly hint: string;
  /** Heading above the main textarea, phrased for this subject. */
  readonly codeLabel: string;
  /** Placeholder inside the textarea, phrased for this subject. */
  readonly codePlaceholder: string;
  /** Accessible name for the file input, phrased for this subject. */
  readonly uploadAriaLabel: string;
  /** The chip's icon. */
  readonly icon: SubjectIcon;
}

/** The two themes the stylesheet defines. Not derived from the OS preference. */
export type ThemeMode = "dark" | "light";

/** An uploaded image, held as a data URL so it can be sent inline to OpenAI. */
export interface ImageAttachment {
  /** Original filename, shown in the thumbnail's accessible name. */
  readonly name: string;
  /** `data:` URL produced by FileReader, or an https URL. */
  readonly src: string;
}

/**
 * A span of lines the locator flagged, after normalisation.
 *
 * `start` and `end` are 1-based and inclusive, matching how the prompt asks
 * the model to count and how the overlay numbers its rows. They have already
 * been widened by one line either side and clamped to the document. See
 * `parseLocatorText`.
 */
export interface LineHint {
  readonly start: number;
  readonly end: number;
  /** The model's question-style note about what to check there. */
  readonly reason?: string;
}

/**
 * One saved interaction, as persisted to localStorage.
 *
 * Images are stored inline as data URLs, which is why the list is capped:
 * a handful of screenshots is enough to approach the ~5MB origin quota.
 */
export interface HistoryItem {
  /** `Date.now()` at the moment the entry was created; also the React key. */
  readonly id: number;
  /** Locale-formatted timestamp, rendered as-is. */
  readonly timestamp: string;
  readonly mode: SubjectId;
  /** What the student typed in the "what do you need help with" field. */
  readonly ask: string;
  /** The submitted work, after image extraction if that ran. */
  readonly code: string;
  readonly images: readonly ImageAttachment[];
  /** The guidance that came back, or the error message if the call failed. */
  readonly aiText: string;
}

// --------------------------------------------------------------- API shapes

/** Body of `POST /api/help`. */
export interface HelpRequest {
  code?: string;
  ask?: string;
  images?: ImageAttachment[];
  subjectMode?: string;
}

/** Body of `POST /api/locate`. Images are deliberately not sent. */
export interface LocateRequest {
  code?: string;
  ask?: string;
  subjectMode?: string;
}

/** Body of `POST /api/extract`. `src` is optional; entries without one are skipped. */
export interface ExtractRequest {
  images?: Array<{ name?: string; src?: string }>;
  ask?: string;
  subjectMode?: string;
}

/** Success shape shared by all three routes. */
export interface AiTextResponse {
  aiText: string;
}

/** Failure shape shared by all three routes. */
export interface ApiErrorResponse {
  error: string;
}
