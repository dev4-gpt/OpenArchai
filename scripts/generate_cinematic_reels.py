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
    print("🎬 Rendering Reel 1: 360° Cinematic Turntable Walkthrough...")
    # 12-second 720p architectural reel with geometric wireframe & multi-harmonic ambient drone
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", "color=c=0x141311:s=1280x720:d=12:r=30",
        "-f", "lavfi",
        "-i", "aevalsrc=0.20*sin(2*PI*110*t)+0.15*sin(2*PI*164.81*t)+0.12*sin(2*PI*220*t)+0.09*sin(2*PI*277.18*t)+0.06*sin(2*PI*329.63*t):s=44100:d=12",
        "-filter_complex",
        "[0:v]"
        "drawbox=x=40:y=40:w=1200:h=640:color=0x403c34@0.8:t=2,"
        "drawbox=x=60:y=60:w=1160:h=600:color=0x2c2924@0.6:t=1,"
        # Center architectural 3D crosshair and isometric frames
        "drawbox=x=540:y=260:w=200:h=200:color=0xcaa56c@0.7:t=2,"
        "drawbox=x=560:y=280:w=160:h=160:color=0xcaa56c@0.4:t=1,"
        "drawbox=x=580:y=300:w=120:h=120:color=0xcaa56c@0.3:t=1,"
        "drawbox=x=635:y=355:w=10:h=10:color=0xffffff@0.9:t=fill,"
        # Top and bottom letterbox accent banners
        "drawbox=x=60:y=60:w=1160:h=45:color=0x1e1c18@0.9:t=fill,"
        "drawbox=x=60:y=615:w=1160:h=45:color=0x1e1c18@0.9:t=fill,"
        # Animated scanning reticle
        "drawbox=x='540+80*sin(t*1.5)':y='260+80*cos(t*1.5)':w=20:h=20:color=0xe8d098@0.8:t=1[v];"
        "[1:a]afade=t=in:ss=0:d=1.5,afade=t=out:st=10.5:d=1.5[a]",
        "-map", "[v]",
        "-map", "[a]",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        REEL_1
    ]
    subprocess.run(cmd, check=True)
    print(f"✅ Reel 1 ready: {REEL_1} ({os.path.getsize(REEL_1) // 1024} KB)")

def generate_reel_2():
    print("🎬 Rendering Reel 2: Twilight Circadian Walkthrough...")
    # 12-second warm twilight interior glide (warm recessed amber 2700K tone)
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", "color=c=0x1c1610:s=1280x720:d=12:r=30",
        "-f", "lavfi",
        "-i", "aevalsrc=0.18*sin(2*PI*92.5*t)+0.14*sin(2*PI*138.59*t)+0.11*sin(2*PI*185*t)+0.09*sin(2*PI*220*t)+0.07*sin(2*PI*293.66*t):s=44100:d=12",
        "-filter_complex",
        "[0:v]"
        "drawbox=x=40:y=40:w=1200:h=640:color=0x543c24@0.8:t=2,"
        "drawbox=x=60:y=60:w=1160:h=600:color=0x382818@0.6:t=1,"
        # Center warm glowing focal plane
        "drawbox=x=500:y=240:w=280:h=240:color=0xdfa052@0.7:t=2,"
        "drawbox=x=530:y=270:w=220:h=180:color=0xdfa052@0.4:t=1,"
        "drawbox=x=560:y=300:w=160:h=120:color=0xdfa052@0.3:t=1,"
        "drawbox=x=635:y=355:w=10:h=10:color=0xffeedd@0.9:t=fill,"
        # Header & Footer banners
        "drawbox=x=60:y=60:w=1160:h=45:color=0x261a10@0.9:t=fill,"
        "drawbox=x=60:y=615:w=1160:h=45:color=0x261a10@0.9:t=fill,"
        # Animated dolly tracker
        "drawbox=x='500+120*sin(t*1.2)':y='240+100*cos(t*1.2)':w=24:h=24:color=0xffcc88@0.8:t=1[v];"
        "[1:a]afade=t=in:ss=0:d=1.5,afade=t=out:st=10.5:d=1.5[a]",
        "-map", "[v]",
        "-map", "[a]",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        REEL_2
    ]
    subprocess.run(cmd, check=True)
    print(f"✅ Reel 2 ready: {REEL_2} ({os.path.getsize(REEL_2) // 1024} KB)")

if __name__ == "__main__":
    generate_reel_1()
    generate_reel_2()
