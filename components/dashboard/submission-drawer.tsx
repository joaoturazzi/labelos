"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ExternalLink } from "lucide-react";
import { WaveformPlayer } from "./waveform-player";
import { useGlobalPlayer } from "./global-player";
import { PipelineTracker } from "./pipeline-tracker";

interface Submission {
  id: string;
  artistName: string;
  artistEmail: string;
  trackTitle: string;
  genre: string | null;
  bpm: number | null;
  mixador: string | null;
  distributor: string | null;
  compositores: string | null;
  produtor: string | null;
  engenheiroMix: string | null;
  coverUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  twitterUrl: string | null;
  facebookUrl: string | null;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
  audioFileUrl: string;
  status: string | null;
  aiScore: number | null;
  aiSummary: string | null;
  aiCriteriaUsed: Record<string, unknown> | null;
  pipelineStage: string | null;
  pipelineAssignee: string | null;
  pipelineDeadline: string | null;
  pipelineHistory: unknown[] | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

interface Props {
  submission: Submission | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}

function StatusBadge({ status }: { status: string | null }) {
  const config: Record<string, { label: string; bg: string; color: string }> = {
    pending: { label: "Pendente", bg: "var(--color-warning-bg)", color: "var(--color-warning)" },
    reviewing: { label: "Em análise", bg: "var(--color-neutral-bg)", color: "var(--color-neutral)" },
    approved: { label: "Aprovado", bg: "var(--color-success-bg)", color: "var(--color-success)" },
    rejected: { label: "Rejeitado", bg: "var(--color-danger-bg)", color: "var(--color-danger)" },
  };
  const c = config[status || "pending"] || config.pending;
  return (
    <span
      className="text-[10px] font-bold tracking-[0.05em] px-[6px] py-[2px] rounded-[4px] uppercase"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return (
      <span className="text-[11px] text-text4">Analisando...</span>
    );
  }
  const color =
    score >= 70
      ? "var(--color-success)"
      : score >= 40
      ? "var(--color-warning)"
      : "var(--color-danger)";
  const bg =
    score >= 70
      ? "var(--color-success-bg)"
      : score >= 40
      ? "var(--color-warning-bg)"
      : "var(--color-danger-bg)";

  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-[15px]"
      style={{
        width: 48,
        height: 48,
        background: bg,
        color: color,
        border: `1.5px solid ${color}`,
      }}
    >
      {score}
    </div>
  );
}

function GlobalPlayButton({ url, title, artist }: { url: string; title: string; artist: string }) {
  const { play, currentTrack, isPlaying } = useGlobalPlayer();
  const isCurrent = currentTrack?.url === url;

  return (
    <button
      onClick={() => play({ url, title, artist })}
      className="mt-1.5 w-full text-[11px] font-semibold py-1.5 rounded-[6px] cursor-pointer transition-colors border"
      style={{
        background: isCurrent && isPlaying ? "var(--color-text)" : "transparent",
        color: isCurrent && isPlaying ? "#fff" : "var(--color-text3)",
        borderColor: isCurrent && isPlaying ? "var(--color-text)" : "var(--color-border)",
        fontFamily: "inherit",
      }}
    >
      {isCurrent && isPlaying ? "\u23F8 Tocando no player global" : "\u25B6 Tocar no player global"}
    </button>
  );
}

