"use client";

import { useState } from "react";

const STAGES = [
  { key: "triage", label: "Triagem IA", description: "Análise automática" },
  { key: "review", label: "Revisão A&R", description: "Escuta humana" },
  { key: "committee", label: "Comitê", description: "Votação da equipe" },
  { key: "contract", label: "Contrato", description: "Aprovação final" },
];

const STAGE_COLORS: Record<string, string> = {
  triage: "var(--color-warning)",
  review: "var(--color-neutral)",
  committee: "var(--color-text)",
  contract: "var(--color-success)",
  approved: "var(--color-success)",
  rejected: "var(--color-danger)",
};

interface Props {
  submissionId: string;
  currentStage: string;
  assignee: string | null;
  deadline: string | null;
  history: { from: string; to: string; at: string; by?: string; note?: string }[] | null;
  aiScore: number | null;
  onStageChange: (stage: string) => void;
}

export function PipelineTracker({
  submissionId,
  currentStage,
  assignee,
  deadline,
  history,
  aiScore,
  onStageChange,
}: Props) {
  const [advancing, setAdvancing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const currentIdx = STAGES.findIndex((s) => s.key === currentStage);
  const isTerminal = currentStage === "approved" || currentStage === "rejected";

  const handleAdvance = async (stage: string) => {
    setAdvancing(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/pipeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (res.ok) {
        onStageChange(stage);
      }
    } finally {
      setAdvancing(false);
    }
  };

  // Auto-triage suggestion based on AI score
  const triageSuggestion =
    currentStage === "triage" && aiScore !== null
      ? aiScore < 30
        ? "rejected"
        : aiScore >= 70
        ? "review"
        : null
      : null;

  return (
    <div>
      <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-3">
        Pipeline de aprovação
      </p>

      {/* Stage dots */}
      <div className="flex items-center gap-1 mb-4">
        {STAGES.map((stage, i) => {
          const isPast = !isTerminal && i < currentIdx;
          const isCurrent = stage.key === currentStage;
          const isFuture = !isTerminal && i > currentIdx;
          const color = isCurrent ? STAGE_COLORS[stage.key] : isPast ? "var(--color-success)" : "var(--color-border2)";

          return (
            <div key={stage.key} className="flex items-center gap-1 flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{
                    background: isCurrent ? color : isPast ? "var(--color-success-bg)" : "var(--color-bg3)",
                    color: isCurrent ? "#fff" : isPast ? "var(--color-success)" : "var(--color-text4)",
                    border: isCurrent ? `2px solid ${color}` : "none",
                  }}
                >
                  {isPast ? "\u2713" : i + 1}
                </div>
                <span
                  className="text-[9px] mt-1 text-center leading-tight"
                  style={{
                    color: isCurrent ? "var(--color-text)" : "var(--color-text4)",
                    fontWeight: isCurrent ? 700 : 400,
                  }}
                >
                  {stage.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div
                  className="h-0.5 flex-1 -mt-3"
                  style={{ background: isPast ? "var(--color-success)" : "var(--color-border)" }}
                />
              )}
            </div>
          );
        })}

        {/* Terminal state */}
        {isTerminal && (
          <div className="flex flex-col items-center">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{
                background: currentStage === "approved" ? "var(--color-success)" : "var(--color-danger)",
                color: "#fff",
              }}
            >
              {currentStage === "approved" ? "\u2713" : "\u2717"}
            </div>
            <span className="text-[9px] mt-1 font-bold" style={{
              color: currentStage === "approved" ? "var(--color-success)" : "var(--color-danger)",
            }}>
              {currentStage === "approved" ? "Aprovado" : "Rejeitado"}
            </span>
          </div>
        )}
      </div>

      {/* Auto-triage suggestion */}
      {triageSuggestion && (
        <div
          className="rounded-[6px] p-2.5 mb-3 text-[12px]"
          style={{
            background: triageSuggestion === "rejected" ? "var(--color-danger-bg)" : "var(--color-success-bg)",
            border: `1px solid ${triageSuggestion === "rejected" ? "var(--color-danger)" : "var(--color-success)"}`,
            color: triageSuggestion === "rejected" ? "var(--color-danger)" : "var(--color-success)",
          }}
        >
          {triageSuggestion === "rejected"
            ? `IA sugere rejeição (score ${aiScore}/100 < 30)`
            : `IA sugere avançar para revisão (score ${aiScore}/100 >= 70)`}
        </div>
      )}

      {/* Action buttons */}
      {!isTerminal && (
        <div className="flex gap-2 mb-3">
          {currentIdx < STAGES.length - 1 && (
            <button
              onClick={() => handleAdvance(STAGES[currentIdx + 1].key)}
              disabled={advancing}
              className="flex-1 bg-text text-white border-none rounded-[6px] text-[12px] font-semibold py-1.5 cursor-pointer hover:opacity-90 transition-opacity"
              style={{ fontFamily: "inherit", opacity: advancing ? 0.5 : 1 }}
            >
              {advancing ? "..." : `Avançar para ${STAGES[currentIdx + 1].label}`}
            </button>
          )}
          {currentStage === "contract" && (
            <button
              onClick={() => handleAdvance("approved")}
              disabled={advancing}
              className="flex-1 bg-success text-white border-none rounded-[6px] text-[12px] font-semibold py-1.5 cursor-pointer"
              style={{ fontFamily: "inherit", background: "var(--color-success)" }}
            >
              Aprovar
            </button>
          )}
          <button
            onClick={() => handleAdvance("rejected")}
            disabled={advancing}
            className="bg-danger-bg text-danger border border-[#f5c6c6] rounded-[6px] text-[12px] font-semibold px-3 py-1.5 cursor-pointer"
            style={{ fontFamily: "inherit" }}
          >
            Rejeitar
          </button>
        </div>
      )}

      {/* History toggle */}
      {history && history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-[11px] text-text3 hover:text-text bg-transparent border-none cursor-pointer p-0"
            style={{ fontFamily: "inherit" }}
          >
            {showHistory ? "Ocultar histórico" : `Ver histórico (${history.length})`}
          </button>
          {showHistory && (
            <div className="mt-2 flex flex-col gap-1">
              {history.map((h, i) => (
                <div key={i} className="text-[11px] text-text3 flex gap-2">
                  <span className="text-text4">{new Date(h.at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  <span>{h.from} → {h.to}</span>
                  {h.by && <span className="text-text4">por {h.by}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
