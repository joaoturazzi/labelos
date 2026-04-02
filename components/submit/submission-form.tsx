"use client";

import { useState, useRef, useCallback } from "react";
import { useUploadThing } from "@/lib/uploadthing-client";
import { PreAnalysisResult } from "./pre-analysis-result";

const GENRES = [
  "Rap", "Trap", "Funk", "Afrobeat", "EDM", "Pop", "R&B",
  "Pagode", "Sertanejo", "Rock", "Outro",
];

interface ArtistEntry {
  nomeArtistico: string;
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  instagram: string;
  tiktok: string;
  twitter: string;
  facebook: string;
  spotify: string;
  appleMusic: string;
  deezer: string;
  youtubeMusic: string;
  amazonMusic: string;
}

interface RoyaltyEntry {
  artista: string;
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  instagram: string;
  tiktok: string;
  twitter: string;
  percentual: string;
}

interface Props {
  labelId: string;
  labelName: string;
  accentColor?: string;
}

const emptyArtist = (): ArtistEntry => ({
  nomeArtistico: "", nomeCompleto: "", cpf: "", dataNascimento: "",
  instagram: "", tiktok: "", twitter: "", facebook: "",
  spotify: "", appleMusic: "", deezer: "", youtubeMusic: "", amazonMusic: "",
});

const emptyRoyalty = (): RoyaltyEntry => ({
  artista: "", nomeCompleto: "", cpf: "", dataNascimento: "",
  instagram: "", tiktok: "", twitter: "", percentual: "",
});

function cpfMask(v: string) {
  return v.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2").slice(0, 14);
}

