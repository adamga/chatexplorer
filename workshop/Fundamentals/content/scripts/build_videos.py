"""
Motion-Graphics 1080p30 Video Compositor for Chronicle Fundamentals Explainer Videos:
  - Participant-Explainer.mp4 (with synced gpt-audio-1.5 'coral' voiceover + English subtitles)
  - Instructor-Explainer.mp4  (with synced gpt-audio-1.5 'alloy' voiceover + English subtitles)

Visual features:
  - Continuous 30fps animated aurora gradient + drifting bokeh/starlight particles
  - Spring-eased kinetic typography, staggered feature cards & live terminal code reveals
  - Embedded live Playwright screen-recording footage from http://127.0.0.1:3210/ + Ken Burns pan/zoom
  - Pulsing neon UI spotlight rings & celebratory finale confetti particles
  - Real-time 14-bar audio-reactive voiceover equalizer driven by gpt-audio-1.5 PCM envelope
  - Synced glass lower-third captions + muxed MP4 AAC audio + mov_text English subtitle stream
"""
from __future__ import annotations

from functools import lru_cache
import json
import math
import subprocess
import sys
import time
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from storyboards import ALL_STORYBOARDS

SCRIPT_DIR = Path(__file__).resolve().parent
CONTENT_DIR = SCRIPT_DIR.parent
SHOTS_DIR = CONTENT_DIR / "assets" / "screenshots"
CLIPS_DIR = CONTENT_DIR / "assets" / "clips"
CACHE_DIR = CONTENT_DIR / ".cache"

W, H = 1920, 1080
FPS = 30

ACCENTS = {
    "cyan": (56, 189, 248),
    "purple": (168, 85, 247),
    "green": (52, 211, 153),
    "amber": (251, 191, 36),
    "coral": (251, 113, 133),
    "blue": (96, 165, 250),
}


def load_font(names: list[str], size: int) -> ImageFont.FreeTypeFont:
    win_fonts = Path(r"C:\Windows\Fonts")
    for name in names:
        cand = win_fonts / name
        if cand.exists():
            return ImageFont.truetype(str(cand), size=size)
    return ImageFont.load_default()


FONT_BADGE = load_font(["seguisb.ttf", "segoeuib.ttf", "arialbd.ttf"], 20)
FONT_H1 = load_font(["segoeuib.ttf", "seguisb.ttf", "arialbd.ttf"], 46)
FONT_SUB = load_font(["segoeui.ttf", "arial.ttf"], 25)
FONT_CARD_T = load_font(["seguisb.ttf", "segoeuib.ttf", "arialbd.ttf"], 25)
FONT_CARD_B = load_font(["segoeui.ttf", "arial.ttf"], 20)
FONT_MONO = load_font(["consolab.ttf", "consola.ttf", "courbd.ttf"], 21)
FONT_MONO_SM = load_font(["consola.ttf", "cour.ttf"], 17)
FONT_HUD = load_font(["seguisb.ttf", "segoeui.ttf", "arial.ttf"], 18)
FONT_CAP = load_font(["seguisb.ttf", "segoeui.ttf", "arial.ttf"], 26)


