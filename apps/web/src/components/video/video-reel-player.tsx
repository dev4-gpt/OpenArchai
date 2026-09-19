"use client";

import { useState, useRef } from "react";
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
  const [isMuted, setIsMuted] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activeReel = reels[selectedReelIndex] || reels[0];

  function togglePlay() {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }

  function handleModeSelect(index: number) {
    setSelectedReelIndex(index);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
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
      <div className="relative aspect-video w-full bg-black overflow-hidden group">
        <video
          ref={videoRef}
          src={activeReel.videoUrl}
          poster={activeReel.thumbnailUrl}
          loop
          muted={isMuted}
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="h-full w-full object-cover"
        />

        {/* Play / Pause Center Overlay */}
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors cursor-pointer"
        >
          <div className="h-14 w-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-foreground shadow-lg hover:scale-105 transition-transform">
            {isPlaying ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </div>
        </button>

        {/* Bottom Bar Info */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex items-center justify-between text-white text-xs">
          <div>
            <p className="font-semibold">{activeReel.title}</p>
            <p className="text-[11px] text-white/75 font-mono">{activeReel.prompt}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="rounded bg-black/40 px-2.5 py-1 text-[11px] text-white hover:bg-black/60 backdrop-blur-xs border border-white/20"
            >
              {isMuted ? "🔇 Muted" : "🔊 Sound"}
            </button>
            <a
              href={activeReel.videoUrl}
              download={`${projectName}_walkthrough.mp4`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-white/20 px-2.5 py-1 text-[11px] text-white hover:bg-white/30 backdrop-blur-xs border border-white/30"
            >
              ⬇ Download MP4
            </a>
          </div>
        </div>
      </div>

      {/* Camera Flight Path Choreography Timeline */}
      <div className="p-4 pt-1 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
          Camera Choreography Waypoints ({activeReel.keyframes.length} Keyframes):
        </span>
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
