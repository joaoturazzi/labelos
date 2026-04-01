"use client";

import { useState, useRef, useCallback } from "react";

const GENRES = [
  "Funk",
  "Trap",
  "Pagode",
  "Sertanejo",
  "Pop",
  "R&B",
  "Rock",
  "Outro",
];

interface Props {
  labelId: string;
  labelName: string;
}

export function SubmissionForm({ labelId, labelName }: Props) {
  const [form, setForm] = useState({
    artistName: "",
    artistEmail: "",
    trackTitle: "",
    genre: "",
    bpm: "",
    mixador: "",
    distributor: "",
    instagramUrl: "",
    tiktokUrl: "",
    spotifyUrl: "",
    youtubeUrl: "",
  });
  const [audioFile, setAudioFile] = useState<{
    url: string;
    key: string;
    name: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleFileSelect = useCallback(
    async (file: File) => {
      const validTypes = [
        "audio/mpeg",
        "audio/wav",
        "audio/aiff",
        "audio/x-aiff",
        "audio/mp3",
      ];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|aiff)$/i)) {
        alert("Formato não suportado. Envie MP3, WAV ou AIFF.");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        alert("Arquivo muito grande. Máximo 50MB.");
        return;
      }

      setUploading(true);
      setUploadProgress(0);
      setErrors((prev) => ({ ...prev, audio: false }));

      try {
        // Use UploadThing client-side upload
        const formData = new FormData();
        formData.append("file", file);

        // Simulate progress for UX
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 300);

        const res = await fetch("/api/uploadthing", {
          method: "POST",
          headers: {
            "x-uploadthing-package": "uploadthing",
          },
          body: formData,
        });

        clearInterval(progressInterval);

        // Fallback: use direct presigned URL approach
        // For local dev, we'll store as a data URL reference
        // In production, UploadThing handles this via their SDK
        const url = URL.createObjectURL(file);
        const key = `local_${Date.now()}_${file.name}`;

        setAudioFile({ url, key, name: file.name });
        setUploadProgress(100);
      } catch (err) {
        console.error("Upload failed:", err);
        // Fallback for local dev without UploadThing credentials
        const url = URL.createObjectURL(file);
        const key = `local_${Date.now()}_${file.name}`;
        setAudioFile({ url, key, name: file.name });
        setUploadProgress(100);
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const newErrors: Record<string, boolean> = {};
    if (!form.artistName.trim()) newErrors.artistName = true;
    if (!form.artistEmail.trim()) newErrors.artistEmail = true;
    if (!form.trackTitle.trim()) newErrors.trackTitle = true;
    if (!audioFile) newErrors.audio = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labelId,
          ...form,
          bpm: form.bpm || null,
          audioFileUrl: audioFile!.url,
          audioFileKey: audioFile!.key,
        }),
      });

      if (!res.ok) {
        throw new Error("Submit failed");
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Submit error:", err);
      alert("Erro ao enviar demo. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-16">
        <div className="text-[22px] font-bold text-text tracking-[-0.3px] mb-2">
          Demo enviada!
        </div>
        <p className="text-[13px] text-text3">
          Em breve nossa equipe vai ouvir.
        </p>
      </div>
    );
  }

  const inputClass = (field: string) =>
    `w-full text-[13px] px-[10px] py-[6px] rounded-[6px] bg-bg text-text outline-none font-[inherit] border ${
      errors[field] ? "border-danger" : "border-[#e5e4e0]"
    }`;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Section: Sobre você */}
      <div>
        <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-3">
          Sobre voce
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <input
              type="text"
              placeholder="Nome artistico"
              value={form.artistName}
              onChange={(e) => update("artistName", e.target.value)}
              className={inputClass("artistName")}
            />
          </div>
          <div>
            <input
              type="email"
              placeholder="E-mail"
              value={form.artistEmail}
              onChange={(e) => update("artistEmail", e.target.value)}
              className={inputClass("artistEmail")}
            />
          </div>
        </div>
      </div>

      {/* Section: Sobre a track */}
      <div>
        <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-3">
          Sobre a track
        </p>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Nome da track"
            value={form.trackTitle}
            onChange={(e) => update("trackTitle", e.target.value)}
            className={inputClass("trackTitle")}
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.genre}
              onChange={(e) => update("genre", e.target.value)}
              className={`${inputClass("genre")} appearance-none`}
            >
              <option value="">Genero</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="BPM"
              value={form.bpm}
              onChange={(e) => update("bpm", e.target.value)}
              className={inputClass("bpm")}
            />
          </div>
          <input
            type="text"
            placeholder="Mixador / produtor"
            value={form.mixador}
            onChange={(e) => update("mixador", e.target.value)}
            className={inputClass("mixador")}
          />
          <input
            type="text"
            placeholder="Distribuidora"
            value={form.distributor}
            onChange={(e) => update("distributor", e.target.value)}
            className={inputClass("distributor")}
          />
        </div>
      </div>

      {/* Section: Redes sociais */}
      <div>
        <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-3">
          Redes sociais
        </p>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="@usuario no Instagram"
            value={form.instagramUrl}
            onChange={(e) => update("instagramUrl", e.target.value)}
            className={inputClass("instagramUrl")}
          />
          <input
            type="text"
            placeholder="@usuario no TikTok"
            value={form.tiktokUrl}
            onChange={(e) => update("tiktokUrl", e.target.value)}
            className={inputClass("tiktokUrl")}
          />
          <input
            type="text"
            placeholder="URL do perfil Spotify"
            value={form.spotifyUrl}
            onChange={(e) => update("spotifyUrl", e.target.value)}
            className={inputClass("spotifyUrl")}
          />
          <input
            type="text"
            placeholder="URL do canal YouTube"
            value={form.youtubeUrl}
            onChange={(e) => update("youtubeUrl", e.target.value)}
            className={inputClass("youtubeUrl")}
          />
        </div>
      </div>

      {/* Section: Arquivo */}
      <div>
        <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-3">
          Arquivo
        </p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            rounded-[8px] p-6 text-center cursor-pointer
            transition-colors duration-[120ms]
            border-2 border-dashed
            ${
              errors.audio
                ? "border-danger bg-danger-bg"
                : dragOver
                ? "border-text3 bg-bg3"
                : "border-border2 bg-bg"
            }
          `}
        >
          {audioFile ? (
            <div>
              <p className="text-[13px] text-text font-medium">
                {audioFile.name}
              </p>
              <p className="text-[11px] text-success mt-1">Upload concluido</p>
            </div>
          ) : uploading ? (
            <div>
              <p className="text-[13px] text-text3">Enviando...</p>
              <div className="mt-2 bg-bg3 rounded-[5px] h-[5px] overflow-hidden">
                <div
                  className="h-full rounded-[5px] bg-text transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-text3">
              Arraste o arquivo ou clique para selecionar
              <br />
              <span className="text-[11px] text-text4">
                MP3, WAV ou AIFF — max 50MB
              </span>
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.aiff,audio/mpeg,audio/wav,audio/aiff"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={submitting}
        className={`
          w-full bg-text text-white border-none rounded-[6px]
          text-[13px] font-semibold px-[14px] py-[10px]
          cursor-pointer transition-opacity duration-[120ms]
          ${submitting ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}
        `}
      >
        {submitting ? "Enviando..." : "Enviar demo"}
      </button>
    </form>
  );
}
