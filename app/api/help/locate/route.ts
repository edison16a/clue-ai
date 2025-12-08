import OpenAI from "openai";

export const runtime = "nodejs";

const SUBJECT_LABELS: Record<string, string> = {
  cs: "Computer Science",
  math: "Math",
  science: "Science",
  english: "English",
  other: "Other",
};

// Dedicated prompt for line-level targeting. Output is a small text block we parse client-side.
const LOCATE_MESSAGE = `
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
`.trim();

export async function POST(req: Request) {
  try {
    const { code, ask, subjectMode }: {
      code?: string;
      ask?: string;
      subjectMode?: string;
    } = await req.json();

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const readableSubject = SUBJECT_LABELS[subjectMode ?? ""] ?? "Not specified";

    const codeText = typeof code === "string" ? code : "";
    const codeLines = codeText.split(/\r?\n/);
    const width = String(Math.max(1, codeLines.length)).length;
    const numbered = codeLines
      .map((ln, idx) => {
        const n = String(idx + 1).padStart(width, " ");
        const display = ln === "" ? "(blank)" : ln;
        return `${n} | ${display}`;
      })
      .join("\n");

    const response = await client.responses.create({
      model: "gpt-4o",
      input: [
        { role: "developer", content: [{ type: "input_text", text: LOCATE_MESSAGE }] },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Student request/context:",
                ask?.trim() ? `• ${ask.trim()}` : "• (no extra description provided)",
                "",
                "Subject:",
                `• ${readableSubject}`,
                "",
                "Code with line numbers (include blank lines as shown):",
                codeLines.length ? numbered.slice(0, 8000) : "(none provided)",
                "",
                "Return only the specified text format. No fixes."
              ].join("\n"),
            },
          ],
        },
      ],
    });

    const aiText = response.output_text ?? "";
    return new Response(JSON.stringify({ aiText }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), { status: 500 });
  }
}
