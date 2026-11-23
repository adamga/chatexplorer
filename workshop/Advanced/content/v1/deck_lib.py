"""Visual slide builder combining workshop boc.pptx assets with v2 layout geometry."""
from __future__ import annotations

import io
import zipfile
from functools import lru_cache
from pathlib import Path
from typing import Iterable

from PIL import ImageFont
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.xmlchemy import OxmlElement
from pptx.util import Inches, Pt

HERE = Path(__file__).resolve().parent
ADV_DIR = HERE.parents[1]
BOC_PPTX = ADV_DIR / "workshop boc.pptx"
SCREENSHOTS_DIR = ADV_DIR / "content" / "assets" / "screenshots"

# 16:9 widescreen coordinate space in points (960 x 540 pt == 10.0 x 5.625 in)
SLIDE_W_PT = 960.0
SLIDE_H_PT = 540.0

# Combined palette from Advanced-Copilot-Workshop-v2.pptx + workshop boc.pptx
C_BG = "0B0F14"
C_CARD = "09241A"       # v2 signature deep emerald card
C_CARD_ALT = "111923"   # slate card variant
C_CODE_BG = "08110D"    # code panel fill
C_CODE_EDGE = "1F3A2C"  # subtle emerald code border
C_BORDER = "1E352D"
C_BORDER_SLATE = "263343"
C_WHITE = "FFFFFF"
C_TEXT = "E6EDF3"
C_MUTED = "9FB0C0"
C_GREEN = "5EEC83"      # v2 primary neon green
C_MINT = "BEFFD0"
C_FOREST = "0D6836"
C_GREEN_LINE = "0EBE3D"
C_BLUE = "2F94FF"
C_DEEP_BLUE = "0B4F8A"
C_PURPLE = "A371F7"     # v2 & BOC purple
C_DEEP_PURPLE = "5B21B6"
C_AMBER = "F59E0B"
C_DEEP_AMBER = "9A4A06"
C_RED = "EF4444"
C_DEEP_RED = "7F1D1D"
C_CYAN = "38BDF8"
C_PINK = "EC4899"

FONT_SANS = "Segoe UI"
FONT_MONO = "Cascadia Mono"


def rgb(hex_str: str) -> RGBColor:
    h = hex_str.lstrip("#")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def pt(val: float) -> Pt:
    return Pt(float(val))


@lru_cache(maxsize=64)
def _pil_font(size_pt: int, bold: bool = False, mono: bool = False):
    fonts_dir = Path(r"C:\Windows\Fonts")
    if mono:
        candidates = ["CascadiaMono.ttf", "consolab.ttf" if bold else "consola.ttf"]
    else:
        candidates = ["segoeuib.ttf" if bold else "segoeui.ttf", "arialbd.ttf" if bold else "arial.ttf"]
    for name in candidates:
        p = fonts_dir / name
        if p.exists():
            # Convert PowerPoint points to 96-DPI pixels for measurement
            return ImageFont.truetype(str(p), max(8, round(size_pt * 96 / 72)))
    return ImageFont.load_default()


def estimate_lines(text: str, width_pt: float, size_pt: float, bold: bool = False, mono: bool = False) -> int:
    fnt = _pil_font(round(size_pt), bold=bold, mono=mono)
    max_px = max(24.0, (width_pt - 8.0) * 96.0 / 72.0)
    total = 0
    for raw_line in text.split("\n"):
        if not raw_line.strip():
            total += 1
            continue
        words = raw_line.split(" ")
        cur = ""
        lines = 1
        for w in words:
            cand = f"{cur} {w}".strip() if cur else w
            if cur and fnt.getlength(cand) > max_px:
                lines += 1
                cur = w
            else:
                cur = cand
        total += lines
    return max(1, total)


def fit_font_size(text: str, w_pt: float, h_pt: float, preferred: float, minimum: float = 8.5,
                  bold: bool = False, mono: bool = False, line_mult: float = 1.28) -> float:
    size = float(preferred)
    while size > minimum:
        lines = estimate_lines(text, w_pt, size, bold=bold, mono=mono)
        if lines * size * line_mult <= h_pt - 2.0:
            return size
        size -= 0.5
    return minimum


class BocAssets:
    """Extracts approved artwork directly from workshop boc.pptx in memory."""

    def __init__(self, boc_path: Path = BOC_PPTX):
        self._cache: dict[str, bytes] = {}
        self.boc_path = boc_path

    def bytes_of(self, media_name: str) -> io.BytesIO:
        if media_name not in self._cache:
            with zipfile.ZipFile(self.boc_path, "r") as zf:
                self._cache[media_name] = zf.read(f"ppt/media/{media_name}")
        return io.BytesIO(self._cache[media_name])


