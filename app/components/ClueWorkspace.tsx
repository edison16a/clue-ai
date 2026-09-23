"use client";

import { useEffect, useState } from "react";

import strings from "@/data/strings.json";
import { useAttachments } from "@/lib/hooks/useAttachments";
import { useGuidance } from "@/lib/hooks/useGuidance";
import { useHistory } from "@/lib/hooks/useHistory";
import { useLineHints } from "@/lib/hooks/useLineHints";
import { useTheme } from "@/lib/hooks/useTheme";
import { splitLines } from "@/lib/numbering";
import { DEFAULT_SUBJECT, SUBJECTS, getSubject } from "@/lib/subjects";
import type { SubjectId } from "@/lib/types";
import { CodeEditor } from "@/app/components/editor/CodeEditor";
import { UploadRow } from "@/app/components/editor/UploadRow";
import { HeroHeader } from "@/app/components/header/HeroHeader";
import { HistorySection } from "@/app/components/history/HistorySection";
import { ResponsePanel } from "@/app/components/response/ResponsePanel";

/**
 * The application container. It composes the hooks that own each piece of
 * state and hands their values to presentational components that own none.
 *
 * The inputs that several hooks share (the code, the question, the subject)
 * live here, because they belong to no single one of them: the subject picks
 * the textarea's label, and the code feeds both requests.
 */
export function ClueWorkspace() {
  const [code, setCode] = useState<string>("");
  const [ask, setAsk] = useState<string>("");
  const [subjectId, setSubjectId] = useState<SubjectId>(DEFAULT_SUBJECT.id);
  const [showMoreSubjects, setShowMoreSubjects] = useState<boolean>(false);

  const { theme, toggleTheme } = useTheme();
  const { history, saveHistory, recordInteraction, clearHistory, toggleSaveHistory } = useHistory();
  const { images, imageName, imagePreview, addFiles, removeImage, resetAttachments } =
    useAttachments(setCode);
  const { lineHints, lineHintNote, isLocating, locateLines, clearLineHints } = useLineHints();
  const { aiText, isLoading, requestGuidance, resetGuidance } = useGuidance({
    code,
    setCode,
    ask,
    subjectId,
    images,
    recordInteraction,
    locateLines,
  });

  const subject = getSubject(subjectId);
  const codeLines = splitLines(code);

  // Selecting a beta subject expands the chip row, so the active subject is
  // never hidden behind "More Subjects" at the moment it is chosen.
  useEffect(() => {
    if (subjectId !== DEFAULT_SUBJECT.id) setShowMoreSubjects(true);
  }, [subjectId]);

  /** Clears every input and result, leaving preferences and history alone. */
  const onNewPrompt = () => {
    setCode("");
    setAsk("");
    resetAttachments();
    resetGuidance();
    clearLineHints();
  };

  return (
    <main className="container">
      <HeroHeader
        theme={theme}
        onToggleTheme={toggleTheme}
        saveHistory={saveHistory}
        onToggleSaveHistory={toggleSaveHistory}
        subjects={SUBJECTS}
        activeSubjectId={subjectId}
        onSelectSubject={setSubjectId}
        showMoreSubjects={showMoreSubjects}
        onShowMoreSubjects={setShowMoreSubjects}
      />

      <section className="panel">
        <div className="left">
          <CodeEditor
            subject={subject}
            code={code}
            onCodeChange={setCode}
            codeLines={codeLines}
            ask={ask}
            onAskChange={setAsk}
            hints={lineHints}
            note={lineHintNote}
            isLocating={isLocating}
            onClearHints={clearLineHints}
          />

          <UploadRow
            subject={subject}
            images={images}
            imageName={imageName}
            imagePreview={imagePreview}
            onFilesSelected={addFiles}
            onRemoveImage={removeImage}
            onHelp={requestGuidance}
            onNewPrompt={onNewPrompt}
            isLoading={isLoading}
          />
        </div>

        <ResponsePanel subject={subject} aiText={aiText} isLoading={isLoading} />
      </section>

      <HistorySection history={history} onClear={clearHistory} />

      <footer className="foot">
        <p>{strings.footer.text}</p>
      </footer>
    </main>
  );
}
