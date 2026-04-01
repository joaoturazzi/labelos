"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface ArtistData {
  id?: string;
  name: string;
  email: string;
  instagramHandle: string;
  tiktokHandle: string;
  spotifyId: string;
  youtubeChannel: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: ArtistData) => Promise<void>;
  initial?: ArtistData | null;
}

const EMPTY: ArtistData = {
  name: "",
  email: "",
  instagramHandle: "",
  tiktokHandle: "",
  spotifyId: "",
  youtubeChannel: "",
};

export function ArtistModal({ open, onClose, onSave, initial }: Props) {
  const [form, setForm] = useState<ArtistData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(initial || EMPTY);
      setNameError("");
      setSaveError("");
    }
  }, [open, initial]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const update = (field: keyof ArtistData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "name") setNameError("");
    setSaveError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setNameError("Nome e obrigatorio");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setSaveError((err as Error).message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (hasError?: boolean) =>
    `w-full text-[13px] px-[10px] py-[6px] rounded-[6px] bg-bg text-text outline-none border ${
      hasError ? "border-danger" : "border-[#e5e4e0]"
    }`;

  return (
    <>
      <div
        className="fixed inset-0 z-[900] flex items-center justify-center p-5"
        style={{ background: "rgba(0,0,0,0.22)" }}
        onClick={onClose}
      >
        <div
          className="bg-bg rounded-[10px] p-6 w-full overflow-y-auto"
          style={{
            maxWidth: 520,
            maxHeight: "88vh",
            boxShadow: "0 8px 40px rgba(0,0,0,0.14)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-bold text-text">
              {initial?.id ? "Editar artista" : "Adicionar artista"}
            </h2>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-[6px] border-none bg-transparent text-text3 hover:bg-bg3 hover:text-text cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Name — required */}
            <div>
              <label className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] block mb-1">
                Nome <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Nome do artista"
                className={inputClass(!!nameError)}
                style={{ fontFamily: "inherit" }}
              />
              {nameError && (
                <span className="text-[11px] text-danger mt-0.5 block">{nameError}</span>
              )}
            </div>

            {/* Email — optional */}
            <div>
              <label className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] block mb-1">
                E-mail{" "}
                <span className="text-text4 font-normal normal-case tracking-normal">(opcional)</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="artista@email.com"
                className={inputClass()}
                style={{ fontFamily: "inherit" }}
              />
            </div>

            <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mt-2">
              Redes sociais{" "}
              <span className="text-text4 font-normal normal-case tracking-normal">(opcional)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={form.instagramHandle}
                onChange={(e) => update("instagramHandle", e.target.value)}
                placeholder="@usuario Instagram"
                className={inputClass()}
                style={{ fontFamily: "inherit" }}
              />
              <input
                type="text"
                value={form.tiktokHandle}
                onChange={(e) => update("tiktokHandle", e.target.value)}
                placeholder="@usuario TikTok"
                className={inputClass()}
                style={{ fontFamily: "inherit" }}
              />
              <input
                type="text"
                value={form.spotifyId}
                onChange={(e) => update("spotifyId", e.target.value)}
                placeholder="Spotify Artist ID"
                className={inputClass()}
                style={{ fontFamily: "inherit" }}
              />
              <input
                type="text"
                value={form.youtubeChannel}
                onChange={(e) => update("youtubeChannel", e.target.value)}
                placeholder="YouTube Channel ID"
                className={inputClass()}
                style={{ fontFamily: "inherit" }}
              />
            </div>

            {saveError && (
              <p className="text-[12px] text-danger">{saveError}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className={`
                mt-2 w-full bg-text text-white border-none rounded-[6px]
                text-[13px] font-semibold px-[14px] py-[8px]
                cursor-pointer transition-opacity
                ${saving ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}
              `}
              style={{ fontFamily: "inherit" }}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
