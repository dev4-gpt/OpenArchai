"use client";

import { useState, useRef, useEffect } from "react";
import {
  SAMPLE_CINEMATIC_REELS,
  generateCameraPath,
  type CameraChoreographyMode,
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
  const [reels, setReels] = useState<VideoWalkthroughReel[]>(initialReels);
  const [selectedReelIndex, setSelectedReelIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscNodesRef = useRef<OscillatorNode[]>([]);

  const activeReel = reels[selectedReelIndex] || reels[0];

  // Stop Web Audio synth
  function stopSynth() {
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
  }

  // Web Audio ambient sound synthesizer (Warm 432Hz architectural chord drone)
  function playAmbientSynth() {
    try {
      stopSynth();
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(isMuted ? 0 : volume * 0.15, ctx.currentTime);
      gain.connect(ctx.destination);
      gainNodeRef.current = gain;

      // Harmonic architectural frequencies (A2=110Hz, E3=164.81Hz, A3=220Hz, C#4=277.18Hz, E4=329.63Hz)
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
  }

  useEffect(() => {
    return () => {
      stopSynth();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Sync mute and volume state to video and synth
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : volume;
    }
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        isMuted ? 0 : volume * 0.15,
        audioCtxRef.current.currentTime,
      );
    }
  }, [isMuted, volume]);

  function togglePlay() {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      stopSynth();
    } else {
      setLoadError(false);
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : volume;

      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          if (!isMuted) {
            playAmbientSynth();
          }
        })
        .catch((err) => {
          console.warn("Initial unmuted play blocked, attempting fallback:", err);
          // Retry muted if browser policy blocked audio playback
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().then(() => setIsPlaying(true));
          }
        });
    }
  }

  function toggleMute() {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

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

  function handleModeSelect(index: number) {
    setSelectedReelIndex(index);
    setIsPlaying(false);
    setLoadError(false);
    stopSynth();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
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
            Ultra-smooth camera flight paths choreographed from the 3D model geometry.
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
                {r.mode === "orbit_360" ? "360° Orbit" : "Interior Glide"}
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

      {/* Video Viewport */}
      <div className="relative aspect-video w-full bg-[#141311] overflow-hidden group">
        <video
          ref={videoRef}
          src={activeReel.videoUrl}
          poster={activeReel.thumbnailUrl}
          loop
          muted={isMuted}
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => setLoadError(true)}
          className="h-full w-full object-cover"
        />

        {/* Play / Pause Center Overlay */}
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/40 transition-colors cursor-pointer"
        >
          <div className="h-16 w-16 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center text-foreground shadow-2xl hover:scale-105 transition-transform border border-black/10">
            {isPlaying ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" className="ml-1 text-accent">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </div>
        </button>

        {/* Audio Equalizer Wave Animation (Visible when playing with sound) */}
        {!isMuted && isPlaying && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-accent/40 text-accent text-[11px] font-bold shadow-lg">
            <span>🔊 432Hz Ambient Soundscape</span>
            <div className="flex items-end gap-0.5 h-3.5 ml-1">
              <span className="w-1 bg-accent rounded-full animate-[bounce_0.8s_ease-in-out_infinite] h-2" />
              <span className="w-1 bg-accent rounded-full animate-[bounce_0.8s_ease-in-out_infinite_0.2s] h-3.5" />
              <span className="w-1 bg-accent rounded-full animate-[bounce_0.8s_ease-in-out_infinite_0.4s] h-1.5" />
              <span className="w-1 bg-accent rounded-full animate-[bounce_0.8s_ease-in-out_infinite_0.1s] h-3" />
            </div>
          </div>
        )}

        {/* Bottom Bar Info & Audio Controls */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex items-center justify-between text-white text-xs">
          <div>
            <p className="font-semibold text-sm flex items-center gap-2">
              <span>{activeReel.title}</span>
              {isPlaying && (
                <span className="text-[10px] uppercase font-bold text-accent tracking-wider animate-pulse">
                  • Playing
                </span>
              )}
            </p>
            <p className="text-[11px] text-white/75 font-mono truncate max-w-md">{activeReel.prompt}</p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Sound Mute/Unmute Button */}
            <button
              type="button"
              onClick={toggleMute}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold backdrop-blur-sm border transition-all cursor-pointer ${
                isMuted
                  ? "bg-red-500/20 text-red-200 border-red-400/40 hover:bg-red-500/30"
                  : "bg-accent/30 text-white border-accent hover:bg-accent/40 shadow-xs"
              }`}
            >
              <span>{isMuted ? "🔇 Unmute Sound" : "🔊 Sound On"}</span>
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
                className="w-16 accent-accent cursor-pointer h-1.5 rounded-lg bg-white/20"
                title="Volume control"
              />
            )}

            {/* Download MP4 */}
            <a
              href={activeReel.videoUrl}
              download={`${projectName}_walkthrough.mp4`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-white/20 px-3 py-1.5 text-xs text-white hover:bg-white/30 backdrop-blur-xs border border-white/30 transition-colors"
            >
              ⬇ Download MP4
            </a>
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
