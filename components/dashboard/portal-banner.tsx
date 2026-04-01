"use client";

import { useState, useEffect } from "react";

export function PortalBanner() {
  const [slug, setSlug] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/label")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.slug) setSlug(data.slug);
      })
      .catch(() => {});
  }, []);

  if (!slug) return null;

  const portalUrl = `${window.location.origin}/submit/${slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-bg2 border-b border-border px-8 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] flex-shrink-0">
          Link do portal
        </span>
        <span
          className="text-[13px] text-text bg-bg border border-border rounded-[4px] px-2 py-0.5 truncate"
          style={{ fontFamily: "monospace" }}
        >
          {portalUrl}
        </span>
      </div>
      <button
        onClick={handleCopy}
        className="text-[12px] font-semibold px-3 py-1 bg-text text-white border-none rounded-[6px] cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0"
        style={{ fontFamily: "inherit" }}
      >
        {copied ? "Copiado!" : "Copiar link"}
      </button>
    </div>
  );
}
