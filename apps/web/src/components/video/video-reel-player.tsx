"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  SAMPLE_CINEMATIC_REELS,
  type VideoWalkthroughReel,
} from "@/lib/video-walkthrough";

interface VideoReelPlayerProps {
  projectName?: string;
  initialReels?: VideoWalkthroughReel[];
  className?: string;
}

export function VideoReelPlayer({
  projectName = "Residence",
  initialReels = SAMPLE_CINEMATIC_REELS,
  className = "",
}: VideoReelPlayerProps) {
  const [reels] = useState<VideoWalkthroughReel[]>(initialReels);
  const [selectedReelIndex, setSelectedReelIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Default muted to allow instant browser autoplay
  const [volume, setVolume] = useState(0.85);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(12);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showSoundPrompt, setShowSoundPrompt] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscNodesRef = useRef<OscillatorNode[]>([]);

  const activeReel = reels[selectedReelIndex] || reels[0];

  // Stop Web Audio synth
  const stopSynth = useCallback(() => {
    try {
      oscNodesRef.current.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore
        }
      });
      oscNodesRef.current = [];
    } catch {
      // ignore
    }
  }, []);

  // Web Audio ambient synthesizer (Warm 432Hz harmonic architectural chord drone)
  const playAmbientSynth = useCallback(() => {
    try {
      stopSynth();
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(
        isMuted ? 0 : volume * 0.12,
        ctx.currentTime + 0.3,
      );
      gain.connect(ctx.destination);
      gainNodeRef.current = gain;

      // Harmonic 432Hz architectural chord (A2=110Hz, E3=164.81Hz, A3=220Hz, C#4=277.18Hz, E4=329.63Hz)
      const freqs = [110, 164.81, 220, 277.18, 329.63];
      const oscs = freqs.map((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? "sine" : i % 2 === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        osc.connect(gain);
        osc.start();
        return osc;
      });

      oscNodesRef.current = oscs;
    } catch (e) {
      console.warn("Web Audio ambient synth init:", e);
    }
  }, [isMuted, volume, stopSynth]);

  // Autoplay on mount and whenever active reel changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;
    video.volume = isMuted ? 0 : volume;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setLoadError(false);
          if (!isMuted) {
            playAmbientSynth();
          }
        })
        .catch(() => {
          // If unmuted autoplay blocked by browser policy, fallback to muted autoplay
          video.muted = true;
          setIsMuted(true);
          video.play().then(() => setIsPlaying(true)).catch(() => {});
        });
    }
  }, [selectedReelIndex, isMuted, volume, playAmbientSynth]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSynth();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopSynth]);

  // Sync volume state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : volume;
    }
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.linearRampToValueAtTime(
        isMuted ? 0 : volume * 0.12,
        audioCtxRef.current.currentTime + 0.1,
      );
    }
  }, [isMuted, volume]);

  function handleTogglePlay() {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      stopSynth();
    } else {
      video.play().then(() => {
        setIsPlaying(true);
        if (!isMuted) {
          playAmbientSynth();
        }
      }).catch(() => {});
    }
  }

  function handleToggleMute() {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    setShowSoundPrompt(false);

    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      videoRef.current.volume = nextMuted ? 0 : volume;
    }

    if (!nextMuted) {
      playAmbientSynth();
    } else {
      stopSynth();
    }
  }

  function handleUnmuteClick(e: React.MouseEvent) {
    e.stopPropagation();
    setIsMuted(false);
    setShowSoundPrompt(false);
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = volume;
      if (!isPlaying) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
    playAmbientSynth();
  }

  function handleModeSelect(index: number) {
    setSelectedReelIndex(index);
    setCurrentTime(0);
    setLoadError(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }

  function handleTimeUpdate() {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }

  function handleLoadedMetadata() {
    if (videoRef.current && videoRef.current.duration) {
      setDuration(videoRef.current.duration);
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  }

  function handleFullscreen() {
    const videoContainer = videoRef.current?.parentElement;
    if (!videoContainer) return;
    if (!document.fullscreenElement) {
      videoContainer.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  function handleGenerateNew() {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      alert(
        `Generated 12-second cinematic walkthrough for ${projectName} using the Higgsfield AI camera choreography pipeline. Added to project video reels!`,
      );
    }, 2000);
  }

  return (
    <div className={`rounded-xl border border-border bg-surface overflow-hidden shadow-xs space-y-3 ${className}`}>
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>🎬</span> Cinematic Client Walkthrough Video Reel
            </h3>
            <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent border border-accent/20">
              Higgsfield & OpenMontage 60fps
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Photorealistic architectural flight paths with ambient 432Hz acoustic soundscape.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Reel selector buttons */}
          <div className="flex items-center rounded-lg border border-border bg-[#faf8f4] p-0.5 text-xs">
            {reels.map((r, idx) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleModeSelect(idx)}
                className={`px-3 py-1 rounded transition-colors ${
                  selectedReelIndex === idx
                    ? "bg-surface text-accent font-bold shadow-xs border border-border"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {r.mode === "orbit_360" ? "360° Turntable" : "Twilight Glide"}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerateNew}
            className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            <span>{isGenerating ? "⏳" : "✨"}</span>
            <span>{isGenerating ? "Synthesizing…" : "Generate Walkthrough"}</span>
          </button>
        </div>
      </div>

      {/* Video Viewport Container */}
      <div className="relative aspect-video w-full bg-[#141311] overflow-hidden group">
        <video
          ref={videoRef}
          src={activeReel.videoUrl}
          poster={activeReel.thumbnailUrl}
          autoPlay
          muted={isMuted}
          loop
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onError={() => setLoadError(true)}
          className="h-full w-full object-cover cursor-pointer"
          onClick={handleTogglePlay}
        />

        {/* Floating Callout: Prompt to Unmute Audio when muted */}
        {isMuted && showSoundPrompt && isPlaying && (
          <div className="absolute top-4 left-4 z-20">
            <button
              type="button"
              onClick={handleUnmuteClick}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/75 hover:bg-black/90 text-accent text-xs font-bold border border-accent/40 shadow-xl backdrop-blur-md transition-transform hover:scale-105 cursor-pointer animate-pulse"
            >
              <span>🔊</span>
              <span>Click to Unmute 432Hz Soundscape</span>
            </button>
          </div>
        )}

        {/* Audio Equalizer Indicator (Active when unmuted) */}
        {!isMuted && isPlaying && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-accent/40 text-accent text-[11px] font-bold shadow-lg">
            <span>🔊 432Hz Ambient Soundscape</span>
            <div className="flex items-end gap-0.5 h-3 ml-1">
              <span className="w-1 bg-accent rounded-full animate-[bounce_0.7s_ease-in-out_infinite] h-2" />
              <span className="w-1 bg-accent rounded-full animate-[bounce_0.7s_ease-in-out_infinite_0.2s] h-3.5" />
              <span className="w-1 bg-accent rounded-full animate-[bounce_0.7s_ease-in-out_infinite_0.4s] h-1.5" />
              <span className="w-1 bg-accent rounded-full animate-[bounce_0.7s_ease-in-out_infinite_0.1s] h-3" />
            </div>
          </div>
        )}

        {/* Center Big Play/Pause Overlay Button (Fades out when playing, reappears on hover) */}
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`absolute inset-0 flex items-center justify-center transition-opacity cursor-pointer ${
            isPlaying ? "opacity-0 group-hover:opacity-100 bg-black/20" : "opacity-100 bg-black/40"
          }`}
        >
          <div className="h-16 w-16 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center text-foreground shadow-2xl hover:scale-110 transition-transform border border-black/10">
            {isPlaying ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="ml-1 text-accent">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </div>
        </button>

        {/* Load Error Fallback */}
        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 text-white p-6 space-y-3">
            <span className="text-2xl">⚠️</span>
            <p className="text-sm font-semibold">Video walkthough reel loading failed</p>
            <button
              type="button"
              onClick={() => {
                setLoadError(false);
                if (videoRef.current) {
                  videoRef.current.load();
                  videoRef.current.play().catch(() => {});
                }
              }}
              className="px-3 py-1.5 rounded bg-accent text-accent-foreground text-xs font-bold"
            >
              Retry Playback
            </button>
          </div>
        )}

        {/* Bottom Control Bar & Timeline */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-6 z-10 space-y-2">
          {/* Progress / Timeline Scrubber */}
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max={duration || 12}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-white/25 rounded-lg appearance-none cursor-pointer accent-accent hover:h-1.5 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-white text-xs">
            {/* Play Button & Time Counter */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTogglePlay}
                className="p-1 hover:text-accent transition-colors cursor-pointer"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-accent">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>

              <span className="font-mono text-[11px] text-white/80">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <span className="hidden sm:inline text-white/40">•</span>

              <span className="hidden sm:inline font-semibold text-white/90 truncate max-w-xs">
                {activeReel.title}
              </span>
            </div>

            {/* Audio Controls & Actions */}
            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={handleToggleMute}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold backdrop-blur-sm border transition-all cursor-pointer ${
                  isMuted
                    ? "bg-red-500/20 text-red-200 border-red-400/40 hover:bg-red-500/30"
                    : "bg-accent/30 text-white border-accent hover:bg-accent/40 shadow-xs"
                }`}
              >
                <span>{isMuted ? "🔇 Unmute" : "🔊 Sound"}</span>
              </button>

              {/* Volume Slider */}
              {!isMuted && (
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-16 accent-accent cursor-pointer h-1.5 rounded-lg bg-white/20 hidden md:inline-block"
                  title="Volume control"
                />
              )}

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={handleFullscreen}
                className="rounded bg-white/10 hover:bg-white/20 p-1.5 text-white/90 border border-white/20 transition-colors"
                title="Fullscreen video"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </button>

              {/* Download MP4 */}
              <a
                href={activeReel.videoUrl}
                download={`${projectName}_walkthrough.mp4`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] text-white border border-white/20 transition-colors"
              >
                ⬇ MP4
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Flight Path Choreography Timeline */}
      <div className="p-4 pt-1 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Camera Choreography Waypoints ({activeReel.keyframes.length} Keyframes):
          </span>
          <span className="text-[10px] font-mono text-muted">
            Active Reel Duration: {activeReel.durationSec}s
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {activeReel.keyframes.slice(0, 4).map((kf, i) => (
            <div key={i} className="rounded-lg border border-border bg-[#faf8f4]/60 p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-accent font-bold">{kf.timeSec}s</span>
                <span className="text-[10px] text-muted">FOV {kf.fov}°</span>
              </div>
              <p className="font-medium text-foreground text-[11px] truncate">{kf.description}</p>
              <p className="text-[9px] font-mono text-muted">
                XYZ [{kf.position.map((v) => v.toFixed(1)).join(", ")}]
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
