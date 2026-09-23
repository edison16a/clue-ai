"use client";

import strings from "@/data/strings.json";
import type { LineHint, Subject } from "@/lib/types";
import { LineHintOverlay } from "@/app/components/editor/LineHintOverlay";

interface CodeEditorProps {
  subject: Subject;
  code: string;
  onCodeChange: (code: string) => void;
  codeLines: readonly string[];
  ask: string;
  onAskChange: (ask: string) => void;
  hints: readonly LineHint[];
  note: string;
  isLocating: boolean;
  onClearHints: () => void;
}

/**
 * The two inputs: the main submission textarea and the one-line "what do you
 * need help with" field.
 *
 * The textarea's label and placeholder come from the active subject, so the
 * prompt reads "Paste your math problem" in Math mode. `spellCheck` is off
 * because red underlines under every identifier in a code snippet are noise.
 */
export function CodeEditor({
  subject,
  code,
  onCodeChange,
  codeLines,
  ask,
  onAskChange,
  hints,
  note,
  isLocating,
  onClearHints,
}: CodeEditorProps) {
  // The overlay also renders while locating, so its loading bar appears in
  // place of the highlights rather than after them.
  const showOverlay = hints.length > 0 || isLocating;

  return (
    <>
      <div className="fieldGroup">
        <label htmlFor="code" className="label">
          {subject.codeLabel}
        </label>
        <div className="codeboxWrap">
          <textarea
            id="code"
            className="codebox"
            placeholder={subject.codePlaceholder}
            spellCheck={false}
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
          />

          {showOverlay && (
            <LineHintOverlay
              codeLines={codeLines}
              hints={hints}
              note={note}
              isLocating={isLocating}
              onClear={onClearHints}
            />
          )}
        </div>
      </div>

      <div className="fieldGroup">
        <label htmlFor="ask" className="label">
          {strings.ask.label}
        </label>
        <input
          id="ask"
          type="text"
          className="askInput"
          placeholder={strings.ask.placeholder}
          value={ask}
          onChange={(event) => onAskChange(event.target.value)}
        />
      </div>
    </>
  );
}
