"use client";

import { useEffect, useState } from "react";

import strings from "@/data/strings.json";
import { useHistory } from "@/lib/hooks/useHistory";
import { useTheme } from "@/lib/hooks/useTheme";
import { parseLocatorText } from "@/lib/locator";
import { splitLines } from "@/lib/numbering";
import { DEFAULT_SUBJECT, SUBJECTS, getSubject } from "@/lib/subjects";
import { isImageFile, isTextLikeFile } from "@/lib/uploads";
import type { ImageAttachment, LineHint, SubjectId } from "@/lib/types";
import { CodeEditor } from "@/app/components/CodeEditor";
import { HeroHeader } from "@/app/components/HeroHeader";
import { HistorySection } from "@/app/components/HistorySection";
import { ResponsePanel } from "@/app/components/ResponsePanel";
import { UploadRow } from "@/app/components/UploadRow";

/**
 * The application container: all interaction state, and the two request
 * flows that read it.
 *
 * State lives here rather than in the individual panels because almost all of
 * it is shared — the subject chooses the textarea's label, the textarea's
 * content drives both requests, and a request's result populates the response
 * panel and the overlay at once. The presentational components below take
 * props and own nothing.
 */
export function ClueWorkspace() {
  const [code, setCode] = useState<string>("");
  const [ask, setAsk] = useState<string>("");
  const [aiText, setAiText] = useState<string>("");
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [subjectId, setSubjectId] = useState<SubjectId>(DEFAULT_SUBJECT.id);
  const [showMoreSubjects, setShowMoreSubjects] = useState<boolean>(false);

  /** Name of the latest selection; drives the drop zone's "has file" styling. */
  const [imageName, setImageName] = useState<string>("");
  /** Legacy single preview, retained from the original markup. */
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [lineHints, setLineHints] = useState<LineHint[]>([]);
  const [lineHintNote, setLineHintNote] = useState<string>("");
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const { theme, toggleTheme } = useTheme();
  const { history, saveHistory, recordInteraction, clearHistory, toggleSaveHistory } = useHistory();

  const subject = getSubject(subjectId);
  const codeLines = splitLines(code);

  // Selecting a beta subject expands the chip row, so the active subject is
  // never hidden behind "More Subjects" at the moment it is chosen.
  useEffect(() => {
    if (subjectId !== DEFAULT_SUBJECT.id) setShowMoreSubjects(true);
  }, [subjectId]);

  /**
   * Reads a selection or a drop: images become attachments, source files are
   * appended to the code box, anything else is ignored.
   *
   * Each file gets its own FileReader because a reader handles one operation
   * at a time; the reads therefore complete in arbitrary order, which is why
   * every state update here is a functional update.
   */
  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setImageName(files[0].name);

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();

      if (isImageFile(file)) {
        reader.onload = () => {
          const src = reader.result as string;
          setImages((previous) => [...previous, { name: file.name, src }]);
          if (index === 0 && !imagePreview) setImagePreview(src);
        };
        reader.readAsDataURL(file);
        return;
      }

      if (isTextLikeFile(file)) {
        reader.onload = () => {
          const text = (reader.result as string) ?? "";
          // Appended with a blank line between, so dropping several files
          // does not run them together into one unreadable block.
          setCode((previous) => (previous ? `${previous}\n\n${text}` : text));
        };
        reader.readAsText(file);
      }
    });
  };

  /**
   * Drops one attachment, keeping the drop zone's label in step.
   *
   * The next array is computed before any state is set. Previously the two
   * dependent updates were issued from *inside* the `setImages` updater,
   * which React requires to be a pure function of its argument: it is free to
   * call an updater more than once — it does exactly that under StrictMode in
   * development — and to discard the result, so those nested updates could run
   * twice or against a state React then threw away.
   */
  const removeImage = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    setImages(next);
    if (index === 0) {
      setImagePreview(next[0]?.src ?? null);
      setImageName(next[0]?.name ?? "");
    }
  };

  /** Transcribes uploaded screenshots into text. Throws on any failure. */
  const extractCodeFromImages = async (): Promise<string> => {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images, ask, subjectMode: subjectId }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || strings.errors.extractFailed);

    const extracted = (data.aiText ?? "").trim();
    if (!extracted) throw new Error(strings.errors.noTextExtracted);
    return extracted;
  };

  /**
   * Asks the locator which lines to highlight.
   *
   * Takes the code explicitly rather than reading state, because it runs
   * immediately after image extraction has set new code and a state update is
   * not visible to the function that queued it.
   */
  const runLocateLines = async (codeOverride?: string) => {
    const target = typeof codeOverride === "string" ? codeOverride : code;
    const lines = splitLines(target);

    if (!lines.length || target.length === 0) {
      setLineHints([]);
      setLineHintNote("");
      return;
    }

    try {
      setIsLocating(true);
      setLineHintNote("");
      setLineHints([]);

      const response = await fetch("/api/locate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: target, ask, subjectMode: subjectId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || strings.errors.requestFailed);

      const text: string = typeof data?.aiText === "string" ? data.aiText : "";
      // `|| 1` guards the clamp: a zero total would collapse every range.
      const parsed = parseLocatorText(text, lines.length || 1);
      setLineHints(parsed.ranges);
      setLineHintNote(
        parsed.note || (!parsed.ranges.length ? strings.lineHints.noRanges : ""),
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      setLineHintNote(
        `${strings.lineHints.failurePrefix}${detail || strings.lineHints.failureFallback}`,
      );
      setLineHints([]);
    } finally {
      setIsLocating(false);
    }
  };

  /**
   * The primary action: transcribe images if needed, fetch guidance, save the
   * interaction, then locate lines.
   *
   * Extraction runs only when there are images and the code box is empty — a
   * student who pasted code and also attached a screenshot meant the paste to
   * be the submission, and overwriting it would discard their work.
   */
  const onHelp = async () => {
    try {
      setAiText("");
      setIsLoading(true);

      const needsExtraction = images.length > 0 && (!code || code.trim() === "");
      let workingCode = code;

      if (needsExtraction) {
        workingCode = await extractCodeFromImages();
        setCode(workingCode);
      }

      const response = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: workingCode, ask, images, subjectMode: subjectId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || strings.errors.requestFailed);

      const guidance = (data.aiText ?? "").trimStart();
      setAiText(guidance);

      recordInteraction({
        mode: subjectId,
        ask,
        code: workingCode,
        images,
        aiText: guidance,
      });

      await runLocateLines(workingCode);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      const message = `${strings.response.errorPrefix}${detail || "something went wrong."}`;
      setAiText(message);

      // Failures are recorded too, so a student can see what happened rather
      // than losing the attempt entirely.
      recordInteraction({ mode: subjectId, ask, code, images, aiText: message });
    } finally {
      setIsLoading(false);
    }
  };

  /** Clears every input and result, leaving preferences and history alone. */
  const onNewPrompt = () => {
    setCode("");
    setAsk("");
    setImages([]);
    setImageName("");
    setImagePreview(null);
    setAiText("");
    setIsLoading(false);
    setLineHints([]);
    setLineHintNote("");
  };

  const clearLineHints = () => {
    setLineHints([]);
    setLineHintNote("");
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
            onHelp={onHelp}
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