function SocialLink({ url, label }: { url: string | null; label: string }) {
  if (!url) return null;
  const href = url.startsWith("http") ? url : `https://${url}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-[13px] text-text2 hover:text-text transition-colors no-underline"
    >
      <ExternalLink size={12} />
      {label}
    </a>
  );
}

export function SubmissionDrawer({ submission, onClose, onStatusChange }: Props) {
  // Local state for polling AI score updates
  const [localData, setLocalData] = useState(submission);

  // Sync when parent passes new submission
  useEffect(() => {
    if (submission) setLocalData(submission);
  }, [submission]);

  // Poll for AI score if not yet available
  useEffect(() => {
    if (!localData || localData.aiScore !== null) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/submissions/${localData.id}`);
        if (res.ok) {
          const updated = await res.json();
          if (updated.aiScore !== null) {
            setLocalData(updated);
          }
        }
      } catch {}
    }, 8000);

    return () => clearInterval(interval);
  }, [localData?.id, localData?.aiScore]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (submission) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [submission, handleKeyDown]);

  if (!submission) return null;

  // Use localData which gets updated by polling
  const sub = localData || submission;
  const criteria = sub.aiCriteriaUsed as Record<string, unknown> | null;
  const pontosFortes = (criteria?.pontos_fortes as string[]) || [];
  const pontosFracos = (criteria?.pontos_fracos as string[]) || [];
  const recomendacao = criteria?.recomendacao as string | undefined;
  const gêneroDetectado = criteria?.genero_detectado as string | undefined;
  const bpmEstimado = criteria?.bpm_estimado as number | undefined;
  const energia = criteria?.energia as string | undefined;
  const proximosPassos = criteria?.proximos_passos as string | undefined;
  const hasCriteria = criteria != null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[800]"
        style={{ background: "rgba(0,0,0,0.22)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[801] bg-bg border-l border-border overflow-y-auto"
        style={{ width: 480 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-[15px] font-bold text-text truncate">
                {sub.artistName}
              </h2>
              <StatusBadge status={sub.status} />
            </div>
            <p className="text-[13px] text-text2 truncate">
              {sub.trackTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-[6px] border-none bg-transparent text-text3 hover:bg-bg3 hover:text-text cursor-pointer transition-colors ml-3 flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* Audio player */}
          <div>
            <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-2">
              Player
            </p>
            <WaveformPlayer
              url={sub.audioFileUrl}
              trackTitle={sub.trackTitle}
              artistName={sub.artistName}
            />
            <GlobalPlayButton url={sub.audioFileUrl} title={sub.trackTitle} artist={sub.artistName} />
          </div>

          {/* Track data */}
          <div>
            <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-2">
              Dados da track
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Gênero", value: sub.genre },
                { label: "BPM", value: sub.bpm },
                { label: "Produtor", value: sub.produtor },
                { label: "Mix/Master", value: sub.engenheiroMix },
                { label: "Compositores", value: sub.compositores },
                { label: "Mixador", value: sub.mixador },
                { label: "Distribuidora", value: sub.distributor },
              ]
                .filter((item) => item.value)
                .map((item) => (
                  <div key={item.label} className="bg-bg2 border border-border rounded-[8px] p-3">
                    <p className="text-[11px] text-text4 mb-0.5">{item.label}</p>
                    <p className="text-[13px] text-text">{item.value}</p>
                  </div>
                ))}
              {![sub.genre, sub.bpm, sub.produtor, sub.engenheiroMix, sub.compositores, sub.mixador, sub.distributor].some(Boolean) && (
                <p className="text-[13px] text-text4 col-span-2">Nenhum dado informado.</p>
              )}
            </div>
          </div>

          {/* Social links */}
          {(sub.instagramUrl || sub.tiktokUrl || sub.twitterUrl || sub.facebookUrl || sub.spotifyUrl || sub.youtubeUrl) && (
            <div>
              <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-2">
                Redes sociais
              </p>
              <div className="flex flex-wrap gap-3">
                <SocialLink url={sub.instagramUrl} label="Instagram" />
                <SocialLink url={sub.tiktokUrl} label="TikTok" />
                <SocialLink url={sub.twitterUrl} label="X / Twitter" />
                <SocialLink url={sub.facebookUrl} label="Facebook" />
                <SocialLink url={sub.spotifyUrl} label="Spotify" />
                <SocialLink url={sub.youtubeUrl} label="YouTube" />
              </div>
            </div>
          )}

          {/* AI Result — expanded */}
          <div>
            <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-2">
              Resultado da IA
            </p>

            {sub.aiScore === null && !sub.aiSummary ? (
              <div className="bg-bg2 border border-border rounded-[8px] p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-text4 animate-pulse" />
                  <p className="text-[13px] text-text4">Analisando...</p>
                </div>
              </div>
            ) : sub.aiScore !== null ? (
              <div className="flex flex-col gap-3">
                {/* Score + recommendation */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-bg border border-border rounded-[8px] p-3">
                    <p className="text-[11px] text-text4 uppercase tracking-[0.05em] font-semibold">Score geral</p>
                    <p className="text-[26px] font-bold tracking-[-0.5px] mt-1" style={{
                      color: sub.aiScore >= 70 ? "var(--color-success)" : sub.aiScore >= 40 ? "var(--color-warning)" : "var(--color-danger)"
                    }}>{sub.aiScore}/100</p>
                  </div>
                  <div className="bg-bg border border-border rounded-[8px] p-3">
                    <p className="text-[11px] text-text4 uppercase tracking-[0.05em] font-semibold">Recomendação</p>
                    <p className="text-[26px] font-bold tracking-[-0.5px] mt-1" style={{
                      color: recomendacao === "sim" ? "var(--color-success)" : recomendacao === "talvez" ? "var(--color-warning)" : "var(--color-danger)"
                    }}>{recomendacao === "sim" ? "Sim" : recomendacao === "talvez" ? "Talvez" : "Nao"}</p>
                  </div>
                </div>

                {/* Sub-scores */}
                {hasCriteria && (
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { label: "Prod.", key: "qualidade_producao" },
                      { label: "Comerc.", key: "potencial_comercial" },
                      { label: "Fit", key: "fit_criterios" },
                      { label: "Origin.", key: "originalidade" },
                      { label: "Viral", key: "potencial_viral" },
                    ].map((item) => {
                      const val = (criteria as Record<string, unknown>)[item.key];
                      return (
                        <div key={item.key} className="bg-bg2 border border-border rounded-[6px] p-2 text-center">
                          <p className="text-[9px] text-text4 uppercase tracking-[0.06em]">{item.label}</p>
                          <p className="text-[18px] font-bold text-text mt-0.5">
                            {val != null ? String(val) : "\u2014"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* AI-detected tags */}
                {(gêneroDetectado || bpmEstimado || energia) && (
                  <div className="flex gap-1.5 flex-wrap">
                    {gêneroDetectado && (
                      <span className="text-[11px] bg-bg3 px-2 py-0.5 rounded-[4px] text-neutral">
                        Gênero: {gêneroDetectado}
                      </span>
                    )}
                    {bpmEstimado && (
                      <span className="text-[11px] bg-bg3 px-2 py-0.5 rounded-[4px] text-neutral">
                        BPM: ~{bpmEstimado}
                      </span>
                    )}
                    {energia && (
                      <span className="text-[11px] bg-bg3 px-2 py-0.5 rounded-[4px] text-neutral">
                        Energia: {energia}
                      </span>
                    )}
                  </div>
                )}

                {/* Summary */}
                <p className="text-[13px] text-text2 leading-relaxed">
                  {sub.aiSummary}
                </p>

                {/* Strong/weak points */}
                <div className="grid grid-cols-2 gap-3">
                  {pontosFortes.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-success uppercase tracking-[0.08em] mb-1.5">Pontos fortes</p>
                      {pontosFortes.map((p, i) => (
                        <p key={i} className="text-[12px] text-text2 mb-1">&#10003; {p}</p>
                      ))}
                    </div>
                  )}
                  {pontosFracos.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-danger uppercase tracking-[0.08em] mb-1.5">Pontos fracos</p>
                      {pontosFracos.map((p, i) => (
                        <p key={i} className="text-[12px] text-text2 mb-1">&#10007; {p}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Next steps */}
                {proximosPassos && (
                  <div className="rounded-[6px] p-2.5 text-[12px]" style={{ background: "#eaf2fb", border: "1px solid #bdd3e8", color: "#1a5276" }}>
                    <strong>Próximos passos:</strong> {proximosPassos}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-text4 text-center py-4">
                {sub.aiSummary || "Analisando..."}
              </p>
            )}
          </div>

          {/* Pipeline */}
          <PipelineTracker
            submissionId={sub.id}
            currentStage={sub.pipelineStage || "triage"}
            assignee={sub.pipelineAssignee || null}
            deadline={sub.pipelineDeadline || null}
            history={(sub.pipelineHistory as { from: string; to: string; at: string; by?: string; note?: string }[]) || null}
            aiScore={sub.aiScore}
            onStageChange={(stage) => {
              const statusMap: Record<string, string> = { triage: "pending", review: "reviewing", committee: "reviewing", contract: "reviewing", approved: "approved", rejected: "rejected" };
              onStatusChange(sub.id, statusMap[stage] || "reviewing");
            }}
          />

          {/* Actions (legacy) */}
          <div>
            <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-2">
              Ações rápidas
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onStatusChange(sub.id, "approved")}
                disabled={sub.status === "approved"}
                className={`
                  flex-1 rounded-[6px] text-[13px] font-semibold px-[14px] py-[6px] cursor-pointer border-none
                  transition-opacity
                  ${
                    sub.status === "approved"
                      ? "opacity-50 cursor-not-allowed bg-text text-white"
                      : "bg-text text-white hover:opacity-90"
                  }
                `}
              >
                Aprovar
              </button>
              <button
                onClick={() => onStatusChange(sub.id, "reviewing")}
                disabled={sub.status === "reviewing"}
                className={`
                  flex-1 rounded-[6px] text-[13px] font-semibold px-[14px] py-[6px] cursor-pointer
                  transition-opacity border
                  ${
                    sub.status === "reviewing"
                      ? "opacity-50 cursor-not-allowed bg-transparent text-neutral border-[#e0e0de]"
                      : "bg-transparent text-neutral border-[#e0e0de] hover:border-text3"
                  }
                `}
              >
                Em análise
              </button>
              <button
                onClick={() => onStatusChange(sub.id, "rejected")}
                disabled={sub.status === "rejected"}
                className={`
                  flex-1 rounded-[6px] text-[13px] font-semibold px-[14px] py-[6px] cursor-pointer
                  transition-opacity border
                  ${
                    sub.status === "rejected"
                      ? "opacity-50 cursor-not-allowed bg-danger-bg text-danger border-[#f5c6c6]"
                      : "bg-danger-bg text-danger border-[#f5c6c6] hover:opacity-80"
                  }
                `}
              >
                Rejeitar
              </button>
            </div>
          </div>

          {/* Meta */}
          <div className="border-t border-border pt-3">
            <p className="text-[11px] text-text4">
              Enviado em{" "}
              {sub.submittedAt
                ? new Date(sub.submittedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </p>
            <p className="text-[11px] text-text4">
              E-mail: {sub.artistEmail}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
