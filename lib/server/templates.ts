import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import fragments from "@/data/prompts/fragments.json";

/**
 * The user-turn templates in data/prompts/*.user.md.
 *
 * These hold the framing around the student's input ("Student request/context:",
 * "Task: Give concrete, location-specific..."). It used to be spelled out
 * line by line inside each service, so rewording a prompt meant editing
 * TypeScript. Now it is content, like the system prompts next to it.
 */
export type TemplateName = "help.user" | "locate.user" | "extract.user";

/** Named text pieces from data/prompts/fragments.json. */
export type FragmentName = Exclude<keyof typeof fragments, `$${string}`>;

const cache = new Map<TemplateName, string>();

/**
 * Reads a template from disk, once per process.
 *
 * Only the trailing newline is removed. Unlike the system prompts, a template
 * is not trimmed at the start, because a leading line would be meaningful.
 */
export function loadTemplate(name: TemplateName): string {
  const cached = cache.get(name);
  if (cached !== undefined) return cached;
  const text = readFileSync(join(process.cwd(), "data", "prompts", `${name}.md`), "utf8").replace(/\n$/, "");
  cache.set(name, text);
  return text;
}

/** A fragment with `{value}` filled in. */
export function fragment(name: FragmentName, value = ""): string {
  return fragments[name].replace("{value}", value);
}

/**
 * Fills `{name}` slots in a template.
 *
 * A line that consists only of a slot, and whose value is empty, is removed
 * entirely rather than left blank. That is how the extract prompt drops its
 * subject line when no subject was sent: the original built that prompt with
 * `.filter(Boolean)`, which removed empty entries rather than printing them.
 * An unknown slot is left in place untouched, so a typo in a template shows up
 * in the prompt instead of silently vanishing.
 */
export function renderTemplate(template: string, values: Record<string, string>): string {
  return template
    .split("\n")
    .filter((line) => {
      const only = line.match(/^\{(\w+)\}$/);
      return !(only && only[1] in values && values[only[1]] === "");
    })
    .map((line) => line.replace(/\{(\w+)\}/g, (slot, key: string) => (key in values ? values[key] : slot)))
    .join("\n");
}
