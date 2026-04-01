"use client";

import { useState, useEffect } from "react";
import { SubmissionDrawer } from "@/components/dashboard/submission-drawer";
import { Search } from "lucide-react";

interface Submission {
  id: string;
  labelId: string | null;
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
  audioFileKey: string;
  status: string | null;
  aiScore: number | null;
  aiSummary: string | null;
  aiCriteriaUsed: Record<string, unknown> | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

const STATUS_FILTERS = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendente" },
  { key: "reviewing", label: "Em análise" },
  { key: "approved", label: "Aprovado" },
  { key: "rejected", label: "Rejeitado" },
];

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "Pendente", bg: "var(--color-warning-bg)", color: "var(--color-warning)" },
  reviewing: { label: "Em análise", bg: "var(--color-neutral-bg)", color: "var(--color-neutral)" },
  approved: { label: "Aprovado", bg: "var(--color-success-bg)", color: "var(--color-success)" },
  rejected: { label: "Rejeitado", bg: "var(--color-danger-bg)", color: "var(--color-danger)" },
};

function getScoreColor(score: number | null) {
  if (score === null) return { color: "var(--color-text4)", bg: "transparent" };
  if (score >= 70) return { color: "var(--color-success)", bg: "var(--color-success-bg)" };
  if (score >= 40) return { color: "var(--color-warning)", bg: "var(--color-warning-bg)" };
  return { color: "var(--color-danger)", bg: "var(--color-danger-bg)" };
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch("/api/submissions");
      if (res.ok) setSubmissions(await res.json());
    } catch (err) {
      console.error("Failed to load:", err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSubmissions().finally(() => setLoading(false));
  }, []);

  // Poll every 10s if there are submissions waiting for AI score
  useEffect(() => {
    const hasPending = submissions.some(
      (s) => s.status === "pending" && s.aiScore === null
    );
    if (!hasPending) return;

    const interval = setInterval(fetchSubmissions, 10000);
    return () => clearInterval(interval);
  }, [submissions]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSubmissions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...updated } : s))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const filtered = submissions.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.artistName.toLowerCase().includes(q) ||
        s.trackTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selected = selectedId
    ? submissions.find((s) => s.id === selectedId) || null
    : null;

  if (loading) {
    return (
      <div className="text-[13px] text-text4 text-center py-16">
        Carregando...
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-bold text-text">Demos recebidas</h2>
          <span className="text-[11px] font-bold text-text3 bg-bg2 px-2 py-0.5 rounded-[4px]">
            {submissions.length}
          </span>
        </div>
        <a
          href="/api/submissions/export"
          className="text-[11px] font-semibold px-[9px] py-[3px] bg-transparent text-neutral border border-[#e0e0de] rounded-[6px] no-underline hover:border-text3 transition-colors"
          style={{ fontFamily: "inherit" }}
        >
          Exportar CSV
        </a>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.key;
            const filterColor =
              f.key === "all"
                ? "var(--color-text)"
                : statusConfig[f.key]?.color || "var(--color-text)";
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className="text-[12px] px-3 py-1 rounded-[20px] font-medium cursor-pointer border transition-colors"
                style={{
                  background: isActive ? filterColor : "transparent",
                  color: isActive ? "#fff" : "var(--color-text3)",
                  borderColor: isActive ? filterColor : "#e0e0de",
                  fontFamily: "inherit",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="relative flex-1 max-w-[240px]">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text4"
          />
          <input
            type="text"
            placeholder="Buscar artista ou track..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-[13px] pl-8 pr-3 py-[5px] border border-[#e5e4e0] rounded-[6px] bg-bg text-text outline-none"
            style={{ fontFamily: "inherit" }}
          />
        </div>
      </div>

      {/* Submissions list */}
      {filtered.length === 0 ? (
        <div className="text-[13px] text-text4 text-center py-16">
          {submissions.length === 0
            ? "Nenhuma demo recebida ainda."
            : "Nenhuma demo encontrada com esses filtros."}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((s) => {
            const sc = statusConfig[s.status || "pending"] || statusConfig.pending;
            const scoreColors = getScoreColor(s.aiScore);
            return (
              <div
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className="bg-bg border border-border rounded-[8px] px-4 py-3 cursor-pointer transition-colors hover:border-[#aaa] flex items-center gap-4"
              >
                {/* Score circle */}
                <div
                  className="flex items-center justify-center rounded-full font-bold text-[13px] flex-shrink-0"
                  style={{
                    width: 40,
                    height: 40,
                    background: scoreColors.bg,
                    color: scoreColors.color,
                    border:
                      s.aiScore !== null
                        ? `1.5px solid ${scoreColors.color}`
                        : "1.5px dashed var(--color-border2)",
                  }}
                >
                  {s.aiScore !== null ? s.aiScore : "..."}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-text truncate">
                      {s.artistName}
                    </span>
                    <span className="text-[13px] text-text2 truncate">
                      {s.trackTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-[10px] font-bold tracking-[0.05em] px-[6px] py-[2px] rounded-[4px] uppercase"
                      style={{ background: sc.bg, color: sc.color }}
                    >
                      {sc.label}
                    </span>
                    {s.genre && (
                      <span className="text-[10px] font-bold tracking-[0.05em] px-[6px] py-[2px] rounded-[4px] uppercase bg-bg2 text-text3">
                        {s.genre}
                      </span>
                    )}
                  </div>
                </div>

                {/* Date */}
                <span className="text-[11px] text-text4 flex-shrink-0">
                  {s.submittedAt
                    ? new Date(s.submittedAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })
                    : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer */}
      <SubmissionDrawer
        submission={selected}
        onClose={() => setSelectedId(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
