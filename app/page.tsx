// app/page.tsx
"use client";

import { useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// NEW: subject mode type + config
type SubjectMode = "cs" | "math" | "science" | "english" | "other";

// NEW: theme mode type
type ThemeMode = "dark" | "light";

type LineHint = { start: number; end: number; reason?: string };

const parseLocatorText = (
  text: string,
  totalLines: number,
): { ranges: LineHint[]; note: string } => {
  const ranges: LineHint[] = [];
  let note = "";

  text.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*-\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*\|\s*(.+)$/i);
    if (m) {
      const start = Number(m[1]);
      const endRaw = m[2] ? Number(m[2]) : start;
      if (Number.isFinite(start) && start > 0) {
        const normalizedEnd = Number.isFinite(endRaw) && endRaw >= start ? endRaw : start;
        ranges.push({ start, end: normalizedEnd, reason: m[3]?.trim() });
      }
      return;
    }

    if (line.toUpperCase().startsWith("NOTE:")) {
      note = line.slice(5).trim();
    }
  });

  const adjusted = ranges.map((r) => {
    if (totalLines <= 0) return r;
    const start = Math.max(1, r.start - 1);
    const end = Math.min(totalLines, Math.max(r.end, r.start) + 1);
    return { ...r, start, end };
  });

  return { ranges: adjusted, note };
};

const SUBJECT_MODES: { id: SubjectMode; label: string; hint: string }[] = [
  { id: "cs", label: "Computer Science", hint: "" },
  { id: "math", label: "Math", hint: "BETA" },
  { id: "science", label: "Science", hint: "BETA" },
  { id: "english", label: "English", hint: "BETA" },
  { id: "other", label: "Other", hint: "BETA" },
];

type HistoryItem = {
  id: number;
  timestamp: string;
  mode: SubjectMode;
  ask: string;
  code: string;
  images: Array<{ name: string; src: string }>;
  aiText: string;
};

