"use client";

import strings from "@/data/strings.json";
import { emphasisForLine, isMeaningfulNote } from "@/lib/locator";
import type { LineHint } from "@/lib/types";
import { LoadingBar } from "@/app/components/LoadingBar";

interface LineHintOverlayProps {
  /** The submission, already split into lines. */
  codeLines: readonly string[];
  hints: readonly LineHint[];
  note: string;
  isLocating: boolean;
  onClear: () => void;
}

/**
 * The panel that covers the textarea and shades the lines worth inspecting.
 *
 * It is an overlay rather than decoration inside the textarea because a
 * `<textarea>` cannot carry per-line styling at all; its content is a single
 * text node. Rendering a parallel, read-only copy of the lines is the standard
 * way around that, at the cost of the two having to number identically.
 */
export function LineHintOverlay({
  codeLines,
  hints,
  note,
  isLocating,
  onClear,
}: LineHintOverlayProps) {
  return (
    <div className="codeOverlay" role="region" aria-label={strings.lineHints.regionAriaLabel}>
      {isLocating ? (
        <LoadingBar hint={strings.lineHints.locating} className="overlayLoader" />
      ) : (
        <>
          <div className="codeOverlayHeader">
            <p className="codeHighlightTitle">{strings.lineHints.heading}</p>
            <button
              type="button"
              className="clearHighlightBtn"
              onClick={onClear}
              title={strings.lineHints.clearTitle}
            >
              {strings.lineHints.clear}
            </button>
          </div>

          {isMeaningfulNote(note) && <p className="codeHighlightNote">{note}</p>}

          <div className="codeHighlightBody">
            {codeLines.map((line, index) => {
              const lineNumber = index + 1;
              const emphasis = emphasisForLine(lineNumber, hints, codeLines.length);
              const className =
                emphasis === "hit" ? "isHit" : emphasis === "context" ? "isContext" : "";
              return (
                <div key={`hl-${lineNumber}`} className={`hlLine ${className}`}>
                  <span className="hlNo">{lineNumber}</span>
                  {/* A non-breaking-space fallback keeps an empty line from
                      collapsing to zero height, which would break the
                      one-row-per-line alignment with the numbers. */}
                  <span className="hlText">{line || " "}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
