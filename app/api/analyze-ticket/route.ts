import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Version constant — used for observability / audit
// ---------------------------------------------------------------------------

const modelVersion = "llama-3.3-70b-versatile";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalyzeRequestBody {
  title: string;
  description: string;
}

interface TicketAnalysis {
  summary: string;
  classification: {
    priority: "baja" | "media" | "alta";
    sentiment: "positivo" | "neutral" | "negativo";
  };
  suggestions: {
    response: string;
    nextAction: "asignar" | "escalar" | "cerrar" | "pedir más datos";
  };
  riskLevel: "bajo" | "medio" | "alto";
}

// ---------------------------------------------------------------------------
// System prompt — instructs the model to return the exact required schema
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Eres un analista experto de soporte técnico. Tu tarea es analizar tickets de soporte y responder ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin bloques de código Markdown, con exactamente esta estructura:
{
  "summary": "Resumen corto del problema",
  "classification": {
    "priority": "baja" | "media" | "alta",
    "sentiment": "positivo" | "neutral" | "negativo"
  },
  "suggestions": {
    "response": "Respuesta redactada para el cliente",
    "nextAction": "asignar" | "escalar" | "cerrar" | "pedir más datos"
  },
  "riskLevel": "bajo" | "medio" | "alto"
}`;

// ---------------------------------------------------------------------------
// Fallback returned when the AI call fails or produces invalid JSON
// ---------------------------------------------------------------------------

const FALLBACK_ANALYSIS: TicketAnalysis = {
  summary: "No se pudo analizar el ticket automáticamente.",
  classification: {
    priority: "media",
    sentiment: "neutral",
  },
  suggestions: {
    response: "Hemos recibido su ticket y lo estamos revisando. En breve nos pondremos en contacto con usted.",
    nextAction: "asignar",
  },
  riskLevel: "medio",
};

// ---------------------------------------------------------------------------
// Helper: extract and validate JSON from the model reply
// ---------------------------------------------------------------------------

function parseAnalysis(raw: string): TicketAnalysis {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const parsed = JSON.parse(cleaned) as Partial<TicketAnalysis>;

  const validPriorities = ["baja", "media", "alta"] as const;
  const validSentiments = ["positivo", "neutral", "negativo"] as const;
  const validRisks      = ["bajo", "medio", "alto"] as const;
  const validActions    = ["asignar", "escalar", "cerrar", "pedir más datos"] as const;

  if (
    typeof parsed.summary !== "string" ||
    !parsed.classification ||
    !validPriorities.includes(parsed.classification.priority as never) ||
    !validSentiments.includes(parsed.classification.sentiment as never) ||
    !parsed.suggestions ||
    typeof parsed.suggestions.response !== "string" ||
    !validActions.includes(parsed.suggestions.nextAction as never) ||
    !validRisks.includes(parsed.riskLevel as never)
  ) {
    throw new Error("AI response did not match the expected schema.");
  }

  return parsed as TicketAnalysis;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  // 1. Parse and validate request body
  let body: AnalyzeRequestBody;
  try {
    body = (await request.json()) as AnalyzeRequestBody;
  } catch {
    return Response.json(
      { error: "Request body inválido. Se esperaba JSON con title y description." },
      { status: 400 }
    );
  }

  const { title, description } = body;

  if (!title?.trim() || !description?.trim()) {
    return Response.json(
      { error: "Los campos 'title' y 'description' son obligatorios." },
      { status: 400 }
    );
  }

  // 2. Build prompt — System Prompt + Título + Descripción
  const promptUsed = `${SYSTEM_PROMPT}\n\n---\nTítulo del ticket: ${title.trim()}\n\nDescripción: ${description.trim()}`;

  // 3. Call Groq with latency tracking
  const startTime = Date.now();

  try {
    const groq = new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
    });

    const completion = await groq.chat.completions.create({
      model: modelVersion,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Título del ticket: ${title.trim()}\n\nDescripción: ${description.trim()}`,
        },
      ],
    });

    const endTime = Date.now();
    const latency = endTime - startTime;

    const rawResult = completion.choices[0]?.message?.content ?? "";
    const aiData = parseAnalysis(rawResult);

    return Response.json(
      {
        aiData,
        promptUsed,
        modelVersion,
        latency,
        rawResult,
      },
      { status: 200 }
    );
  } catch (error) {
    const endTime = Date.now();
    const latency = endTime - startTime;

    console.error("[analyze-ticket] Groq call failed:", error);

    return Response.json(
      {
        aiData: FALLBACK_ANALYSIS,
        promptUsed,
        modelVersion,
        latency,
        rawResult: "",
        _warning: "El análisis automático no estuvo disponible. Se devuelven valores por defecto.",
      },
      { status: 200 } // 200 so the form can still insert with fallback values
    );
  }
}
