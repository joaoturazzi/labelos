"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

interface RadarAlert {
  id: string;
  labelId: string;
  submissionId: string;
  artistName: string;
  platform: string;
  metric: string;
  previousValue: number | null;
  currentValue: number | null;
  growthPercent: string | null;
  submissionStatus: string;
  submissionDate: string | null;
  trackTitle: string | null;
  alertMessage: string;
  isRead: boolean;
  generatedAt: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  approved: { label: "Aprovada", color: "#1e8449", bg: "#eafaf1" },
  rejected: { label: "Rejeitada", color: "#c0392b", bg: "#fdf2f2" },
  pending: { label: "Pendente", color: "#d68910", bg: "#fef9e7" },
  reviewing: { label: "Em analise", color: "#1a5276", bg: "#eaf2fb" },
};

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "#8e44ad",
  TikTok: "#1a1a1a",
  Spotify: "#1e8449",
  YouTube: "#c0392b",
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function RadarPage() {
  const [alerts, setAlerts] = useState<RadarAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/radar");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        // Mark as read
        fetch("/api/radar", { method: "PATCH" }).catch(() => {});
      }
    } catch {
      console.error("Failed to load radar");
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setScanMsg("");
    try {
      await fetch("/api/radar/scan", { method: "POST" });
      setScanMsg("Scan iniciado. Resultados aparecerao em alguns minutos.");
      setTimeout(async () => {
        await fetchAlerts();
        setScanning(false);
        setScanMsg("");
      }, 10000);
    } catch {
      setScanMsg("Erro ao iniciar scan.");
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="text-[13px] text-text4 text-center py-16">
        Carregando alertas...
      </div>
    );
  }

  return (
    <div className="max-w-[800px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[22px] font-bold text-text tracking-[-0.3px]">
          Radar de Artistas
        </h2>
        <button
          onClick={handleScan}
          disabled={scanning}
          className={`
            flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5
            rounded-[6px] cursor-pointer transition-colors border-none
            ${scanning ? "bg-bg3 text-text4" : "bg-text text-white hover:opacity-90"}
          `}
          style={{ fontFamily: "inherit" }}
        >
          <RefreshCw size={12} className={scanning ? "animate-spin" : ""} />
          {scanning ? "Escaneando..." : "Escanear agora"}
        </button>
      </div>
      <p className="text-[13px] text-text3 mb-5">
        Acompanhe o crescimento de artistas que ja submeteram demos
      </p>

      {scanMsg && (
        <p className="text-[11px] text-text3 mb-3">{scanMsg}</p>
      )}

      {/* Info box */}
      <div
        className="rounded-[8px] p-3 mb-5 text-[12px]"
        style={{
          background: "#eaf2fb",
          border: "1px solid #bdd3e8",
          color: "#1a5276",
        }}
      >
        <strong>Como funciona:</strong> O radar monitora diariamente o
        crescimento de artistas que enviaram demos nos ultimos 12 meses.
        Quando detecta crescimento acelerado (+20% em 7 dias), cria um
        alerta. Isso inclui demos <strong>rejeitadas</strong> — pode ser
        uma segunda chance.
      </div>

      {/* Empty state */}
      {alerts.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border2 rounded-[8px]">
          <p className="text-[15px] font-bold text-text mb-2">
            Nenhum alerta ainda
          </p>
          <p className="text-[13px] text-text3 mb-4">
            O radar esta monitorando todos os artistas que ja enviaram
            demos. Quando detectar crescimento acelerado, os alertas
            aparecerao aqui.
          </p>
          <button
            onClick={handleScan}
            className="text-[13px] font-semibold px-5 py-2 bg-text text-white border-none rounded-[6px] cursor-pointer hover:opacity-90 transition-opacity"
            style={{ fontFamily: "inherit" }}
          >
            Rodar primeiro scan
          </button>
        </div>
      )}

      {/* Alert list */}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-3">
          {alerts.map((alert) => {
            const status =
              STATUS_CONFIG[alert.submissionStatus] || STATUS_CONFIG.pending;
            const platformColor =
              PLATFORM_COLORS[alert.platform] || "#555";
            const growth = alert.growthPercent
              ? parseFloat(alert.growthPercent)
              : 0;

            return (
              <div
                key={alert.id}
                className="bg-bg rounded-[8px] p-4 transition-colors"
                style={{
                  border: `1px solid ${alert.isRead ? "var(--color-border)" : "#a9dfbf"}`,
                  borderLeft: `4px solid ${platformColor}`,
                }}
              >
                <div className="flex justify-between items-start gap-3 mb-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-text mb-1.5">
                      {alert.alertMessage}
                    </p>
                    <div className="flex gap-2 flex-wrap items-center">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-[4px]"
                        style={{
                          color: platformColor,
                          background: `${platformColor}15`,
                        }}
                      >
                        {alert.platform}
                      </span>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-[4px]"
                        style={{
                          color: status.color,
                          background: status.bg,
                        }}
                      >
                        Demo: {status.label}
                      </span>
                      {alert.trackTitle && (
                        <span className="text-[11px] text-text3">
                          {alert.trackTitle}
                        </span>
                      )}
                      {alert.submissionDate && (
                        <span className="text-[11px] text-text4">
                          Submeteu em {formatDate(alert.submissionDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Growth highlight */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[22px] font-bold leading-none text-success">
                      +{growth.toFixed(0)}%
                    </p>
                    <p className="text-[10px] text-text4 mt-0.5">
                      crescimento
                    </p>
                  </div>
                </div>

                {/* Numbers */}
                {alert.previousValue != null &&
                  alert.currentValue != null && (
                    <div className="flex items-center gap-2 bg-bg2 rounded-[6px] px-3 py-2 text-[12px] text-text2 mb-2.5">
                      <span className="text-text3">
                        {formatNumber(alert.previousValue)}
                      </span>
                      <span className="text-text4">&rarr;</span>
                      <span className="font-bold text-success">
                        {formatNumber(alert.currentValue)}
                      </span>
                      <span className="text-text3">{alert.metric}</span>
                    </div>
                  )}

                {/* Rejected demo CTA */}
                {alert.submissionStatus === "rejected" && (
                  <div
                    className="rounded-[6px] px-3 py-2 text-[12px] flex items-center justify-between"
                    style={{
                      background: "#fef9e7",
                      border: "1px solid #f9ca56",
                      color: "#d68910",
                    }}
                  >
                    <span>
                      Voce rejeitou a demo deste artista. Pode ser hora de
                      reconsiderar.
                    </span>
                    <a
                      href={`/dashboard/submissions?search=${encodeURIComponent(alert.artistName)}`}
                      className="text-[11px] font-bold no-underline whitespace-nowrap ml-3"
                      style={{ color: "#d68910" }}
                    >
                      Ver demo &rarr;
                    </a>
                  </div>
                )}

                {/* Timestamp */}
                <p className="text-[10px] text-text4 text-right mt-2">
                  Detectado em {formatDate(alert.generatedAt)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
