"use client";

import { useRef, useState, useEffect } from "react";

interface AudioPlayerProps {
  url: string;
  trackTitle: string;
  artistName: string;
}

export function AudioPlayer({ url, trackTitle, artistName }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [browserSupports, setBrowserSupports] = useState(true);

  // Check if browser supports the format
  useEffect(() => {
    const audio = document.createElement("audio");
    const ext = url.split(".").pop()?.toLowerCase()?.split("?")[0] || "mp3";
    const mimeMap: Record<string, string> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      flac: "audio/flac",
      aiff: "audio/aiff",
      aif: "audio/aiff",
      ogg: "audio/ogg",
    };
    const mime = mimeMap[ext] || "audio/mpeg";
    const canPlay = audio.canPlayType(mime);
    setBrowserSupports(canPlay !== "");
  }, [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => { setDuration(audio.duration); setIsLoading(false); };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setIsPlaying(false);
    const onError = () => { setError("Erro ao carregar audio"); setIsLoading(false); };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  };

  const formatTime = (s: number) => {
    if (isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Fallback for unsupported formats
  if (!browserSupports) {
    return (
      <div className="bg-bg2 border border-border rounded-[8px] p-[14px_16px] text-center">
        <div className="mb-3">
          <div className="text-[13px] font-semibold text-text">{trackTitle}</div>
          <div className="text-[11px] text-text3 mt-0.5">{artistName}</div>
        </div>
        <p className="text-[13px] text-text3 mb-3">
          Este formato nao e suportado pelo browser.
        </p>
        <a
          href={url}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-semibold px-3 py-1.5 no-underline rounded-[6px] transition-colors"
          style={{ background: "#eaf2fb", color: "#1a5276", border: "1px solid #bdd3e8" }}
        >
          Baixar arquivo para ouvir
        </a>
      </div>
    );
  }

  return (
    <div className="bg-bg2 border border-border rounded-[8px] p-[14px_16px]">
      <audio ref={audioRef} src={url} preload="metadata" />

      <div className="mb-3">
        <div className="text-[13px] font-semibold text-text">{trackTitle}</div>
        <div className="text-[11px] text-text3 mt-0.5">{artistName}</div>
      </div>

      {error ? (
        <div>
          <div className="text-[12px] text-danger mb-2">{error}</div>
          <a
            href={url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-text3 no-underline px-2 py-1 border border-border rounded-[4px] hover:border-text3 transition-colors"
          >
            Download
          </a>
        </div>
      ) : (
        <>
          <div
            onClick={seek}
            className="h-1 bg-bg3 rounded-[4px] cursor-pointer mb-2.5 relative"
          >
            <div
              className="h-full bg-text rounded-[4px]"
              style={{ width: `${progress}%`, transition: "width 0.1s linear" }}
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={togglePlay}
              disabled={isLoading}
              className={`
                w-9 h-9 rounded-full bg-text border-none cursor-pointer
                flex items-center justify-center text-white text-[14px]
                ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}
              `}
              style={{ fontFamily: "inherit" }}
            >
              {isLoading ? "..." : isPlaying ? "\u23F8" : "\u25B6"}
            </button>

            <span className="text-[11px] text-text3" style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <a
              href={url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-text3 no-underline px-2 py-1 border border-border rounded-[4px] hover:border-text3 transition-colors"
            >
              Download
            </a>
          </div>
        </>
      )}
    </div>
  );
}
