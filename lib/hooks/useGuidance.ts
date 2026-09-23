"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import strings from "@/data/strings.json";
import { fetchExtraction, fetchGuidance } from "@/lib/api-client";
import type { HistoryDraft } from "@/lib/history";
import type { ImageAttachment, SubjectId } from "@/lib/types";

/** What the guidance flow reads from, and writes back to, the workspace. */
export interface GuidanceInputs {
  code: string;
  setCode: Dispatch<SetStateAction<string>>;
  ask: string;
  subjectId: SubjectId;
  images: readonly ImageAttachment[];
  recordInteraction: (draft: HistoryDraft) => void;
  locateLines: (code: string, ask: string, subjectMode: string) => Promise<void>;
}

/**
 * The primary action and its result: transcribe images if needed, fetch
 * guidance, save the interaction, then locate lines.
 */
export function useGuidance(inputs: GuidanceInputs) {
  const [aiText, setAiText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /**
   * Extraction runs only when there are images and the code box is empty. A
   * student who pasted code and also attached a screenshot meant the paste to
   * be the submission, and overwriting it would discard their work.
   */
  const requestGuidance = async () => {
    const { code, setCode, ask, subjectId, images, recordInteraction, locateLines } = inputs;
    try {
      setAiText("");
      setIsLoading(true);

      const needsExtraction = images.length > 0 && (!code || code.trim() === "");
      let workingCode = code;

      if (needsExtraction) {
        workingCode = await fetchExtraction({ images: [...images], ask, subjectMode: subjectId });
        setCode(workingCode);
      }

      const guidance = await fetchGuidance({
        code: workingCode,
        ask,
        images: [...images],
        subjectMode: subjectId,
      });
      setAiText(guidance);

      recordInteraction({ mode: subjectId, ask, code: workingCode, images, aiText: guidance });

      await locateLines(workingCode, ask, subjectId);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      const message = `${strings.response.errorPrefix}${detail || strings.response.errorFallback}`;
      setAiText(message);

      // Failures are recorded too, so a student can see what happened rather
      // than losing the attempt entirely.
      recordInteraction({ mode: subjectId, ask, code, images, aiText: message });
    } finally {
      setIsLoading(false);
    }
  };

  /** Clears the result, for "New Prompt". */
  const resetGuidance = () => {
    setAiText("");
    setIsLoading(false);
  };

  return { aiText, isLoading, requestGuidance, resetGuidance } as const;
}
