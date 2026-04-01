"use client";

import { useState, useEffect } from "react";

interface AiCriteria {
  generos_preferidos: string;
  bpm_ideal: string;
  foco: string;
  qualidade_minima: string;
}

const DEFAULT_CRITERIA: AiCriteria = {
  generos_preferidos: "Funk, Trap, Pop",
  bpm_ideal: "80-140",
  foco: "Potencial comercial e fit com TikTok/Reels",
  qualidade_minima: "Produção limpa, mix equilibrado",
};

function buildPromptPreview(criteria: AiCriteria): string {
  return `Você é um A&R de uma gravadora independente brasileira.
Ouça esta faixa e avalie com base nos seguintes critérios:

CRITÉRIOS:
${JSON.stringify(
  {
    generos_preferidos: criteria.generos_preferidos
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    bpm_ideal: criteria.bpm_ideal,
    foco: criteria.foco,
    qualidade_minima: criteria.qualidade_minima,
  },
  null,
  2
)}

Responda em JSON com: score (0-100), recomendacao, pontos_fortes, pontos_fracos, resumo, fit_criterios.`;
}

export default function AISettingsPage() {
  const [criteria, setCriteria] = useState<AiCriteria>(DEFAULT_CRITERIA);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load existing config
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ai/config");
        if (res.ok) {
          const config = await res.json();
          if (config?.criteria) {
            const c = config.criteria as Record<string, unknown>;
            setCriteria({
              generos_preferidos: Array.isArray(c.generos_preferidos)
                ? (c.generos_preferidos as string[]).join(", ")
                : (c.generos_preferidos as string) || DEFAULT_CRITERIA.generos_preferidos,
              bpm_ideal: (c.bpm_ideal as string) || DEFAULT_CRITERIA.bpm_ideal,
              foco: (c.foco as string) || DEFAULT_CRITERIA.foco,
              qualidade_minima:
                (c.qualidade_minima as string) || DEFAULT_CRITERIA.qualidade_minima,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load AI config:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criteria: {
            generos_preferidos: criteria.generos_preferidos
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            bpm_ideal: criteria.bpm_ideal,
            foco: criteria.foco,
            qualidade_minima: criteria.qualidade_minima,
          },
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save config:", err);
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof AiCriteria, value: string) => {
    setCriteria((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="text-[13px] text-text4 text-center py-16">
        Carregando...
      </div>
    );
  }

  const textareaClass =
    "w-full text-[13px] px-[10px] py-[6px] border border-[#e5e4e0] rounded-[6px] bg-bg text-text outline-none resize-y min-h-[60px]";

  return (
    <div className="max-w-[720px]">
      <h2 className="text-[15px] font-bold text-text mb-1">
        Configuracao da IA
      </h2>
      <p className="text-[13px] text-text3 mb-6">
        Defina os criterios que a IA usara para avaliar as demos recebidas.
      </p>

      <div className="grid grid-cols-[1fr_1fr] gap-6">
        {/* Form */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] block mb-1.5">
              Generos preferidos
            </label>
            <textarea
              value={criteria.generos_preferidos}
              onChange={(e) => update("generos_preferidos", e.target.value)}
              placeholder="Funk, Trap, Pop"
              className={textareaClass}
              style={{ fontFamily: "inherit" }}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] block mb-1.5">
              BPM ideal
            </label>
            <textarea
              value={criteria.bpm_ideal}
              onChange={(e) => update("bpm_ideal", e.target.value)}
              placeholder="80 a 140"
              className={textareaClass}
              style={{ fontFamily: "inherit" }}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] block mb-1.5">
              Contexto e foco da gravadora
            </label>
            <textarea
              value={criteria.foco}
              onChange={(e) => update("foco", e.target.value)}
              placeholder="O que mais importa pra voces?"
              className={textareaClass}
              style={{ fontFamily: "inherit", minHeight: 80 }}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] block mb-1.5">
              Qualidade minima esperada
            </label>
            <textarea
              value={criteria.qualidade_minima}
              onChange={(e) => update("qualidade_minima", e.target.value)}
              placeholder="Produção limpa, mix equilibrado"
              className={textareaClass}
              style={{ fontFamily: "inherit" }}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`
              bg-text text-white border-none rounded-[6px]
              text-[13px] font-semibold px-[14px] py-[8px]
              cursor-pointer transition-opacity
              ${saving ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}
            `}
            style={{ fontFamily: "inherit" }}
          >
            {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar configuracao"}
          </button>

          {saved && (
            <p className="text-[11px] text-success">
              Configuracao salva com sucesso.
            </p>
          )}
        </div>

        {/* Prompt preview */}
        <div>
          <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-1.5">
            Preview do prompt
          </p>
          <pre
            className="bg-bg2 border border-border rounded-[8px] p-4 text-[12px] text-text2 whitespace-pre-wrap overflow-y-auto"
            style={{
              fontFamily: "inherit",
              maxHeight: 440,
              lineHeight: 1.5,
            }}
          >
            {buildPromptPreview(criteria)}
          </pre>
        </div>
      </div>
    </div>
  );
}
