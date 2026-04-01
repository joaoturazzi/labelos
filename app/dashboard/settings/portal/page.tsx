"use client";

import { useState, useEffect } from "react";

const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{6}$/.test(hex);

export default function PortalSettingsPage() {
  const [accentColor, setAccentColor] = useState("#1a1a1a");
  const [hexInput, setHexInput] = useState("#1a1a1a");
  const [portalHeadline, setPortalHeadline] = useState("");
  const [portalSubtext, setPortalSubtext] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [labelSlug, setLabelSlug] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/label")
      .then((r) => r.json())
      .then((label) => {
        if (label) {
          const color = label.accentColor || "#1a1a1a";
          setAccentColor(isValidHex(color) ? color : "#1a1a1a");
          setHexInput(isValidHex(color) ? color : "#1a1a1a");
          setPortalHeadline(label.portalHeadline || "");
          setPortalSubtext(label.portalSubtext || "");
          setContactEmail(label.contactEmail || "");
          setLabelSlug(label.slug || "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleHexChange = (value: string) => {
    setHexInput(value);
    if (isValidHex(value)) setAccentColor(value);
  };

  const handleColorPicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccentColor(e.target.value);
    setHexInput(e.target.value);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/labels/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accentColor: isValidHex(hexInput) ? hexInput : "#1a1a1a",
        portalHeadline: portalHeadline || null,
        portalSubtext: portalSubtext || null,
        contactEmail: contactEmail || null,
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/submit/${labelSlug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="text-[13px] text-text4 text-center py-16">Carregando...</div>;
  }

  const portalUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/submit/${labelSlug}`;
  const inputClass = "w-full text-[13px] px-[10px] py-[6px] border border-[#e5e4e0] rounded-[6px] bg-bg text-text outline-none";

  return (
    <div className="max-w-[720px]">
      {/* Portal link card */}
      {labelSlug && (
        <div
          className="rounded-[8px] p-4 mb-6 flex items-center justify-between gap-4"
          style={{ background: "#eafaf1", border: "1px solid #a9dfbf" }}
        >
          <div className="min-w-0">
            <p className="text-[13px] font-bold" style={{ color: "#1e8449" }}>
              Link para compartilhar com artistas
            </p>
            <p className="text-[13px] text-text truncate" style={{ fontFamily: "monospace" }}>
              {portalUrl}
            </p>
            <p className="text-[11px] text-text3 mt-1">
              Envie este link para os artistas enviarem demos
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleCopyLink}
              className="text-[12px] font-semibold px-3 py-1.5 bg-text text-white border-none rounded-[6px] cursor-pointer hover:opacity-90 transition-opacity"
              style={{ fontFamily: "inherit" }}
            >
              {copied ? "Copiado!" : "Copiar link"}
            </button>
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-semibold px-3 py-1.5 bg-transparent text-neutral border border-[#e0e0de] rounded-[6px] no-underline hover:border-text3 transition-colors"
              style={{ fontFamily: "inherit" }}
            >
              Abrir portal
            </a>
          </div>
        </div>
      )}

      <h2 className="text-[15px] font-bold text-text mb-1">Portal de submissão</h2>
      <p className="text-[13px] text-text3 mb-6">
        Personalize o portal publico onde artistas enviam demos.
      </p>

      <div className="grid grid-cols-[1fr_1fr] gap-6">
        {/* Form */}
        <div className="flex flex-col gap-4">
          {/* Color picker — Fixed */}
          <div>
            <label className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] block mb-1.5">
              Cor principal
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={handleColorPicker}
                className="w-9 h-9 rounded-[6px] border border-border cursor-pointer p-0.5 bg-bg"
              />
              <input
                type="text"
                value={hexInput}
                onChange={(e) => handleHexChange(e.target.value)}
                placeholder="#1a1a1a"
                maxLength={7}
                className="text-[13px] px-[10px] py-[6px] rounded-[6px] bg-bg text-text outline-none border"
                style={{
                  fontFamily: "monospace",
                  width: 100,
                  borderColor: isValidHex(hexInput) ? "#e5e4e0" : "#c0392b",
                }}
              />
              <div
                className="w-6 h-6 rounded-[4px] border border-border"
                style={{ background: isValidHex(hexInput) ? hexInput : "#1a1a1a" }}
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] block mb-1.5">
              Titulo do portal
            </label>
            <input
              type="text"
              value={portalHeadline}
              onChange={(e) => setPortalHeadline(e.target.value)}
              placeholder="Envie sua demo para a XYZ Records"
              className={inputClass}
              style={{ fontFamily: "inherit" }}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] block mb-1.5">
              Subtitulo
            </label>
            <input
              type="text"
              value={portalSubtext}
              onChange={(e) => setPortalSubtext(e.target.value)}
              placeholder="Trabalhamos com funk, trap e R&B"
              className={inputClass}
              style={{ fontFamily: "inherit" }}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] block mb-1.5">
              Email de contato
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contato@suagravadora.com"
              className={inputClass}
              style={{ fontFamily: "inherit" }}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`bg-text text-white border-none rounded-[6px] text-[13px] font-semibold px-[14px] py-[8px] cursor-pointer transition-opacity ${saving ? "opacity-50" : "hover:opacity-90"}`}
            style={{ fontFamily: "inherit" }}
          >
            {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar"}
          </button>
        </div>

        {/* Preview */}
        <div>
          <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-1.5">
            Preview
          </p>
          <div className="bg-bg2 rounded-[8px] p-6 border border-border">
            <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-1">
              Enviar demo para
            </p>
            <h3
              className="text-[18px] font-bold tracking-[-0.3px] mb-4"
              style={{ color: isValidHex(hexInput) ? hexInput : "#1a1a1a" }}
            >
              {portalHeadline || "Nome da gravadora"}
            </h3>
            {portalSubtext && (
              <p className="text-[13px] text-text3 mb-4">{portalSubtext}</p>
            )}
            <div className="bg-bg border border-border rounded-[6px] p-3">
              <div className="h-2 w-3/4 bg-bg3 rounded mb-2" />
              <div className="h-2 w-1/2 bg-bg3 rounded mb-3" />
              <div
                className="h-7 rounded-[6px]"
                style={{ background: isValidHex(hexInput) ? hexInput : "#1a1a1a" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