def _set_line_spacing(paragraph, pct: float = 1.18):
    paragraph.line_spacing = pct


def parse_rich_runs(paragraph, text: str, size: float, default_color: str = C_TEXT,
                    default_bold: bool = False, font_name: str = FONT_SANS):
    """Supports inline **bold** and `code` tokens inside native editable PowerPoint runs."""
    tokens: list[tuple[str, str]] = []
    i = 0
    n = len(text)
    while i < n:
        if text.startswith("**", i):
            end = text.find("**", i + 2)
            if end != -1:
                tokens.append(("bold", text[i + 2:end]))
                i = end + 2
                continue
        if text[i] == "*" and not text.startswith("**", i):
            end = text.find("*", i + 1)
            if end != -1 and "\n" not in text[i + 1:end]:
                tokens.append(("italic", text[i + 1:end]))
                i = end + 1
                continue
        if text[i] == "`":
            end = text.find("`", i + 1)
            if end != -1:
                tokens.append(("code", text[i + 1:end]))
                i = end + 1
                continue
        stops = [p for p in (text.find("**", i), text.find("*", i), text.find("`", i)) if p != -1]
        if i in stops:
            tokens.append(("plain", text[i]))
            i += 1
            continue
        stop = min(stops) if stops else n
        tokens.append(("plain", text[i:stop]))
        i = stop

    for kind, chunk in tokens:
        if not chunk:
            continue
        if kind in ("bold", "italic"):
            if kind == "bold":
                sub_parts = chunk.split("`")
                for sp_idx, sp in enumerate(sub_parts):
                    if not sp:
                        continue
                    sr = paragraph.add_run()
                    sr.text = sp
                    if sp_idx % 2 == 1:
                        sr.font.name = FONT_MONO
                        sr.font.size = pt(max(7.5, size - 0.8))
                        sr.font.bold = True
                        sr.font.color.rgb = rgb(C_MINT)
                    else:
                        sr.font.name = font_name
                        sr.font.size = pt(size)
                        sr.font.bold = True
                        sr.font.color.rgb = rgb(C_WHITE)
            else:
                sub_parts = chunk.split("`")
                for sp_idx, sp in enumerate(sub_parts):
                    if not sp:
                        continue
                    sr = paragraph.add_run()
                    sr.text = sp
                    if sp_idx % 2 == 1:
                        sr.font.name = FONT_MONO
                        sr.font.size = pt(max(7.5, size - 0.8))
                        sr.font.italic = True
                        sr.font.color.rgb = rgb(C_WHITE)
                    else:
                        sr.font.name = font_name
                        sr.font.size = pt(size)
                        sr.font.italic = True
                        sr.font.color.rgb = rgb(C_MINT)
            continue
        run = paragraph.add_run()
        run.text = chunk
        if kind == "code":
            run.font.name = FONT_MONO
            run.font.size = pt(max(7.5, size - 1.0))
            run.font.bold = False
            run.font.color.rgb = rgb(C_MINT)
        else:
            run.font.name = font_name
            run.font.size = pt(size)
            run.font.bold = default_bold
            run.font.color.rgb = rgb(default_color)


