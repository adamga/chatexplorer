"""High-craft 1080p30 motion-graphics explainer compositor with gpt-audio-1.5 narration."""
from __future__ import annotations

import base64
import concurrent.futures
import hashlib
import io
import json
import math
import os
import re
import subprocess
import sys
import textwrap
import time
import wave
import zipfile
from functools import lru_cache
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
ADV_DIR = ROOT.parents[1]
BOC_PPTX = ADV_DIR / "workshop boc.pptx"
sys.path.insert(0, str(ROOT.parent / "scripts"))
from voice import windows_post

URL = "https://adamga-8000-resource.services.ai.azure.com/openai/v1/chat/completions"
MODEL = "gpt-audio-1.5"
FF = imageio_ffmpeg.get_ffmpeg_exe()
CACHE = ROOT.parent / ".cache" / "deck-v1-mg"
HZ = 24000
FPS = 30
SAMPLES_PER_FRAME = HZ // FPS  # 800 samples per frame at 30 fps
TRANS_FRAMES = 12              # 0.40s smooth transition between slides
W, H = 1920, 1080
LAB_MINUTES = [8, 17, 15, 15, 18, 17]


@lru_cache(maxsize=64)
def get_font(size_px: int, bold: bool = False, mono: bool = False):
    fdir = Path(r"C:\Windows\Fonts")
    names = (["CascadiaMono.ttf", "consolab.ttf" if bold else "consola.ttf"] if mono
             else ["segoeuib.ttf" if bold else "segoeui.ttf", "arialbd.ttf" if bold else "arial.ttf"])
    for n in names:
        p = fdir / n
        if p.exists():
            return ImageFont.truetype(str(p), size_px)
    return ImageFont.load_default()


