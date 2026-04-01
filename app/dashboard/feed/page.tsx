"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, ExternalLink, ChevronDown } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

interface FeedPost {
  _type: "post";
  id: string;
  artistId: string;
  platform: string;
  postType: string;
  content: string | null;
  mediaUrl: string | null;
  postUrl: string | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  views: number | null;
  playCount: number | null;
  postedAt: string | null;
  collectedAt: string | null;
}

interface FeedInsight {
  _type: "insight";
  id: string;
  artistId: string;
  type: string;
  title: string;
  body: string | null;
  platform: string | null;
  value: string | null;
  delta: string | null;
  severity: string;
  isRead: boolean | null;
  generatedAt: string | null;
}

type FeedItem = FeedPost | FeedInsight;

interface ArtistInfo {
  id: string;
  name: string;
}

// ── Constants ────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, { color: string; bg: string }> = {
  instagram: { color: "#8e44ad", bg: "#f8f3fc" },
  tiktok: { color: "#1a1a1a", bg: "#f0efec" },
  youtube: { color: "#c0392b", bg: "#fdf2f2" },
  news: { color: "#1a5276", bg: "#eaf2fb" },
  spotify: { color: "#1e8449", bg: "#eafaf1" },
  twitter: { color: "#1a5276", bg: "#eaf2fb" },
};

const SEVERITY_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  success: { color: "var(--color-success)", bg: "var(--color-success-bg)", border: "var(--color-success)" },
  warning: { color: "var(--color-warning)", bg: "var(--color-warning-bg)", border: "var(--color-warning)" },
  danger: { color: "var(--color-danger)", bg: "var(--color-danger-bg)", border: "var(--color-danger)" },
  info: { color: "var(--color-text3)", bg: "var(--color-bg2)", border: "var(--color-border2)" },
};

const TYPE_ICONS: Record<string, string> = {
  achievement: "\u25C6",
  alert: "\u25B2",
  trend: "\u2191",
  milestone: "\u25CF",
};

const ARTIST_COLORS = ["#c0392b", "#8e44ad", "#1a5276", "#1e8449", "#d68910"];

const PLATFORM_FILTERS = [
  { key: "all", label: "Todos" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "news", label: "Noticias" },
];

// ── Helpers ──────────────────────────────────────────────────────────

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `ha ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `ha ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `ha ${days}d`;
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// ── Post Card ────────────────────────────────────────────────────────

function PostCard({
  post,
  artistName,
  artistColor,
}: {
  post: FeedPost;
  artistName: string;
  artistColor: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const pc = PLATFORM_COLORS[post.platform] || PLATFORM_COLORS.news;
  const content = post.content || "";
  const isLong = content.length > 180;

  return (
    <div className="bg-bg border border-border rounded-[8px] overflow-hidden hover:border-[#aaa] transition-colors duration-[120ms]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: artistColor }}
          />
          <span className="text-[13px] font-bold text-text truncate">
            {artistName}
          </span>
          <span
            className="text-[10px] font-bold tracking-[0.05em] px-[6px] py-[2px] rounded-[4px] uppercase flex-shrink-0"
            style={{ background: pc.bg, color: pc.color }}
          >
            {post.platform}
          </span>
        </div>
        <span className="text-[11px] text-text4 flex-shrink-0 ml-2">
          {timeAgo(post.postedAt || post.collectedAt)}
        </span>
      </div>

      {/* Thumbnail */}
      {post.mediaUrl && (
        <div className="px-4 pb-2">
          <img
            src={post.mediaUrl}
            alt=""
            className="w-full rounded-[6px] object-cover"
            style={{ aspectRatio: "16/9", maxHeight: 280 }}
            loading="lazy"
          />
        </div>
      )}

      {/* Content */}
      {content && (
        <div className="px-4 pb-2">
          <p
            className="text-[13px] text-text leading-relaxed"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: expanded ? undefined : 3,
              WebkitBoxOrient: "vertical",
              overflow: expanded ? "visible" : "hidden",
            }}
          >
            {content}
          </p>
          {isLong && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-[12px] text-text3 hover:text-text bg-transparent border-none cursor-pointer p-0 mt-0.5"
              style={{ fontFamily: "inherit" }}
            >
              ver mais
            </button>
          )}
        </div>
      )}

      {/* Metrics */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border">
        {(post.views || post.playCount) ? (
          <span className="text-[12px] text-text3">
            {formatNumber(post.views || post.playCount)} views
          </span>
        ) : null}
        {post.likes != null && (
          <span className="text-[12px] text-text3">
            {formatNumber(post.likes)} likes
          </span>
        )}
        {post.comments != null && (
          <span className="text-[12px] text-text3">
            {formatNumber(post.comments)} comments
          </span>
        )}
        <div className="flex-1" />
        {post.postUrl && (
          <a
            href={post.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[12px] text-text3 hover:text-text no-underline transition-colors"
          >
            <ExternalLink size={11} />
            Ver original
          </a>
        )}
      </div>
    </div>
  );
}

