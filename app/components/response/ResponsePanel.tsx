"use client";

import strings from "@/data/strings.json";
import type { Subject } from "@/lib/types";
import { LoadingBar } from "@/app/components/shared/LoadingBar";
import { Markdown } from "@/app/components/shared/Markdown";

interface ResponsePanelProps {
  subject: Subject;
  aiText: string;
  isLoading: boolean;
}

/**
 * The right-hand column: guidance, the loading bar, or the empty-state hint.
 *
 * `aria-live="polite"` announces the guidance when it lands without
 * interrupting whatever a screen reader is currently reading. The student may
 * still be navigating their own code when the reply arrives.
 */
export function ResponsePanel({ subject, aiText, isLoading }: ResponsePanelProps) {
  return (
    <div className="right">
      <div className="aiHeader">
        <span className="pulse" aria-hidden="true" />
        <h2>{strings.response.heading}</h2>
      </div>

      <div className="aiCard" role="region" aria-live="polite">
        {isLoading ? (
          <LoadingBar hint={strings.lineHints.generating} />
        ) : aiText ? (
          <div className="aiText">
            <Markdown>{aiText}</Markdown>
          </div>
        ) : (
          <EmptyState subject={subject} />
        )}
      </div>
    </div>
  );
}

/**
 * Shown before the first request.
 *
 * The lead sentence names the active subject, so it reads "your cs work" /
 * "your math work". The `{action}` slot is bolded rather than interpolated as
 * plain text, which is why the sentence is split here instead of being one
 * formatted string.
 */
function EmptyState({ subject }: { subject: Subject }) {
  const [before, after] = strings.response.placeholderLead.split("{action}");

  return (
    <div className="placeholder">
      <p>
        {before}
        <strong>{strings.actions.helpIdle}</strong>
        {after.replace("{subject}", subject.shortLabel.toLowerCase())}
      </p>
      <ul>
        {strings.response.placeholderBullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </div>
  );
}
