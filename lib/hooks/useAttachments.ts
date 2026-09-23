"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { isImageFile, isTextLikeFile } from "@/lib/uploads";
import type { ImageAttachment } from "@/lib/types";

/**
 * Uploaded images and the drop zone's label state.
 *
 * Text files are not attachments: they are read straight into the code box,
 * which is why this hook takes the code setter rather than owning the code.
 */
export function useAttachments(setCode: Dispatch<SetStateAction<string>>) {
  const [images, setImages] = useState<ImageAttachment[]>([]);
  /** Name of the latest selection; drives the drop zone's "has file" styling. */
  const [imageName, setImageName] = useState<string>("");
  /**
   * Legacy single preview, retained from the original markup. The stylesheet
   * hides it whenever it could be seen; see the note in UploadRow.
   */
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  /**
   * Reads a selection or a drop: images become attachments, source files are
   * appended to the code box, anything else is ignored.
   *
   * Each file gets its own FileReader because a reader handles one operation
   * at a time, so reads finish in any order and every update is functional.
   * `!imagePreview` reads the value from the render that created this
   * function, not the latest one, so two images read in the same batch both
   * see null. Harmless because the preview is never visible; flagged, not
   * changed.
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
          // A blank line between files keeps several drops from running
          // together into one block.
          setCode((previous) => (previous ? `${previous}\n\n${text}` : text));
        };
        reader.readAsText(file);
      }
    });
  };

  /**
   * Drops one attachment, keeping the drop zone's label in step.
   *
   * The next array is computed before any state is set. The dependent
   * updates used to run inside the `setImages` updater, which React requires
   * to be pure; it may call an updater twice or discard its result.
   */
  const removeImage = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    setImages(next);
    if (index === 0) {
      setImagePreview(next[0]?.src ?? null);
      setImageName(next[0]?.name ?? "");
    }
  };

  /** Forgets every attachment, for "New Prompt". */
  const resetAttachments = () => {
    setImages([]);
    setImageName("");
    setImagePreview(null);
  };

  return { images, imageName, imagePreview, addFiles, removeImage, resetAttachments } as const;
}
