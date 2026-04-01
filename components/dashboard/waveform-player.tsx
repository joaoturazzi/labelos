"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface WaveformPlayerProps {
  url: string;
  trackTitle: string;
  artistName: string;
}

export function WaveformPlayer({ url, trackTitle, artistName }: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsReady, setWsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let ws: any = null;

    async function init() {
      try {
        const WaveSurfer = (await import("wavesurfer.js")).default;

        ws = WaveSurfer.create({
          container: containerRef.current!,
          waveColor: "#dddbd5",
          progressColor: "#1a1a1a",
          cursorColor: "#1a1a1a",
          cursorWidth: 1,
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          height: 48,
          normalize: true,
          backend: "WebAudio",
          url: url,
        });

        wavesurferRef.current = ws;

        ws.on("ready", () => {
          setDuration(ws.getDuration());
          setIsLoading(false);
          setWsReady(true);
        });

        ws.on("timeupdate", (time: number) => {
          setCurrentTime(time);
        });

        ws.on("finish", () => {
          setIsPlaying(false);
        });

        ws.on("error", () => {
          setError("Erro ao carregar áudio");
          setIsLoading(false);
        });
      } catch (err) {
        setError("Erro ao inicializar player");
        setIsLoading(false);
      }
    }

    init();

    return () => {
      if (ws) {
        try { ws.destroy(); } catch {}
      }
      wavesurferRef.current = null;
      setWsReady(false);
    };
  }, [url]);

  const togglePlay = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws || !wsReady) return;
    ws.playPause();
    setIsPlaying(!isPlaying);
  }, [isPlaying, wsReady]);

  const formatTime = (s: number) => {
    if (isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-bg2 border border-border rounded-[8px] p-[14px_16px]">
      {/* Track info */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[13px] font-semibold text-text">{trackTitle}</div>
          <div className="text-[11px] text-text3 mt-0.5">{artistName}</div>
        </div>
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

      {error ? (
        <div>
          <p className="text-[12px] text-danger mb-2">{error}</p>
          <a
            href={url}
            download
            className="text-[11px] text-text3 no-underline px-2 py-1 border border-border rounded-[4px]"
          >
            Baixar arquivo
          </a>
        </div>
      ) : (
        <>
          {/* Waveform container */}
          <div
            ref={containerRef}
            className="mb-3 rounded-[4px] overflow-hidden"
            style={{ minHeight: 48, opacity: isLoading ? 0.4 : 1, transition: "opacity 0.3s" }}
          />

          {/* Controls */}
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

            <span
              className="text-[11px] text-text3"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