def ease_out_cubic(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return 1.0 - (1.0 - x) ** 3


def ease_out_back(x: float) -> float:
    x = max(0.0, min(1.0, x))
    c1 = 1.70158
    c3 = c1 + 1.0
    return 1.0 + c3 * ((x - 1.0) ** 3) + c1 * ((x - 1.0) ** 2)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    words = text.split()
    if not words:
        return []
    lines = [words[0]]
    for w in words[1:]:
        cand = f"{lines[-1]} {w}"
        bbox = draw.textbbox((0, 0), cand, font=font)
        if (bbox[2] - bbox[0]) <= max_w:
            lines[-1] = cand
        else:
            lines.append(w)
    return lines


def build_base_backdrops() -> tuple[np.ndarray, np.ndarray]:
    """Precomputes two rich 1920x1080 cosmic aurora gradient fields for fast per-frame blending."""
    yy = np.linspace(0.0, 1.0, H, dtype=np.float32)[:, None]
    xx = np.linspace(0.0, 1.0, W, dtype=np.float32)[None, :]

    # Backdrop A: Deep navy + cyan top-right glow + indigo bottom-left glow
    d1 = (xx - 0.82) ** 2 + (yy - 0.18) ** 2
    d2 = (xx - 0.14) ** 2 + (yy - 0.85) ** 2
    g1 = np.exp(-d1 / 0.14)
    g2 = np.exp(-d2 / 0.18)

    bg_a = np.zeros((H, W, 3), dtype=np.float32)
    bg_a[..., 0] = 12 + 24 * g1 + 48 * g2
    bg_a[..., 1] = 17 + 72 * g1 + 26 * g2
    bg_a[..., 2] = 31 + 110 * g1 + 88 * g2

    # Backdrop B: Shifted aurora (purple top-left + emerald-cyan right-bottom)
    d3 = (xx - 0.22) ** 2 + (yy - 0.20) ** 2
    d4 = (xx - 0.80) ** 2 + (yy - 0.78) ** 2
    g3 = np.exp(-d3 / 0.16)
    g4 = np.exp(-d4 / 0.15)

    bg_b = np.zeros((H, W, 3), dtype=np.float32)
    bg_b[..., 0] = 14 + 58 * g3 + 18 * g4
    bg_b[..., 1] = 18 + 25 * g3 + 78 * g4
    bg_b[..., 2] = 34 + 98 * g3 + 92 * g4

    return np.clip(bg_a, 0, 255).astype(np.uint8), np.clip(bg_b, 0, 255).astype(np.uint8)


PARTICLES = [
    (
        (i * 173 + 91) % W,
        (i * 293 + 47) % H,
        3 + (i % 5) * 2,
        18.0 + (i % 7) * 6.0,
        i * 0.7,
        list(ACCENTS.values())[i % len(ACCENTS)],
    )
    for i in range(38)
]

CONFETTI = [
    (
        (i * 137 + 50) % W,
        (i * 89) % H,
        6 + (i % 4) * 3,
        75.0 + (i % 6) * 22.0,
        i * 0.45,
        list(ACCENTS.values())[i % len(ACCENTS)],
    )
    for i in range(55)
]


def load_live_tour_frames(ffmpeg_exe: str, clip_path: Path, target_w: int = 1040, target_h: int = 585) -> list[Image.Image]:
    """Decodes the Playwright-recorded live-app-tour.webm once into scaled PIL RGB frames at 15fps (doubled smoothly at 30fps)."""
    if not clip_path.exists():
        return []
    cmd = [
        ffmpeg_exe,
        "-v", "error",
        "-i", str(clip_path),
        "-vf", f"fps=15,scale={target_w}:{target_h}:flags=lanczos",
        "-f", "rawvideo",
        "-pix_fmt", "rgb24",
        "-",
    ]
    proc = subprocess.run(cmd, capture_output=True, check=True)
    raw = proc.stdout
    frame_bytes = target_w * target_h * 3
    n_frames = len(raw) // frame_bytes
    frames = []
    for idx in range(n_frames):
        chunk = raw[idx * frame_bytes : (idx + 1) * frame_bytes]
        frames.append(Image.frombytes("RGB", (target_w, target_h), chunk))
    return frames


def concat_scene_audio_wav(manifest: dict, out_wav: Path):
    """Concatenates all scene WAV segments with exact lead_pad and tail_pad silence into one master WAV track."""
    first_wav = CONTENT_DIR / manifest["scenes"][0]["wav_file"]
    with wave.open(str(first_wav), "rb") as wf0:
        n_channels = wf0.getnchannels()
        sampwidth = wf0.getsampwidth()
        framerate = wf0.getframerate()

    silence_unit = b"\x00" * (n_channels * sampwidth)
    out_wav.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out_wav), "wb") as out_wf:
        out_wf.setnchannels(n_channels)
        out_wf.setsampwidth(sampwidth)
        out_wf.setframerate(framerate)

        for sc in manifest["scenes"]:
            lead_frames = int(round(sc["lead_pad"] * framerate))
            tail_frames = int(round(sc["tail_pad"] * framerate))
            out_wf.writeframes(silence_unit * lead_frames)
            with wave.open(str(CONTENT_DIR / sc["wav_file"]), "rb") as swf:
                out_wf.writeframes(swf.readframes(swf.getnframes()))
            out_wf.writeframes(silence_unit * tail_frames)


