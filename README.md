# Clue.ai 🎓💡

[https://clue-ai.vercel.app/](https://clue-ai.vercel.app/)

Clue.ai is an AI-powered learning assistant built to help students troubleshoot assignments **without ever spoiling the answer**.

Think of it as that supportive teacher who nudges you in the right direction, asks good questions, and helps you figure things out on your own. Instead of dumping a solution, Clue.ai guides you step by step so you actually learn the reasoning process.

---

## ✨ What it does

* 📄 **Paste your assignment** — share any snippet you're stuck on.
* 🖼️ **Upload images and screenshots** — questions, diagrams, lab prompts, or assignment screenshots. Source files can be dropped straight into the text box.
* 💬 **Describe your problem** — tell Clue.ai what confuses you, or just say "help debug".
* 🤖 **Get coaching, not answers** — the AI responds with hints, highlights the lines worth checking, asks clarifying questions, and suggests problem-solving strategies.

---

## 🚀 Screenshots

<img width="1912" height="1636" alt="Clue.ai main interface" src="https://github.com/user-attachments/assets/529c01b7-aac6-44e6-af02-07992cd01ab2" />
<img width="1176" height="577" alt="Clue.ai guidance panel" src="https://github.com/user-attachments/assets/be9697fc-ead9-4fe0-b26c-bdd801c95c60" />

---

## 🏃 Running it locally

```bash
npm install
echo "OPENAI_API_KEY=sk-..." > .env.local
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

`OPENAI_API_KEY` is the only environment variable. It is read server-side only and never reaches the browser.

### Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve a production build |
| `npm test` | Run the test suite |
| `npm run test:watch` | Re-run tests on change |
| `npm run test:coverage` | Tests with a coverage report |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run validate:data` | Check every file in `data/` |
| `npm run generate:tokens` | Rebuild the CSS colour tokens from `data/theme.json` |
| `npm run verify` | All of the above checks, in one command |

---

## 🏗️ Architecture

The app is a single page backed by three API routes. Content lives in `data/`, logic in `lib/`, and rendering in `app/`.

```
data/                      Content and configuration. No code.
  subjects.json              The five subject modes and all of their copy
  strings.json               Every user-visible string
  uploads.json               Accepted file extensions
  config.json                Models, limits, storage keys, defaults
  theme.json                 Colour palettes for dark and light
  prompts/                   The AI system prompts, as Markdown
    help.md  locate.md  extract.md

lib/                       Logic. No JSX, no fetch.
  types.ts                   Shared types and API contracts
  subjects.ts                The subject registry
  locator.ts                 Parses the locator's reply into line ranges
  numbering.ts               Renders a submission as a numbered listing
  fences.ts                  Strips Markdown fences from transcribed code
  uploads.ts                 Accept attribute and text-file detection
  history.ts                 History records and the entry cap
  storage.ts                 Guarded localStorage access
  hooks/                     useTheme, useHistory
  server/                    Server-only modules
    openai.ts                  The shared OpenAI client
    prompts.ts                 Loads data/prompts/*.md at runtime
    services.ts                Prompt assembly and the three model calls
    http.ts                    JSON response helpers

app/
  page.tsx                   Route entry; renders the workspace
  layout.tsx                 Document shell
  globals.css                Stylesheet entry point — import order is the cascade
  styles/                    Fifteen per-feature stylesheets, plus generated tokens
  components/                UI, one file per piece of the screen
  api/
    help/     locate/     extract/      Thin HTTP adapters

scripts/                   Extraction and validation tooling
tests/                     Vitest suites
```

### How the two requests fit together

Pressing **Provide Guidance** runs up to three calls:

1. **`POST /api/extract`** — only when images are attached *and* the text box is empty. Transcribes the screenshots, preserving the student's mistakes rather than correcting them. If you pasted code *and* attached a screenshot, your paste is treated as the submission and is never overwritten.
2. **`POST /api/help`** — returns the coaching hints shown in the right-hand panel.
3. **`POST /api/locate`** — returns line ranges as plain text, which the browser parses into the highlight overlay.

The locate reply is deliberately plain text rather than JSON. `lib/locator.ts` tolerates a missing header, a chatty preamble or an odd dash, so a formatting slip degrades to fewer highlights instead of failing outright.

`lib/numbering.ts` and `lib/locator.ts` are two halves of one contract: the route numbers the lines the model sees, and the browser numbers the lines it highlights. If those ever disagree, every highlight silently lands on the wrong row — which is why they sit side by side and are tested together.

---

## 📝 Adding things without writing code

Everything below is a `data/` edit. Run `npm run validate:data` afterwards; it will tell you if something is missing or inconsistent.

### Add a subject

Append an object to `subjects` in `data/subjects.json`:

```json
{
  "id": "history",
  "label": "History",
  "shortLabel": "History",
  "apiLabel": "History",
  "hint": "BETA",
  "codeLabel": "Paste your source or essay prompt",
  "codePlaceholder": "// Paste the passage, prompt, or outline.\n// Attach images of documents if helpful.",
  "uploadAriaLabel": "Upload image of your source or prompt",
  "icon": { "kind": "glyph", "value": "📜" }
}
```

| Field | Where it appears |
| --- | --- |
| `id` | Sent to the API, stored in history. Lowercase, no spaces. |
| `label` | The full name on the subject chip |
| `shortLabel` | The history tag, and the empty-state sentence |
| `apiLabel` | The name given to the AI in the prompt |
| `hint` | Badge text on the chip. Use `""` for no badge. |
| `codeLabel` | Heading above the text box |
| `codePlaceholder` | Placeholder inside the text box |
| `uploadAriaLabel` | Accessible name for the file input |
| `icon` | `{"kind": "glyph", "value": "📜"}` for a character, or `{"kind": "component", "value": "code"}` for an SVG from `app/components/Icons.tsx` |

The chip, the labels, the prompt wording and the history tag all follow automatically. Only the first subject in the list is shown before "More Subjects" is expanded.

### Change wording

Edit `data/strings.json`. `{action}`, `{subject}` and `{count}` are substituted at render time; leave them in place.

### Change the AI's behaviour

Edit the Markdown in `data/prompts/`. They are read from disk at runtime, so no code change is involved.

Be careful with `locate.md`: its `LINES:` / `- start-end | reason` / `NOTE:` format is what `lib/locator.ts` parses. A test asserts the format is still documented there.

### Accept another file type

Add the bare extension — no leading dot — to `textExtensions` in `data/uploads.json`. It feeds both the file picker's `accept` attribute and the drop handler's detection, so the two cannot drift apart.

### Change colours

Edit `data/theme.json`, then run `npm run generate:tokens` to rebuild `app/styles/tokens.generated.css`. Do not edit the generated file; `npm run validate:data` fails if it is stale.

The four palettes are ordered, and the order matters. `base` and `systemLight` have equal CSS specificity, so only source order separates them. The `theme-dark` and `theme-light` blocks carry an extra class and win from anywhere, which is how the manual toggle overrides the operating system's preference.

### Change a model or a limit

Edit `data/config.json`: models and retention per endpoint, the prompt truncation cap, the history cap, the localStorage key names, and the startup defaults.

---

## 🧰 Tooling notes

`scripts/` holds the tools that made this structure trustworthy and keep it that way:

* **`extract-*.mjs`** — the one-shot extractors that pulled the subjects, prompts, upload types and colours out of the original source. They read from git rather than the working tree, so `validate-data.mjs` can re-run them forever as a regression check that the data still matches what the app originally rendered.
* **`validate-data.mjs`** — 26 checks over `data/`: shapes, uniqueness, cross-file references, and round-trips against the original source.
* **`generate-tokens.mjs`** — `data/theme.json` → CSS custom properties.
* **`verify-stylesheet.mjs`** — flattens the stylesheets to a (media query, selector, property) → winning value map and diffs it against the original single-file stylesheet, proving the split changed no declaration.
* **`split-stylesheet.mjs`** — the one-shot splitter, kept for reference.

---

## 🛠️ Built with

Next.js 15 (App Router) · React 19 · TypeScript · OpenAI Responses API · Vitest

---

Built for students • Edison Law 2025 • San Ramon Valley Unified School District
