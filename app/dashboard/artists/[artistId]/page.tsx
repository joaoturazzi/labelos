"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, ExternalLink } from "lucide-react";
import { GrowthChart } from "@/components/dashboard/growth-chart";
import { ArtistModal } from "@/components/dashboard/artist-modal";

interface SocialSnapshot {
  platform: string | null;
  followers: number | null;
  engagementRate: string | null;
  rawData: Record<string, unknown> | null;
  collectedAt: string | null;
}

interface Submission {
  id: string;
  trackTitle: string;
  status: string | null;
  aiScore: number | null;
}

interface ArtistProfile {
  id: string;
  name: string;
  email: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  spotifyId: string | null;
  youtubeChannel: string | null;
  platforms: Record<string, SocialSnapshot>;
  growthHistory: { date: string; followers: number }[];
  alerts: { type: "success" | "danger"; message: string }[];
  submissions: Submission[];
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "Pendente", bg: "var(--color-warning-bg)", color: "var(--color-warning)" },
  reviewing: { label: "Em análise", bg: "var(--color-neutral-bg)", color: "var(--color-neutral)" },
  approved: { label: "Aprovado", bg: "var(--color-success-bg)", color: "var(--color-success)" },
  rejected: { label: "Rejeitado", bg: "var(--color-danger-bg)", color: "var(--color-danger)" },
};

function PlatformCard({
  label,
  followers,
  extra,
}: {
  label: string;
  followers: number | null;
  extra?: { label: string; value: string }[];
}) {
  return (
    <div className="bg-bg border border-border rounded-[8px] p-3">
      <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.05em] mb-1">
        {label}
      </p>
      <p className="text-[26px] font-bold text-text tracking-[-0.5px]">
        {followers != null ? formatNumber(followers) : "—"}
      </p>
      {extra?.map((e, i) => (
        <p key={i} className="text-[11px] text-text4 mt-0.5">
          {e.label}: {e.value}
        </p>
      ))}
    </div>
  );
}