export function SubmissionForm({ labelId, labelName, accentColor = "#1a1a1a" }: Props) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Step 1 — Track data
  const [trackTitle, setTrackTitle] = useState("");
  const [artistNameMain, setArtistNameMain] = useState("");
  const [artistEmail, setArtistEmail] = useState("");
  const [compositores, setCompositores] = useState("");
  const [produtor, setProdutor] = useState("");
  const [engenheiroMix, setEngenheiroMix] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [dataLancamento, setDataLancamento] = useState("");
  const [bpm, setBpm] = useState("");

  // Files
  const [audioFile, setAudioFile] = useState<{ url: string; key: string; name: string } | null>(null);
  const [coverFile, setCoverFile] = useState<{ url: string; key: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Step 2 — Artists
  const [artistEntries, setArtistEntries] = useState<ArtistEntry[]>([emptyArtist()]);

  // Step 3 — Royalties
  const [royaltyEntries, setRoyaltyEntries] = useState<RoyaltyEntry[]>([emptyRoyalty()]);

  // Step 4 — LGPD
  const [lgpdConsent, setLgpdConsent] = useState(false);

  // Pre-analysis
  const [preAnalyzing, setPreAnalyzing] = useState(false);
  const [preAnalysisResult, setPreAnalysisResult] = useState<Record<string, unknown> | null>(null);
  const [preAnalysisError, setPreAnalysisError] = useState("");

  const inputClass = (field?: string) =>
    `w-full text-[13px] px-[10px] py-[6px] rounded-[6px] bg-bg text-text outline-none border ${
      field && errors[field] ? "border-danger" : "border-[#e5e4e0]"
    }`;

  const labelClass = "text-[11px] font-bold text-text3 uppercase tracking-[0.08em] block mb-1";

  // UploadThing hooks
  const { startUpload: startAudioUpload } = useUploadThing("audioUploader", {
    onUploadProgress: (p) => setUploadProgress(p),
  });
  const { startUpload: startCoverUpload } = useUploadThing("coverUploader");

  // Audio upload
  const handleAudioSelect = useCallback(async (file: File) => {
    if (file.size > 100 * 1024 * 1024) { alert("Maximo 100MB."); return; }
    setUploading(true); setUploadProgress(0);
    setErrors((prev) => ({ ...prev, audio: false }));

    try {
      const res = await startAudioUpload([file]);
      if (res && res[0]) {
        setAudioFile({
          url: res[0].ufsUrl || res[0].url,
          key: res[0].key,
          name: file.name,
        });
        setUploadProgress(100);
      } else {
        throw new Error("Upload retornou vazio");
      }
    } catch (err) {
      console.error("UploadThing failed, using local fallback:", err);
      const url = URL.createObjectURL(file);
      const key = `local_${Date.now()}_${file.name}`;
      setAudioFile({ url, key, name: file.name });
      setUploadProgress(100);
    } finally {
      setUploading(false);
    }
  }, [startAudioUpload]);

  // Cover upload
  const handleCoverSelect = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { alert("Maximo 5MB."); return; }
    try {
      const res = await startCoverUpload([file]);
      if (res && res[0]) {
        setCoverFile({ url: res[0].ufsUrl || res[0].url, key: res[0].key });
      } else {
        throw new Error("Cover upload retornou vazio");
      }
    } catch (err) {
      console.error("Cover upload failed, using local fallback:", err);
      const url = URL.createObjectURL(file);
      setCoverFile({ url, key: `cover_${Date.now()}` });
    }
  }, [startCoverUpload]);

  // Pre-analysis
  const handlePreAnalyze = useCallback(async () => {
    if (!audioFile) return;
    setPreAnalyzing(true);
    setPreAnalysisError("");
    setPreAnalysisResult(null);

    try {
      const res = await fetch("/api/public/pre-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl: audioFile.url,
          trackTitle,
          genre: selectedGenres.join(", "),
          bpm: bpm || null,
          labelId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreAnalysisResult(data.result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro na analise";
      setPreAnalysisError(msg);
    } finally {
      setPreAnalyzing(false);
    }
  }, [audioFile, trackTitle, selectedGenres, bpm, labelId]);

  // Navigation
  const validateStep1 = () => {
    const e: Record<string, boolean> = {};
    if (!trackTitle.trim()) e.trackTitle = true;
    if (!artistNameMain.trim()) e.artistNameMain = true;
    if (!artistEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(artistEmail)) e.artistEmail = true;
    if (!audioFile) e.audio = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, boolean> = {};
    if (!artistEntries[0].nomeArtistico.trim()) e.artist0name = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const royaltyTotal = royaltyEntries.reduce((sum, r) => sum + (parseFloat(r.percentual) || 0), 0);

  const validateStep3 = () => {
    if (royaltyEntries.length === 0) return true;
    if (Math.abs(royaltyTotal - 100) > 0.01 && royaltyTotal > 0) {
      alert("A soma dos royalties deve ser 100%.");
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!lgpdConsent) {
      alert("Voce precisa concordar com o tratamento de dados para enviar.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labelId,
          trackTitle: trackTitle.trim(),
          artistName: artistNameMain.trim(),
          artistEmail: artistEmail.trim(),
          genre: selectedGenres.join(", ") || null,
          bpm: bpm ? parseInt(bpm) : null,
          compositores: compositores.trim() || null,
          produtor: produtor.trim() || null,
          engenheiroMix: engenheiroMix.trim() || null,
          dataLancamento: dataLancamento || null,
          audioFileUrl: audioFile!.url,
          audioFileKey: audioFile!.key,
          coverUrl: coverFile?.url || null,
          coverKey: coverFile?.key || null,
          instagramUrl: artistEntries[0]?.instagram || null,
          tiktokUrl: artistEntries[0]?.tiktok || null,
          twitterUrl: artistEntries[0]?.twitter || null,
          facebookUrl: artistEntries[0]?.facebook || null,
          spotifyUrl: artistEntries[0]?.spotify || null,
          appleMusicUrl: artistEntries[0]?.appleMusic || null,
          deezerUrl: artistEntries[0]?.deezer || null,
          youtubeMusicUrl: artistEntries[0]?.youtubeMusic || null,
          amazonMusicUrl: artistEntries[0]?.amazonMusic || null,
          nomeCompleto: artistEntries[0]?.nomeCompleto || null,
          cpf: artistEntries[0]?.cpf || null,
          dataNascimento: artistEntries[0]?.dataNascimento || null,
          royaltiesData: royaltyEntries.filter((r) => r.artista.trim()),
          lgpdConsent: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao enviar.");
        return;
      }
      const data = await res.json();
      setSubmissionId(data.id || "");
      setSubmitted(true);
    } catch {
      alert("Erro de conexao. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ──
  if (submitted) {
    return (
      <div className="text-center py-10">
        <div
          className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: accentColor }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-[22px] font-bold text-text tracking-[-0.3px] mb-2">
          Demo enviada com sucesso!
        </p>
        <p className="text-[13px] text-text3 mb-4">
          A equipe da <strong>{labelName}</strong> vai ouvir e avaliar sua musica.
          <br />
          Voce recebera um e-mail em <strong>{artistEmail}</strong> com a confirmacao.
        </p>

        <div className="bg-bg2 border border-border rounded-[8px] p-4 text-left max-w-[360px] mx-auto mb-4">
          <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-2">
            Resumo do envio
          </p>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-[12px] text-text3">Musica</span>
              <span className="text-[12px] text-text font-medium">{trackTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[12px] text-text3">Artista</span>
              <span className="text-[12px] text-text font-medium">{artistNameMain}</span>
            </div>
            {selectedGenres.length > 0 && (
              <div className="flex justify-between">
                <span className="text-[12px] text-text3">Genero</span>
                <span className="text-[12px] text-text font-medium">{selectedGenres.join(", ")}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[12px] text-text3">Status</span>
              <span className="text-[12px] font-medium" style={{ color: "#d4a017" }}>
                Pendente de analise
              </span>
            </div>
          </div>
        </div>

        {submissionId && (
          <p className="text-[10px] text-text4 mb-3" style={{ fontFamily: "monospace" }}>
            ID: {submissionId.slice(0, 8)}
          </p>
        )}

        <p className="text-[12px] text-text4">
          Prazo estimado de resposta: 7 a 14 dias uteis
        </p>
      </div>
    );
  }

  // Step indicator
  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-6">
      {[
        { n: 1, label: "Musica" },
        { n: 2, label: "Artista" },
        { n: 3, label: "Royalties" },
        { n: 4, label: "Enviar" },
      ].map((s) => (
        <div key={s.n} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
              style={{
                background: step >= s.n ? accentColor : "var(--color-bg3)",
                color: step >= s.n ? "#fff" : "var(--color-text3)",
              }}
            >
              {step > s.n ? "\u2713" : s.n}
            </div>
            <span className={`text-[10px] font-medium ${step >= s.n ? "text-text" : "text-text4"}`}>
              {s.label}
            </span>
          </div>
          {s.n < 4 && (
            <div
              className="w-6 h-0.5"
              style={{ background: step > s.n ? accentColor : "var(--color-bg3)" }}
            />
          )}
        </div>
      ))}
    </div>
  );

  const btnStyle = { background: accentColor, fontFamily: "inherit" as const };

  return (
    <div>
      <StepIndicator />

      {/* ── STEP 1: Dados da musica ── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em]">
            Dados da musica
          </p>

          {/* Cover upload */}
          <div>
            <label className={labelClass}>Capa (opcional)</label>
            <div
              onClick={() => coverInputRef.current?.click()}
              className="w-24 h-24 rounded-[6px] border border-dashed border-border2 bg-bg flex items-center justify-center cursor-pointer overflow-hidden hover:border-text3 transition-colors"
            >
              {coverFile ? (
                <img src={coverFile.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[11px] text-text4 text-center">Capa</span>
              )}
            </div>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverSelect(f); }} />
          </div>

          <div>
            <label className={labelClass}>Titulo da musica *</label>
            <input type="text" value={trackTitle} onChange={(e) => setTrackTitle(e.target.value)}
              className={inputClass("trackTitle")} style={{ fontFamily: "inherit" }} />
            {errors.trackTitle && <p className="text-[11px] text-danger mt-0.5">Campo obrigatorio</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Artista principal *</label>
              <input type="text" value={artistNameMain} onChange={(e) => setArtistNameMain(e.target.value)}
                className={inputClass("artistNameMain")} style={{ fontFamily: "inherit" }} />
              {errors.artistNameMain && <p className="text-[11px] text-danger mt-0.5">Campo obrigatorio</p>}
            </div>
            <div>
              <label className={labelClass}>E-mail *</label>
              <input type="email" value={artistEmail} onChange={(e) => setArtistEmail(e.target.value)}
                className={inputClass("artistEmail")} style={{ fontFamily: "inherit" }} />
              {errors.artistEmail && <p className="text-[11px] text-danger mt-0.5">E-mail invalido</p>}
            </div>
          </div>

          <div>
            <label className={labelClass}>Compositores</label>
            <input type="text" value={compositores} onChange={(e) => setCompositores(e.target.value)}
              placeholder="Nome1, Nome2" className={inputClass()} style={{ fontFamily: "inherit" }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Produtor</label>
              <input type="text" value={produtor} onChange={(e) => setProdutor(e.target.value)}
                className={inputClass()} style={{ fontFamily: "inherit" }} />
            </div>
            <div>
              <label className={labelClass}>Eng. Mix/Master</label>
              <input type="text" value={engenheiroMix} onChange={(e) => setEngenheiroMix(e.target.value)}
                className={inputClass()} style={{ fontFamily: "inherit" }} />
            </div>
          </div>

          {/* Genre checkboxes */}
          <div>
            <label className={labelClass}>Genero</label>
            <div className="flex flex-wrap gap-1.5">
              {GENRES.map((g) => (
                <button key={g} type="button"
                  onClick={() => setSelectedGenres((prev) =>
                    prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
                  )}
                  className="text-[12px] px-3 py-1 rounded-[20px] font-medium cursor-pointer border transition-colors"
                  style={{
                    background: selectedGenres.includes(g) ? accentColor : "transparent",
                    color: selectedGenres.includes(g) ? "#fff" : "var(--color-text3)",
                    borderColor: selectedGenres.includes(g) ? accentColor : "#e0e0de",
                    fontFamily: "inherit",
                  }}
                >{g}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>BPM (opcional)</label>
              <input type="number" value={bpm} onChange={(e) => setBpm(e.target.value)}
                className={inputClass()} style={{ fontFamily: "inherit" }} />
            </div>
            <div>
              <label className={labelClass}>Data de lancamento</label>
              <input type="date" value={dataLancamento} onChange={(e) => setDataLancamento(e.target.value)}
                className={inputClass()} style={{ fontFamily: "inherit" }} />
            </div>
          </div>

          {/* Audio upload */}
          <div>
            <label className={labelClass}>Arquivo de audio *</label>
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`rounded-[8px] p-5 text-center cursor-pointer border-2 border-dashed transition-colors ${
                errors.audio ? "border-danger bg-danger-bg" : "border-border2 bg-bg hover:border-text3"
              }`}
            >
              {audioFile ? (
                <div>
                  <p className="text-[13px] text-text font-medium">{audioFile.name}</p>
                  <p className="text-[11px] text-success mt-1">Upload concluido</p>
                </div>
              ) : uploading ? (
                <div>
                  <p className="text-[13px] text-text3">Enviando...</p>
                  <div className="mt-2 bg-bg3 rounded-[5px] h-[5px] overflow-hidden">
                    <div className="h-full rounded-[5px] transition-all duration-300"
                      style={{ width: `${uploadProgress}%`, background: accentColor }} />
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-text3">
                  Clique para selecionar<br />
                  <span className="text-[11px] text-text4">WAV, MP3, AIFF, FLAC — max 100MB</span>
                </p>
              )}
              <input ref={fileInputRef} type="file"
                accept=".mp3,.wav,.aiff,.aif,.flac,audio/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAudioSelect(f); }} />
            </div>
            {errors.audio && <p className="text-[11px] text-danger mt-0.5">Envie o arquivo de audio</p>}
          </div>

          {/* Pre-analysis section */}
          {audioFile && !preAnalysisResult && (
            <div>
              <button
                type="button"
                onClick={handlePreAnalyze}
                disabled={preAnalyzing}
                className="w-full py-2.5 rounded-[8px] text-[13px] font-semibold cursor-pointer border transition-all flex items-center justify-center gap-2"
                style={{
                  background: preAnalyzing ? "#f0efec" : "#f7f6f3",
                  color: preAnalyzing ? "#888" : "#1a1a1a",
                  borderColor: "#eceae5",
                  fontFamily: "inherit",
                  cursor: preAnalyzing ? "not-allowed" : "pointer",
                }}
              >
                {preAnalyzing ? (
                  <>
                    <span className="inline-block animate-spin">&#8635;</span>
                    Analisando sua faixa... (pode levar ate 30s)
                  </>
                ) : (
                  "Analisar minha faixa antes de enviar"
                )}
              </button>
              <p className="text-[11px] text-text4 text-center mt-1.5">
                Opcional — receba um feedback da IA antes de submeter
              </p>
            </div>
          )}

          {preAnalyzing && !preAnalysisResult && (
            <div className="bg-bg2 border border-border rounded-[8px] p-5 text-center">
              <p className="text-[13px] text-text3 mb-1">
                Nossa IA esta ouvindo sua faixa...
              </p>
              <p className="text-[11px] text-text4">
                Analisando qualidade, producao e potencial comercial
              </p>
            </div>
          )}

          {preAnalysisError && (
            <div
              className="rounded-[8px] p-3 text-[13px]"
              style={{
                background: "#fef9e7",
                border: "1px solid #f9ca56",
                color: "#d68910",
              }}
            >
              {preAnalysisError}. Voce ainda pode enviar sua demo normalmente.
            </div>
          )}

          {preAnalysisResult && (
            <PreAnalysisResult
              result={preAnalysisResult as unknown as Parameters<typeof PreAnalysisResult>[0]["result"]}
              accentColor={accentColor}
              onContinue={() => {
                setPreAnalysisResult(null);
                nextStep();
              }}
              onReupload={() => {
                setPreAnalysisResult(null);
                setAudioFile(null);
                setUploadProgress(0);
              }}
            />
          )}

          {!preAnalysisResult && (
            <button type="button" onClick={nextStep}
              className="w-full text-white border-none rounded-[6px] text-[13px] font-semibold px-[14px] py-[10px] cursor-pointer hover:opacity-90 transition-opacity"
              style={btnStyle}>
              Proximo
            </button>
          )}
        </div>
      )}

      {/* ── STEP 2: Dados dos artistas ── */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em]">
            Dados dos artistas
          </p>

          {artistEntries.map((artist, idx) => (
            <div key={idx} className="border border-border rounded-[8px] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-text">Artista {idx + 1}</p>
                {idx > 0 && (
                  <button type="button"
                    onClick={() => setArtistEntries(artistEntries.filter((_, i) => i !== idx))}
                    className="text-[11px] text-text4 hover:text-danger bg-transparent border-none cursor-pointer"
                    style={{ fontFamily: "inherit" }}>
                    Remover
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Nome artistico *</label>
                  <input type="text" value={artist.nomeArtistico}
                    onChange={(e) => { const a = [...artistEntries]; a[idx].nomeArtistico = e.target.value; setArtistEntries(a); }}
                    className={inputClass(idx === 0 ? "artist0name" : undefined)} style={{ fontFamily: "inherit" }} />
                </div>
                <div>
                  <label className={labelClass}>Nome completo</label>
                  <input type="text" value={artist.nomeCompleto}
                    onChange={(e) => { const a = [...artistEntries]; a[idx].nomeCompleto = e.target.value; setArtistEntries(a); }}
                    className={inputClass()} style={{ fontFamily: "inherit" }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>CPF</label>
                  <input type="text" value={artist.cpf} placeholder="000.000.000-00"
                    onChange={(e) => { const a = [...artistEntries]; a[idx].cpf = cpfMask(e.target.value); setArtistEntries(a); }}
                    className={inputClass()} style={{ fontFamily: "inherit" }} />
                </div>
                <div>
                  <label className={labelClass}>Data de nascimento</label>
                  <input type="date" value={artist.dataNascimento}
                    onChange={(e) => { const a = [...artistEntries]; a[idx].dataNascimento = e.target.value; setArtistEntries(a); }}
                    className={inputClass()} style={{ fontFamily: "inherit" }} />
                </div>
              </div>

              <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mt-2">Redes sociais</p>
              <div className="grid grid-cols-2 gap-3">
                {(["instagram", "tiktok", "twitter", "facebook"] as const).map((k) => (
                  <div key={k}>
                    <label className={labelClass}>{k === "twitter" ? "X / Twitter" : k.charAt(0).toUpperCase() + k.slice(1)}</label>
                    <input type="text" value={artist[k]} placeholder={k === "facebook" ? "URL" : "@usuario"}
                      onChange={(e) => { const a = [...artistEntries]; (a[idx] as unknown as Record<string, string>)[k] = e.target.value; setArtistEntries(a); }}
                      className={inputClass()} style={{ fontFamily: "inherit" }} />
                  </div>
                ))}
              </div>

              <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mt-2">Perfis nas lojas</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["spotify", "Spotify"], ["appleMusic", "Apple Music"],
                  ["deezer", "Deezer"], ["youtubeMusic", "YouTube Music"],
                  ["amazonMusic", "Amazon Music"],
                ] as const).map(([k, label]) => (
                  <div key={k}>
                    <label className={labelClass}>{label}</label>
                    <input type="text" value={artist[k]} placeholder="URL"
                      onChange={(e) => { const a = [...artistEntries]; (a[idx] as unknown as Record<string, string>)[k] = e.target.value; setArtistEntries(a); }}
                      className={inputClass()} style={{ fontFamily: "inherit" }} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button type="button"
            onClick={() => setArtistEntries([...artistEntries, emptyArtist()])}
            className="text-[12px] text-text3 hover:text-text bg-transparent border border-dashed border-border2 rounded-[6px] py-2 cursor-pointer transition-colors"
            style={{ fontFamily: "inherit" }}>
            + Adicionar artista
          </button>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)}
              className="flex-1 bg-transparent text-neutral border border-[#e0e0de] rounded-[6px] text-[13px] font-semibold py-[8px] cursor-pointer"
              style={{ fontFamily: "inherit" }}>Voltar</button>
            <button type="button" onClick={nextStep}
              className="flex-1 text-white border-none rounded-[6px] text-[13px] font-semibold py-[8px] cursor-pointer hover:opacity-90"
              style={btnStyle}>Proximo</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Royalties ── */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em]">
            Royalties share
          </p>
          <p className="text-[12px] text-text3 -mt-2">
            Opcional. Informe a divisao de royalties entre os autores.
          </p>

          {royaltyEntries.map((r, idx) => (
            <div key={idx} className="border border-border rounded-[8px] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-text">Autor {idx + 1}</p>
                {idx > 0 && (
                  <button type="button"
                    onClick={() => setRoyaltyEntries(royaltyEntries.filter((_, i) => i !== idx))}
                    className="text-[11px] text-text4 hover:text-danger bg-transparent border-none cursor-pointer"
                    style={{ fontFamily: "inherit" }}>
                    Remover
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Artista</label>
                  <input type="text" value={r.artista}
                    onChange={(e) => { const a = [...royaltyEntries]; a[idx].artista = e.target.value; setRoyaltyEntries(a); }}
                    className={inputClass()} style={{ fontFamily: "inherit" }} />
                </div>
                <div>
                  <label className={labelClass}>Royalties (%)</label>
                  <input type="number" value={r.percentual} min="0" max="100"
                    onChange={(e) => { const a = [...royaltyEntries]; a[idx].percentual = e.target.value; setRoyaltyEntries(a); }}
                    className={inputClass()} style={{ fontFamily: "inherit" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Nome completo</label>
                  <input type="text" value={r.nomeCompleto}
                    onChange={(e) => { const a = [...royaltyEntries]; a[idx].nomeCompleto = e.target.value; setRoyaltyEntries(a); }}
                    className={inputClass()} style={{ fontFamily: "inherit" }} />
                </div>
                <div>
                  <label className={labelClass}>CPF</label>
                  <input type="text" value={r.cpf} placeholder="000.000.000-00"
                    onChange={(e) => { const a = [...royaltyEntries]; a[idx].cpf = cpfMask(e.target.value); setRoyaltyEntries(a); }}
                    className={inputClass()} style={{ fontFamily: "inherit" }} />
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between">
            <button type="button"
              onClick={() => setRoyaltyEntries([...royaltyEntries, emptyRoyalty()])}
              className="text-[12px] text-text3 hover:text-text bg-transparent border-none cursor-pointer"
              style={{ fontFamily: "inherit" }}>
              + Adicionar autor
            </button>
            <span className={`text-[12px] font-bold ${Math.abs(royaltyTotal - 100) < 0.01 ? "text-success" : royaltyTotal > 0 ? "text-warning" : "text-text3"}`}>
              Total: {royaltyTotal}% / 100%
            </span>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)}
              className="flex-1 bg-transparent text-neutral border border-[#e0e0de] rounded-[6px] text-[13px] font-semibold py-[8px] cursor-pointer"
              style={{ fontFamily: "inherit" }}>Voltar</button>
            <button type="button" onClick={nextStep}
              className="flex-1 text-white border-none rounded-[6px] text-[13px] font-semibold py-[8px] cursor-pointer hover:opacity-90"
              style={btnStyle}>Revisar</button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Review ── */}
      {step === 4 && (
        <div className="flex flex-col gap-4">
          <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em]">
            Revisao final
          </p>

          {/* Summary */}
          <div className="bg-bg2 border border-border rounded-[8px] p-4 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {coverFile && (
                <img src={coverFile.url} alt="" className="w-12 h-12 rounded-[4px] object-cover" />
              )}
              <div>
                <p className="text-[15px] font-bold text-text">{trackTitle}</p>
                <p className="text-[13px] text-text2">{artistNameMain}</p>
              </div>
            </div>
            {audioFile && <p className="text-[11px] text-text3">Arquivo: {audioFile.name}</p>}
            {selectedGenres.length > 0 && (
              <p className="text-[11px] text-text3">Genero: {selectedGenres.join(", ")}</p>
            )}
            {bpm && <p className="text-[11px] text-text3">BPM: {bpm}</p>}
            <p className="text-[11px] text-text3">E-mail: {artistEmail}</p>
          </div>

          {/* Artists */}
          {artistEntries.filter((a) => a.nomeArtistico).map((a, i) => (
            <div key={i} className="bg-bg2 border border-border rounded-[8px] p-3">
              <p className="text-[13px] font-bold text-text">{a.nomeArtistico}</p>
              {a.nomeCompleto && <p className="text-[11px] text-text3">{a.nomeCompleto}</p>}
              {a.instagram && <p className="text-[11px] text-text4">IG: {a.instagram}</p>}
            </div>
          ))}

          {/* Royalties */}
          {royaltyEntries.filter((r) => r.artista).length > 0 && (
            <div className="bg-bg2 border border-border rounded-[8px] p-3">
              <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-1">Royalties</p>
              {royaltyEntries.filter((r) => r.artista).map((r, i) => (
                <p key={i} className="text-[12px] text-text">{r.artista}: {r.percentual}%</p>
              ))}
            </div>
          )}

          {/* LGPD — properly wired */}
          <label className="flex gap-2 items-start cursor-pointer">
            <input
              type="checkbox"
              checked={lgpdConsent}
              onChange={(e) => setLgpdConsent(e.target.checked)}
              className="mt-0.5 flex-shrink-0"
              style={{ accentColor }}
            />
            <span className="text-[12px] text-text3 leading-relaxed">
              Concordo com o{" "}
              <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-text2 underline">
                tratamento dos meus dados
              </a>{" "}conforme a LGPD. Seus dados serao utilizados exclusivamente para avaliacao da demo.
            </span>
          </label>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(3)}
              className="flex-1 bg-transparent text-neutral border border-[#e0e0de] rounded-[6px] text-[13px] font-semibold py-[8px] cursor-pointer"
              style={{ fontFamily: "inherit" }}>Voltar</button>
            <button type="button" onClick={handleSubmit} disabled={submitting || !lgpdConsent}
              className={`flex-1 text-white border-none rounded-[6px] text-[13px] font-semibold py-[10px] cursor-pointer transition-opacity ${submitting || !lgpdConsent ? "opacity-50" : "hover:opacity-90"}`}
              style={btnStyle}>
              {submitting ? "Enviando..." : "Enviar demo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