@lru_cache(maxsize=32)
def get_cached_browser_chrome(cw: int, ch: int, url_label: str, accent: tuple[int, int, int]) -> Image.Image:
    """Pre-renders and caches the Gaussian-blurred drop-shadow + glass browser frame once per layout."""
    bar_h = 40
    pad = 8
    win_w = cw + pad * 2
    win_h = ch + bar_h + pad * 2

    canvas = Image.new("RGBA", (win_w + 28, win_h + 28), (0, 0, 0, 0))
    sh_draw = ImageDraw.Draw(canvas)
    sh_draw.rounded_rectangle((16, 18, 16 + win_w, 18 + win_h), radius=20, fill=(0, 0, 0, 145))
    canvas = canvas.filter(ImageFilter.GaussianBlur(8))

    draw = ImageDraw.Draw(canvas)
    ox, oy = 10, 8
    draw.rounded_rectangle(
        (ox, oy, ox + win_w, oy + win_h),
        radius=18,
        fill=(19, 26, 44, 248),
        outline=(*accent, 225),
        width=2,
    )
    for idx, col in enumerate([(251, 113, 133), (251, 191, 36), (52, 211, 153)]):
        cx = ox + 22 + idx * 22
        cy = oy + 22
        draw.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), fill=(*col, 255))

    draw.rounded_rectangle((ox + 96, oy + 9, ox + win_w - 18, oy + 35), radius=10, fill=(11, 16, 28, 230))
    draw.text((ox + 112, oy + 12), url_label, font=FONT_MONO_SM, fill=(182, 198, 232, 255))
    return canvas


def paste_browser_window(
    frame: Image.Image,
    draw: ImageDraw.ImageDraw,
    dest_x: int,
    dest_y: int,
    content_img: Image.Image,
    url_label: str,
    accent: tuple[int, int, int],
    spotlight: tuple[float, float] | None = None,
    local_t: float = 0.0,
):
    """Composites cached glass browser chrome + RGB content + animated neon spotlight directly onto frame."""
    cw, ch = content_img.size
    chrome = get_cached_browser_chrome(cw, ch, url_label, accent)
    frame.paste(chrome, (dest_x, dest_y), chrome)
    ox, oy, pad, bar_h = 10, 8, 8, 40
    img_x = dest_x + ox + pad
    img_y = dest_y + oy + bar_h
    frame.paste(content_img, (img_x, img_y))

    if spotlight is not None:
        sx = img_x + int(cw * spotlight[0])
        sy = img_y + int(ch * spotlight[1])
        pulse = 0.5 + 0.5 * math.sin(local_t * 5.2)
        r1 = int(34 + 14 * pulse)
        r2 = int(56 + 22 * pulse)
        a1 = int(215 - 60 * pulse)
        a2 = int(120 - 70 * pulse)
        draw.ellipse((sx - r2, sy - r2, sx + r2, sy + r2), outline=(*accent, max(20, a2)), width=3)
        draw.ellipse((sx - r1, sy - r1, sx + r1, sy + r1), outline=(255, 255, 255, max(50, a1)), width=3)


