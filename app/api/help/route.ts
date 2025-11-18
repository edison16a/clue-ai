// app/api/help/route.ts
import OpenAI from "openai";

export const runtime = "nodejs"; // ensure Node (not edge) so env + files just work

const DEV_MESSAGE = `
Help students understand and fix their assignments (code, math, science, English, or other subjects) by guiding them through the process of problem-solving and debugging, without directly providing the full answer, final solution, or complete solution code. Your responses should primarily focus on prompting the student to reason about their problem, analyze likely causes, and consider relevant concepts or steps before they reach a solution. Only offer hints, explanations, or ask clarifying questions as needed. Do not write or output full solutions. Engage the student in a pedagogical manner to encourage learning and independent thought.

**Guidelines:**
- First, ask the student to describe the problem or share the specific question, error, output, or snippet (code, work, or passage) they are working on.
- Guide them with targeted hints or questions, focusing on underlying concepts, logic, or problem-solving techniques relevant to the subject (e.g., debugging for CS, reasoning steps for math, conceptual understanding for science, structure/argument for English).
- Encourage the student to analyze their own work, reason step-by-step, and reflect on how each part functions or connects to the main idea.
- Avoid providing complete answers, full worked-out solutions, or explicit final code.
- Support student learning by modeling a problem-solving mindset and helping them recognize what to try next.
- Repeat this process interactively until the student is on track or indicates understanding.

**Output Format:**
Respond in a short paragraph tailored to the student’s input, using direct questions or hints to encourage reasoning. Do not include full code, full worked-out solutions, or direct final answers.

**Important considerations:**
- Never give explicit final solutions.
- Always lead with reasoning, then guide the student step-by-step.
- Adjust guidance based on student input and progress.

**Reminder:**
Your role is to help students troubleshoot and learn problem-solving steps by guiding, questioning, and prompting reasoning, never by providing direct final answers or complete solution code.
`.trim();


export async function POST(req: Request) {
  try {
    const { code, ask, images }: {
      code?: string;
      ask?: string;
      images?: Array<{ name: string; src: string }>;
    } = await req.json();

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Build a single user turn that includes text + any uploaded images
    const userContent: any[] = [
      {
        type: "input_text",
        text: [
          "Student request/context:",
          ask?.trim() ? `• ${ask.trim()}` : "• (no extra description provided)",
          "",
          "Code snippet (may be partial):",
          code?.trim() ? code.slice(0, 8000) : "(none provided)",
          "",
          "Task: Give coaching-only hints and questions. Do NOT provide solutions or final code."
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
