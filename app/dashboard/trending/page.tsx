"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

interface TrendingTrack {
  id: string;
  rank: number | null;
  trackName: string;
  artistName: string;
  plays: number | null;
  deltaRank: number | null;
}

function formatPlays(n: number | null): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null || delta === undefined) {
    return (
      <span
        className="text-[10px] font-bold px-[6px] py-[2px] rounded-[4px] uppercase tracking-[0.05em]"
        style={{ background: "var(--color-warning-bg)", color: "var(--color-warning)" }}
      >
        NEW
      </span>
    );
  }
  if (delta === 0) {
    return (
      <span
        className="text-[10px] font-bold px-[6px] py-[2px] rounded-[4px] uppercase tracking-[0.05em]"
        style={{ background: "var(--color-neutral-bg)", color: "var(--color-neutral)" }}
      >
        —
      </span>
    );
  }
  const isUp = delta > 0;
  return (
    <span
      className="text-[10px] font-bold px-[6px] py-[2px] rounded-[4px] uppercase tracking-[0.05em]"
      style={{
        background: isUp ? "var(--color-success-bg)" : "var(--color-danger-bg)",
        color: isUp ? "var(--color-success)" : "var(--color-danger)",
      }}
    >
      {isUp ? `+${delta}` : delta}
    </span>
  );
}

function TrendingColumn({
  title,
  tracks,
}: {
  title: string;
  tracks: TrendingTrack[];
}) {
  return (
    <div className="flex flex-col">
      <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-3">
        {title}
      </p>
      {tracks.length === 0 ? (
        <div className="text-[13px] text-text4 text-center py-8">
          Dados ainda nao coletados.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {tracks.map((track) => (
            <div
              key={track.id}
              className="flex items-center gap-3 bg-bg border border-border rounded-[8px] px-3 py-2 hover:border-[#aaa] transition-colors"
            >
              <span className="text-[22px] font-bold text-text3 w-8 text-right flex-shrink-0">
                {track.rank || "—"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-text truncate">
                  {track.trackName}
                </p>
                <p className="text-[13px] text-text2 truncate">
                  {track.artistName}
                </p>
              </div>
              <span className="text-[11px] text-text3 flex-shrink-0">
                {formatPlays(track.plays)}
              </span>
              <DeltaBadge delta={track.deltaRank} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TrendingPage() {
  const [data, setData] = useState<{
    platforms: Record<string, TrendingTrack[]>;
    lastUpdated: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/trending");
        if (res.ok) setData(await res.json());
      } catch (err) {
        console.error("Failed to load trending:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await fetch("/api/trending/update", { method: "POST" });
      // Reload after a delay
      setTimeout(async () => {
        const res = await fetch("/api/trending");
        if (res.ok) setData(await res.json());
        setUpdating(false);
      }, 5000);
    } catch {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="text-[13px] text-text4 text-center py-16">
        Carregando...
      </div>
    );
  }

  const platforms = data?.platforms || { tiktok: [], reels: [], spotify: [] };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-bold text-text">Trending</h2>
          {data?.lastUpdated && (
            <span className="text-[11px] text-text4 bg-bg2 px-2 py-0.5 rounded-[4px]">
              Atualizado{" "}
              {new Date(data.lastUpdated).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
        <button
          onClick={handleUpdate}
          disabled={updating}
          className={`
            flex items-center gap-1.5 bg-transparent text-neutral border border-[#e0e0de] rounded-[6px]
            text-[13px] font-semibold px-[14px] py-[6px] cursor-pointer transition-colors
            ${updating ? "opacity-50 cursor-not-allowed" : "hover:border-text3"}
          `}
          style={{ fontFamily: "inherit" }}
        >
          <RefreshCw size={13} className={updating ? "animate-spin" : ""} />
          {updating ? "Atualizando..." : "Atualizar agora"}
        </button>
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-3 gap-5">
        <TrendingColumn title="TikTok" tracks={platforms.tiktok || []} />
        <TrendingColumn title="Reels" tracks={platforms.reels || []} />
        <TrendingColumn title="Spotify" tracks={platforms.spotify || []} />
      </div>
    </div>
  );
}
