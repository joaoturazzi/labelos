"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUploadThing } from "@/lib/uploadthing-client";

const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{6}$/.test(hex);

export default function PortalSettingsPage() {
  const [accentColor, setAccentColor] = useState("#1a1a1a");
  const [hexInput, setHexInput] = useState("#1a1a1a");
  const [portalHeadline, setPortalHeadline] = useState("");
  const [portalSubtext, setPortalSubtext] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [labelSlug, setLabelSlug] = useState("");
  const [labelName, setLabelName] = useState("");
  const [copied, setCopied] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [portalOpen, setPortalOpen] = useState(true);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { startUpload: startLogoUpload } = useUploadThing("logoUploader");

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
          setLogoUrl(label.logoUrl || "");
          setLabelSlug(label.slug || "");
          setLabelName(label.name || "");
          setPortalOpen(label.portalOpen ?? true);
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

  const handleLogoSelect = useCallback(
    async (file: File) => {
      if (file.size > 2 * 1024 * 1024) {
        alert("Logo deve ter no maximo 2MB.");
        return;
      }
      setUploadingLogo(true);
      try {
        const res = await startLogoUpload([file]);
        if (res && res[0]) {
          setLogoUrl(res[0].ufsUrl || res[0].url);
        }
      } catch (err) {
        console.error("Logo upload failed:", err);
        const url = URL.createObjectURL(file);
        setLogoUrl(url);
      } finally {
        setUploadingLogo(false);
      }
    },
    [startLogoUpload]
  );

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
        logoUrl: logoUrl || null,
        portalOpen,
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const getBaseUrl = () =>
    typeof window !== "undefined" ? window.location.origin : "";

  const handleCopyLink = () => {
    const url = `${getBaseUrl()}/submit/${labelSlug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="text-[13px] text-text4 text-center py-16">
        Carregando...
      </div>
    );
  }

  const portalUrl = `${getBaseUrl()}/submit/${labelSlug}`;
  const inputClass =
    "w-full text-[13px] px-[10px] py-[6px] border border-[#e5e4e0] rounded-[6px] bg-bg text-text outline-none";
  const displayColor = isValidHex(hexInput) ? hexInput : "#1a1a1a";

  return (
    <div className="max-w-[820px]">
      {/* Portal link card — always visible */}
      {labelSlug && (
        <div
          className="rounded-[8px] p-4 mb-6 flex items-center justify-between gap-4"
          style={{ background: "#eafaf1", border: "1px solid #a9dfbf" }}
        >
          <div className="min-w-0">
            <p
              className="text-[13px] font-bold"
              style={{ color: "#1e8449" }}
            >
              Seu portal esta ativo
            </p>
            <p
              className="text-[13px] text-text truncate"
              style={{ fontFamily: "monospace" }}
            >
              {portalUrl}
            </p>
            <p className="text-[11px] text-text3 mt-1">
              Compartilhe este link com artistas para receber demos
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

      <h2 className="text-[15px] font-bold text-text mb-1">
        Portal de submissao
      </h2>
      <p className="text-[13px] text-text3 mb-6">
        Personalize o portal publico onde artistas enviam demos.
      </p>

      <div className="grid grid-cols-[1fr_1fr] gap-8">
        {/* Form */}
        <div className="flex flex-col gap-4">
          {/* Logo upload */}
          <div>
            <label className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] block mb-1.5">
              Logo da gravadora
            </label>
            <div className="flex items-center gap-3">
              <div
                onClick={() => logoInputRef.current?.click()}
                className="w-16 h-16 rounded-full border border-dashed border-border2 bg-bg2 flex items-center justify-center cursor-pointer overflow-hidden hover:border-text3 transition-colors flex-shrink-0"
              >
                {uploadingLogo ? (
                  <span className="text-[10px] text-text4">...</span>
                ) : logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] text-text4 text-center leading-tight">
                    Logo
                  </span>
                )}
              </div>
              <div>
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="text-[12px] text-text2 bg-transparent border border-[#e0e0de] rounded-[6px] px-3 py-1 cursor-pointer hover:border-text3 transition-colors"
                  style={{ fontFamily: "inherit" }}
                >
                  {logoUrl ? "Trocar logo" : "Enviar logo"}
                </button>
                {logoUrl && (
                  <button
                    onClick={() => setLogoUrl("")}
                    className="text-[11px] text-text4 bg-transparent border-none cursor-pointer ml-2 hover:text-danger transition-colors"
                    style={{ fontFamily: "inherit" }}
                  >
                    Remover
                  </button>
                )}
                <p className="text-[10px] text-text4 mt-1">
                  PNG ou JPG, max 2MB
                </p>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoSelect(f);
                }}
              />
            </div>
          </div>

          {/* Color picker */}
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
                style={{ background: displayColor }}
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
              placeholder={`Envie sua demo para a ${labelName || "gravadora"}`}
              maxLength={200}
              className={inputClass}
              style={{ fontFamily: "inherit" }}
            />
            <p className="text-[10px] text-text4 mt-1">
              {portalHeadline.length}/200
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] block mb-1.5">
              Subtitulo
            </label>
            <textarea
              value={portalSubtext}
              onChange={(e) => setPortalSubtext(e.target.value)}
              placeholder="Trabalhamos com funk, trap e R&B. Buscamos novos talentos!"
              maxLength={500}
              rows={2}
              className={inputClass}
              style={{ fontFamily: "inherit", resize: "vertical" }}
            />
            <p className="text-[10px] text-text4 mt-1">
              {portalSubtext.length}/500
            </p>
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
            <p className="text-[10px] text-text4 mt-1">
              Exibido no portal para artistas entrarem em contato
            </p>
          </div>

          {/* Portal open/close toggle */}
          <div
            className="flex items-center justify-between rounded-[8px] p-3 mb-3"
            style={{
              background: portalOpen ? "#eafaf1" : "#f7f6f3",
              border: `1px solid ${portalOpen ? "#a9dfbf" : "#eceae5"}`,
            }}
          >
            <div>
              <p className="text-[13px] font-semibold text-text">
                Portal {portalOpen ? "aberto" : "fechado"}
              </p>
              <p className="text-[11px] text-text3 mt-0.5">
                {portalOpen
                  ? "Artistas podem enviar demos agora"
                  : "Nenhuma nova demo sera aceita"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPortalOpen(!portalOpen)}
              className="relative border-none cursor-pointer rounded-[12px] transition-colors"
              style={{
                width: 44,
                height: 24,
                background: portalOpen ? "#1e8449" : "#bbb",
                padding: 0,
              }}
            >
              <div
                className="absolute rounded-full bg-white transition-all"
                style={{
                  width: 18,
                  height: 18,
                  top: 3,
                  left: portalOpen ? 23 : 3,
                }}
              />
            </button>
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

        {/* Preview — matches actual portal layout */}
        <div>
          <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-1.5">
            Preview do portal
          </p>
          <div
            className="rounded-[10px] border border-border overflow-hidden"
            style={{ background: "#f7f6f3" }}
          >
            {/* Portal header preview */}
            <div className="p-6 pb-4">
              <div className="flex items-center gap-3 mb-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-10 h-10 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-bold"
                    style={{ background: displayColor }}
                  >
                    {(labelName || "G")[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-text3 uppercase tracking-[0.08em]">
                    Enviar demo para
                  </p>
                  <h3
                    className="text-[16px] font-bold tracking-[-0.3px] leading-tight"
                    style={{ color: displayColor }}
                  >
                    {portalHeadline || labelName || "Nome da gravadora"}
                  </h3>
                </div>
              </div>
              {portalSubtext && (
                <p className="text-[12px] text-text3 mb-2">{portalSubtext}</p>
              )}
              {contactEmail && (
                <p className="text-[10px] text-text4">{contactEmail}</p>
              )}
            </div>

            {/* Form preview */}
            <div className="mx-4 mb-4 bg-bg border border-border rounded-[8px] p-4">
              <div className="space-y-2.5">
                <div className="h-2 w-2/3 bg-bg3 rounded" />
                <div className="h-7 w-full bg-bg2 border border-border rounded-[6px]" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-7 bg-bg2 border border-border rounded-[6px]" />
                  <div className="h-7 bg-bg2 border border-border rounded-[6px]" />
                </div>
                <div className="h-12 w-full bg-bg2 border border-dashed border-border2 rounded-[6px] flex items-center justify-center">
                  <span className="text-[10px] text-text4">Audio</span>
                </div>
                <div
                  className="h-8 rounded-[6px] flex items-center justify-center"
                  style={{ background: displayColor }}
                >
                  <span className="text-[10px] text-white font-semibold">
                    Proximo
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[9px] text-text4 text-center pb-3">
              Powered by LabelOS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
