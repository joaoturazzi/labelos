"use client";

import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

// ── Context ──────────────────────────────────────────────────────────

interface Track {
  url: string;
  title: string;
  artist: string;
  submissionId?: string;
}

interface PlayerContextValue {
  currentTrack: Track | null;
  isPlaying: boolean;
  play: (track: Track) => void;
  pause: () => void;
  toggle: () => void;
}

const PlayerContext = createContext<PlayerContextValue>({
  currentTrack: null,
  isPlaying: false,
  play: () => {},
  pause: () => {},
  toggle: () => {},
});

export const useGlobalPlayer = () => useContext(PlayerContext);

// ── Provider + Footer Bar ────────────────────────────────────────────

export function GlobalPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Create audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "metadata";
    }

    const audio = audioRef.current;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const play = useCallback((track: Track) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentTrack?.url !== track.url) {
      audio.src = track.url;
      audio.load();
      setCurrentTime(0);
      setDuration(0);
    }
    setCurrentTrack(track);
    audio.play().catch(() => {});
    setIsPlaying(true);
  }, [currentTrack]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else if (currentTrack) {
      audioRef.current?.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying, pause, currentTrack]);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const formatTime = (s: number) => {
    if (isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <PlayerContext.Provider value={{ currentTrack, isPlaying, play, pause, toggle }}>
      {children}

      {/* Footer player bar — only visible when a track is loaded */}
      {currentTrack && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[700] bg-bg border-t border-border"
          style={{ height: 56 }}
        >
          {/* Progress bar — full width on top */}
          <div onClick={seek} className="absolute top-0 left-0 right-0 h-1 bg-bg3 cursor-pointer">
            <div
              className="h-full bg-text rounded-r-[2px]"
              style={{ width: `${progress}%`, transition: "width 0.15s linear" }}
            />
          </div>

          <div className="flex items-center gap-3 h-full px-4 md:px-8 pt-1">
            {/* Play/Pause */}
            <button
              onClick={toggle}
              className="w-8 h-8 rounded-full bg-text text-white border-none cursor-pointer flex items-center justify-center text-[13px] hover:opacity-90 transition-opacity flex-shrink-0"
              style={{ fontFamily: "inherit" }}
            >
              {isPlaying ? "\u23F8" : "\u25B6"}
            </button>

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-text truncate m-0 leading-tight">
                {currentTrack.title}
              </p>
              <p className="text-[11px] text-text3 truncate m-0 leading-tight">
                {currentTrack.artist}
              </p>
            </div>

            {/* Time */}
            <span className="text-[11px] text-text4 flex-shrink-0 hidden md:block" style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Close */}
            <button
              onClick={() => { pause(); setCurrentTrack(null); }}
              className="text-[16px] text-text4 hover:text-text bg-transparent border-none cursor-pointer px-1"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </PlayerContext.Provider>
  );
}
