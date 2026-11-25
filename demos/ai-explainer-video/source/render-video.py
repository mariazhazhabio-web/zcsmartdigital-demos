"""Render the narrated explainer (scene.html + narration-fitted.wav) to 1920x1080, 30 fps MP4s.

Requires: Python 3, `pip install playwright`, `python -m playwright install chromium`, and ffmpeg on PATH.
Run from this folder (scene.html must be served over http so script.json loads):
    python -m http.server 8765            (in one window)
    python render-video.py                (in another)
Outputs ../media/explainer.mp4 (narrated, clean picture) and ../media/explainer-open-captions.mp4 (captions burned in).
Timing comes from script.json: duration_s, cues (caption times) and warp (scene timing that follows the voice).
"""
import json, pathlib, shutil, subprocess, sys, tempfile
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
MEDIA = HERE.parent / "media"; MEDIA.mkdir(exist_ok=True)
URL = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765/scene.html") + "?captions=0"
FPS = 30
meta = json.loads((HERE / "script.json").read_text(encoding="utf-8"))
DUR = float(meta["duration_s"])
chrome = shutil.which("google-chrome")
tmp = pathlib.Path(tempfile.mkdtemp())
with sync_playwright() as pw:
    b = pw.chromium.launch(**({"executable_path": chrome} if chrome else {}))
    p = b.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
    p.goto(URL); p.wait_for_timeout(500)
    p.evaluate("w => { WARP = w; }", meta.get("warp"))
    for i in range(int(round(FPS * DUR))):
        p.evaluate(f"render({i / FPS})")
        p.screenshot(path=str(tmp / f"f{i:05d}.jpg"), type="jpeg", quality=92)
    b.close()
clean = MEDIA / "explainer.mp4"
audio = HERE / "narration-fitted.wav"  # not published; copy it here from handover/explainer-audio/ before rendering
cmd = ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(tmp / "f%05d.jpg")]
if audio.exists(): cmd += ["-i", str(audio), "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-shortest"]
cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(clean)]
subprocess.run(cmd, check=True)
style = "FontName=Poppins,FontSize=22,PrimaryColour=&H00FFFFFF,BackColour=&H40281005,BorderStyle=3,Outline=6,Shadow=0,MarginV=36,Bold=1"
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(clean), "-vf", f"subtitles=explainer.en.srt:force_style='{style}'",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart",
                str(MEDIA / "explainer-open-captions.mp4")], check=True, cwd=str(MEDIA))
shutil.rmtree(tmp)
print("done:", clean, f"{DUR}s")
