"""Render the process explainer locally, using the exported editable deck."""
from __future__ import annotations

import json
import math
import subprocess
import textwrap
import wave
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
BUILD = ROOT / ".build"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
FPS = 24
LEAD = .45
TAIL = .65


def run(args):
    subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", *args], check=True, cwd=BUILD)


def stamp(seconds, vtt=False):
    ms = round(seconds * 1000)
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02}{'.' if vtt else ','}{ms:03}"


def audio_for_slide(index, segments):
    target = BUILD / f"voice-{index:02}.wav"
    cues = []
    elapsed = LEAD
    with wave.open(str(segments[0]["wav"]), "rb") as first:
        params = first.getparams()
    rate = params.framerate
    assert params.nchannels == 1 and params.sampwidth == 2
    with wave.open(str(target), "wb") as out:
        out.setparams(params)
        out.writeframes(b"\0\0" * round(LEAD * rate))
        for segment in segments:
            with wave.open(str(segment["wav"]), "rb") as source:
                assert source.getparams()[:3] == params[:3]
                duration = source.getnframes() / rate
                out.writeframes(source.readframes(source.getnframes()))
            cues.append((elapsed, elapsed + duration, segment["text"]))
            elapsed += duration
        out.writeframes(b"\0\0" * round(TAIL * rate))
    duration = math.ceil((elapsed + TAIL) * FPS) / FPS
    return target, cues, duration


def caption_text(text):
    return "\n".join(textwrap.wrap(text, width=97))


def ass_captions(index, cues):
    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Segoe UI,30,&H00F6F4EA,&H00F6F4EA,&H002A1F10,&H002A1F10,0,0,0,0,100,100,0,0,1,1,0,2,90,90,30,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for start, end, text in cues:
        start_time = stamp(start, True)[1:-1]
        end_time = stamp(end, True)[1:-1]
        caption = caption_text(text).replace("\n", r"\N")
        lines.append(f"Dialogue: 0,{start_time},{end_time},Default,,0,0,0,,{caption}")
    path = BUILD / f"captions-{index:02}.ass"
    path.write_text(header + "\n".join(lines) + "\n", encoding="utf-8")
    return path.name


def contact_sheet():
    sheet = Image.new("RGB", (1920, 1200), "#d8dce0")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(r"C:\Windows\Fonts\seguisb.ttf", 20)
    for i in range(12):
        x, y = (i % 3)*640, (i // 3)*300
        with Image.open(BUILD / "slides" / f"Slide{i+1}.PNG") as im:
            thumb = im.convert("RGB")
            thumb.thumbnail((620, 263))
            sheet.paste(thumb, (x+10, y+27))
        draw.text((x+12, y+3), f"{i+1:02d}", font=font, fill="#101f2a")
    sheet.save(ROOT / "Deck-Preview.jpg", quality=92)


def build():
    story = json.loads((ROOT / "story.json").read_text(encoding="utf-8"))
    segments = json.loads((BUILD / "segments.json").read_text(encoding="utf-8-sig"))
    global_cues = []
    scene_details = []
    elapsed = 0
    for i in range(1, 13):
        scene = [s for s in segments if s["slide"] == i]
        wav, cues, duration = audio_for_slide(i, scene)
        frames = round(duration * FPS)
        scene_details.append({"slide": i, "start": elapsed, "duration": duration})
        clip = BUILD / f"scene-{i:02}.mp4"
        captions = ass_captions(i, cues)
        # A gentle camera push and short fades add motion without fighting the speaker.
        vf = (
            f"scale=2000:-2,zoompan=z='1+0.012*on/{frames}':"
            f"x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s=1664x936:fps={FPS},"
            f"fade=t=in:st=0:d=0.25,fade=t=out:st={duration-.25:.4f}:d=0.25,"
            f"pad=1920:1080:128:0:color=0x101F2A,setsar=1,ass={captions},format=yuv420p"
        )
        run(["-i", str(BUILD / "slides" / f"Slide{i}.PNG"), "-i", str(wav),
             "-vf", vf, "-af", "apad", "-t", str(duration), "-r", str(FPS),
             "-c:v", "libx264", "-preset", "fast", "-crf", "19",
             "-c:a", "aac", "-b:a", "160k", "-ar", "48000", str(clip)])
        for start, end, text in cues:
            global_cues.append((elapsed+start, elapsed+end, text))
        elapsed += duration
        print(f"Encoded scene {i:02}: {duration:.2f}s", flush=True)

    srt, vtt = [], ["WEBVTT\n"]
    for n, (start, end, text) in enumerate(global_cues, 1):
        srt.append(f"{n}\n{stamp(start)} --> {stamp(end)}\n{caption_text(text)}\n")
        vtt.append(f"{stamp(start, True)} --> {stamp(end, True)}\n{caption_text(text)}\n")
    (ROOT / "Workshop-Studio-Explainer.srt").write_text("\n".join(srt), encoding="utf-8")
    (ROOT / "Workshop-Studio-Explainer.vtt").write_text("\n".join(vtt), encoding="utf-8")
    concat = BUILD / "scenes.txt"
    concat.write_text("\n".join(f"file 'scene-{i:02}.mp4'" for i in range(1, 13)), encoding="utf-8")
    run(["-f", "concat", "-safe", "0", "-i", str(concat),
         "-i", str(ROOT / "Workshop-Studio-Explainer.srt"),
         "-map", "0:v", "-map", "0:a", "-map", "1:0",
         "-c:v", "copy", "-c:a", "copy", "-c:s", "mov_text",
         "-metadata:s:a:0", "language=eng",
         "-metadata:s:s:0", "language=eng", "-metadata:s:s:0", "title=English captions",
         "-disposition:s:0", "0", "-movflags", "+faststart",
         str(ROOT / "Workshop-Studio-Explainer.mp4")])
    transcript = [
        "# The AI-Powered Workshop Studio",
        "",
        "Process explainer. Narration: offline Microsoft Zira Desktop. "
        "Captions are burned into the video, included as an optional MP4 text track, "
        "and supplied separately as SRT/VTT.",
        "",
    ]
    for scene, slide in zip(scene_details, story["slides"]):
        transcript.extend([
            f"## {stamp(scene['start'], True)[:-4]} | {slide['section']}",
            "", slide["narration"], "",
        ])
    (ROOT / "Explainer-Transcript.md").write_text("\n".join(transcript), encoding="utf-8")
    (BUILD / "timing.json").write_text(json.dumps({
        "duration": elapsed, "cues": len(global_cues), "scenes": scene_details,
    }, indent=2), encoding="utf-8")
    contact_sheet()
    print(f"Created 1920x1080 explainer: {elapsed:.2f}s, {len(global_cues)} caption cues.")


if __name__ == "__main__":
    build()
