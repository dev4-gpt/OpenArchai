#!/usr/bin/env python3
"""
Generates self-hosted high-definition architectural cinematic walkthrough reels
with embedded ambient audio tracks for AtelierOS using FFmpeg.
"""

import subprocess
import os

OUT_DIR = os.path.abspath("apps/web/public/videos")
os.makedirs(OUT_DIR, exist_ok=True)

REEL_1 = os.path.join(OUT_DIR, "reel-360-turntable.mp4")
REEL_2 = os.path.join(OUT_DIR, "reel-twilight-glide.mp4")

def generate_reel_1():
    print("🎬 Rendering Reel 1: 360° Cinematic Turntable Walkthrough (12s, 720p)...")
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-t", "12", "-i", "/tmp/arch_reel1.jpg",
        "-f", "lavfi",
        "-i", "aevalsrc=0.20*sin(2*PI*110*t)+0.15*sin(2*PI*164.81*t)+0.12*sin(2*PI*220*t)+0.09*sin(2*PI*277.18*t)+0.06*sin(2*PI*329.63*t):s=44100:d=12",
        "-filter_complex",
        "[0:v]scale=1920x1080:force_original_aspect_ratio=increase,crop=1920:1080,"
        "zoompan=z='min(zoom+0.0007,1.18)':x='iw/2-(iw/zoom/2)+40*sin(in/45)':y='ih/2-(ih/zoom/2)':d=360:s=1280x720:fps=30,"
        "drawbox=x=0:y=0:w=1280:h=36:color=black@0.6:t=fill,"
        "drawbox=x=0:y=684:w=1280:h=36:color=black@0.6:t=fill[v];"
        "[1:a]afade=t=in:ss=0:d=1.5,afade=t=out:st=10.5:d=1.5[a]",
        "-map", "[v]",
        "-map", "[a]",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-c:a", "aac",
        "-b:a", "192k",
        "-t", "12",
        "-movflags", "+faststart",
        REEL_1
    ]
    subprocess.run(cmd, check=True)
    print(f"✅ Reel 1 ready: {REEL_1} ({os.path.getsize(REEL_1) // 1024} KB)")

def generate_reel_2():
    print("🎬 Rendering Reel 2: Twilight Circadian Walkthrough (12s, 720p)...")
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-t", "12", "-i", "/tmp/arch_reel2.jpg",
        "-f", "lavfi",
        "-i", "aevalsrc=0.18*sin(2*PI*92.5*t)+0.14*sin(2*PI*138.59*t)+0.11*sin(2*PI*185*t)+0.09*sin(2*PI*220*t)+0.07*sin(2*PI*293.66*t):s=44100:d=12",
        "-filter_complex",
        "[0:v]scale=1920x1080:force_original_aspect_ratio=increase,crop=1920:1080,"
        "zoompan=z='min(zoom+0.0006,1.15)':x='iw/2-(iw/zoom/2)+50*cos(in/50)':y='ih/2-(ih/zoom/2)':d=360:s=1280x720:fps=30,"
        "drawbox=x=0:y=0:w=1280:h=36:color=black@0.6:t=fill,"
        "drawbox=x=0:y=684:w=1280:h=36:color=black@0.6:t=fill[v];"
        "[1:a]afade=t=in:ss=0:d=1.5,afade=t=out:st=10.5:d=1.5[a]",
        "-map", "[v]",
        "-map", "[a]",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-c:a", "aac",
        "-b:a", "192k",
        "-t", "12",
        "-movflags", "+faststart",
        REEL_2
    ]
    subprocess.run(cmd, check=True)
    print(f"✅ Reel 2 ready: {REEL_2} ({os.path.getsize(REEL_2) // 1024} KB)")

if __name__ == "__main__":
    generate_reel_1()
    generate_reel_2()
