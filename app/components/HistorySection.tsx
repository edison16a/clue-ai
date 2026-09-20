"use client";

import configData from "@/data/config.json";
import strings from "@/data/strings.json";
import { getSubject } from "@/lib/subjects";
import type { HistoryItem } from "@/lib/types";
import { CloseIcon } from "@/app/components/Icons";
import { Markdown } from "@/app/components/Markdown";

interface HistorySectionProps {
  history: readonly HistoryItem[];
  onClear: () => void;
}

/**
 * Past questions and their guidance, newest first.
 *
 * Renders nothing when empty rather than showing a placeholder, matching the
 * original — the section simply does not exist until there is something in it.
 */
export function HistorySection({ history, onClear }: HistorySectionProps) {
  if (history.length === 0) return null;

  return (
    <section className="history">
      <div className="historyHeader">
        <div className="historyHeaderText">
          <h2>{strings.history.heading}</h2>
          <p>
            {strings.history.description.replace(
              "{count}",
              String(configData.limits.historyEntries),
            )}
          </p>
        </div>

        <button
          type="button"
          className="clearHistoryBtn"
          onClick={onClear}
          title={strings.history.clearTitle}
        >
          <span className="clearHistoryIcon" aria-hidden="true">
            <CloseIcon />
          </span>
          <span>{strings.history.clear}</span>
        </button>
      </div>

      <div className="historyList">
        {history.map((item) => (
          <HistoryEntry key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

/**
 * One collapsed interaction.
 *
 * `<details>` gives the expand/collapse for free, including keyboard operation
 * and the open state being exposed to assistive technology — none of which a
 * div plus an onClick would provide without extra work.
 */
function HistoryEntry({ item }: { item: HistoryItem }) {
  // Looked up rather than stored on the record, so renaming a subject updates
  // old entries instead of leaving them tagged with a stale label.
  const subject = getSubject(item.mode);

  return (
    <details className="historyItem">
      <summary className="historySummary">
        <div className="historySummaryMain">
          <span className={`historyModeTag mode-${item.mode}`}>{subject.shortLabel}</span>
          <span className="historyAskText">{item.ask || strings.history.noQuestion}</span>
        </div>
        <span className="historyTimestamp">{item.timestamp}</span>
      </summary>

      <div className="historyBody">
        <div className="historyMeta">
          <p>
            <strong>{strings.history.modeLabel}</strong> {subject.shortLabel}
          </p>
          {item.code && (
            <div className="historyCode">
              <strong>{strings.history.codeLabel}</strong>
              <pre>
                <code>{item.code}</code>
              </pre>
            </div>
          )}
        </div>

        {item.images.length > 0 && (
          <div className="historyImages" aria-label={strings.history.imagesAriaLabel}>
            {item.images.map((image, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${item.id}-img-${index}`}
                src={image.src}
                alt={image.name || `${strings.history.imageAltPrefix}${index + 1}`}
              />
            ))}
          </div>
        )}

        <div className="historyResponse">
          <h3>{strings.history.responseHeading}</h3>
          <div className="historyResponseText">
            <Markdown>{item.aiText}</Markdown>
          </div>
        </div>
      </div>
    </details>
  );
}