def crop_ken_burns(img: Image.Image, target_w: int, target_h: int, progress: float, focus: tuple[float, float] = (0.5, 0.5)) -> Image.Image:
    """Applies smooth subtle zoom & pan across a 1920x1080 screenshot."""
    iw, ih = img.size
    zoom = 1.0 + 0.10 * math.sin(progress * math.pi * 0.85)
    crop_w = iw / zoom
    crop_h = ih / zoom
    cx = iw * (0.5 + (focus[0] - 0.5) * min(1.0, progress * 1.4) * 0.55)
    cy = ih * (0.5 + (focus[1] - 0.5) * min(1.0, progress * 1.4) * 0.55)
    x0 = max(0.0, min(iw - crop_w, cx - crop_w / 2.0))
    y0 = max(0.0, min(ih - crop_h, cy - crop_h / 2.0))
    cropped = img.crop((int(x0), int(y0), int(x0 + crop_w), int(y0 + crop_h)))
    return cropped.resize((target_w, target_h), Image.Resampling.BILINEAR)


def render_scene_layer(
    board: dict,
    scene: dict,
    sm: dict,
    local_t: float,
    global_t: float,
    amp: float,
    bg_a: np.ndarray,
    bg_b: np.ndarray,
    shot_cache: dict[str, Image.Image],
    tour_frames: list[Image.Image],
    total_scenes: int,
    total_duration: float,
) -> Image.Image:
    blend = 0.5 + 0.5 * math.sin(global_t * 0.55)
    w_b = int(round(blend * 256))
    bg_arr = ((bg_a.astype(np.uint16) * (256 - w_b) + bg_b.astype(np.uint16) * w_b) >> 8).astype(np.uint8)
    frame = Image.fromarray(bg_arr)
    draw = ImageDraw.Draw(frame, "RGBA")

    accent = ACCENTS.get(scene.get("accent", "cyan"), ACCENTS["cyan"])
    progress = max(0.0, min(1.0, local_t / max(0.1, sm["scene_duration"])))

    # 1. Floating ambient bokeh / starlight particles
    for px, py, rad, speed, phase, pcol in PARTICLES:
        yy = (py - global_t * speed) % H
        xx = (px + math.sin(global_t * 0.9 + phase) * 24.0) % W
        twinkle = int(42 + 48 * (0.5 + 0.5 * math.sin(global_t * 2.3 + phase)))
        draw.ellipse((xx - rad, yy - rad, xx + rad, yy + rad), fill=(*pcol, twinkle))

    # Finale celebratory confetti!
    if scene["layout"] == "finale":
        for cx, cy, sz, cspeed, cphase, ccol in CONFETTI:
            yy = (cy + local_t * cspeed) % (H - 120)
            xx = (cx + math.sin(local_t * 2.8 + cphase) * 36.0) % W
            draw.rounded_rectangle((xx, yy, xx + sz * 1.5, yy + sz), radius=2, fill=(*ccol, 165))

    # Top sleek accent bar
    draw.rectangle((0, 0, W, 6), fill=(*accent, 255))

    # 2. Top-right Live Voice Equalizer HUD + Brand Pill
    hud_x, hud_y, hud_w, hud_h = W - 410, 34, 346, 52
    draw.rounded_rectangle((hud_x, hud_y, hud_x + hud_w, hud_y + hud_h), radius=26, fill=(18, 25, 44, 220), outline=(64, 82, 124, 190), width=2)
    voice_lbl = "LIVE GUIDE" if board["id"] == "participant" else "COACH BRIEF"
    draw.text((hud_x + 20, hud_y + 14), voice_lbl, font=FONT_HUD, fill=(216, 228, 250, 255))
    # 12 animated equalizer bars
    eq_base_x = hud_x + 208
    for bi in range(12):
        wave_mod = 0.45 + 0.55 * abs(math.sin(global_t * 9.5 + bi * 0.65))
        bh = int(6 + 28 * max(0.08, amp) * wave_mod)
        bx = eq_base_x + bi * 10
        by0 = hud_y + 26 - bh // 2
        by1 = hud_y + 26 + bh // 2
        bcol = accent if bi % 2 == 0 else (56, 189, 248)
        draw.rounded_rectangle((bx, by0, bx + 6, by1), radius=3, fill=(*bcol, 245))

    # 3. Spring-eased Badge, Headline & Subhead
    badge_in = ease_out_back(local_t / 0.48)
    head_in = ease_out_cubic((local_t - 0.10) / 0.55)
    sub_in = ease_out_cubic((local_t - 0.22) / 0.55)

    badge_txt = scene["badge"]
    bb = draw.textbbox((0, 0), badge_txt, font=FONT_BADGE)
    bw = (bb[2] - bb[0]) + 40
    by = int(38 + (1.0 - badge_in) * -24)
    draw.rounded_rectangle((68, by, 68 + bw, by + 42), radius=21, fill=(*accent, int(255 * min(1.0, local_t / 0.25))))
    draw.text((88, by + 9), badge_txt, font=FONT_BADGE, fill=(14, 20, 34, 255))

    hy = int(96 + (1.0 - head_in) * 22)
    h_alpha = int(255 * head_in)
    draw.text((68, hy), scene["headline"], font=FONT_H1, fill=(248, 250, 255, h_alpha))

    sy = int(158 + (1.0 - sub_in) * 18)
    s_alpha = int(235 * sub_in)
    draw.text((68, sy), scene["subhead"], font=FONT_SUB, fill=(176, 198, 238, s_alpha))

    # 4. Left Column: Staggered Kinetic Cards / Code Terminal / Timeline
    layout = scene["layout"]
    cards = scene.get("cards", [])

    if layout == "code_and_shot":
        # Animated terminal code box + 2 summary cards below
        c_in = ease_out_cubic((local_t - 0.30) / 0.60)
        cx0 = int(68 - (1.0 - c_in) * 38)
        cy0 = 216
        cw_box, ch_box = 690, 355
        draw.rounded_rectangle(
            (cx0, cy0, cx0 + cw_box, cy0 + ch_box),
            radius=18,
            fill=(10, 15, 27, int(245 * c_in)),
            outline=(*accent, int(220 * c_in)),
            width=2,
        )
        draw.rounded_rectangle((cx0 + 20, cy0 + 16, cx0 + 360, cy0 + 50), radius=12, fill=(*accent, int(245 * c_in)))
        draw.text((cx0 + 34, cy0 + 21), scene.get("code_title", "CODE"), font=FONT_HUD, fill=(14, 20, 34, int(255 * c_in)))

        code_lines = scene.get("code_lines", [])
        for li, ln in enumerate(code_lines):
            l_in = ease_out_cubic((local_t - (0.50 + li * 0.22)) / 0.45)
            if l_in <= 0:
                continue
            ly = cy0 + 68 + li * 44
            col = (134, 239, 172) if li == 0 else (226, 236, 255)
            draw.text((cx0 + 28, ly), ln, font=FONT_MONO, fill=(*col, int(255 * l_in)))

        for ci, (ct, cb) in enumerate(cards[:2]):
            card_in = ease_out_cubic((local_t - (1.1 + ci * 0.25)) / 0.55)
            if card_in <= 0:
                continue
            ky = 590 + ci * 130
            kx = int(68 - (1.0 - card_in) * 32)
            draw.rounded_rectangle((kx, ky, kx + 690, ky + 114), radius=16, fill=(26, 35, 58, int(235 * card_in)), outline=(64, 84, 128, int(200 * card_in)), width=2)
            draw.rounded_rectangle((kx + 16, ky + 18, kx + 24, ky + 96), radius=4, fill=(*accent, int(255 * card_in)))
            draw.text((kx + 38, ky + 18), ct, font=FONT_CARD_T, fill=(248, 250, 255, int(255 * card_in)))
            draw.text((kx + 38, ky + 58), cb, font=FONT_CARD_B, fill=(196, 212, 242, int(245 * card_in)))
    else:
        # Staggered vertical cards with active glowing indicator synchronized to narration progress!
        active_idx = min(max(0, len(cards) - 1), int(progress * len(cards)))
        card_w = 690 if layout != "dual_shots" else 860
        for ci, (ct, cb) in enumerate(cards):
            card_in = ease_out_cubic((local_t - (0.32 + ci * 0.24)) / 0.55)
            if card_in <= 0:
                continue
            is_active = ci == active_idx
            if layout == "dual_shots":
                kx = 68 + ci * 900
                ky = int(218 + (1.0 - card_in) * 24)
                cw_cur = 870
                ch_cur = 118
            else:
                kx = int(68 - (1.0 - card_in) * 36)
                ky = 224 + ci * 192
                cw_cur = card_w
                ch_cur = 168

            fill_c = (34, 46, 76, int(245 * card_in)) if is_active else (24, 33, 55, int(228 * card_in))
            out_c = (*accent, int(250 * card_in)) if is_active else (60, 78, 118, int(190 * card_in))
            draw.rounded_rectangle((kx, ky, kx + cw_cur, ky + ch_cur), radius=18, fill=fill_c, outline=out_c, width=3 if is_active else 2)
            draw.rounded_rectangle((kx + 18, ky + 20, kx + 28, ky + ch_cur - 20), radius=5, fill=(*accent, int(255 * card_in)))
            draw.text((kx + 46, ky + 22), ct, font=FONT_CARD_T, fill=(250, 252, 255, int(255 * card_in)))
            wrapped = wrap_text(draw, cb, FONT_CARD_B, cw_cur - 68)
            for wi, wln in enumerate(wrapped[:3]):
                draw.text((kx + 46, ky + 64 + wi * 28), wln, font=FONT_CARD_B, fill=(204, 218, 246, int(245 * card_in)))

    # Optional animated 60-minute timeline bar on timeline_map layout
    if layout == "timeline_map":
        tx0, ty0, tw = 805, 760, 1020
        draw.rounded_rectangle((tx0, ty0, tx0 + tw, ty0 + 54), radius=14, fill=(18, 25, 44, 235), outline=(64, 84, 128, 200), width=2)
        fill_w = int((tw - 12) * min(1.0, progress * 1.15))
        if fill_w > 16:
            draw.rounded_rectangle((tx0 + 6, ty0 + 6, tx0 + 6 + fill_w, ty0 + 48), radius=10, fill=(*accent, 95))
        milestones = [("00m Setup", 0.03), ("07m Rulebook", 0.21), ("15m Brain", 0.41), ("30m Server", 0.63), ("40–60m Live UI!", 0.83)]
        for mlbl, mpos in milestones:
            mx = tx0 + int(tw * mpos)
            draw.text((mx, ty0 + 15), mlbl, font=FONT_HUD, fill=(244, 248, 255, 250))

    # 5. Right Column (or Dual Row): Live Browser Video Tour OR Ken Burns Pan/Zoom Screenshot(s)!
    win_in = ease_out_cubic((local_t - 0.18) / 0.65)
    if layout == "dual_shots":
        s_left = shot_cache[scene["screenshot"]]
        s_right = shot_cache[scene["screenshot_alt"]]
        img_l = crop_ken_burns(s_left, 850, 478, progress, (0.5, 0.48))
        img_r = crop_ken_burns(s_right, 850, 478, progress, (0.5, 0.48))
        wy = int(352 + (1.0 - win_in) * 32)
        paste_browser_window(frame, draw, 58, wy, img_l, "http://127.0.0.1:3210  ·  VS Code workspaceStorage", ACCENTS["cyan"], (0.5, 0.50), local_t)
        paste_browser_window(frame, draw, 960, wy, img_r, "http://127.0.0.1:3210  ·  .copilot\\session-state", ACCENTS["purple"], (0.5, 0.50), local_t + 1.0)
    else:
        target_w, target_h = 1040, 585
        use_video = ("clip_range" in scene) and len(tour_frames) > 0
        if use_video:
            c0, c1 = scene["clip_range"]
            span_frames = max(1, int((c1 - c0) * 15))
            start_f = int(c0 * 15)
            cur_f = (start_f + int(local_t * 15) % span_frames) % len(tour_frames)
            if layout == "video_and_light" and progress > 0.56:
                shot_img = crop_ken_burns(shot_cache[scene["screenshot"]], target_w, target_h, (progress - 0.56) / 0.44, scene.get("spotlight", (0.5, 0.5)))
                spot = scene.get("spotlight")
                url_lbl = "http://127.0.0.1:3210  ·  Bright White Mode + Sorting"
            else:
                shot_img = tour_frames[cur_f]
                spot = None
                url_lbl = "http://127.0.0.1:3210  ·  Live Running Lab App"
        else:
            base_shot = shot_cache[scene["screenshot"]]
            shot_img = crop_ken_burns(base_shot, target_w, target_h, progress, scene.get("spotlight", (0.5, 0.5)))
            spot = scene.get("spotlight")
            url_lbl = "http://127.0.0.1:3210  ·  Chronicle / Chat Explorer"

        wx = int(795 + (1.0 - win_in) * 44)
        wy = 212 if layout != "timeline_map" else 198
        paste_browser_window(frame, draw, wx, wy, shot_img, url_lbl, accent, spot, local_t)

    # 6. Lower-Third Synced Glass Caption Pill
    active_cap = None
    for cue in sm["captions"]:
        if cue["start"] <= global_t <= cue["end"]:
            active_cap = cue["text"]
            break

    if active_cap:
        cap_lines = wrap_text(draw, active_cap, FONT_CAP, 1480)[:2]
        line_h = 36
        box_h = 26 + len(cap_lines) * line_h
        box_w = min(1580, max(540, max((draw.textbbox((0, 0), ln, font=FONT_CAP)[2] for ln in cap_lines)) + 76))
        bx0 = (W - box_w) // 2
        by0 = H - 72 - box_h
        draw.rounded_rectangle(
            (bx0, by0, bx0 + box_w, by0 + box_h),
            radius=18,
            fill=(10, 14, 26, 224),
            outline=(*accent, 185),
            width=2,
        )
        for idx, cln in enumerate(cap_lines):
            tbx = draw.textbbox((0, 0), cln, font=FONT_CAP)
            tw = tbx[2] - tbx[0]
            draw.text(((W - tw) // 2, by0 + 11 + idx * line_h), cln, font=FONT_CAP, fill=(248, 250, 255, 255))

    # 7. Sleek Bottom Chapter Progress Bar
    bar_y = H - 46
    draw.rectangle((0, bar_y, W, H), fill=(10, 14, 24, 238))
    prog_w = int(W * min(1.0, global_t / max(0.1, total_duration)))
    draw.rectangle((0, bar_y, prog_w, bar_y + 4), fill=(*accent, 255))

    chap_txt = f"Scene {sm['index']} / {total_scenes}  ·  {board['title']}"
    draw.text((68, bar_y + 11), chap_txt, font=FONT_HUD, fill=(172, 190, 226, 255))
    rem_sec = max(0, int(round(total_duration - global_t)))
    time_txt = f"{int(global_t)//60:02d}:{int(global_t)%60:02d} / {int(total_duration)//60:02d}:{int(total_duration)%60:02d}  (-{rem_sec//60}:{rem_sec%60:02d})"
    draw.text((W - 285, bar_y + 11), time_txt, font=FONT_MONO_SM, fill=(156, 178, 218, 255))

    return frame


def render_variant_video(variant: str):
    board = ALL_STORYBOARDS[variant]
    manifest_path = CACHE_DIR / f"manifest-{variant}.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"Missing {manifest_path} — run generate_tts.py first!")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    print(f"\n=== Rendering 1080p30 Motion-Graphics Video: {board['output_mp4']} ({manifest['total_duration']:.2f}s) ===")
    t_start = time.time()

    master_wav = CACHE_DIR / f"master-{variant}.wav"
    concat_scene_audio_wav(manifest, master_wav)

    bg_a, bg_b = build_base_backdrops()
    shot_cache = {p.name: Image.open(p).convert("RGB") for p in SHOTS_DIR.glob("*.png")}
    tour_frames = load_live_tour_frames(ffmpeg_exe, CLIPS_DIR / "live-app-tour.webm", 1040, 585)
    print(f"  Loaded {len(shot_cache)} high-DPI screenshots and {len(tour_frames)} live browser frames.")

    srt_path = CONTENT_DIR / board["output_srt"]
    out_mp4 = CONTENT_DIR / board["output_mp4"]
    tmp_mp4 = CACHE_DIR / f"render-{variant}.tmp.mp4"

    cmd = [
        ffmpeg_exe,
        "-y",
        "-v", "error",
        "-f", "rawvideo",
        "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}",
        "-r", str(FPS),
        "-i", "-",
        "-i", str(master_wav),
        "-i", str(srt_path),
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-map", "2:s:0",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "48000",
        "-ac", "2",
        "-c:s", "mov_text",
        "-metadata:s:a:0", "language=eng",
        "-metadata:s:s:0", "language=eng",
        "-metadata:s:s:0", "title=English",
        "-movflags", "+faststart",
        "-shortest",
        str(tmp_mp4),
    ]

    scenes = board["scenes"]
    s_manifests = manifest["scenes"]
    total_scenes = len(scenes)
    total_duration = manifest["total_duration"]
    fade_dur = 0.40

    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    assert proc.stdin is not None

    prev_tail_img: Image.Image | None = None
    global_frame = 0

    try:
        for s_idx, (scene, sm) in enumerate(zip(scenes, s_manifests)):
            n_frames = max(1, int(round(sm["scene_duration"] * FPS)))
            env = sm["envelope_30fps"]
            fade_frames = int(round(fade_dur * FPS))

            for f in range(n_frames):
                local_t = f / float(FPS)
                global_t = sm["start_sec"] + local_t
                amp = env[min(len(env) - 1, f)] if env else 0.0

                img = render_scene_layer(
                    board=board,
                    scene=scene,
                    sm=sm,
                    local_t=local_t,
                    global_t=global_t,
                    amp=amp,
                    bg_a=bg_a,
                    bg_b=bg_b,
                    shot_cache=shot_cache,
                    tour_frames=tour_frames,
                    total_scenes=total_scenes,
                    total_duration=total_duration,
                )

                # Smooth cross-dissolve from previous scene's final frame
                if s_idx > 0 and prev_tail_img is not None and f < fade_frames:
                    alpha = ease_out_cubic((f + 1) / float(fade_frames))
                    img = Image.blend(prev_tail_img, img, alpha)

                # Smooth fade-in on very first scene & gentle fade-out on final half-second
                if s_idx == 0 and f < 12:
                    img = Image.blend(Image.new("RGB", (W, H), (10, 14, 24)), img, (f + 1) / 12.0)
                elif s_idx == total_scenes - 1 and f >= n_frames - 14:
                    rem = max(0.0, (n_frames - 1 - f) / 14.0)
                    img = Image.blend(Image.new("RGB", (W, H), (10, 14, 24)), img, rem)

                if f == n_frames - 1:
                    prev_tail_img = img

                proc.stdin.write(img.tobytes())
                global_frame += 1

            print(f"  Rendered scene {s_idx + 1}/{total_scenes} ({scene['id']}, {n_frames} frames)")
    finally:
        proc.stdin.close()

    rc = proc.wait()
    if rc != 0:
        raise RuntimeError(f"FFmpeg exited with code {rc} for {variant}")

    if out_mp4.exists():
        out_mp4.unlink()
    tmp_mp4.replace(out_mp4)
    elapsed = time.time() - t_start
    size_mb = out_mp4.stat().st_size / (1024 * 1024)
    print(f"Completed {out_mp4.name} ({global_frame} frames, {size_mb:.2f} MB) in {elapsed:.1f}s!")


def main():
    targets = sys.argv[1:] or ["participant", "instructor"]
    for variant in targets:
        render_variant_video(variant)


if __name__ == "__main__":
    main()
