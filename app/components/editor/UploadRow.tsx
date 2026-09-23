"use client";

import { useRef } from "react";
import strings from "@/data/strings.json";
import { FILE_ACCEPT_ATTRIBUTE } from "@/lib/uploads";
import type { ImageAttachment, Subject } from "@/lib/types";
import { CloseIcon, SearchIcon, UploadIcon } from "@/app/components/shared/Icons";

interface UploadRowProps {
  subject: Subject;
  images: readonly ImageAttachment[];
  /** Name of the most recent selection; drives the drop zone's "has file" state. */
  imageName: string;
  /** Legacy single preview. See the note on the element below. */
  imagePreview: string | null;
  onFilesSelected: (files: FileList | null) => void;
  onRemoveImage: (index: number) => void;
  onHelp: () => void;
  onNewPrompt: () => void;
  isLoading: boolean;
}

/**
 * The drop zone, the thumbnail gallery and the two action buttons.
 *
 * Layout is a CSS grid keyed off `.hasGallery`; the ordering of these children
 * is set in the stylesheet rather than here, which is why the markup order
 * does not match the visual order.
 */
export function UploadRow({
  subject,
  images,
  imageName,
  imagePreview,
  onFilesSelected,
  onRemoveImage,
  onHelp,
  onNewPrompt,
  isLoading,
}: UploadRowProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className={`uploadRow ${images.length ? "hasGallery" : ""}`}>
      <label
        className={`dropzone ${imageName ? "hasFile" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onFilesSelected(event.dataTransfer.files);
        }}
        // A <label> is not focusable or keyboard-activatable on its own, so
        // the tabIndex and key handler are what make the drop zone reachable
        // without a mouse.
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={FILE_ACCEPT_ATTRIBUTE}
          className="hiddenFile"
          onChange={(event) => onFilesSelected(event.target.files)}
          aria-label={subject.uploadAriaLabel}
        />
        <div className="dzInner">
          <UploadIcon />
          <span className="dzText">{strings.upload.prompt}</span>
          {imageName && <span className="dzTextUploaded">{strings.upload.promptWithFile}</span>}
          {imageName && (
            <em className="fileNote">
              {strings.upload.selectedPrefix}
              {imageName}
            </em>
          )}
        </div>
      </label>

      {images.length > 0 && (
        <div className="thumbs" aria-label={strings.upload.galleryAriaLabel}>
          {images.map((image, index) => (
            <div className="thumbItem" key={`${image.name}-${index}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt={`${strings.upload.thumbAltPrefix}${image.name}`} />
              <button
                type="button"
                className="thumbClose"
                aria-label={`${strings.upload.removeAriaLabelPrefix}${image.name}`}
                title={strings.upload.removeTitle}
                onClick={() => onRemoveImage(index)}
              >
                {strings.upload.removeGlyph}
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="helpBtn"
        onClick={onHelp}
        aria-label={strings.actions.helpAriaLabel}
        title={strings.actions.helpTitle}
        aria-busy={isLoading}
        disabled={isLoading}
      >
        <SearchIcon />
        <span>{isLoading ? strings.actions.helpBusy : strings.actions.helpIdle}</span>
      </button>

      <button
        type="button"
        className="newPromptBtn"
        onClick={onNewPrompt}
        title={strings.actions.newPromptTitle}
        disabled={isLoading}
      >
        <span className="newPromptIcon" aria-hidden="true">
          <CloseIcon />
        </span>
        <span>{strings.actions.newPrompt}</span>
      </button>

      {/*
        Legacy single-image preview, kept from the original markup.
        It is never actually visible: it only renders once an image exists,
        and the stylesheet's `.uploadRow.hasGallery .thumb { display: none }`
        hides it in exactly that case. Preserved rather than deleted so this
        stays a pure restructure; see the summary for the flag.
      */}
      {imagePreview && (
        <div className="thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt={strings.upload.legacyPreviewAlt} />
        </div>
      )}
    </div>
  );
}
