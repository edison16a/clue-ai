/**
 * File-upload rules, derived from data/uploads.json.
 *
 * The accepted-type list used to exist twice in incompatible notations — the
 * `accept` attribute and a regex in `isTextLikeFile` — which meant the picker
 * and the drop handler could disagree without anything noticing. Both are now
 * computed from the same array, so they cannot drift.
 */

import uploadsData from "@/data/uploads.json";

/** Bare, lowercase extensions accepted as text: ["txt", "java", ...]. */
export const TEXT_EXTENSIONS: readonly string[] = uploadsData.textExtensions;

/**
 * The `accept` attribute for the file input.
 *
 * Wildcards come first so the OS picker's default filter offers images, which
 * matches the original attribute's ordering and therefore its behaviour.
 */
export const FILE_ACCEPT_ATTRIBUTE = [
  ...uploadsData.imageAcceptWildcards,
  ...TEXT_EXTENSIONS.map((extension) => `.${extension}`),
].join(",");

/** Built once rather than per dropped file. */
const TEXT_EXTENSION_PATTERN = new RegExp(`\\.(${TEXT_EXTENSIONS.join("|")})$`, "i");

/**
 * Whether a file should be read as text into the code box.
 *
 * Checks the MIME type first because it is authoritative when the browser
 * supplies one, then falls back to the extension — browsers report an empty
 * type for many source files (.java, .kt, .scala have no registered MIME
 * type), so extension matching is the only thing that catches them.
 */
export function isTextLikeFile(file: File): boolean {
  if (file.type.startsWith("text/")) return true;
  return TEXT_EXTENSION_PATTERN.test(file.name || "");
}

/** Whether a file should be attached as an image rather than read as text. */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}
