import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { labels, aiConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.0-flash-001";

const DEFAULT_CRITERIA = {
  generos_preferidos: ["Funk", "Trap", "Pop", "R&B"],
  bpm_ideal: "80-160",
  foco: "Potencial comercial e qualidade de producao",
  qualidade_minima: "Producao limpa, mix equilibrado",
};

// POST — public pre-analysis (no auth, rate limited)
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 pre-analyses per IP per hour
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "anonymous";
    const { success: withinLimit } = await checkRateLimit(
      `pre-analyze:${ip}`,
      3
    );
    if (!withinLimit) {
      return NextResponse.json(
        { error: "Muitas analises. Tente novamente em 1 hora." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { audioUrl, trackTitle, genre, bpm, labelId } = body;

    if (!audioUrl) {
      return NextResponse.json(
        { error: "URL do audio e obrigatoria" },
        { status: 400 }
      );
    }

    // Fetch label-specific criteria if labelId provided
    let criteria: Record<string, unknown> = DEFAULT_CRITERIA;
    if (labelId) {
      const [config] = await db
        .select()
        .from(aiConfigs)
        .where(eq(aiConfigs.labelId, labelId))
        .limit(1);
      if (config) criteria = config.criteria as Record<string, unknown>;
    }

    // Download audio with timeout
    const audioRes = (await Promise.race([
      fetch(audioUrl),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 30000)
      ),
    ])) as Response;

    if (!audioRes.ok) {
      return NextResponse.json(
        { error: "Nao foi possivel processar o arquivo de audio" },
        { status: 400 }
      );
    }

    // Check size (max 50MB)
    const contentLength = audioRes.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Arquivo muito grande para analise (max 50MB)" },
        { status: 400 }
      );
    }

    const audioBuffer = await audioRes.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    const fileName = audioUrl.split("/").pop() || "";
    const format = fileName.endsWith(".wav")
      ? "wav"
      : fileName.endsWith(".aiff") || fileName.endsWith(".aif")
        ? "aiff"
        : fileName.endsWith(".flac")
          ? "flac"
          : "mp3";

    const prompt = `Voce e um produtor musical experiente e coach de artistas independentes.
Um artista esta CONSIDERANDO enviar esta faixa para uma gravadora e quer saber
se esta pronta. Sua missao e ser honesto, construtivo e especifico.

CRITERIOS QUE A GRAVADORA VALORIZA:
${JSON.stringify(criteria, null, 2)}

DADOS DA FAIXA:
- Titulo: ${trackTitle || "Nao informado"}
- Genero: ${genre || "Nao informado"}
- BPM: ${bpm || "Nao informado"}

Ouca a faixa com atencao e responda APENAS em JSON valido sem markdown:
{
  "score": <numero de 0 a 100>,
  "pronta_para_enviar": <true se score >= 65, false se menor>,
  "resumo_executivo": "<2 frases diretas sobre o estado atual da faixa>",
  "pontos_fortes": ["<ponto 1>", "<ponto 2>", "<ponto 3>"],
  "melhorias_necessarias": [
    {
      "area": "<Mix | Master | Arranjo | Letra | Melodia | Producao | Performance>",
      "problema": "<descricao clara do problema>",
      "sugestao": "<acao especifica e pratica para melhorar>"
    }
  ],
  "genero_detectado": "<genero que voce identificou>",
  "bpm_estimado": <BPM estimado ou null>,
  "energia": "<baixa | media | alta>",
  "mensagem_para_artista": "<mensagem motivacional e honesta de 1-2 frases>",
  "proximos_passos": ["<passo 1>", "<passo 2>", "<passo 3>"]
}`;

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "LabelOS Pre-Analysis",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "input_audio",
                input_audio: { data: audioBase64, format },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(
        "[pre-analyze] OpenRouter error:",
        response.status,
        await response.text()
      );
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const aiResult = await response.json();
    const rawText = aiResult.choices?.[0]?.message?.content || "";

    let parsed: Record<string, unknown> | null = null;
    try {
      const clean = rawText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {
      console.error("[pre-analyze] JSON parse failed:", rawText.slice(0, 200));
    }

    if (!parsed) {
      throw new Error("Nao foi possivel interpretar a resposta da IA");
    }

    return NextResponse.json({ result: parsed });
  } catch (err) {
    console.error("[pre-analyze] Erro:", err);
    return NextResponse.json(
      { error: "Erro na analise. Tente novamente." },
      { status: 500 }
    );
  }
}
