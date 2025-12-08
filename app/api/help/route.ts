// app/api/help/route.ts
import OpenAI from "openai";

export const runtime = "nodejs"; // ensure Node (not edge) so env + files just work

const SUBJECT_LABELS: Record<string, string> = {
  cs: "Computer Science",
  math: "Math",
  science: "Science",
  english: "English",
  other: "Other",
};

const DEV_MESSAGE = `
Help students understand and fix their assignments (code, math, science, English, or other subjects) by guiding them through the process of problem-solving and debugging, without directly providing the full answer, final solution, or complete solution code.

Specificity rules:
- Give 2–4 pinpointed leads that reference concrete spots in their work (e.g., “In your second loop that builds totals, check for a missing semicolon or off-by-one on the upper bound”).
- Prefer actionable checks over generic advice: suggest exact diagnostics (print/log a variable, trace an index, plug numbers back into equation 2, check evidence in paragraph 3, re-check control vs. experimental setup).
- Call out likely syntax/logic/structure slips right after the area they mention (missing semicolons, <= vs. <, sign errors, misplaced thesis/evidence, skipped unit conversions) and say where to inspect.
- For logic errors, walk them through the path: point to the exact branch/loop/step that produces the output and ask them to trace inputs → state changes → outputs there (e.g., “In the branch after the second loop, is the accumulator reset before the next run?”).
- Tailor by subject: CS—loops/functions/state; Math—steps, operations, equation references; Science—setup, variables, controls/results; English—thesis, evidence, transitions; Other—most relevant structure/content checks.
- Point to the area without declaring the fix: frame checks as questions/verification, not statements like “replace the comma with a semicolon.” Example: “Check your second loop header—are the separators the standard for-loop format?” instead of “You used a comma.”
- If info is sparse, ask one clarifying question that narrows *where* to look next—never a broad “can you share more?”.
- Never output full solutions or full code.

Tone/format:
- One tight paragraph plus a concise bullet list of the specific checks/questions. Avoid fluff.

DO NOT PROVIDE ANY HINTS THAT ARE NOT CORRECT!
`.trim();


export async function POST(req: Request) {
  try {
    const { code, ask, images, subjectMode }: {
      code?: string;
      ask?: string;
      images?: Array<{ name: string; src: string }>;
      subjectMode?: string;
    } = await req.json();

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const readableSubject = SUBJECT_LABELS[subjectMode ?? ""] ?? "Not specified";

    // Build a single user turn that includes text + any uploaded images
    const userContent: any[] = [
      {
        type: "input_text",
        text: [
          "Student request/context:",
          ask?.trim() ? `• ${ask.trim()}` : "• (no extra description provided)",
          "",
          "Subject:",
          `• ${readableSubject}`,
          "",
          "Code snippet (may be partial):",
          code?.trim() ? code.slice(0, 8000) : "(none provided)",
          "",
          "Task: Give concrete, location-specific coaching-only hints and questions. Do NOT provide solutions or final code. Highlight the next spots to inspect and what to verify there."
        ].join("\n"),
      },
    ];

    // Attach each image (data URL is fine)
    for (const img of images ?? []) {
      if (img?.src) {
        userContent.push({
          type: "input_image",
          image_url: img.src, // can be data: URL or https URL
        });
      }
    }

    // Responses API call
    const response = await client.responses.create({
      model: "gpt-4o",                     // ✅ switched to GPT-4o
      store: true,                         // keep for thread continuity / analytics
      text: { format: { type: "text" } },  // output as plain text
      input: [
        { role: "developer", content: [{ type: "input_text", text: DEV_MESSAGE }] },
        { role: "user",      content: userContent },
      ],
      // (Optional) keep answers short; uncomment to be extra strict:
      // max_output_tokens: 220,
      // truncation: "auto",
    });

    // Compact text payload
    const aiText = response.output_text ?? "Sorry, I couldn’t generate guidance this time.";
    return new Response(JSON.stringify({ aiText }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), { status: 500 });
  }
}
