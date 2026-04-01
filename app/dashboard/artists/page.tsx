"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ArtistModal } from "@/components/dashboard/artist-modal";

interface Artist {
  id: string;
  name: string;
  email: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  spotifyId: string | null;
  youtubeChannel: string | null;
  totalFollowers: number;
  followersDelta: number | null;
  lastCollected: string | null;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export default function ArtistsPage() {
  const router = useRouter();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/artists");
        if (res.ok) setArtists(await res.json());
      } catch (err) {
        console.error("Failed to load artists:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCreate = async (data: { name: string; email: string; instagramHandle: string; tiktokHandle: string; spotifyId: string; youtubeChannel: string }) => {
    const res = await fetch("/api/artists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create");
    const created = await res.json();
    setArtists((prev) => [{ ...created, totalFollowers: 0, followersDelta: null, lastCollected: null }, ...prev]);
  };

  if (loading) {
    return (
      <div className="text-[13px] text-text4 text-center py-16">
        Carregando...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-bold text-text">Artistas</h2>
          <span className="text-[11px] font-bold text-text3 bg-bg2 px-2 py-0.5 rounded-[4px]">
            {artists.length}
          </span>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 bg-text text-white border-none rounded-[6px] text-[13px] font-semibold px-[14px] py-[6px] cursor-pointer hover:opacity-90 transition-opacity"
          style={{ fontFamily: "inherit" }}
        >
          <Plus size={14} />
          Adicionar artista
        </button>
      </div>

      {artists.length === 0 ? (
        <div className="text-[13px] text-text4 text-center py-16">
          Nenhum artista cadastrado ainda. Adiciona o primeiro.
        </div>
      ) : (
        <div
          className="grid gap-2.5"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          {artists.map((artist) => (
            <div
              key={artist.id}
              onClick={() => router.push(`/dashboard/artists/${artist.id}`)}
              className="bg-bg border border-border rounded-[8px] px-4 py-3 cursor-pointer transition-colors hover:border-[#aaa]"
            >
              <p className="text-[15px] font-bold text-text truncate">
                {artist.name}
              </p>

              <div className="flex items-center gap-2 mt-1">
                {artist.instagramHandle && (
                  <span className="text-[13px] text-text3">
                    {artist.instagramHandle}
                  </span>
                )}
                {artist.tiktokHandle && (
                  <span className="text-[13px] text-text3">
                    {artist.tiktokHandle}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-[11px] text-text4 uppercase tracking-[0.05em] font-semibold">
                    Seguidores
                  </p>
                  <p className="text-[18px] font-bold text-text tracking-[-0.3px]">
                    {artist.totalFollowers > 0
                      ? formatNumber(artist.totalFollowers)
                      : "—"}
                  </p>
                </div>

                {artist.followersDelta !== null ? (
                  <span
                    className="text-[10px] font-bold px-[6px] py-[2px] rounded-[4px] uppercase tracking-[0.05em]"
                    style={{
                      background:
                        artist.followersDelta > 0
                          ? "var(--color-success-bg)"
                          : artist.followersDelta < 0
                          ? "var(--color-danger-bg)"
                          : "var(--color-neutral-bg)",
                      color:
                        artist.followersDelta > 0
                          ? "var(--color-success)"
                          : artist.followersDelta < 0
                          ? "var(--color-danger)"
                          : "var(--color-neutral)",
                    }}
                  >
                    {artist.followersDelta > 0
                      ? `+${formatNumber(artist.followersDelta)}`
                      : artist.followersDelta < 0
                      ? formatNumber(artist.followersDelta)
                      : "—"}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-[6px] py-[2px] rounded-[4px] bg-neutral-bg text-neutral uppercase tracking-[0.05em]">
                    —
                  </span>
                )}
              </div>

              {artist.lastCollected && (
                <p className="text-[11px] text-text4 mt-2">
                  Atualizado{" "}
                  {new Date(artist.lastCollected).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <ArtistModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreate}
      />
    </div>
  );
}
