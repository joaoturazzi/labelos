"use client";

import { useState, useEffect } from "react";

export default function PortalSettingsPage() {
  const [form, setForm] = useState({
    accentColor: "#1a1a1a",
    portalHeadline: "",
    portalSubtext: "",
    contactEmail: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [labelSlug, setLabelSlug] = useState("");

  useEffect(() => {
    fetch("/api/label")
      .then((r) => r.json())
      .then((label) => {
        if (label) {
          setForm({
            accentColor: label.accentColor || "#1a1a1a",
            portalHeadline: label.portalHeadline || "",
            portalSubtext: label.portalSubtext || "",
            contactEmail: label.contactEmail || "",
          });
          setLabelSlug(label.slug || "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/labels/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-[13px] text-text4 text-center py-16">Carregando...</div>;
  }

  const inputClass = "w-full text-[13px] px-[10px] py-[6px] border border-[#e5e4e0] rounded-[6px] bg-bg text-text outline-none";

  return (
    <div className="max-w-[720px]">
      <h2 className="text-[15px] font-bold text-text mb-1">Portal de submissao</h2>
      <p className="text-[13px] text-text3 mb-6">
        Personalize o portal publico onde artistas enviam demos.
      </p>

      <div className="grid grid-cols-[1fr_1fr] gap-6">
        {/* Form */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] block mb-1.5">
              Cor principal
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.accentColor}
                onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                className="w-8 h-8 rounded-[4px] border border-border cursor-pointer"
              />
              <input
                type="text"
                value={form.accentColor}
                onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                className={inputClass}
                style={{ fontFamily: "inherit", maxWidth: 120 }}
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] block mb-1.5">
              Titulo do portal
            </label>
            <input
              type="text"
              value={form.portalHeadline}
              onChange={(e) => setForm((f) => ({ ...f, portalHeadline: e.target.value }))}
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
              value={form.portalSubtext}
              onChange={(e) => setForm((f) => ({ ...f, portalSubtext: e.target.value }))}
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
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
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
              style={{ color: form.accentColor }}
            >
              {form.portalHeadline || "Nome da gravadora"}
            </h3>
            {form.portalSubtext && (
              <p className="text-[13px] text-text3 mb-4">{form.portalSubtext}</p>
            )}
            <div className="bg-bg border border-border rounded-[6px] p-3">
              <div className="h-2 w-3/4 bg-bg3 rounded mb-2" />
              <div className="h-2 w-1/2 bg-bg3 rounded mb-3" />
              <div
                className="h-7 rounded-[6px]"
                style={{ background: form.accentColor }}
              />
            </div>
            {labelSlug && (
              <p className="text-[11px] text-text4 mt-3">
                Link: /submit/{labelSlug}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
