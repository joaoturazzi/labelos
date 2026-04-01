import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { submissions, aiConfigs, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.0-flash-001";

const DEFAULT_CRITERIA = {
  generos_preferidos: ["Funk", "Trap", "Pop"],
  bpm_ideal: "80-140",
  foco: "Potencial comercial e fit com TikTok e Reels",
  qualidade_minima: "Produção limpa, mix equilibrado, masterização adequada",
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { submissionId } = body;

  if (!submissionId) {
    return NextResponse.json({ error: "submissionId required" }, { status: 400 });
  }

  analyzeSubmission(submissionId).catch((e) =>
    console.error("[AI] Erro na análise:", e)
  );

  return NextResponse.json({ ok: true }, { status: 202 });
}

async function analyzeSubmission(submissionId: string) {
  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);

  if (!submission || !submission.audioFileUrl) return;

  // Get AI config
  let criteria: Record<string, unknown> = DEFAULT_CRITERIA;
  if (submission.labelId) {
    const [config] = await db
      .select()
      .from(aiConfigs)
      .where(eq(aiConfigs.labelId, submission.labelId))
      .limit(1);
    if (config) criteria = config.criteria as Record<string, unknown>;
  }

  // Try audio analysis first, fall back to metadata-only
  let audioBase64: string | null = null;
  let mimeType = "audio/mpeg";

  try {
    console.log("[AI] Baixando áudio:", submission.audioFileUrl);
    const audioRes = await fetch(submission.audioFileUrl);
    if (audioRes.ok) {
      const buffer = await audioRes.arrayBuffer();
      audioBase64 = Buffer.from(buffer).toString("base64");

      const fileName = submission.audioFileUrl.split("/").pop() || "";
      if (fileName.endsWith(".wav")) mimeType = "audio/wav";
      else if (fileName.endsWith(".aiff") || fileName.endsWith(".aif")) mimeType = "audio/aiff";
      else if (fileName.endsWith(".flac")) mimeType = "audio/flac";
    }
  } catch (err) {
    console.error("[AI] Falha ao baixar áudio:", err);
  }

  const metadataBlock = `- Nome artístico: ${submission.artistName}
- Título da track: ${submission.trackTitle}
- Gênero informado: ${submission.genre || "Não informado"}
- BPM informado: ${submission.bpm || "Não informado"}
- Produtor: ${submission.produtor || "Não informado"}
- Engenheiro de Mix/Master: ${submission.engenheiroMix || "Não informado"}
- Compositores: ${submission.compositores || "Não informado"}`;

  const jsonStructure = `{
  "score": <número inteiro de 0 a 100>,
  "recomendacao": "<sim | talvez | nao>",
  "pontos_fortes": ["<ponto 1>", "<ponto 2>", "<ponto 3>"],
  "pontos_fracos": ["<ponto 1>", "<ponto 2>"],
  "qualidade_producao": <número de 0 a 10>,
  "potencial_comercial": <número de 0 a 10>,
  "fit_criterios": <número de 0 a 10>,
  "originalidade": <número de 0 a 10>,
  "potencial_viral": <número de 0 a 10>,
  "resumo": "<análise em 3-4 frases em português>",
  "genero_detectado": "<gênero identificado>",
  "bpm_estimado": <BPM estimado ou null>,
  "energia": "<baixa | media | alta>",
  "proximos_passos": "<recomendação em 1 frase>"
}`;

  const systemPrompt = `Você é um A&R (Artist and Repertoire) experiente de uma gravadora independente brasileira.
Sua função é avaliar demos de artistas com ouvido técnico e visão comercial.
Responda APENAS em JSON válido, sem markdown, sem texto fora do JSON.`;

  let parsed: Record<string, unknown> | null = null;

  // Attempt 1: Audio analysis
  if (audioBase64) {
    try {
      const audioFormat = mimeType === "audio/wav" ? "wav"
        : mimeType === "audio/flac" ? "flac"
        : "mp3";

      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "LabelOS",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1500,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Ouça esta faixa e avalie com base nos critérios abaixo.

CRITÉRIOS DA GRAVADORA:
${JSON.stringify(criteria, null, 2)}

METADADOS:
${metadataBlock}

Responda com este JSON exato:
${jsonStructure}`,
                },
                {
                  type: "input_audio",
                  input_audio: { data: audioBase64, format: audioFormat },
                },
              ],
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content || "";
        parsed = parseAIResponse(raw);
      } else {
        console.error("[AI] OpenRouter error:", res.status, await res.text());
      }
    } catch (err) {
      console.error("[AI] Audio analysis failed:", err);
    }
  }

  // Attempt 2: Metadata-only fallback
  if (!parsed) {
    console.log("[AI] Usando fallback de análise por metadados");
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "LabelOS",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1000,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Com base apenas nos metadados abaixo, faça uma análise inicial.
IMPORTANTE: Indique no resumo que esta análise é baseada apenas em metadados (áudio não processado).

CRITÉRIOS: ${JSON.stringify(criteria)}

METADADOS:
${metadataBlock}

Responda com este JSON:
${jsonStructure}`,
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content || "";
        parsed = parseAIResponse(raw);
      }
    } catch (err) {
      console.error("[AI] Metadata fallback also failed:", err);
    }
  }

  if (!parsed) {
    await saveAIError(submissionId, "Erro na análise automática.");
    return;
  }

  // Save results
  const score = Math.min(100, Math.max(0, parseInt(String(parsed.score)) || 0));
  await db
    .update(submissions)
    .set({
      aiScore: score,
      aiSummary: (parsed.resumo as string) || "",
      aiCriteriaUsed: {
        recomendacao: parsed.recomendacao,
        pontos_fortes: parsed.pontos_fortes,
        pontos_fracos: parsed.pontos_fracos,
        qualidade_producao: parsed.qualidade_producao,
        potencial_comercial: parsed.potencial_comercial,
        fit_criterios: parsed.fit_criterios,
        originalidade: parsed.originalidade,
        potencial_viral: parsed.potencial_viral,
        genero_detectado: parsed.genero_detectado,
        bpm_estimado: parsed.bpm_estimado,
        energia: parsed.energia,
        proximos_passos: parsed.proximos_passos,
      },
    })
    .where(eq(submissions.id, submissionId));

  // Create notification
  if (submission.labelId) {
    const rec = parsed.recomendacao as string;
    const badge = rec === "sim" ? "Recomendado" : rec === "talvez" ? "Talvez" : "Nao recomendado";
    await db.insert(notifications).values({
      labelId: submission.labelId,
      type: "ai_score_ready",
      title: `Score: ${submission.trackTitle}`,
      body: `${submission.artistName} — ${score}/100 · ${badge}`,
      link: "/dashboard/submissions",
    });
  }

  console.log(`[AI] Análise concluída: ${submission.trackTitle} — Score: ${score}`);
}

function parseAIResponse(raw: string): Record<string, unknown> | null {
  try {
    const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    console.error("[AI] JSON parse failed:", raw.slice(0, 200));
    return null;
  }
}

async function saveAIError(submissionId: string, message: string) {
  await db
    .update(submissions)
    .set({ aiScore: null, aiSummary: message })
    .where(eq(submissions.id, submissionId));
}
