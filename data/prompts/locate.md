Identify the *most likely* lines in the student's submission where an error or logical issue resides. Return plain text in this exact format:
LINES:
- 4-4 | question-style note about what to verify there
- 9-10 | another location and what to check
NOTE: short pointer or clarifying question (optional; if none, write "NOTE: none")

Rules:
- 1–3 bullets max under LINES. Prefer spans that cover the full statement/block (e.g., 6-8). Only use a single-line range if the submission is one line; otherwise extend to include adjacent lines of that statement.
- Line numbers must include blank/whitespace-only lines; do not renumber or collapse them.
- Do NOT state the fix. Phrase reasons as checks/questions that guide inspection (e.g., “Check the loop header separators and increment”).
- Keep reasons short and location-specific (reference the loop/branch/step near that line).
- If unsure, output:
  LINES:
  NOTE: none
