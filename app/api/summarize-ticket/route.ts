import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SummarizeRequestBody {
  title: string;
  description: string;
  sentiment?: string;
}

interface TicketSummary {
  mainProblem: string;
  recommendedAction: string;
}

// Fallback returned when the AI call fails or produces invalid JSON
const FALLBACK_SUMMARY: TicketSummary = {
  mainProblem: "No se pudo analizar el problema automáticamente.",
  recommendedAction: "Revisar el ticket manualmente y asignarlo al equipo correspondiente.",
};

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Eres un agente de soporte técnico senior. Analiza el ticket y devuelve ÚNICAMENTE un JSON con esta estructura exacta, sin texto adicional ni bloques de código Markdown:
{
  "mainProblem": "Descripción breve y directa del problema principal (máx 2 oraciones)",
  "recommendedAction": "Acción concreta y específica que el agente debe tomar (máx 1 oración)"
}`;

// ---------------------------------------------------------------------------
// Helper: extract and validate JSON from the model reply
// ---------------------------------------------------------------------------

function parseSummary(raw: string): TicketSummary {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const parsed = JSON.parse(cleaned) as Partial<TicketSummary>;

  if (
    typeof parsed.mainProblem !== "string" ||
    !parsed.mainProblem.trim() ||
    typeof parsed.recommendedAction !== "string" ||
    !parsed.recommendedAction.trim()
  ) {
    throw new Error("AI response did not match the expected schema.");
  }

  return parsed as TicketSummary;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  // 1. Parse and validate request body
  let body: SummarizeRequestBody;
  try {
    body = (await request.json()) as SummarizeRequestBody;
  } catch {
    return Response.json(
      { error: "Request body inválido. Se esperaba JSON con title y description." },
      { status: 400 }
    );
  }

  const { title, description, sentiment } = body;

  if (!title?.trim() || !description?.trim()) {
    return Response.json(
      { error: "Los campos 'title' y 'description' son obligatorios." },
      { status: 400 }
    );
  }

  // 2. Call the AI via Groq
  try {
    const openai = new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Título del ticket: ${title.trim()}\n\nDescripción del ticket: ${description.trim()}${
            sentiment ? `\n\nSentimiento del cliente: ${sentiment}` : ""
          }`,
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content ?? "";
    const parsed = parseSummary(rawContent);

    return Response.json(parsed, { status: 200 });
  } catch (error) {
    console.error("[summarize-ticket] Groq call failed:", error);

    return Response.json(
      {
        ...FALLBACK_SUMMARY,
        _warning:
          "El resumen automático no estuvo disponible. Se devuelve un valor por defecto.",
      },
      { status: 500 }
    );
  }
}
