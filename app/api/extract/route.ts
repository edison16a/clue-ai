import OpenAI from "openai";

export const runtime = "nodejs";

const EXTRACT_DEV_MESSAGE = `
You transcribe code from images. Preserve the student's original formatting, indentation, symbols, and errors. Do not correct or normalize anything.

Return only the extracted text. No explanations, no extra notes.
`.trim();

export async function POST(req: Request) {
  try {
    const {
      images,
      ask,
      subjectMode,
    }: { images?: Array<{ name?: string; src?: string }>; ask?: string; subjectMode?: string } =
      await req.json();

    if (!images || images.length === 0) {
      return new Response(JSON.stringify({ error: "No images provided" }), { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const userContent: any[] = [
      {
        type: "input_text",
        text: [
          "If relevant, context from the student:",
          ask?.trim() ? `• ${ask.trim()}` : "• (no extra description provided)",
          subjectMode ? `Subject: ${subjectMode}` : "",
          "",
          "Extract ONLY the raw text/code. Do not fix errors.",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ];

    for (const img of images) {
      if (img?.src) {
        userContent.push({ type: "input_image", image_url: img.src });
      }
    }

    const response = await client.responses.create({
      model: "gpt-4o",
      input: [
        { role: "developer", content: [{ type: "input_text", text: EXTRACT_DEV_MESSAGE }] },
        { role: "user", content: userContent },
      ],
      // Keep the output purely textual
      text: { format: { type: "text" } },
    });

    const rawText = response.output_text?.trim() ?? "";
    const aiText = stripCodeFences(rawText);
    if (!aiText) {
      return new Response(JSON.stringify({ error: "No text extracted" }), { status: 422 });
    }

    return new Response(JSON.stringify({ aiText }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), { status: 500 });
  }
}

// Remove common Markdown code fences like ```lang ... ``` while preserving inner text
function stripCodeFences(text: string): string {
  const fenced = text.match(/^```[\w-]*\s*[\r\n]+([\s\S]*?)\s*```$/);
  if (fenced) return fenced[1].trim();
  const nakedFence = text.match(/^```\s*([\s\S]*?)\s*```$/);
  if (nakedFence) return nakedFence[1].trim();
  return text;
}
