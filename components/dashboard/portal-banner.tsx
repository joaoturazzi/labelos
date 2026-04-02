"use client";

import { useState, useEffect } from "react";

export function PortalBanner() {
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/label")
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then((data) => {
        const slug = data?.slug;
        if (slug) {
          const base = window.location.origin.replace(/\/$/, "");
          setPortalUrl(`${base}/submit/${slug}`);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Don't render while loading
  if (loading) return null;

  // Error state — show warning to configure portal
  if (error) {
    return (
      <div
        className="border-b px-4 md:px-8 py-2 flex items-center gap-2"
        style={{
          background: "#fef9e7",
          borderColor: "#f9ca56",
        }}
      >
        <span className="text-[12px] font-medium" style={{ color: "#d68910" }}>
          Link do portal nao configurado.
        </span>
        <a
          href="/dashboard/settings/portal"
          className="text-[12px] font-semibold no-underline hover:underline"
          style={{ color: "#d68910" }}
        >
          Configurar agora
        </a>
      </div>
    );
  }

  if (!portalUrl) return null;

  return (
    <div
      className="border-b px-4 md:px-8 py-2.5 flex items-center justify-between gap-3"
      style={{
        background: "#eafaf1",
        borderColor: "#a9dfbf",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#1e8449" }} />
        <span
          className="text-[11px] font-bold uppercase tracking-[0.08em] flex-shrink-0"
          style={{ color: "#1e8449" }}
        >
          Link para artistas
        </span>
        <span
          className="text-[12px] text-text border rounded-[4px] px-2 py-0.5 truncate hidden md:inline"
          style={{
            fontFamily: "monospace",
            background: "#fff",
            borderColor: "#a9dfbf",
          }}
        >
          {portalUrl}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleCopy}
          className="text-[12px] font-semibold px-3 py-1 border-none rounded-[6px] cursor-pointer transition-all"
          style={{
            background: copied ? "#1e8449" : "#1a1a1a",
            color: "#fff",
            fontFamily: "inherit",
          }}
        >
          {copied ? "\u2713 Copiado!" : "Copiar link"}
        </button>
        <a
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-semibold px-3 py-1 rounded-[6px] no-underline transition-colors hidden md:inline-block"
          style={{
            background: "transparent",
            color: "#1e8449",
            border: "1px solid #a9dfbf",
            fontFamily: "inherit",
          }}
        >
          Abrir portal
        </a>
      </div>
    </div>
  );
}
