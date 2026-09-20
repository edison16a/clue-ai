"use client";

import type { ComponentType } from "react";

import strings from "@/data/strings.json";
import type { Subject, SubjectId } from "@/lib/types";
import { CodeIcon } from "@/app/components/Icons";

/**
 * Icon components a subject can name via `icon.kind === "component"`.
 *
 * A registry rather than a `switch` so that adding an icon is adding a key.
 * data/subjects.json is validated against these names, so an unknown one is a
 * failing check rather than a chip that renders with a blank square.
 */
const ICON_COMPONENTS: Record<string, ComponentType> = {
  code: CodeIcon,
};

function SubjectIconGlyph({ subject }: { subject: Subject }) {
  if (subject.icon.kind === "component") {
    const Icon = ICON_COMPONENTS[subject.icon.value];
    return Icon ? (
      <span className="modeIcon" aria-hidden="true">
        <Icon />
      </span>
    ) : null;
  }

  return (
    <span className="modeIcon" aria-hidden="true">
      {subject.icon.value}
    </span>
  );
}

interface SubjectModeBarProps {
  subjects: readonly Subject[];
  activeSubjectId: SubjectId;
  onSelect: (id: SubjectId) => void;
  showMore: boolean;
  onShowMoreChange: (show: boolean) => void;
}

/**
 * The row of subject chips, plus the control that expands the beta subjects.
 *
 * Collapsed, only the first subject is offered; the rest are marked BETA and
 * hidden behind "More Subjects". The filter keys off the first entry's id
 * rather than a hard-coded "cs" so reordering the JSON reorders the UI.
 */
export function SubjectModeBar({
  subjects,
  activeSubjectId,
  onSelect,
  showMore,
  onShowMoreChange,
}: SubjectModeBarProps) {
  const primaryId = subjects[0]?.id;
  const visible = showMore ? subjects : subjects.filter((subject) => subject.id === primaryId);

  return (
    <div className="modeBar" aria-label={strings.subjectBar.ariaLabel}>
      {visible.map((subject) => {
        const active = subject.id === activeSubjectId;
        return (
          <button
            key={subject.id}
            type="button"
            className={`modeChip ${active ? "isActive" : ""}`}
            onClick={() => onSelect(subject.id)}
            aria-pressed={active}
          >
            <SubjectIconGlyph subject={subject} />
            <span className="modeLabelText">{subject.label}</span>
            <span className="modeHint">{subject.hint}</span>
          </button>
        );
      })}

      {!showMore ? (
        <button
          type="button"
          className="modeChip"
          onClick={() => onShowMoreChange(true)}
          aria-pressed={showMore}
        >
          <span className="modeIcon" aria-hidden="true">
            +
          </span>
          <span className="modeLabelText">{strings.subjectBar.showMore}</span>
        </button>
      ) : (
        <button
          type="button"
          className="modeChip"
          onClick={() => onShowMoreChange(false)}
          aria-pressed={!showMore}
        >
          <span className="modeIcon" aria-hidden="true">
            –
          </span>
          <span className="modeLabelText">{strings.subjectBar.showLess}</span>
        </button>
      )}
    </div>
  );
}
