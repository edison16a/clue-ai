import { describe, expect, it } from "vitest";

import uploadsData from "@/data/uploads.json";
import { FILE_ACCEPT_ATTRIBUTE, TEXT_EXTENSIONS, isImageFile, isTextLikeFile } from "@/lib/uploads";

function file(name: string, type = ""): File {
  return new File(["x"], name, { type });
}

/**
 * The accepted-type list used to exist twice in incompatible notations — the
 * `accept` attribute and a regex — which let the file picker and the drop
 * handler disagree silently. These tests pin them to one list.
 */
describe("upload rules", () => {
  it("builds the accept attribute from the same list the matcher uses", () => {
    for (const extension of TEXT_EXTENSIONS) {
      expect(FILE_ACCEPT_ATTRIBUTE).toContain(`.${extension}`);
      expect(isTextLikeFile(file(`main.${extension}`))).toBe(true);
    }
  });

  it("offers images first in the accept attribute", () => {
    // Ordering decides the picker's default filter, so it is behaviour.
    expect(FILE_ACCEPT_ATTRIBUTE.startsWith("image/*")).toBe(true);
  });

  it("names every extension in the picker that the drop handler will read", () => {
    const offered = FILE_ACCEPT_ATTRIBUTE.split(",")
      .filter((entry) => entry.startsWith("."))
      .map((entry) => entry.slice(1));
    expect(offered).toEqual([...TEXT_EXTENSIONS]);
  });
});

describe("isTextLikeFile", () => {
  it("accepts anything the browser calls text, whatever its name", () => {
    expect(isTextLikeFile(file("notes", "text/plain"))).toBe(true);
  });

  it("falls back to the extension when the browser reports no type", () => {
    // Browsers report an empty type for most source files — .java, .kt and
    // .scala have no registered MIME type — so this is the common path, not
    // the fallback.
    expect(isTextLikeFile(file("Main.java", ""))).toBe(true);
    expect(isTextLikeFile(file("app.kt", ""))).toBe(true);
  });

  it("matches the extension case-insensitively", () => {
    expect(isTextLikeFile(file("Main.JAVA"))).toBe(true);
  });

  it("rejects unknown extensions", () => {
    expect(isTextLikeFile(file("archive.zip"))).toBe(false);
    expect(isTextLikeFile(file("report.pdf"))).toBe(false);
  });

  it("requires the extension at the end of the name", () => {
    // "notes.py.zip" is an archive, not Python.
    expect(isTextLikeFile(file("notes.py.zip"))).toBe(false);
  });

  it("rejects a file with no extension and no type", () => {
    expect(isTextLikeFile(file("Makefile"))).toBe(false);
  });
});

describe("isImageFile", () => {
  it("accepts any image MIME type", () => {
    expect(isImageFile(file("shot.png", "image/png"))).toBe(true);
    expect(isImageFile(file("shot.heic", "image/heic"))).toBe(true);
  });

  it("rejects non-images even when the name looks like one", () => {
    // The MIME type is authoritative; the name is not.
    expect(isImageFile(file("shot.png", "application/zip"))).toBe(false);
  });
});

describe("uploads data", () => {
  it("stores bare extensions, not dotted ones", () => {
    // A leading dot here would produce `accept="..java"` and a regex that
    // matches nothing.
    for (const extension of uploadsData.textExtensions) {
      expect(extension.startsWith(".")).toBe(false);
    }
  });
});