class SlideCanvas:
    """High-level slide composer that also records focus regions for the motion-graphics video engine."""

    def __init__(self, slide, assets: BocAssets, index: int, eyebrow: str = "", title: str = "",
                 bg_media: str | None = "image13.png", footer: bool = True):
        self.slide = slide
        self.assets = assets
        self.index = index
        self.eyebrow = eyebrow
        self.title = title
        self.regions: list[dict] = []

        bg = slide.background
        fill = bg.fill
        fill.solid()
        fill.fore_color.rgb = rgb(C_BG)

        if bg_media:
            self.slide.shapes.add_picture(
                assets.bytes_of(bg_media), pt(0), pt(0), width=pt(SLIDE_W_PT), height=pt(SLIDE_H_PT)
            )

        if eyebrow:
            self.textbox(38, 22, 820, 18, eyebrow.upper(), size=9.5, color=C_MUTED, bold=True)
        if title:
            sz = fit_font_size(title, 860, 44, preferred=26.0, minimum=20.0, bold=True, line_mult=1.15)
            self.textbox(38, 40, 865, 44, title, size=sz, color=C_WHITE, bold=True)

        if footer:
            self.rect(0, 513, SLIDE_W_PT, 1.2, fill=C_GREEN_LINE)
            self.textbox(
                38, 518, 620, 16,
                f"ADVANCED GITHUB COPILOT: AGENTS, SKILLS & SUBAGENTS   ·   CHRONICLE LABS   ·   {index:02d}",
                size=7.5, color=C_MUTED, bold=True,
            )
            self.slide.shapes.add_picture(assets.bytes_of("image22.png"), pt(930), pt(517), width=pt(16), height=pt(16))

    def mark_region(self, label: str, x: float, y: float, w: float, h: float, accent: str = C_GREEN):
        # Normalized 0..1 coordinates so 1920x1080 video engine maps spotlights cleanly
        self.regions.append({
            "label": label,
            "rect": [round(x / SLIDE_W_PT, 4), round(y / SLIDE_H_PT, 4),
                     round(w / SLIDE_W_PT, 4), round(h / SLIDE_H_PT, 4)],
            "accent": accent,
        })

    def rect(self, x: float, y: float, w: float, h: float, fill: str | None = C_CARD,
             border: str | None = None, border_w: float = 1.0, rounded: bool = False, radius: float = 0.04):
        kind = MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE
        sh = self.slide.shapes.add_shape(kind, pt(x), pt(y), pt(w), pt(h))
        if rounded and sh.adjustments:
            sh.adjustments[0] = radius
        if fill:
            sh.fill.solid()
            sh.fill.fore_color.rgb = rgb(fill)
        else:
            sh.fill.background()
        if border:
            sh.line.color.rgb = rgb(border)
            sh.line.width = pt(border_w)
        else:
            sh.line.fill.background()
        sh.shadow.inherit = False
        return sh

    def oval(self, x: float, y: float, w: float, h: float, fill: str, text: str = "",
             text_color: str = C_WHITE, size: float = 11.0):
        sh = self.slide.shapes.add_shape(MSO_SHAPE.OVAL, pt(x), pt(y), pt(w), pt(h))
        sh.fill.solid()
        sh.fill.fore_color.rgb = rgb(fill)
        sh.line.fill.background()
        sh.shadow.inherit = False
        if text:
            tf = sh.text_frame
            tf.word_wrap = False
            tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = pt(0)
            tf.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = tf.paragraphs[0]
            p.alignment = PP_ALIGN.CENTER
            r = p.add_run()
            r.text = text
            r.font.name = FONT_SANS
            r.font.size = pt(size)
            r.font.bold = True
            r.font.color.rgb = rgb(text_color)
        return sh

    def arrow(self, x1: float, y1: float, x2: float, y2: float, color: str = C_MUTED, width: float = 1.75):
        conn = self.slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, pt(x1), pt(y1), pt(x2), pt(y2))
        conn.line.color.rgb = rgb(color)
        conn.line.width = pt(width)
        ln = conn._element.spPr.ln
        tail = OxmlElement("a:tailEnd")
        tail.set("type", "triangle")
        tail.set("w", "med")
        tail.set("len", "med")
        ln.append(tail)
        return conn

    def textbox(self, x: float, y: float, w: float, h: float, text: str, size: float = 12.5,
                color: str = C_TEXT, bold: bool = False, font: str = FONT_SANS,
                align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, rich: bool = True, line_spacing: float = 1.16):
        tb = self.slide.shapes.add_textbox(pt(x), pt(y), pt(w), pt(h))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = pt(2)
        tf.margin_top = tf.margin_bottom = pt(1)
        tf.vertical_anchor = anchor
        lines = text.split("\n")
        for idx, line in enumerate(lines):
            p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
            p.alignment = align
            _set_line_spacing(p, line_spacing)
            if rich:
                parse_rich_runs(p, line, size=size, default_color=color, default_bold=bold, font_name=font)
            else:
                r = p.add_run()
                r.text = line
                r.font.name = font
                r.font.size = pt(size)
                r.font.bold = bold
                r.font.color.rgb = rgb(color)
        return tb

    def pill(self, x: float, y: float, w: float, h: float, text: str, fill: str = C_FOREST,
             color: str = C_WHITE, border: str | None = None, size: float = 9.5, mono: bool = False):
        sh = self.rect(x, y, w, h, fill=fill, border=border, border_w=1.0, rounded=True, radius=0.45)
        tf = sh.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = pt(6)
        tf.margin_top = tf.margin_bottom = pt(2)
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        parse_rich_runs(p, text, size=size, default_color=color, default_bold=True,
                        font_name=FONT_MONO if mono else FONT_SANS)
        return sh

    def bullets(self, x: float, y: float, w: float, h: float, items: Iterable[str],
                size: float = 12.0, bullet_char: str = "•", bullet_color: str = C_GREEN,
                text_color: str = C_TEXT, gap_pt: float = 6.0):
        plain_join = "\n".join(items)
        sz = fit_font_size(plain_join, w - 18, h, preferred=size, minimum=9.0, line_mult=1.36)
        tb = self.slide.shapes.add_textbox(pt(x), pt(y), pt(w), pt(h))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = pt(1)
        for idx, item in enumerate(items):
            p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
            p.space_after = pt(gap_pt)
            _set_line_spacing(p, 1.18)
            rb = p.add_run()
            rb.text = f"{bullet_char}  "
            rb.font.name = FONT_SANS
            rb.font.size = pt(sz)
            rb.font.bold = True
            rb.font.color.rgb = rgb(bullet_color)
            parse_rich_runs(p, item, size=sz, default_color=text_color, default_bold=False)
        return tb

    def accent_card(self, x: float, y: float, w: float, h: float, title: str,
                    bullets: list[str] | str, accent: str = C_GREEN, badge: str = "",
                    footer_note: str = "", fill: str = C_CARD, track_region: bool = True):
        self.rect(x, y, w, h, fill=fill, border=C_BORDER if fill == C_CARD else C_BORDER_SLATE,
                  border_w=1.0, rounded=True, radius=0.03)
        self.rect(x, y, w, 3.5, fill=accent, rounded=False)
        cur_y = y + 12
        if badge:
            self.textbox(x + 14, cur_y, w - 28, 15, badge.upper(), size=8.5, color=accent, bold=True, rich=False)
            cur_y += 16
        t_sz = fit_font_size(title, w - 28, 30, preferred=14.5, minimum=11.0, bold=True)
        self.textbox(x + 14, cur_y, w - 28, 28, title, size=t_sz, color=C_WHITE, bold=True)
        cur_y += 30
        avail_h = (y + h - 12 - (22 if footer_note else 0)) - cur_y
        if isinstance(bullets, str):
            b_sz = fit_font_size(bullets, w - 28, avail_h, preferred=11.2, minimum=8.8)
            self.textbox(x + 14, cur_y, w - 28, avail_h, bullets, size=b_sz, color=C_TEXT)
        else:
            self.bullets(x + 14, cur_y, w - 28, avail_h, bullets, size=11.0, bullet_color=accent, gap_pt=4.5)
        if footer_note:
            self.textbox(x + 14, y + h - 24, w - 28, 18, footer_note, size=9.2, color=C_MINT if accent == C_GREEN else accent, bold=True)
        if track_region:
            self.mark_region(title, x, y, w, h, accent=accent)

    def code_box(self, x: float, y: float, w: float, h: float, header: str, code: str,
                 accent: str = C_GREEN, track_region: bool = True):
        self.rect(x, y, w, h, fill=C_CODE_BG, border=C_CODE_EDGE, border_w=1.2, rounded=True, radius=0.025)
        self.rect(x, y, w, 24, fill="10241B", border=C_CODE_EDGE, border_w=0.8, rounded=False)
        for idx, dot_col in enumerate(("EF4444", "F59E0B", "5EEC83")):
            self.oval(x + 10 + idx * 11, y + 8, 6.5, 6.5, fill=dot_col)
        self.textbox(x + 48, y + 4, w - 56, 16, header, size=8.8, color=accent, bold=True, font=FONT_MONO, rich=False)
        sz = fit_font_size(code, w - 24, h - 34, preferred=9.6, minimum=7.5, mono=True, line_mult=1.24)
        tb = self.slide.shapes.add_textbox(pt(x + 12), pt(y + 29), pt(w - 24), pt(h - 35))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = pt(1)
        for idx, line in enumerate(code.split("\n")):
            p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
            _set_line_spacing(p, 1.15)
            r = p.add_run()
            r.text = line if line else " "
            r.font.name = FONT_MONO
            r.font.size = pt(sz)
            if line.strip().startswith("#") or line.strip().startswith("//"):
                r.font.color.rgb = rgb("6E8B7E")
            elif line.strip() == "---":
                r.font.color.rgb = rgb(C_AMBER)
            elif ":" in line and not line.strip().startswith("- ") and not line.strip().startswith("http"):
                key, _, rest = line.partition(":")
                r.text = key + ":"
                r.font.color.rgb = rgb(C_GREEN)
                r2 = p.add_run()
                r2.text = rest
                r2.font.name = FONT_MONO
                r2.font.size = pt(sz)
                r2.font.color.rgb = rgb(C_TEXT)
            else:
                r.font.color.rgb = rgb(C_TEXT)
        if track_region:
            self.mark_region(header, x, y, w, h, accent=accent)

    def styled_table(self, x: float, y: float, w: float, h: float, headers: list[str],
                     rows: list[list[str]], col_weights: list[float], badge_col: int | None = None):
        n_rows = len(rows) + 1
        n_cols = len(headers)
        shape = self.slide.shapes.add_table(n_rows, n_cols, pt(x), pt(y), pt(w), pt(h))
        tbl = shape.table
        total_w = sum(col_weights)
        for c_idx, weight in enumerate(col_weights):
            tbl.columns[c_idx].width = pt(w * weight / total_w)

        row_h = h / n_rows
        for r_idx in range(n_rows):
            tbl.rows[r_idx].height = pt(row_h)
            for c_idx in range(n_cols):
                cell = tbl.cell(r_idx, c_idx)
                cell.vertical_anchor = MSO_ANCHOR.MIDDLE
                cell.margin_left = cell.margin_right = pt(8)
                cell.margin_top = cell.margin_bottom = pt(4)
                cell.fill.solid()
                if r_idx == 0:
                    cell.fill.fore_color.rgb = rgb("133326")
                    txt = headers[c_idx]
                    p = cell.text_frame.paragraphs[0]
                    r = p.add_run()
                    r.text = txt.upper()
                    r.font.name = FONT_SANS
                    r.font.size = pt(9.0)
                    r.font.bold = True
                    r.font.color.rgb = rgb(C_GREEN)
                else:
                    cell.fill.fore_color.rgb = rgb("0A1D16" if r_idx % 2 == 1 else "0F261D")
                    txt = rows[r_idx - 1][c_idx]
                    p = cell.text_frame.paragraphs[0]
                    _set_line_spacing(p, 1.12)
                    col_w = w * col_weights[c_idx] / total_w
                    sz = fit_font_size(txt, col_w - 16, row_h - 6, preferred=10.2, minimum=8.2)
                    def_col = C_WHITE if c_idx == 0 else (C_MINT if c_idx == badge_col else C_TEXT)
                    parse_rich_runs(p, txt, size=sz, default_color=def_col, default_bold=(c_idx == 0))
        self.mark_region(headers[0], x, y, w, h, accent=C_GREEN)
        return shape

    def screenshot_card(self, x: float, y: float, w: float, h: float, png_stem: str, caption: str, accent: str = C_BLUE):
        self.rect(x, y, w, h, fill="081018", border=C_BORDER_SLATE, border_w=1.2, rounded=True, radius=0.03)
        self.rect(x, y, w, 3.0, fill=accent, rounded=False)
        img_path = SCREENSHOTS_DIR / f"{png_stem}.png"
        # Fit 16:9 image cleanly inside card above caption
        inner_w = w - 14
        inner_h = h - 30
        aspect = 16.0 / 9.0
        if inner_w / inner_h > aspect:
            pw = inner_h * aspect
            ph = inner_h
        else:
            pw = inner_w
            ph = inner_w / aspect
        px = x + (w - pw) / 2
        py = y + 8 + (inner_h - ph) / 2
        self.slide.shapes.add_picture(str(img_path), pt(px), pt(py), width=pt(pw), height=pt(ph))
        self.textbox(x + 10, y + h - 20, w - 20, 16, caption, size=8.5, color=C_MUTED, bold=True, align=PP_ALIGN.CENTER, rich=False)
        self.mark_region(caption, x, y, w, h, accent=accent)

    def callout_strip(self, y: float, text: str, accent: str = C_GREEN, x: float = 38, w: float = 884):
        self.rect(x, y, w, 32, fill="0C1F18", border=C_BORDER, border_w=1.0, rounded=True, radius=0.12)
        self.rect(x, y, 4.5, 32, fill=accent, rounded=False)
        sz = fit_font_size(text, w - 26, 26, preferred=11.0, minimum=9.2)
        self.textbox(x + 14, y + 6, w - 24, 22, text, size=sz, color=C_TEXT, anchor=MSO_ANCHOR.MIDDLE)


def create_presentation() -> tuple[Presentation, BocAssets]:
    prs = Presentation()
    prs.slide_width = Pt(SLIDE_W_PT)
    prs.slide_height = Pt(SLIDE_H_PT)
    return prs, BocAssets()


def set_speaker_notes(slide, notes_text: str):
    notes_slide = slide.notes_slide
    tf = notes_slide.notes_text_frame
    tf.text = notes_text