export default function Page() {
  const [code, setCode] = useState<string>("");
  const [imageName, setImageName] = useState<string>(""); // kept
  const [imagePreview, setImagePreview] = useState<string | null>(null); // kept (legacy single)
  const [aiText, setAiText] = useState<string>("");
  const [ask, setAsk] = useState<string>(""); // NEW: optional prompt text
  const [images, setImages] = useState<Array<{ name: string; src: string }>>([]); // NEW: multi
  const [isLoading, setIsLoading] = useState<boolean>(false); // NEW: loading bar state
  const [subjectMode, setSubjectMode] = useState<SubjectMode>("cs"); // NEW: subject mode
  const [history, setHistory] = useState<HistoryItem[]>([]); // NEW: past prompts / responses

  // NEW: theme state
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [showMoreSubjects, setShowMoreSubjects] = useState<boolean>(false);

  // NEW: line-level hints from locator
  const [lineHints, setLineHints] = useState<LineHint[]>([]);
  const [lineHintNote, setLineHintNote] = useState<string>("");
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const codeLines = code.split(/\r?\n/);

  useEffect(() => {
    if (typeof window === "undefined") return; // safety for SSR

    try {
      const raw = window.localStorage.getItem("clueai-history-v1");
      if (raw) {
        const parsed = JSON.parse(raw) as HistoryItem[];
        setHistory(parsed);
      }
    } catch (err) {
      console.error("Failed to load history from localStorage:", err);
    }
  }, []);

  // Persist history to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      // NOTE: This will store images (base64) too — if you hit size limits later,
      // you can strip images here before saving.
      window.localStorage.setItem("clueai-history-v1", JSON.stringify(history));
    } catch (err) {
      console.error("Failed to save history to localStorage:", err);
    }
  }, [history]);

  // NEW: load initial theme from localStorage / system preference
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem("clueai-theme");
      if (stored === "light" || stored === "dark") {
        setTheme(stored);
        return;
      }

      const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
      setTheme(prefersLight ? "light" : "dark");
    } catch {
      // fall back to default "dark"
    }
  }, []);

  // NEW: apply theme to <html> and persist
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    root.classList.toggle("theme-light", theme === "light");
    root.classList.toggle("theme-dark", theme === "dark");

    try {
      window.localStorage.setItem("clueai-theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Keep extra subject chips visible when a non-CS mode is active
  useEffect(() => {
    if (subjectMode !== "cs") setShowMoreSubjects(true);
  }, [subjectMode]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Derived text based on subject mode (labels / placeholders)
  const codeLabel =
    subjectMode === "cs"
      ? "Paste your code"
      : subjectMode === "math"
      ? "Paste your math problem"
      : subjectMode === "science"
      ? "Paste your science question or lab instructions"
      : subjectMode === "english"
      ? "Paste the passage, prompt, or outline"
      : "Paste your assignment details";

  const codePlaceholder =
    subjectMode === "cs"
      ? `// Paste your Java, Python, JS, etc.\n// Attach pictures if needed.`
      : subjectMode === "math"
      ? `// Paste the full math problem or system here.\n// You can also attach a screenshot of the question.`
      : subjectMode === "science"
      ? `// Paste the question, lab write-up, or data snippet.\n// Attach images of diagrams or lab setups if helpful.`
      : subjectMode === "english"
      ? `// Paste the prompt, passage, or outline you're working on.\n// Attach screenshots of the rubric or prompt if needed.`
      : `// Paste any instructions or content you're stuck on.\n// Attach screenshots or images if they help explain the task.`;

  const uploadAriaLabel =
    subjectMode === "cs"
      ? "Upload image of your assignment or error"
      : subjectMode === "math"
      ? "Upload image of your math problem or work"
      : subjectMode === "science"
      ? "Upload image of your diagram, data table, or lab prompt"
      : subjectMode === "english"
      ? "Upload image of your prompt, passage, or rubric"
      : "Upload image related to your assignment";

  const modeReadable = (mode: SubjectMode): string => {
    switch (mode) {
      case "cs":
        return "CS";
      case "math":
        return "Math";
      case "science":
        return "Science";
      case "english":
        return "English";
      default:
        return "Other";
    }
  };

  const visibleModes = showMoreSubjects
    ? SUBJECT_MODES
    : SUBJECT_MODES.filter((mode) => mode.id === "cs");

  const isTextLikeFile = (file: File): boolean => {
    if (file.type.startsWith("text/")) return true;
    return /\.(txt|java|py|js|ts|tsx|c|cpp|cs|rb|go|rs|php|swift|kt|kts|m|scala)$/i.test(
      file.name || "",
    );
  };

  // NEW: util to add multiple files (images -> previews, text/code files -> code box)
  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // for "File uploaded" label logic
    setImageName(files[0].name);

    Array.from(files).forEach((file, idx) => {
      const reader = new FileReader();

      // Route images through the old flow
      if (file.type.startsWith("image/")) {
        reader.onload = () => {
          const src = reader.result as string;
          setImages((prev) => [...prev, { name: file.name, src }]);

          // keep your legacy single-preview working (first file only)
          if (idx === 0 && !imagePreview) setImagePreview(src);
        };
        reader.readAsDataURL(file);
        return;
      }

      // Route text/code files straight into the code box
      if (isTextLikeFile(file)) {
        reader.onload = () => {
          const text = (reader.result as string) ?? "";
          setCode((prev) => (prev ? `${prev}\n\n${text}` : text));
        };
        reader.readAsText(file);
      }
    });
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files); // NEW
  };

  const handleImage = (file: File) => {
    // kept for compatibility (used by your original code paths)
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // UPDATED: accept multiple files
    const files = e.target.files;
    addFiles(files); // NEW
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // keep legacy single-preview in sync
      if (index === 0) {
        setImagePreview(next[0]?.src ?? null);
        setImageName(next[0]?.name ?? "");
      }
      return next;
    });
  };

  const extractCodeFromImages = async (): Promise<string> => {
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images, ask, subjectMode }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to extract code from image");

    const extracted = (data.aiText ?? "").trim();
    if (!extracted) throw new Error("No text extracted from image");
    return extracted;
  };

  // UPDATED: Help button -> start loading bar (no fake text)
  const onHelp = async () => {
    try {
      setAiText("");
      setIsLoading(true);

      const needsExtraction = images.length > 0 && (!code || code.trim() === "");
      let workingCode = code;

      if (needsExtraction) {
        const extracted = await extractCodeFromImages();
        workingCode = extracted;
        setCode(extracted);
      }

      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: workingCode, ask, images, subjectMode }), // NEW: send subjectMode too
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");

      const cleanText = (data.aiText ?? "").trimStart();
      setAiText(cleanText);

      // NEW: push to history (snapshot of current interaction) with max 10 items
      setHistory((prev) => {
        const next: HistoryItem[] = [
          {
            id: Date.now(),
            timestamp: new Date().toLocaleString(),
            mode: subjectMode,
            ask,
            code: workingCode,
            images: images.map((img) => ({ ...img })), // snapshot
            aiText: cleanText,
          },
          ...prev,
        ];
        return next.slice(0, 10); // cap at 10 items
      });
      await runLocateLines(workingCode);
    } catch (e: any) {
      const errMsg = `Oops — ${e?.message || "something went wrong."}`;
      setAiText(errMsg);

      // also log failures in history so user can see what happened (also capped at 10)
      setHistory((prev) => {
        const next: HistoryItem[] = [
          {
            id: Date.now(),
            timestamp: new Date().toLocaleString(),
            mode: subjectMode,
            ask,
            code: code,
            images: images.map((img) => ({ ...img })),
            aiText: errMsg,
          },
          ...prev,
        ];
        return next.slice(0, 10); // cap at 10 items
      });
    } finally {
      setIsLoading(false);
    }
  };
  // END UPDATED

  // NEW: clear current prompt / response / inputs
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

    // NEW: clear saved history (state + localStorage)
  const onClearHistory = () => {
    setHistory([]);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("clueai-history-v1");
      } catch {
        // ignore
      }
    }
  };

  // NEW: ask AI for likely line ranges to inspect (auto after guidance)
  const runLocateLines = async (codeOverride?: string) => {
    const codeToUse = typeof codeOverride === "string" ? codeOverride : code;
    const lines = codeToUse.split(/\r?\n/);

    if (!lines.length || codeToUse.length === 0) {
      setLineHints([]);
      setLineHintNote("");
      return;
    }

    try {
      setIsLocating(true);
      setLineHintNote("");
      setLineHints([]);
      const res = await fetch("/api/locate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeToUse, ask, subjectMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");

      const aiText: string = typeof data?.aiText === "string" ? data.aiText : "";
      const parsed = parseLocatorText(aiText, lines.length || 1);
      setLineHints(parsed.ranges);
      setLineHintNote(parsed.note || (!parsed.ranges.length ? "No line ranges returned." : ""));
    } catch (e: any) {
      setLineHintNote(`Could not locate lines: ${e?.message || "unknown error"}`);
      setLineHints([]);
    } finally {
      setIsLocating(false);
    }
  };

  const clearLineHints = () => {
    setLineHints([]);
    setLineHintNote("");
  };


  return (
    <main className="container">
      <header className="hero">
        <h1 className="brand">Clue-ai</h1>
        <p className="tagline">
          An AI Agent that helps students troubleshoot assignments without
          directly giving the answer.
        </p>

        {/* NEW: subject-mode toggle bar */}
        <div className="modeBar" aria-label="Choose subject mode">
          {visibleModes.map((mode) => {
            const active = subjectMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                className={`modeChip ${active ? "isActive" : ""}`}
                onClick={() => setSubjectMode(mode.id)}
                aria-pressed={active}
              >
                {/* CS icon only for CS mode, per request */}
                {mode.id === "cs" && (
                  <span className="modeIcon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path
                        d="M8.5 6.5L4 12l4.5 5.5M15.5 6.5L20 12l-4.5 5.5M11 18h2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
                {/* NEW: icons for other subjects */}
                {mode.id === "math" && (
                  <span className="modeIcon" aria-hidden="true">
                    ∆
                  </span>
                )}
                {mode.id === "science" && (
                  <span className="modeIcon" aria-hidden="true">
                    🧪
                  </span>
                )}
                {mode.id === "english" && (
                  <span className="modeIcon" aria-hidden="true">
                    📖
                  </span>
                )}
                {mode.id === "other" && (
                  <span className="modeIcon" aria-hidden="true">
                    ❔
                  </span>
                )}
                <span className="modeLabelText">{mode.label}</span>
                <span className="modeHint">{mode.hint}</span>
              </button>
            );
          })}
          {!showMoreSubjects && (
            <button
              type="button"
              className="modeChip"
              onClick={() => setShowMoreSubjects(true)}
              aria-pressed={showMoreSubjects}
            >
              <span className="modeIcon" aria-hidden="true">
                +
              </span>
              <span className="modeLabelText">More Subjects (Beta)</span>
            </button>
          )}
          {showMoreSubjects && (
            <button
              type="button"
              className="modeChip"
              onClick={() => setShowMoreSubjects(false)}
              aria-pressed={!showMoreSubjects}
            >
              <span className="modeIcon" aria-hidden="true">
                –
              </span>
              <span className="modeLabelText">Hide extra subjects</span>
            </button>
          )}
        </div>
        {/* REMOVED Start button */}
      </header>

      <section className="panel">
        <div className="left">
          <div className="fieldGroup">
            <label htmlFor="code" className="label">
              {codeLabel}
            </label>
            <div className="codeboxWrap">
              <textarea
                id="code"
                className="codebox"
                placeholder={codePlaceholder}
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />

              {(lineHints.length > 0 || isLocating) && (
                <div className="codeOverlay" role="region" aria-label="Highlighted code lines">
                  {isLocating ? (
                    <div className="overlayLoader" aria-busy="true">
                      <div className="loaderTrack">
                        <div className="loaderBar" />
                      </div>
                      <p className="loaderHint">Locating likely lines…</p>
                    </div>
                  ) : (
                    <>
                      <div className="codeOverlayHeader">
                        <p className="codeHighlightTitle">Likely Error Lines</p>
                        <button
                          type="button"
                          className="clearHighlightBtn"
                          onClick={clearLineHints}
                          title="Clear highlighted lines"
                        >
                          Clear
                        </button>
                      </div>
                      {lineHintNote && lineHintNote.toLowerCase() !== "none" && (
                        <p className="codeHighlightNote">{lineHintNote}</p>
                      )}
                      <div className="codeHighlightBody">
                        {codeLines.map((line, idx) => {
                          const lineNumber = idx + 1;
                          const isPrimary = lineHints.some(
                            (range) => lineNumber >= range.start && lineNumber <= range.end,
                          );
                          const isContext = lineHints.some(
                            (range) =>
                              (lineNumber === range.start - 1 && lineNumber >= 1) ||
                              (lineNumber === range.end + 1 && lineNumber <= codeLines.length),
                          );
                          const cls = isPrimary ? "isHit" : isContext ? "isContext" : "";
                          return (
                            <div key={`hl-${lineNumber}`} className={`hlLine ${cls}`}>
                              <span className="hlNo">{lineNumber}</span>
                              <span className="hlText">{line || " "}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* NEW: Optional guidance input */}
          <div className="fieldGroup">
            <label htmlFor="ask" className="label">
              What do you need help with?
            </label>
            <input
              id="ask"
              type="text"
              className="askInput"
              placeholder="Describe the bug, the goal, or what confuses you…"
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
            />
          </div>

          <div className={`uploadRow ${images.length ? "hasGallery" : ""}`}>
            <label
              className={`dropzone ${imageName ? "hasFile" : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple // NEW
                accept="image/*,.txt,.java,.py,.js,.ts,.tsx,.c,.cpp,.cs,.rb,.go,.rs,.php,.swift,.kt,.kts,.m,.scala"
                className="hiddenFile"
                onChange={onFileChange}
                aria-label={uploadAriaLabel}
              />
              <div className="dzInner">
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 16V8m0 0l-3 3m3-3l3 3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="dzText">Drag & drop or click to upload images</span>
                {imageName && <span className="dzTextUploaded">Upload More</span>}
                {imageName && <em className="fileNote">Selected: {imageName}</em>}
              </div>
            </label>

            {/* NEW: Previews container with removable thumbs */}
            {images.length > 0 && (
              <div className="thumbs" aria-label="Uploaded previews">
                {images.map((img, i) => (
                  <div className="thumbItem" key={`${img.name}-${i}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.src} alt={`Uploaded ${img.name}`} />
                    <button
                      type="button"
                      className="thumbClose"
                      aria-label={`Remove ${img.name}`}
                      title="Remove"
                      onClick={() => removeImage(i)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Help button drives loading */}
            <button
              type="button"
              className="helpBtn"
              onClick={onHelp}
              aria-label="Get non-spoiler debugging help"
              title="Non-spoiler debugging help"
              aria-busy={isLoading}
              disabled={isLoading}
            >
              {/* Search icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{isLoading ? "Thinking…" : "Provide Guidance"}</span>
            </button>

            {/* NEW: New Prompt button to clear current inputs/response */}
            <button
              type="button"
              className="newPromptBtn"
              onClick={onNewPrompt}
              title="Clear current question and start fresh"
              disabled={isLoading}
            >
               <span className="newPromptIcon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>New Prompt or Clear Existing Prompt and Response</span>
            </button>

            {/* legacy single preview block (kept). Hidden via CSS when gallery present */}
            {imagePreview && (
              <div className="thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Uploaded preview" />
              </div>
            )}
          </div>

        </div>

        <div className="right">
          <div className="aiHeader">
            <span className="pulse" aria-hidden="true" />
            <h2>AI Response</h2>
          </div>
          <div className="aiCard" role="region" aria-live="polite">
            {isLoading ? (
              /* NEW: fancy indefinite loading bar */
              <div className="loaderWrap">
                <div className="loaderTrack">
                  <div className="loaderBar" />
                </div>
                <p className="loaderHint">Generating guidance…</p>
              </div>
            ) : aiText ? (
              <div className="aiText">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {aiText}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="placeholder">
                <p>
                  Press <strong>Provide Guidance</strong> to start. I’ll analyze your{" "}
                  {modeReadable(subjectMode).toLowerCase()} work, images, and context and return
                  coaching-only steps (no spoilers).
                </p>
                <ul>
                  <li>Upload a screenshots of the assignment</li>
                  <li>Paste details or assignment instructions</li>
                  <li>Describe what you need help with</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* NEW: Past prompts / history section */}
      {history.length > 0 && (
        <section className="history">
    <div className="historyHeader">
      <div className="historyHeaderText">
        <h2>Past Questions</h2>
        <p>
          Review the past 10 questions you had, what you uploaded, and how Clue-ai responded. Click on the box to see more details.
        </p>
      </div>

      {/* NEW: Clear History button */}
      <button
        type="button"
        className="clearHistoryBtn"
        onClick={onClearHistory}
        title="Clear saved history"
      >
        <span className="clearHistoryIcon" aria-hidden="true">
          {/* same X icon as Clear Prompt */}
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span>Clear History</span>
      </button>
    </div>
          <div className="historyList">
            {history.map((item) => (
              <details key={item.id} className="historyItem">
                <summary className="historySummary">
                  <div className="historySummaryMain">
                    <span className={`historyModeTag mode-${item.mode}`}>
                      {modeReadable(item.mode)}
                    </span>
                    <span className="historyAskText">
                      {item.ask ? item.ask : "(No explicit question provided)"}
                    </span>
                  </div>
                  <span className="historyTimestamp">{item.timestamp}</span>
                </summary>
                <div className="historyBody">
                  <div className="historyMeta">
                    <p>
                      <strong>Mode:</strong> {modeReadable(item.mode)}
                    </p>
                    {item.code && (
                      <div className="historyCode">
                        <strong>Text submitted:</strong>
                        <pre>
                          <code>{item.code}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                  {item.images.length > 0 && (
                    <div className="historyImages" aria-label="Images used in this session">
                      {item.images.map((img, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={`${item.id}-img-${i}`}
                          src={img.src}
                          alt={img.name || `History image ${i + 1}`}
                        />
                      ))}
                    </div>
                  )}
                  <div className="historyResponse">
                    <h3>AI Guidance</h3>
                    <div className="historyResponseText">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {item.aiText}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <footer className="foot">
        <p>
          Built for students • Edison Law 2025 • San Ramon Valley Unified School District • v1.2.7
        </p>
      </footer>
    </main>
  );
}
