"use client";

import { useState } from "react";
import strings from "@/data/strings.json";
import { fetchLocatorText } from "@/lib/api-client";
import { parseLocatorText } from "@/lib/locator";
import { splitLines } from "@/lib/numbering";
import type { LineHint } from "@/lib/types";

/** The locator's highlighted ranges, its note, and whether it is running. */
export function useLineHints() {
  const [lineHints, setLineHints] = useState<LineHint[]>([]);
  const [lineHintNote, setLineHintNote] = useState<string>("");
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const clearLineHints = () => {
    setLineHints([]);
    setLineHintNote("");
  };

  /**
   * Asks the locator which lines to highlight.
   *
   * Takes the code as an argument rather than reading state, because it runs
   * right after image extraction has set new code, and a state update is not
   * visible to the function that queued it. Failures become a note on the
   * overlay instead of an error, since the guidance above already succeeded.
   */
  const locateLines = async (code: string, ask: string, subjectMode: string) => {
    const lines = splitLines(code);

    if (!lines.length || code.length === 0) {
      clearLineHints();
      return;
    }

    try {
      setIsLocating(true);
      setLineHintNote("");
      setLineHints([]);

      const text = await fetchLocatorText({ code, ask, subjectMode });
      // `|| 1` guards the clamp: a zero total would collapse every range.
      const parsed = parseLocatorText(text, lines.length || 1);
      setLineHints(parsed.ranges);
      setLineHintNote(parsed.note || (!parsed.ranges.length ? strings.lineHints.noRanges : ""));
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      setLineHintNote(`${strings.lineHints.failurePrefix}${detail || strings.lineHints.failureFallback}`);
      setLineHints([]);
    } finally {
      setIsLocating(false);
    }
  };

  return { lineHints, lineHintNote, isLocating, locateLines, clearLineHints } as const;
}
