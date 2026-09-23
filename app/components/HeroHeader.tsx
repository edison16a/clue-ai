"use client";

import strings from "@/data/strings.json";
import type { Subject, SubjectId, ThemeMode } from "@/lib/types";
import { SubjectModeBar } from "@/app/components/SubjectModeBar";
import { MoonIcon, SaveOffIcon, SaveOnIcon, SunIcon } from "@/app/components/Icons";

interface HeroHeaderProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  saveHistory: boolean;
  onToggleSaveHistory: () => void;
  subjects: readonly Subject[];
  activeSubjectId: SubjectId;
  onSelectSubject: (id: SubjectId) => void;
  showMoreSubjects: boolean;
  onShowMoreSubjects: (show: boolean) => void;
}

/**
 * The page masthead: the two preference toggles, the brand, and the subject
 * chips.
 *
 * Both toggles are `aria-pressed` buttons rather than checkboxes because they
 * take effect immediately and belong to no form, and that is the role a screen
 * reader should announce for a control that switches something on.
 */
export function HeroHeader({
  theme,
  onToggleTheme,
  saveHistory,
  onToggleSaveHistory,
  subjects,
  activeSubjectId,
  onSelectSubject,
  showMoreSubjects,
  onShowMoreSubjects,
}: HeroHeaderProps) {
  const isLight = theme === "light";

  return (
    <header className="hero">
      <div className="heroTop">
        <button
          type="button"
          className={`saveToggleBtn ${saveHistory ? "isOn" : "isOff"}`}
          onClick={onToggleSaveHistory}
          aria-pressed={saveHistory}
          title={saveHistory ? strings.toggles.saveHistoryTitleOn : strings.toggles.saveHistoryTitleOff}
        >
          <span className="saveGlyph" aria-hidden="true">
            {saveHistory ? <SaveOnIcon /> : <SaveOffIcon />}
          </span>
          <span className="saveToggleText">
            {saveHistory ? strings.toggles.saveHistoryOn : strings.toggles.saveHistoryOff}
          </span>
        </button>

        <button
          type="button"
          className={`themeToggleBtn ${isLight ? "isLight" : "isDark"}`}
          onClick={onToggleTheme}
          aria-pressed={isLight}
          // The tooltip names the theme being switched *to*, while the label
          // names the theme currently active. They intentionally disagree.
          title={isLight ? strings.toggles.themeTitleToDark : strings.toggles.themeTitleToLight}
        >
          <span className="themeGlyph" aria-hidden="true">
            {isLight ? <SunIcon /> : <MoonIcon />}
          </span>
          <span className="themeToggleText">
            {isLight ? strings.toggles.themeLight : strings.toggles.themeDark}
          </span>
        </button>
      </div>

      <h1 className="brand">{strings.brand.name}</h1>
      <p className="tagline">{strings.brand.tagline}</p>

      <SubjectModeBar
        subjects={subjects}
        activeSubjectId={activeSubjectId}
        onSelect={onSelectSubject}
        showMore={showMoreSubjects}
        onShowMoreChange={onShowMoreSubjects}
      />
    </header>
  );
}
