import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { submissions, aiConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const DEFAULT_CRITERIA = {
  generos_preferidos: ["Funk", "Trap", "Pop"],
  bpm_ideal: "80-140",
  foco: "Potencial comercial e fit com TikTok/Reels",
  qualidade_minima: "Produção limpa, mix equilibrado",
};

function buildPrompt(
  criteria: Record<string, unknown>,
  artistName: string,
  trackTitle: string,
  genre: string | null,
  bpm: number | null
): string {
  return `Você é um A&R (Artist and Repertoire) de uma gravadora independente brasileira.
Ouça esta faixa e avalie com base nos seguintes critérios da gravadora:

CRITÉRIOS:
${JSON.stringify(criteria, null, 2)}

METADADOS DA TRACK:
- Artista: ${artistName}
- Título: ${trackTitle}
- Gênero informado: ${genre || "Não informado"}
- BPM informado: ${bpm || "Não informado"}

Responda APENAS em JSON válido, sem markdown, com esta estrutura exata:
{
  "score": <número de 0 a 100>,
  "recomendacao": "<sim | talvez | nao>",
  "pontos_fortes": ["<ponto 1>", "<ponto 2>"],
  "pontos_fracos": ["<ponto 1>", "<ponto 2>"],
  "resumo": "<análise em 2-3 frases em português>",
  "fit_criterios": "<como a track se encaixa ou não nos critérios configurados>"
}`;
}

export async function POST(req: NextRequest) {
  // Return 202 immediately, process in background
  const body = await req.json();
  const { submissionId } = body;

  if (!submissionId) {
    return NextResponse.json(
      { error: "submissionId is required" },
      { status: 400 }
    );
  }

  // Process asynchronously
  processAnalysis(submissionId).catch((err) =>
    console.error("AI analysis failed for submission:", submissionId, err)
  );

  return NextResponse.json(
    { message: "Análise iniciada", submissionId },
    { status: 202 }
  );
}

async function processAnalysis(submissionId: string) {
  // 1. Fetch submission
  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);

  if (!submission) {
    console.error("Submission not found:", submissionId);
    return;
  }

  // 2. Fetch label's AI config
  let criteria: Record<string, unknown> = DEFAULT_CRITERIA;
  let model = "google/gemini-flash-1.5";

  if (submission.labelId) {
    const [config] = await db
      .select()
      .from(aiConfigs)
      .where(eq(aiConfigs.labelId, submission.labelId))
      .limit(1);

    if (config) {
      criteria = config.criteria as Record<string, unknown>;
      model = config.model || model;
    }
  }

  // 3. Fetch audio and convert to base64
  let audioBase64: string;
  let mimeType = "audio/mpeg";

  try {
    const audioRes = await fetch(submission.audioFileUrl);
    if (!audioRes.ok) {
      throw new Error(`Failed to fetch audio: ${audioRes.status}`);
    }

    const contentType = audioRes.headers.get("content-type");
    if (contentType) mimeType = contentType;

    const buffer = await audioRes.arrayBuffer();
    audioBase64 = Buffer.from(buffer).toString("base64");
  } catch (err) {
    console.error("Failed to fetch audio file:", err);
    await db
      .update(submissions)
      .set({
        aiSummary: "Erro na análise automática: não foi possível acessar o arquivo de áudio.",
      })
      .where(eq(submissions.id, submissionId));
    return;
  }

  // 4. Build prompt
  const prompt = buildPrompt(
    criteria,
    submission.artistName,
    submission.trackTitle,
    submission.genre,
    submission.bpm
  );

  // 5. Call OpenRouter with multimodal content
  try {
    const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "audio_url" as const,
                audio_url: {
                  url: `data:${mimeType};base64,${audioBase64}`,
                },
              },
              {
                type: "text" as const,
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const rawContent: string = data.choices?.[0]?.message?.content || "";

    // 6. Parse JSON response
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 7. Save results
    await db
      .update(submissions)
      .set({
        aiScore: typeof parsed.score === "number" ? parsed.score : null,
        aiSummary: parsed.resumo || rawContent,
        aiCriteriaUsed: {
          recomendacao: parsed.recomendacao,
          pontos_fortes: parsed.pontos_fortes,
          pontos_fracos: parsed.pontos_fracos,
          fit_criterios: parsed.fit_criterios,
          score: parsed.score,
        },
      })
      .where(eq(submissions.id, submissionId));

    console.log(
      `AI analysis complete for "${submission.trackTitle}": score ${parsed.score}`
    );
  } catch (err) {
    console.error("AI analysis error:", err);
    await db
      .update(submissions)
      .set({
        aiScore: null,
        aiSummary: "Erro na análise automática.",
      })
      .where(eq(submissions.id, submissionId));
  }
}