def hex_rgb(h: str) -> tuple[int, int, int]:
    s = h.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def ease_out_cubic(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return 1.0 - (1.0 - x) ** 3


def ease_in_out_cubic(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return 4 * x * x * x if x < 0.5 else 1 - ((-2 * x + 2) ** 3) / 2


def wrap_lines(text: str, font, max_w: int) -> list[str]:
    words = text.split()
    if not words:
        return [""]
    lines = [words[0]]
    for w in words[1:]:
        cand = lines[-1] + " " + w
        if font.getlength(cand) <= max_w:
            lines[-1] = cand
        else:
            lines.append(w)
    return lines


def load_boc_mascot(media_name: str, size: tuple[int, int]) -> Image.Image:
    with zipfile.ZipFile(BOC_PPTX, "r") as zf:
        raw = zf.read(f"ppt/media/{media_name}")
    im = Image.open(io.BytesIO(raw)).convert("RGBA")
    im.thumbnail(size, Image.Resampling.LANCZOS)
    # Add soft neon drop glow behind mascot
    glow = Image.new("RGBA", (im.width + 32, im.height + 32), (0, 0, 0, 0))
    alpha = im.split()[3].filter(ImageFilter.GaussianBlur(10))
    tint = Image.new("RGBA", im.size, (94, 236, 131, 110))
    glow.paste(tint, (16, 16), alpha)
    glow.alpha_composite(im, (16, 16))
    return glow


def make_studio_backdrop(role: str) -> Image.Image:
    """Builds a rich dark GitHub Copilot motion-studio backdrop with aurora glow and subtle grid."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    base = np.zeros((H, W, 3), dtype=np.float32)
    base[:, :] = (9, 13, 20)

    if role == "child":
        orbs = [
            (360, 220, 520, (24, 105, 145)),
            (1620, 240, 480, (88, 42, 155)),
            (980, 920, 560, (16, 110, 72)),
        ]
    else:
        orbs = [
            (340, 200, 520, (14, 98, 66)),
            (1640, 250, 500, (32, 74, 142)),
            (1100, 940, 540, (112, 62, 18)),
        ]
    for ox, oy, rad, col in orbs:
        d2 = ((xx - ox) ** 2 + (yy - oy) ** 2) / (rad ** 2)
        w = np.exp(-d2 * 1.35)[..., None]
        base += w * np.array(col, dtype=np.float32)

    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB")
    draw = ImageDraw.Draw(img, "RGBA")
    for gx in range(0, W, 64):
        draw.line([(gx, 0), (gx, H)], fill=(255, 255, 255, 10), width=1)
    for gy in range(0, H, 64):
        draw.line([(0, gy), (W, gy)], fill=(255, 255, 255, 10), width=1)
    return img


def trim_and_save_wav(raw_wav_bytes: bytes, dest: Path):
    with wave.open(io.BytesIO(raw_wav_bytes), "rb") as w:
        nch, sw, rate = w.getnchannels(), w.getsampwidth(), w.getframerate()
        frames = w.readframes(len(raw_wav_bytes) // (nch * sw))
    arr = np.frombuffer(frames, dtype="<i2")
    if nch > 1:
        arr = arr.reshape(-1, nch).mean(axis=1).astype("<i2")
    if rate != HZ:
        x_old = np.arange(len(arr))
        x_new = np.linspace(0, len(arr) - 1, round(len(arr) * HZ / rate))
        arr = np.interp(x_new, x_old, arr).astype("<i2")
    active = np.flatnonzero(np.abs(arr) > 75)
    if len(active):
        lo = max(0, int(active[0]) - int(HZ * 0.08))
        hi = min(len(arr), int(active[-1]) + int(HZ * 0.14))
        arr = arr[lo:hi]
    tmp = dest.with_suffix(".tmp.wav")
    with wave.open(str(tmp), "wb") as out:
        out.setparams((1, 2, HZ, 0, "NONE", "not compressed"))
        out.writeframes(arr.tobytes())
    tmp.replace(dest)


def synthesize_foundry_take(job: tuple[int, str, str, str, Path]) -> Path:
    idx, voice, style, text, path = job
    if path.exists() and path.stat().st_size > 1000:
        return path
    payload = {
        "model": MODEL,
        "modalities": ["text", "audio"],
        "audio": {"format": "wav", "voice": voice},
        "messages": [
            {"role": "system", "content": style},
            {"role": "user", "content": text},
        ],
    }
    last_err = None
    for attempt in range(4):
        try:
            res = windows_post(URL, payload)
            b64 = res["choices"][0]["message"]["audio"]["data"]
            raw = base64.b64decode(b64, validate=True)
            trim_and_save_wav(raw, path)
            return path
        except Exception as exc:
            last_err = exc
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Slide {idx + 1} audio synthesis failed after retries: {last_err}")


def ensure_takes(rows: list[dict], role: str, mode: str, tmp: Path) -> list[Path]:
    if role == "child":
        voice = "coral"
        style = (
            "You are an enthusiastic, warm, crystal-clear storyteller explaining fun robot helpers to a bright five-year-old "
            "and workshop beginners. Speak with lively energy, friendly warmth, and natural pacing. Read the supplied text verbatim with no preamble."
        )
    else:
        voice = "ash"
        style = (
            "You are a seasoned, energizing GitHub principal instructor coaching fellow trainers on how to deliver an advanced hands-on workshop. "
            "Speak crisply, conversationally, and authoritatively at a natural brisk pace. Read the supplied text verbatim with no preamble."
        )

    paths: list[Path] = []
    jobs = []
    for i, row in enumerate(rows):
        text = row[role]
        key = hashlib.sha256(json.dumps(["v2-mg", MODEL, URL, mode, role, voice, style, text]).encode()).hexdigest()
        wav_path = CACHE / f"{role}-{i + 1:02d}-{key[:16]}.wav"
        paths.append(wav_path)
        if mode == "Foundry" and not wav_path.exists():
            jobs.append((i, voice, style, text, wav_path))

    if mode == "Foundry" and jobs:
        print(f"Synthesizing {len(jobs)} '{role}' takes with {MODEL} (voice={voice})...", flush=True)
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            futs = [pool.submit(synthesize_foundry_take, j) for j in jobs]
            for done_idx, fut in enumerate(concurrent.futures.as_completed(futs), 1):
                fut.result()
                if done_idx % 8 == 0 or done_idx == len(jobs):
                    print(f"  Completed {done_idx}/{len(jobs)} audio takes", flush=True)
    elif mode == "LocalPreview":
        missing = [{"n": i, "text": rows[i][role], "path": str(paths[i])}
                   for i in range(len(rows)) if not paths[i].exists()]
        if missing:
            manifest = tmp / f"preview-{role}.json"
            manifest.write_text(json.dumps(missing), encoding="utf-8")
            subprocess.run(["powershell.exe", "-NoProfile", "-NonInteractive", "-File",
                            str(ROOT / "speak-preview.ps1"), str(manifest), role], check=True)
    return paths


def split_sentences(text: str) -> list[str]:
    parts = [p.strip() for p in re.split(r"(?<=[.!?])\s+", text.strip()) if p.strip()]
    return parts or [text.strip()]


def stamp(seconds: float, sep: str = ".") -> str:
    ms = round(max(0.0, seconds) * 1000)
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02}{sep}{ms:03}"


def build_base_plate(backdrop: Image.Image, row: dict, slide_idx: int, total_slides: int, role: str) -> Image.Image:
    """Pre-renders the static chrome for a slide so per-frame animation stays blazingly fast."""
    im = backdrop.copy()
    d = ImageDraw.Draw(im, "RGBA")
    primary = hex_rgb("38BDF8" if role == "child" else "5EEC83")
    secondary = hex_rgb("A371F7" if role == "child" else "F59E0B")

    # Top broadcast bar
    d.rectangle((0, 0, W, 68), fill=(8, 12, 18, 215))
    d.line([(0, 68), (W, 68)], fill=(*primary, 150), width=2)
    d.ellipse((42, 24, 58, 40), fill=(*primary, 255))
    d.text((70, 19), "GITHUB COPILOT  ·  ADVANCED WORKSHOP", font=get_font(19, bold=True), fill=(235, 242, 250))

    sec_txt = row["section"].upper()
    sec_fnt = get_font(16, bold=True, mono=True)
    sec_w = int(sec_fnt.getlength(sec_txt)) + 28
    d.rounded_rectangle((490, 16, 490 + sec_w, 50), radius=16, fill=(22, 38, 52, 230), outline=(*primary, 180), width=2)
    d.text((504, 22), sec_txt, font=sec_fnt, fill=primary)

    mode_lbl = "FUNDAMENTALS · EXPLAINED FOR EVERYONE" if role == "child" else "TRAIN THE TRAINER · FACILITATOR GUIDE"
    d.text((1260, 21), mode_lbl, font=get_font(17, bold=True), fill=secondary)
    d.rounded_rectangle((1748, 15, 1882, 51), radius=14, fill=(18, 28, 40, 240), outline=(90, 110, 130, 180), width=1)
    d.text((1766, 21), f"{slide_idx + 1:02d} / {total_slides:02d}", font=get_font(18, bold=True, mono=True), fill=(255, 255, 255))

    # Left stage outer bezel shadow & border (stage inner: x=42..1354, y=84..822 -> 1312 x 738)
    d.rounded_rectangle((36, 78, 1360, 828), radius=16, fill=(5, 9, 14, 235), outline=(*primary, 135), width=2)

    # Right companion top studio pod (x=1380..1882, y=78..330)
    d.rounded_rectangle((1380, 78, 1882, 330), radius=16, fill=(11, 20, 29, 232), outline=(45, 68, 88, 200), width=2)
    pod_title = "STORYTELLER STUDIO  ·  GPT-AUDIO-1.5" if role == "child" else "INSTRUCTOR STUDIO  ·  GPT-AUDIO-1.5"
    d.text((1402, 94), pod_title, font=get_font(15, bold=True, mono=True), fill=primary)

    if role == "trainer":
        # 90-minute proportional workshop lab clock inside top pod
        d.text((1402, 246), "90-MINUTE WORKSHOP LAB CLOCK", font=get_font(13, bold=True, mono=True), fill=(160, 180, 198))
        cx = 1402.0
        avail = 456.0
        active_lab = row.get("lab")
        for l_idx, mins in enumerate(LAB_MINUTES):
            seg_w = avail * mins / 90.0
            is_on = (active_lab == l_idx)
            col = primary if is_on else (42, 62, 78)
            d.rounded_rectangle((cx, 268, cx + seg_w - 4, 286), radius=5, fill=col)
            d.text((cx + 2, 291), f"L{l_idx}", font=get_font(13, bold=is_on, mono=True),
                   fill=primary if is_on else (140, 158, 175))
            cx += seg_w

    # Right companion bottom kinetic card shell (x=1380..1882, y=344..828)
    d.rounded_rectangle((1380, 344, 1882, 828), radius=16, fill=(9, 26, 21, 232), outline=(34, 72, 56, 210), width=2)
    d.rectangle((1380, 344, 1882, 349), fill=secondary)
    hdr = "KEY IDEA  ·  FOLLOW ALONG" if role == "child" else "FACILITATOR CUES  ·  KEY POINTS"
    d.text((1402, 362), hdr, font=get_font(15, bold=True, mono=True), fill=secondary)
    badge_lines = wrap_lines(row["badge"], get_font(22, bold=True), 456)
    by = 388
    for bl in badge_lines[:2]:
        d.text((1402, by), bl, font=get_font(22, bold=True), fill=(255, 255, 255))
        by += 27
    d.line([(1402, by + 6), (1860, by + 6)], fill=(45, 80, 66, 200), width=1)

    return im


def render_role_video(rows: list[dict], role: str, mode: str, slides_dir: Path, tmp: Path):
    stem = "Little Helpers" if role == "child" else "Train the Trainer"
    if mode == "LocalPreview":
        stem += " - Local Preview"
    provider_label = f"Microsoft Foundry ({MODEL})" if mode == "Foundry" else "Windows Speech Preview"
    primary = hex_rgb("38BDF8" if role == "child" else "5EEC83")
    secondary = hex_rgb("A371F7" if role == "child" else "F59E0B")

    wav_paths = ensure_takes(rows, role, mode, tmp)
    backdrop = make_studio_backdrop(role)
    mascots = [
        load_boc_mascot("image43.png", (118, 118)),
        load_boc_mascot("image29.png", (118, 118)),
        load_boc_mascot("image44.png", (118, 118)),
    ]

    # Build unified 24kHz audio track + exact frame schedule + RMS audio envelope + captions
    lead_s = 0.30
    tail_s = 0.40
    all_pcm = bytearray()
    slide_plans = []
    global_cues: list[tuple[float, float, str]] = []
    chapters: list[str] = []
    cursor_frames = 0

    for i, (row, wav_path) in enumerate(zip(rows, wav_paths)):
        with wave.open(str(wav_path), "rb") as w:
            speech_pcm = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2")
        lead_samples = round(lead_s * HZ)
        tail_samples = round(tail_s * HZ)
        raw_total = lead_samples + len(speech_pcm) + tail_samples
        n_frames = max(FPS * 3, math.ceil(raw_total / SAMPLES_PER_FRAME))
        padded_len = n_frames * SAMPLES_PER_FRAME
        slide_samples = np.zeros(padded_len, dtype="<i2")
        slide_samples[lead_samples:lead_samples + len(speech_pcm)] = speech_pcm
        all_pcm.extend(slide_samples.tobytes())

        # Per-frame smoothed RMS voice envelope (0..1) for real-time spectrum bars
        reshaped = slide_samples.astype(np.float32).reshape(n_frames, SAMPLES_PER_FRAME)
        rms = np.sqrt(np.mean(reshaped ** 2, axis=1)) / 6500.0
        rms = np.clip(np.convolve(rms, [0.2, 0.6, 0.2], mode="same"), 0.0, 1.0)

        start_sec = cursor_frames / FPS
        chapters.append(f"## {stamp(start_sec)[:8]} | Slide {i + 1:02d} — {row['title']}\n\n{row[role]}")

        # Sentence timing & lower-third caption groups
        sentences = split_sentences(row[role])
        s_weights = [max(1, len(s)) for s in sentences]
        s_total = sum(s_weights)
        speech_dur = len(speech_pcm) / HZ
        sent_spans: list[tuple[float, float, str]] = []
        elapsed_in_speech = 0.0
        for s_txt, sw in zip(sentences, s_weights):
            sdur = speech_dur * (sw / s_total)
            s_start = lead_s + elapsed_in_speech
            s_end = s_start + sdur
            sent_spans.append((s_start, s_end, s_txt))
            # Split long sentences into crisp <= 76-char caption chunks
            wrapped = textwrap.wrap(s_txt, width=68, break_long_words=False, break_on_hyphens=False)
            groups = ["\n".join(wrapped[k:k + 2]) for k in range(0, len(wrapped), 2)]
            g_weights = [max(1, len(g)) for g in groups]
            g_total = sum(g_weights)
            gt = start_sec + s_start
            for g_txt, gw in zip(groups, g_weights):
                gdur = sdur * (gw / g_total)
                global_cues.append((gt, gt + gdur, g_txt))
                gt += gdur
            elapsed_in_speech += sdur

        slide_plans.append({
            "idx": i,
            "row": row,
            "start_frame": cursor_frames,
            "n_frames": n_frames,
            "rms": rms,
            "sent_spans": sent_spans,
        })
        cursor_frames += n_frames

    total_frames = cursor_frames
    total_sec = total_frames / FPS

    audio_wav = tmp / f"{role}-master.wav"
    with wave.open(str(audio_wav), "wb") as out_w:
        out_w.setparams((1, 2, HZ, 0, "NONE", "not compressed"))
        out_w.writeframes(bytes(all_pcm))

    srt_text = "\n\n".join(
        f"{idx}\n{stamp(a, ',')} --> {stamp(b, ',')}\n{txt}"
        for idx, (a, b, txt) in enumerate(global_cues, 1)
    ) + "\n"
    vtt_text = "WEBVTT\n\n" + "\n\n".join(
        f"{stamp(a)} --> {stamp(b)}\n{txt}" for a, b, txt in global_cues
    ) + "\n"
    srt_file = tmp / f"{role}.srt"
    srt_file.write_text(srt_text, encoding="utf-8")

    out_mp4 = tmp / f"{role}-complete.mp4"
    cmd = [
        FF, "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-i", str(audio_wav),
        "-i", str(srt_file),
        "-map", "0:v", "-map", "1:a", "-map", "2:0",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
        "-c:s", "mov_text",
        "-metadata:s:a:0", "language=eng",
        "-metadata:s:s:0", "language=eng",
        "-metadata:s:s:0", "title=English captions",
        "-metadata", f"comment={provider_label}",
        "-movflags", "+faststart",
        str(out_mp4),
    ]

    print(f"Encoding 1080p{FPS} motion-graphics '{stem}' ({stamp(total_sec)}, {total_frames} frames)...", flush=True)
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    # Map frame index -> active caption text for fast lookup
    cue_idx = 0
    n_cues = len(global_cues)
    stage_x, stage_y, stage_w, stage_h = 42, 84, 1312, 738
    bar_freqs = np.linspace(0.7, 2.3, 22)

    def render_scene_frame(plan: dict, local_f: int, active_caption: str) -> np.ndarray:
        idx = plan["idx"]
        row = plan["row"]
        nf = plan["n_frames"]
        t = local_f / FPS
        u = local_f / max(1, nf - 1)
        im = plan["base_plate"].copy()
        slide_src: Image.Image = plan["slide_img"]

        # Gentle 30fps Ken Burns cinematic camera push
        zoom = 1.0 + 0.028 * ease_in_out_cubic(u)
        regions = row.get("regions") or []
        if regions:
            r_pos = min(len(regions) - 1, int(u * len(regions)))
            rx, ry, rw, rh = regions[r_pos]["rect"]
            focus_cx = rx + rw / 2.0
            focus_cy = ry + rh / 2.0
        else:
            r_pos = -1
            focus_cx, focus_cy = 0.5, 0.5

        crop_w = W / zoom
        crop_h = H / zoom
        max_dx = (W - crop_w) / 2.0
        max_dy = (H - crop_h) / 2.0
        cx = W / 2.0 + (focus_cx - 0.5) * 2.0 * max_dx * 0.65
        cy = H / 2.0 + (focus_cy - 0.5) * 2.0 * max_dy * 0.65
        x0 = max(0.0, min(W - crop_w, cx - crop_w / 2.0))
        y0 = max(0.0, min(H - crop_h, cy - crop_h / 2.0))

        cropped = slide_src.crop((round(x0), round(y0), round(x0 + crop_w), round(y0 + crop_h)))
        stage_im = cropped.resize((stage_w, stage_h), Image.Resampling.BILINEAR)
        im.paste(stage_im, (stage_x, stage_y))

        d = ImageDraw.Draw(im, "RGBA")

        # Animated spotlight & viewfinder brackets around active region on the slide
        if r_pos >= 0:
            # Smoothly interpolate spotlight between previous region and current region
            seg_len = 1.0 / len(regions)
            local_seg_u = (u - r_pos * seg_len) / max(1e-6, seg_len)
            blend = ease_out_cubic(min(1.0, local_seg_u * 3.2))
            cur_r = regions[r_pos]["rect"]
            prev_r = regions[max(0, r_pos - 1)]["rect"]
            ir = [prev_r[k] + (cur_r[k] - prev_r[k]) * blend for k in range(4)]

            # Map normalized slide coords -> zoomed stage pixels
            sx0 = stage_x + ((ir[0] * W - x0) / crop_w) * stage_w
            sy0 = stage_y + ((ir[1] * H - y0) / crop_h) * stage_h
            sx1 = stage_x + (((ir[0] + ir[2]) * W - x0) / crop_w) * stage_w
            sy1 = stage_y + (((ir[1] + ir[3]) * H - y0) / crop_h) * stage_h
            sx0 = max(stage_x + 4, min(stage_x + stage_w - 20, sx0 - 6))
            sy0 = max(stage_y + 4, min(stage_y + stage_h - 20, sy0 - 6))
            sx1 = max(sx0 + 24, min(stage_x + stage_w - 4, sx1 + 6))
            sy1 = max(sy0 + 24, min(stage_y + stage_h - 4, sy1 + 6))

            acc_col = hex_rgb(regions[r_pos].get("accent", "5EEC83"))
            pulse_alpha = int(150 + 85 * math.sin(t * 5.2))
            d.rounded_rectangle((sx0, sy0, sx1, sy1), radius=10, outline=(*acc_col, pulse_alpha), width=3)

            # Corner viewfinder brackets
            blen = 18
            for bx, sgx in ((sx0 - 3, 1), (sx1 + 3, -1)):
                for by, sgy in ((sy0 - 3, 1), (sy1 + 3, -1)):
                    d.line([(bx, by), (bx + sgx * blen, by)], fill=(255, 255, 255, 230), width=3)
                    d.line([(bx, by), (bx, by + sgy * blen)], fill=(255, 255, 255, 230), width=3)

            # Animated comet packet arcing between regions during transitions
            if r_pos > 0 and blend < 0.98:
                px = stage_x + (((prev_r[0] + prev_r[2] / 2) * W - x0) / crop_w) * stage_w
                py = stage_y + (((prev_r[1] + prev_r[3] / 2) * H - y0) / crop_h) * stage_h
                tx = stage_x + (((cur_r[0] + cur_r[2] / 2) * W - x0) / crop_w) * stage_w
                ty = stage_y + (((cur_r[1] + cur_r[3] / 2) * H - y0) / crop_h) * stage_h
                dot_x = px + (tx - px) * blend
                dot_y = py + (ty - py) * blend - math.sin(blend * math.pi) * 28
                d.ellipse((dot_x - 11, dot_y - 11, dot_x + 11, dot_y + 11), fill=(*acc_col, 95))
                d.ellipse((dot_x - 5, dot_y - 5, dot_x + 5, dot_y + 5), fill=(255, 255, 255, 255))

            # Active focus badge inside right card
            r_label = f"FOCUS  ▸  {regions[r_pos]['label'][:34]}"
            d.rounded_rectangle((1402, 456, 1860, 488), radius=8, fill=(18, 42, 34, 235), outline=(*acc_col, 190), width=1)
            d.text((1414, 463), r_label, font=get_font(15, bold=True, mono=True), fill=acc_col)

        # Floating 3D Copilot mascot + real-time 22-bar audio spectrum in top-right pod
        mascot = mascots[idx % len(mascots)]
        bob_y = round(math.sin(t * 2.7) * 6)
        im.paste(mascot, (1396, 122 + bob_y), mascot)

        env_val = float(plan["rms"][min(local_f, len(plan["rms"]) - 1)])
        eq_base_y = 224 if role == "trainer" else 284
        eq_max_h = 84 if role == "trainer" else 130
        for b_i, freq in enumerate(bar_freqs):
            bx = 1542 + b_i * 14
            wave_mod = 0.55 + 0.45 * math.sin(t * 9.0 * freq + b_i * 0.55)
            bh = max(6, round(eq_max_h * env_val * wave_mod))
            b_col = primary if b_i % 2 == 0 else secondary
            d.rounded_rectangle((bx, eq_base_y - bh, bx + 9, eq_base_y), radius=4, fill=(*b_col, 235))

        # Kinetic progressive sentence list in right-bottom card
        card_slide_in = round((1.0 - ease_out_cubic(min(1.0, t / 0.42))) * 26)
        sy_cursor = 504 + card_slide_in
        sent_fnt = get_font(17, bold=False)
        sent_bold = get_font(17, bold=True)
        for s_start, s_end, s_txt in plan["sent_spans"]:
            is_cur = (s_start - 0.05) <= t <= (s_end + 0.12)
            is_done = t > (s_end + 0.12)
            fnt_use = sent_bold if is_cur else sent_fnt
            lines = wrap_lines(s_txt, fnt_use, 434)
            if sy_cursor + len(lines) * 22 > 814:
                break
            if is_cur:
                d.rectangle((1396, sy_cursor + 2, 1401, sy_cursor + len(lines) * 22 - 2), fill=primary)
                col_txt = (255, 255, 255, 255)
            elif is_done:
                col_txt = (182, 218, 202, 225)
            else:
                col_txt = (120, 142, 158, 155)
            for ln in lines:
                d.text((1412, sy_cursor), ln, font=fnt_use, fill=col_txt)
                sy_cursor += 22
            sy_cursor += 10

        # Lower-third glassmorphic burned-in caption bar
        if active_caption:
            cap_fnt = get_font(26, bold=True)
            cap_lines = active_caption.split("\n")
            max_lw = max(cap_fnt.getlength(cl) for cl in cap_lines)
            pill_w = max(560, min(1680, round(max_lw) + 76))
            pill_h = 26 + len(cap_lines) * 34
            px0 = (W - pill_w) // 2
            py0 = 918 - pill_h // 2
            d.rounded_rectangle((px0, py0, px0 + pill_w, py0 + pill_h), radius=18,
                                fill=(7, 13, 20, 228), outline=(*primary, 175), width=2)
            for li, cl in enumerate(cap_lines):
                lw = cap_fnt.getlength(cl)
                tx = (W - lw) / 2
                ty = py0 + 11 + li * 34
                d.text((tx + 2, ty + 2), cl, font=cap_fnt, fill=(0, 0, 0, 220))
                d.text((tx, ty), cl, font=cap_fnt, fill=(255, 255, 255, 255))

        # 32-slide segmented glowing progress bar at bottom (y=1024..1040)
        n_slides = len(rows)
        seg_gap = 4
        bar_total_w = W - 84
        seg_w = (bar_total_w - seg_gap * (n_slides - 1)) / n_slides
        for s_i in range(n_slides):
            bx0 = 42 + s_i * (seg_w + seg_gap)
            bx1 = bx0 + seg_w
            if s_i < idx:
                d.rounded_rectangle((bx0, 1028, bx1, 1038), radius=4, fill=(*primary, 215))
            elif s_i == idx:
                d.rounded_rectangle((bx0, 1028, bx1, 1038), radius=4, fill=(32, 48, 62, 210))
                fill_x = bx0 + max(4.0, seg_w * u)
                d.rounded_rectangle((bx0, 1026, fill_x, 1040), radius=5, fill=(*secondary, 255))
                d.ellipse((fill_x - 6, 1024, fill_x + 6, 1042), fill=(255, 255, 255, 255))
            else:
                d.rounded_rectangle((bx0, 1028, bx1, 1038), radius=4, fill=(26, 36, 48, 175))

        return np.asarray(im, dtype=np.uint8)

    # Preload current & next slide resources lazily so RAM stays low
    def prepare_plan(p: dict):
        if "slide_img" not in p:
            i = p["idx"]
            p["slide_img"] = Image.open(slides_dir / f"Slide{i + 1}.png").convert("RGB")
            p["base_plate"] = build_base_plate(backdrop, p["row"], i, len(rows), role)

    def release_plan(p: dict):
        p.pop("slide_img", None)
        p.pop("base_plate", None)

    try:
        for s_idx, plan in enumerate(slide_plans):
            prepare_plan(plan)
            next_plan = slide_plans[s_idx + 1] if s_idx + 1 < len(slide_plans) else None
            if next_plan is not None:
                prepare_plan(next_plan)

            nf = plan["n_frames"]
            for lf in range(nf):
                gf = plan["start_frame"] + lf
                g_sec = gf / FPS
                while cue_idx < n_cues and global_cues[cue_idx][1] < g_sec:
                    cue_idx += 1
                cap = ""
                if cue_idx < n_cues and global_cues[cue_idx][0] <= g_sec <= global_cues[cue_idx][1]:
                    cap = global_cues[cue_idx][2]

                # Smooth cross-dissolve + gentle push into next slide over final TRANS_FRAMES
                rem = nf - lf
                if next_plan is not None and rem <= TRANS_FRAMES:
                    alpha = ease_in_out_cubic(1.0 - (rem / (TRANS_FRAMES + 1)))
                    f_a = render_scene_frame(plan, lf, cap)
                    f_b = render_scene_frame(next_plan, 0, "")
                    shift = round((1.0 - alpha) * 48)
                    shifted_b = np.zeros_like(f_b)
                    if shift > 0:
                        shifted_b[:, shift:] = f_b[:, :W - shift]
                        shifted_b[:, :shift] = f_b[:, :1]
                    else:
                        shifted_b = f_b
                    blended = ((f_a.astype(np.uint16) * round((1.0 - alpha) * 256) +
                                shifted_b.astype(np.uint16) * round(alpha * 256)) >> 8).astype(np.uint8)
                    proc.stdin.write(blended.tobytes())
                else:
                    frame_arr = render_scene_frame(plan, lf, cap)
                    proc.stdin.write(frame_arr.tobytes())

            release_plan(plan)
            if (s_idx + 1) % 8 == 0 or s_idx + 1 == len(slide_plans):
                print(f"  Rendered {s_idx + 1}/{len(slide_plans)} slides of '{stem}'", flush=True)

        proc.stdin.close()
        rc = proc.wait()
        if rc != 0:
            raise RuntimeError(f"FFmpeg exited with status {rc}")
    finally:
        if proc.poll() is None:
            proc.kill()

    final_mp4 = ROOT / f"{stem}.mp4"
    out_mp4.replace(final_mp4)
    (ROOT / f"{stem}.srt").write_text(srt_text, encoding="utf-8")
    (ROOT / f"{stem}.vtt").write_text(vtt_text, encoding="utf-8")
    md_header = [
        f"# {stem}",
        "",
        f"- **Deck:** [Advanced Workshop Deck v1.pptx](../../Advanced%20Workshop%20Deck%20v1.pptx) (32 slides)",
        f"- **Video:** [{stem}.mp4](./{stem.replace(' ', '%20')}.mp4) · 1920×1080 @ {FPS} fps · Runtime `{stamp(total_sec)[:8]}`",
        f"- **Narration:** {provider_label}",
        "",
        *chapters,
    ]
    (ROOT / f"{stem}.md").write_text("\n\n".join(md_header) + "\n", encoding="utf-8")
    print(f"SUCCESS: {final_mp4.name} ({final_mp4.stat().st_size // (1024 * 1024)} MB, {stamp(total_sec)}, {len(global_cues)} caption cues)", flush=True)


if __name__ == "__main__":
    slides_dir = Path(sys.argv[1])
    mode = sys.argv[2]
    only_role = sys.argv[3] if len(sys.argv) > 3 else "both"
    assert mode in {"LocalPreview", "Foundry"}
    rows = json.loads((ROOT / "narration.json").read_text(encoding="utf-8-sig"))
    assert rows and len(list(slides_dir.glob("Slide*.png"))) == len(rows), "Slide PNG count does not match narration.json"
    CACHE.mkdir(parents=True, exist_ok=True)
    roles = ("child", "trainer") if only_role == "both" else (only_role,)
    for r in roles:
        render_role_video(rows, r, mode, slides_dir, slides_dir)