export default function ArtistProfilePage() {
  const { artistId } = useParams<{ artistId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const loadProfile = async () => {
    try {
      const res = await fetch(`/api/artists/${artistId}`);
      if (res.ok) setProfile(await res.json());
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [artistId]);

  const handleScrape = async () => {
    setScraping(true);
    try {
      await fetch(`/api/scraping/artist/${artistId}`, { method: "POST" });
      // Wait a bit then reload
      setTimeout(() => {
        loadProfile();
        setScraping(false);
      }, 3000);
    } catch {
      setScraping(false);
    }
  };

  const handleEdit = async (data: { name: string; email: string; instagramHandle: string; tiktokHandle: string; spotifyId: string; youtubeChannel: string }) => {
    const res = await fetch(`/api/artists/${artistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update");
    await loadProfile();
  };

  if (loading) {
    return (
      <div className="text-[13px] text-text4 text-center py-16">
        Carregando...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-[13px] text-text4 text-center py-16">
        Artista não encontrado.
      </div>
    );
  }

  const ig = profile.platforms.instagram;
  const tt = profile.platforms.tiktok;
  const sp = profile.platforms.spotify;
  const yt = profile.platforms.youtube;

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => router.push("/dashboard/artists")}
        className="flex items-center gap-1.5 text-[13px] text-text3 hover:text-text bg-transparent border-none cursor-pointer mb-4 p-0"
        style={{ fontFamily: "inherit" }}
      >
        <ArrowLeft size={14} />
        Voltar
      </button>

      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 320px" }}>
        {/* Main column */}
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[22px] font-bold text-text tracking-[-0.3px]">
                {profile.name}
              </h2>
              {profile.email && (
                <p className="text-[13px] text-text3 mt-0.5">{profile.email}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditOpen(true)}
                className="bg-transparent text-neutral border border-[#e0e0de] rounded-[6px] text-[13px] font-semibold px-[14px] py-[6px] cursor-pointer hover:border-text3 transition-colors"
                style={{ fontFamily: "inherit" }}
              >
                Editar
              </button>
              <button
                onClick={handleScrape}
                disabled={scraping}
                className={`
                  flex items-center gap-1.5 bg-transparent text-neutral border border-[#e0e0de] rounded-[6px]
                  text-[13px] font-semibold px-[14px] py-[6px] cursor-pointer transition-colors
                  ${scraping ? "opacity-50 cursor-not-allowed" : "hover:border-text3"}
                `}
                style={{ fontFamily: "inherit" }}
              >
                <RefreshCw size={13} className={scraping ? "animate-spin" : ""} />
                {scraping ? "Coletando..." : "Coletar dados"}
              </button>
            </div>
          </div>

          {/* Platform metrics */}
          <div>
            <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-2">
              Redes sociais
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {profile.instagramHandle && (
                <PlatformCard
                  label="Instagram"
                  followers={ig?.followers ?? null}
                  extra={[
                    ...(ig?.engagementRate
                      ? [{ label: "Engajamento", value: `${ig.engagementRate}%` }]
                      : []),
                  ]}
                />
              )}
              {profile.tiktokHandle && (
                <PlatformCard
                  label="TikTok"
                  followers={tt?.followers ?? null}
                  extra={
                    tt?.rawData?.totalLikes
                      ? [{ label: "Likes totais", value: formatNumber(tt.rawData.totalLikes as number) }]
                      : []
                  }
                />
              )}
              {profile.spotifyId && (
                <PlatformCard
                  label="Spotify"
                  followers={sp?.followers ?? null}
                  extra={
                    sp?.rawData?.popularity
                      ? [{ label: "Popularidade", value: String(sp.rawData.popularity) }]
                      : []
                  }
                />
              )}
              {profile.youtubeChannel && (
                <PlatformCard
                  label="YouTube"
                  followers={yt?.followers ?? null}
                  extra={
                    yt?.rawData?.viewCount
                      ? [{ label: "Views totais", value: formatNumber(yt.rawData.viewCount as number) }]
                      : []
                  }
                />
              )}
              {!profile.instagramHandle && !profile.tiktokHandle && !profile.spotifyId && !profile.youtubeChannel && (
                <div className="col-span-2 text-[13px] text-text4 text-center py-4">
                  Nenhuma rede social configurada.
                </div>
              )}
            </div>
          </div>

          {/* Growth chart */}
          <div>
            <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-2">
              Histórico de crescimento
            </p>
            <div className="bg-bg border border-border rounded-[8px] p-4">
              <GrowthChart data={profile.growthHistory} />
            </div>
          </div>

          {/* Submissions */}
          <div>
            <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-2">
              Submissions
            </p>
            {profile.submissions.length === 0 ? (
              <div className="text-[13px] text-text4 text-center py-4">
                Nenhuma demo deste artista.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {profile.submissions.map((s) => {
                  const sc = statusConfig[s.status || "pending"] || statusConfig.pending;
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 bg-bg border border-border rounded-[8px] px-3 py-2"
                    >
                      <span className="text-[13px] text-text font-medium flex-1 truncate">
                        {s.trackTitle}
                      </span>
                      <span
                        className="text-[10px] font-bold tracking-[0.05em] px-[6px] py-[2px] rounded-[4px] uppercase"
                        style={{ background: sc.bg, color: sc.color }}
                      >
                        {sc.label}
                      </span>
                      {s.aiScore !== null && (
                        <span
                          className="text-[11px] font-bold"
                          style={{
                            color:
                              s.aiScore >= 70
                                ? "var(--color-success)"
                                : s.aiScore >= 40
                                ? "var(--color-warning)"
                                : "var(--color-danger)",
                          }}
                        >
                          {s.aiScore}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar column */}
        <div className="flex flex-col gap-4">
          {/* Alerts */}
          <div className="bg-bg border border-border rounded-[8px] p-4">
            <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-2">
              Alertas
            </p>
            {profile.alerts.length === 0 ? (
              <p className="text-[13px] text-text4">
                Nenhum alerta no momento.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {profile.alerts.map((alert, i) => (
                  <div
                    key={i}
                    className="text-[12px] px-2.5 py-1.5 rounded-[4px]"
                    style={{
                      background:
                        alert.type === "success"
                          ? "var(--color-success-bg)"
                          : "var(--color-danger-bg)",
                      color:
                        alert.type === "success"
                          ? "var(--color-success)"
                          : "var(--color-danger)",
                    }}
                  >
                    {alert.message}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Handles */}
          <div className="bg-bg border border-border rounded-[8px] p-4">
            <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-2">
              Handles
            </p>
            <div className="flex flex-col gap-1.5">
              {profile.instagramHandle && (
                <a
                  href={`https://instagram.com/${profile.instagramHandle.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[13px] text-text2 hover:text-text no-underline transition-colors"
                >
                  <ExternalLink size={12} />
                  Instagram: {profile.instagramHandle}
                </a>
              )}
              {profile.tiktokHandle && (
                <a
                  href={`https://tiktok.com/@${profile.tiktokHandle.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[13px] text-text2 hover:text-text no-underline transition-colors"
                >
                  <ExternalLink size={12} />
                  TikTok: {profile.tiktokHandle}
                </a>
              )}
              {profile.spotifyId && (
                <a
                  href={`https://open.spotify.com/artist/${profile.spotifyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[13px] text-text2 hover:text-text no-underline transition-colors"
                >
                  <ExternalLink size={12} />
                  Spotify
                </a>
              )}
              {profile.youtubeChannel && (
                <a
                  href={`https://youtube.com/channel/${profile.youtubeChannel}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[13px] text-text2 hover:text-text no-underline transition-colors"
                >
                  <ExternalLink size={12} />
                  YouTube
                </a>
              )}
              {!profile.instagramHandle && !profile.tiktokHandle && !profile.spotifyId && !profile.youtubeChannel && (
                <p className="text-[13px] text-text4">Nenhum handle configurado.</p>
              )}
            </div>
          </div>

          {/* Last scraping */}
          <div className="bg-bg border border-border rounded-[8px] p-4">
            <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-2">
              Último scraping
            </p>
            {Object.values(profile.platforms).some((p) => p?.collectedAt) ? (
              <p className="text-[13px] text-text2">
                {new Date(
                  Math.max(
                    ...Object.values(profile.platforms)
                      .filter((p) => p?.collectedAt)
                      .map((p) => new Date(p.collectedAt!).getTime())
                  )
                ).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : (
              <p className="text-[13px] text-text4">Nenhuma coleta realizada.</p>
            )}
            <button
              onClick={handleScrape}
              disabled={scraping}
              className={`
                mt-2 w-full flex items-center justify-center gap-1.5
                bg-transparent text-neutral border border-[#e0e0de] rounded-[6px]
                text-[11px] font-semibold px-[9px] py-[3px] cursor-pointer transition-colors
                ${scraping ? "opacity-50 cursor-not-allowed" : "hover:border-text3"}
              `}
              style={{ fontFamily: "inherit" }}
            >
              <RefreshCw size={11} className={scraping ? "animate-spin" : ""} />
              Coletar agora
            </button>
          </div>
        </div>
      </div>

      <ArtistModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleEdit}
        initial={{
          id: profile.id,
          name: profile.name,
          email: profile.email || "",
          instagramHandle: profile.instagramHandle || "",
          tiktokHandle: profile.tiktokHandle || "",
          spotifyId: profile.spotifyId || "",
          youtubeChannel: profile.youtubeChannel || "",
        }}
      />
    </div>
  );
}