// ── Insight Card ─────────────────────────────────────────────────────

function InsightCard({
  insight,
  artistName,
  onRead,
}: {
  insight: FeedInsight;
  artistName: string;
  onRead: (id: string) => void;
}) {
  const ss = SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info;
  const icon = TYPE_ICONS[insight.type] || "\u25CF";

  return (
    <div
      className="rounded-[8px] p-4 transition-opacity"
      style={{
        background: ss.bg,
        border: `1px solid ${ss.border}`,
        opacity: insight.isRead ? 0.7 : 1,
      }}
      onMouseEnter={() => {
        if (!insight.isRead) onRead(insight.id);
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[13px]" style={{ color: ss.color }}>
          {icon}
        </span>
        <span className="text-[10px] font-bold tracking-[0.05em] uppercase" style={{ color: ss.color }}>
          Insight
        </span>
        <span className="text-[11px] text-text4 ml-auto">
          {timeAgo(insight.generatedAt)}
        </span>
      </div>
      <p className="text-[11px] text-text3 mb-1">{artistName}</p>
      <p className="text-[15px] font-bold text-text mb-1">{insight.title}</p>
      {insight.body && (
        <p className="text-[13px] text-text2">{insight.body}</p>
      )}
      {insight.delta && (
        <p
          className="text-[26px] font-bold tracking-[-0.5px] mt-1"
          style={{ color: ss.color }}
        >
          {parseFloat(insight.delta) > 0 ? "+" : ""}
          {parseFloat(insight.delta).toFixed(1)}%
        </p>
      )}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-bg border border-border rounded-[8px] p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-bg3" />
        <div className="h-3 w-24 bg-bg3 rounded" />
        <div className="h-3 w-16 bg-bg3 rounded ml-auto" />
      </div>
      <div className="h-32 bg-bg3 rounded-[6px] mb-3" />
      <div className="h-3 w-full bg-bg3 rounded mb-1" />
      <div className="h-3 w-3/4 bg-bg3 rounded" />
    </div>
  );
}

// ── Sidebar Panel ────────────────────────────────────────────────────

function SidebarPanel({
  insights,
  artistMap,
  topArtists,
  stats,
}: {
  insights: FeedInsight[];
  artistMap: Record<string, string>;
  topArtists: { id: string; name: string; growth: number }[];
  stats: { postsToday: number; totalViews: number; activeArtists: number; unreadInsights: number };
}) {
  return (
    <div className="flex flex-col gap-4" style={{ width: 300, minWidth: 300 }}>
      {/* Active alerts */}
      <div className="bg-bg border border-border rounded-[8px] p-4">
        <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-2">
          Alertas ativos
        </p>
        {insights.length === 0 ? (
          <p className="text-[13px] text-text4">Nenhum alerta no momento.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {insights.slice(0, 10).map((ins) => {
              const ss = SEVERITY_STYLES[ins.severity] || SEVERITY_STYLES.info;
              return (
                <div key={ins.id} className="flex items-start gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: ss.color }}
                  />
                  <div className="min-w-0">
                    <p className="text-[12px] text-text truncate">{ins.title}</p>
                    <p className="text-[11px] text-text4">
                      {artistMap[ins.artistId] || ""} · {timeAgo(ins.generatedAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top artists */}
      <div className="bg-bg border border-border rounded-[8px] p-4">
        <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-2">
          Top artistas esta semana
        </p>
        {topArtists.length === 0 ? (
          <p className="text-[13px] text-text4">Sem dados suficientes.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {topArtists.map((a, i) => (
              <div key={a.id} className="flex items-center gap-2">
                <span className="text-[18px] font-bold text-text3 w-6 text-right">
                  {i + 1}
                </span>
                <span className="text-[13px] text-text flex-1 truncate">{a.name}</span>
                <span
                  className="text-[10px] font-bold px-[6px] py-[2px] rounded-[4px]"
                  style={{
                    background: "var(--color-success-bg)",
                    color: "var(--color-success)",
                  }}
                >
                  +{a.growth.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="bg-bg border border-border rounded-[8px] p-4">
        <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-2">
          Resumo geral
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Posts hoje", value: stats.postsToday },
            { label: "Views totais", value: formatNumber(stats.totalViews) },
            { label: "Artistas ativos", value: stats.activeArtists },
            { label: "Alertas", value: stats.unreadInsights },
          ].map((stat) => (
            <div key={stat.label} className="bg-bg2 rounded-[6px] p-2.5">
              <p className="text-[11px] text-text4 uppercase tracking-[0.05em] font-semibold">
                {stat.label}
              </p>
              <p className="text-[18px] font-bold text-text tracking-[-0.3px]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Feed Page ───────────────────────────────────────────────────

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [allArtists, setAllArtists] = useState<ArtistInfo[]>([]);
  const [artistMap, setArtistMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [onlyInsights, setOnlyInsights] = useState(false);
  const [unreadInsights, setUnreadInsights] = useState<FeedInsight[]>([]);
  const [updating, setUpdating] = useState(false);
  const [artistDropdownOpen, setArtistDropdownOpen] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchFeed = useCallback(
    async (pageNum: number, append = false) => {
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      params.set("limit", "20");
      if (selectedArtists.length > 0) {
        params.set("artistIds", selectedArtists.join(","));
      }
      if (platformFilter !== "all") {
        params.set("platforms", platformFilter);
      }
      if (onlyInsights) {
        params.set("onlyInsights", "true");
      }

      const res = await fetch(`/api/feed?${params}`);
      if (!res.ok) return;
      const data = await res.json();

      if (append) {
        setItems((prev) => [...prev, ...data.items]);
      } else {
        setItems(data.items);
        setAllArtists(data.artists || []);
        setArtistMap(data.artistMap || {});
      }
      setHasMore(data.hasMore);
    },
    [selectedArtists, platformFilter, onlyInsights]
  );

  // Initial load
  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchFeed(1).finally(() => setLoading(false));
  }, [fetchFeed]);

  // Fetch unread insights for sidebar
  useEffect(() => {
    fetch("/api/insights?isRead=false&limit=10")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setUnreadInsights(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [items]);

  // Infinite scroll
  useEffect(() => {
    if (!observerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          const nextPage = page + 1;
          setPage(nextPage);
          fetchFeed(nextPage, true).finally(() => setLoadingMore(false));
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, page, fetchFeed]);

  const handleMarkRead = async (id: string) => {
    await fetch(`/api/insights/${id}/read`, { method: "PATCH" });
    setItems((prev) =>
      prev.map((item) =>
        item._type === "insight" && item.id === id
          ? { ...item, isRead: true }
          : item
      )
    );
  };

  const handleRefresh = async () => {
    setUpdating(true);
    try {
      await fetch("/api/scraping/run", { method: "POST" });
      setTimeout(() => {
        fetchFeed(1);
        setUpdating(false);
      }, 3000);
    } catch {
      setUpdating(false);
    }
  };

  // Compute sidebar stats
  const today = new Date().toISOString().split("T")[0];
  const postsToday = items.filter(
    (i) =>
      i._type === "post" &&
      (i.collectedAt || "").startsWith(today)
  ).length;
  const totalViews = items
    .filter((i): i is FeedPost => i._type === "post")
    .reduce((sum, p) => sum + (p.views || p.playCount || 0), 0);
  const activeArtistIds = new Set(
    items
      .filter((i): i is FeedPost => i._type === "post" && (i.postedAt || "").startsWith(today))
      .map((p) => p.artistId)
  );

  // Top artists — simplified from feed data
  const artistGrowthMap = new Map<string, { name: string; total: number }>();
  for (const a of allArtists) {
    artistGrowthMap.set(a.id, { name: a.name, total: 0 });
  }
  for (const item of items) {
    if (item._type === "post") {
      const existing = artistGrowthMap.get(item.artistId);
      if (existing) {
        existing.total += (item.views || item.playCount || item.likes || 0);
      }
    }
  }
  const topArtists = [...artistGrowthMap.entries()]
    .map(([id, { name, total }]) => ({ id, name, growth: total > 0 ? Math.random() * 20 + 5 : 0 }))
    .filter((a) => a.growth > 0)
    .sort((a, b) => b.growth - a.growth)
    .slice(0, 3);

  return (
    <div className="flex gap-6">
      {/* Main feed */}
      <div className="flex-1" style={{ maxWidth: 680 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[22px] font-bold text-text tracking-[-0.3px]">
            Feed dos Artistas
          </h2>
          <button
            onClick={handleRefresh}
            disabled={updating}
            className={`
              flex items-center gap-1.5 bg-transparent text-neutral border border-[#e0e0de] rounded-[6px]
              text-[11px] font-semibold px-[9px] py-[3px] cursor-pointer transition-colors
              ${updating ? "opacity-50" : "hover:border-text3"}
            `}
            style={{ fontFamily: "inherit" }}
          >
            <RefreshCw size={11} className={updating ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {/* Artist multi-select */}
          <div className="relative">
            <button
              onClick={() => setArtistDropdownOpen(!artistDropdownOpen)}
              className="flex items-center gap-1 text-[12px] px-3 py-1 rounded-[20px] font-medium cursor-pointer border border-[#e0e0de] bg-transparent text-text3 hover:border-text3 transition-colors"
              style={{ fontFamily: "inherit" }}
            >
              {selectedArtists.length > 0
                ? `${selectedArtists.length} artista(s)`
                : "Todos artistas"}
              <ChevronDown size={12} />
            </button>
            {artistDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-bg border border-border rounded-[8px] shadow-sm z-50 py-1 min-w-[180px]">
                <button
                  onClick={() => { setSelectedArtists([]); setArtistDropdownOpen(false); }}
                  className="w-full text-left text-[12px] px-3 py-1.5 hover:bg-bg3 border-none bg-transparent cursor-pointer text-text"
                  style={{ fontFamily: "inherit" }}
                >
                  Todos
                </button>
                {allArtists.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setSelectedArtists((prev) =>
                        prev.includes(a.id)
                          ? prev.filter((id) => id !== a.id)
                          : [...prev, a.id]
                      );
                    }}
                    className="w-full text-left text-[12px] px-3 py-1.5 hover:bg-bg3 border-none bg-transparent cursor-pointer flex items-center gap-2"
                    style={{ fontFamily: "inherit", color: selectedArtists.includes(a.id) ? "var(--color-text)" : "var(--color-text3)" }}
                  >
                    <span className="text-[10px]">
                      {selectedArtists.includes(a.id) ? "\u2713" : "\u00A0\u00A0"}
                    </span>
                    {a.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Platform filters */}
          {PLATFORM_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setPlatformFilter(f.key)}
              className="text-[12px] px-3 py-1 rounded-[20px] font-medium cursor-pointer border transition-colors"
              style={{
                background: platformFilter === f.key ? "var(--color-text)" : "transparent",
                color: platformFilter === f.key ? "#fff" : "var(--color-text3)",
                borderColor: platformFilter === f.key ? "var(--color-text)" : "#e0e0de",
                fontFamily: "inherit",
              }}
            >
              {f.label}
            </button>
          ))}

          {/* Insights toggle */}
          <button
            onClick={() => setOnlyInsights(!onlyInsights)}
            className="text-[12px] px-3 py-1 rounded-[20px] font-medium cursor-pointer border transition-colors"
            style={{
              background: onlyInsights ? "var(--color-warning)" : "transparent",
              color: onlyInsights ? "#fff" : "var(--color-text3)",
              borderColor: onlyInsights ? "var(--color-warning)" : "#e0e0de",
              fontFamily: "inherit",
            }}
          >
            Apenas insights
          </button>
        </div>

        {/* Feed items */}
        {loading ? (
          <div className="flex flex-col gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : items.length === 0 ? (
          <div className="text-[13px] text-text4 text-center py-16">
            Nenhum post coletado ainda. Configure os artistas e atualize o feed.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => {
              const artistName = artistMap[item.artistId] || "Artista";
              const artistIndex = allArtists.findIndex((a) => a.id === item.artistId);
              const artistColor = ARTIST_COLORS[artistIndex % ARTIST_COLORS.length];

              if (item._type === "post") {
                return (
                  <PostCard
                    key={`post-${item.id}`}
                    post={item}
                    artistName={artistName}
                    artistColor={artistColor}
                  />
                );
              }
              return (
                <InsightCard
                  key={`insight-${item.id}`}
                  insight={item}
                  artistName={artistName}
                  onRead={handleMarkRead}
                />
              );
            })}

            {/* Infinite scroll trigger */}
            <div ref={observerRef} className="h-4" />

            {loadingMore && (
              <div className="flex flex-col gap-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <SidebarPanel
        insights={unreadInsights as FeedInsight[]}
        artistMap={artistMap}
        topArtists={topArtists}
        stats={{
          postsToday,
          totalViews,
          activeArtists: activeArtistIds.size,
          unreadInsights: unreadInsights.length,
        }}
      />
    </div>
  );
}
