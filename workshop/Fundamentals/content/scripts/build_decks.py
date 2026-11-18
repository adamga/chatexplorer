"""
Builds native, 100% editable 16:9 PowerPoint decks for the Chronicle Fundamentals Workshop:
  1. Fundamentals-Workshop-Deck.pptx (18 kid-friendly, visual hands-on lab slides)
  2. Instructor-Delivery-Guide.pptx  (10 facilitator coaching, pacing & troubleshooting slides)

All shapes, cards, badges, tables, code panels, and typography are native PowerPoint shapes
paired with real screenshots captured from http://127.0.0.1:3210/.
"""
from __future__ import annotations

import os
from pathlib import Path
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

SCRIPT_DIR = Path(__file__).resolve().parent
CONTENT_DIR = SCRIPT_DIR.parent
SHOTS = CONTENT_DIR / "assets" / "screenshots"

# Widescreen 16:9 (13.333 x 7.5 in)
SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

FONT_HEAD = "Segoe UI Semibold"
FONT_BODY = "Segoe UI"
FONT_MONO = "Consolas"

# Playful, high-contrast cosmic-studio palette
BG_DARK = RGBColor(15, 20, 34)       # Deep starlight navy
BG_CARD = RGBColor(26, 34, 56)       # Elevated slate card
BG_CARD_ALT = RGBColor(33, 43, 70)   # Highlight card
BG_CODE = RGBColor(11, 15, 26)       # Code terminal surface
BORDER_SUBTLE = RGBColor(58, 74, 112)

INK_WHITE = RGBColor(248, 250, 255)
INK_BODY = RGBColor(214, 224, 245)
INK_MUTED = RGBColor(152, 168, 204)
INK_DARK = RGBColor(16, 22, 38)

ACCENT_CYAN = RGBColor(56, 189, 248)
ACCENT_PURPLE = RGBColor(168, 85, 247)
ACCENT_GREEN = RGBColor(52, 211, 153)
ACCENT_AMBER = RGBColor(251, 191, 36)
ACCENT_CORAL = RGBColor(251, 113, 133)
ACCENT_BLUE = RGBColor(96, 165, 250)


def new_presentation() -> Presentation:
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    return prs


def save_safe(prs: Presentation, target: Path) -> Path:
    try:
        prs.save(str(target))
        return target
    except PermissionError:
        for idx in range(2, 10):
            alt = target.with_name(f"{target.stem}-v{idx}{target.suffix}")
            try:
                prs.save(str(alt))
                return alt
            except PermissionError:
                continue
        raise


def add_blank_slide(prs: Presentation, notes: str = ""):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.background.fill
    bg.solid()
    bg.fore_color.rgb = BG_DARK

    # Subtle decorative top accent bar & soft corner glow circles (native shapes)
    top_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), SLIDE_W, Inches(0.08))
    top_bar.fill.solid()
    top_bar.fill.fore_color.rgb = ACCENT_CYAN
    top_bar.line.fill.background()

    orb1 = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(11.6), Inches(-0.9), Inches(2.6), Inches(2.6))
    orb1.fill.solid()
    orb1.fill.fore_color.rgb = RGBColor(28, 42, 76)
    orb1.line.fill.background()

    if notes:
        slide.notes_slide.notes_text_frame.text = notes
    return slide


def add_footer(slide, page_num: int, total_pages: int, deck_label: str = "Chronicle Fundamentals Workshop  ·  Zero-Package Lab"):
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(7.02), Inches(12.13), Inches(0.015))
    line.fill.solid()
    line.fill.fore_color.rgb = RGBColor(42, 55, 86)
    line.line.fill.background()

    tb = slide.shapes.add_textbox(Inches(0.6), Inches(7.06), Inches(9.5), Inches(0.32))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = deck_label
    p.font.name = FONT_BODY
    p.font.size = Pt(10.5)
    p.font.color.rgb = INK_MUTED

    tb_r = slide.shapes.add_textbox(Inches(10.5), Inches(7.06), Inches(2.23), Inches(0.32))
    tf_r = tb_r.text_frame
    tf_r.margin_left = tf_r.margin_top = tf_r.margin_right = tf_r.margin_bottom = 0
    pr = tf_r.paragraphs[0]
    pr.alignment = PP_ALIGN.RIGHT
    pr.text = f"Slide {page_num} of {total_pages}"
    pr.font.name = FONT_HEAD
    pr.font.size = Pt(10.5)
    pr.font.color.rgb = ACCENT_CYAN


def add_pill(slide, x: float, y: float, w: float, h: float, text: str, fill_rgb: RGBColor, text_rgb: RGBColor = INK_DARK, font_pt: float = 11.5):
    pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    pill.adjustments[0] = 0.5
    pill.fill.solid()
    pill.fill.fore_color.rgb = fill_rgb
    pill.line.fill.background()
    tf = pill.text_frame
    tf.word_wrap = False
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = Inches(0.12)
    tf.margin_right = Inches(0.12)
    tf.margin_top = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    p.text = text
    p.font.name = FONT_HEAD
    p.font.size = Pt(font_pt)
    p.font.bold = True
    p.font.color.rgb = text_rgb
    return pill


def add_header(slide, badge_text: str, badge_color: RGBColor, title: str, subtitle: str = ""):
    add_pill(slide, 0.6, 0.34, max(1.85, len(badge_text) * 0.115 + 0.45), 0.36, badge_text, badge_color, INK_DARK, 11)

    tb = slide.shapes.add_textbox(Inches(0.6), Inches(0.78), Inches(12.1), Inches(0.62))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = title
    p.font.name = FONT_HEAD
    p.font.size = Pt(28)
    p.font.bold = True
    p.font.color.rgb = INK_WHITE

    if subtitle:
        tb_s = slide.shapes.add_textbox(Inches(0.6), Inches(1.40), Inches(12.1), Inches(0.42))
        tf_s = tb_s.text_frame
        tf_s.word_wrap = True
        tf_s.margin_left = tf_s.margin_top = tf_s.margin_right = tf_s.margin_bottom = 0
        ps = tf_s.paragraphs[0]
        ps.text = subtitle
        ps.font.name = FONT_BODY
        ps.font.size = Pt(15)
        ps.font.color.rgb = INK_BODY


def add_card(
    slide,
    x: float,
    y: float,
    w: float,
    h: float,
    title: str,
    bullets: list[str],
    accent: RGBColor = ACCENT_CYAN,
    fill_rgb: RGBColor = BG_CARD,
    title_pt: float = 17.5,
    body_pt: float = 13.8,
):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    card.adjustments[0] = 0.05
    card.fill.solid()
    card.fill.fore_color.rgb = fill_rgb
    card.line.color.rgb = BORDER_SUBTLE
    card.line.width = Pt(1.2)

    # Top accent stripe inside card
    stripe = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x + 0.18), Inches(y + 0.16), Inches(0.55), Inches(0.08))
    stripe.adjustments[0] = 0.5
    stripe.fill.solid()
    stripe.fill.fore_color.rgb = accent
    stripe.line.fill.background()

    tb = slide.shapes.add_textbox(Inches(x + 0.22), Inches(y + 0.32), Inches(w - 0.44), Inches(h - 0.46))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    p0 = tf.paragraphs[0]
    p0.text = title
    p0.font.name = FONT_HEAD
    p0.font.size = Pt(title_pt)
    p0.font.bold = True
    p0.font.color.rgb = INK_WHITE
    p0.space_after = Pt(8)

    for line in bullets:
        p = tf.add_paragraph()
        p.text = f"•  {line}" if not line.startswith(("✓", "→", "1.", "2.", "3.", "4.")) else line
        p.font.name = FONT_BODY
        p.font.size = Pt(body_pt)
        p.font.color.rgb = INK_BODY
        p.space_after = Pt(5.5)
    return card


def add_code_panel(slide, x: float, y: float, w: float, h: float, label: str, code_lines: list[str], accent: RGBColor = ACCENT_GREEN):
    box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    box.adjustments[0] = 0.04
    box.fill.solid()
    box.fill.fore_color.rgb = BG_CODE
    box.line.color.rgb = accent
    box.line.width = Pt(1.3)

    add_pill(slide, x + 0.18, y + 0.14, max(1.6, len(label) * 0.105 + 0.38), 0.30, label, accent, INK_DARK, 10)

    tb = slide.shapes.add_textbox(Inches(x + 0.22), Inches(y + 0.52), Inches(w - 0.44), Inches(h - 0.64))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    for idx, ln in enumerate(code_lines):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        p.text = ln
        p.font.name = FONT_MONO
        p.font.size = Pt(12.5)
        p.font.color.rgb = RGBColor(210, 244, 228) if idx % 2 == 0 else INK_WHITE
        p.space_after = Pt(3.5)


def add_framed_screenshot(slide, img_path: Path, x: float, y: float, w: float, caption: str = "", accent: RGBColor = ACCENT_CYAN):
    # 16:9 image height
    img_h = w * (9.0 / 16.0)
    chrome_h = 0.30
    total_h = img_h + chrome_h + 0.12

    frame = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x - 0.06), Inches(y - 0.06), Inches(w + 0.12), Inches(total_h))
    frame.adjustments[0] = 0.03
    frame.fill.solid()
    frame.fill.fore_color.rgb = RGBColor(20, 27, 45)
    frame.line.color.rgb = accent
    frame.line.width = Pt(1.5)

    # Mini browser URL bar
    for idx, dot_col in enumerate([ACCENT_CORAL, ACCENT_AMBER, ACCENT_GREEN]):
        dot = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x + 0.10 + idx * 0.18), Inches(y + 0.06), Inches(0.11), Inches(0.11))
        dot.fill.solid()
        dot.fill.fore_color.rgb = dot_col
        dot.line.fill.background()

    url_tb = slide.shapes.add_textbox(Inches(x + 0.72), Inches(y + 0.01), Inches(w - 0.8), Inches(0.24))
    utf = url_tb.text_frame
    utf.margin_left = utf.margin_top = utf.margin_right = utf.margin_bottom = 0
    up = utf.paragraphs[0]
    up.text = caption or "http://127.0.0.1:3210  —  Chronicle / Chat Explorer"
    up.font.name = FONT_MONO
    up.font.size = Pt(9.5)
    up.font.color.rgb = INK_MUTED

    slide.shapes.add_picture(str(img_path), Inches(x), Inches(y + chrome_h), width=Inches(w))


def build_fundamentals_deck() -> Path:
    prs = new_presentation()
    total = 18

    # ---------------- SLIDE 1: HERO TITLE ----------------
    s1 = add_blank_slide(
        prs,
        "Welcome learners! Keep the energy warm, playful, and simple. Point out the live Chronicle app screenshot on the right: in just 60 minutes, starting from an empty folder, every person here will build this exact web app with GitHub Copilot!",
    )
    add_pill(s1, 0.6, 0.55, 3.35, 0.40, "HANDS-ON LAB  ·  60 MINUTES", ACCENT_AMBER, INK_DARK, 11.5)
    tb = s1.shapes.add_textbox(Inches(0.6), Inches(1.15), Inches(5.9), Inches(2.1))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Let's Build Chronicle!"
    p.font.name = FONT_HEAD
    p.font.size = Pt(42)
    p.font.bold = True
    p.font.color.rgb = INK_WHITE
    p2 = tf.add_paragraph()
    p2.text = "Turn Copilot's Secret Chat Notebook into Your Very Own Web App"
    p2.font.name = FONT_BODY
    p2.font.size = Pt(20)
    p2.font.color.rgb = ACCENT_CYAN
    p2.space_before = Pt(8)

    add_card(
        s1, 0.6, 3.45, 5.75, 3.15,
        "Your 3 Superpowers Today",
        [
            "Start with an EMPTY folder + VS Code + GitHub Copilot",
            "Give Copilot 1 Magic Rulebook (Zero Outside Packages!)",
            "Build, test & launch http://127.0.0.1:3210 step by step!",
            "Simple enough for a 5-year-old — real code pros love!",
        ],
        accent=ACCENT_GREEN,
        title_pt=18,
        body_pt=14,
    )
    add_framed_screenshot(s1, SHOTS / "01-hero-overview-dark.png", 6.65, 1.25, 6.05, "http://127.0.0.1:3210  ·  Live Workshop Output", ACCENT_CYAN)
    add_footer(s1, 1, total)

    # ---------------- SLIDE 2: SECRET DETECTIVE NOTEBOOK ----------------
    s2 = add_blank_slide(
        prs,
        "Explain the problem like a bedtime story: Copilot writes down every chat, thought, command, and code change on your computer, but it's scrambled inside giant .jsonl files. Chronicle is our magic magnifying glass!",
    )
    add_header(
        s2,
        "THE BIG IDEA",
        ACCENT_PURPLE,
        "Copilot Keeps a Secret Detective Notebook!",
        "Every time you chat in VS Code, your computer quietly saves 4 awesome clues on disk:",
    )
    clues = [
        ("1. Your Questions", ["Every prompt you typed", "Which project folder you worked in", "Saved by date and time"], ACCENT_CYAN),
        ("2. Thinking Bubbles", ["How Copilot planned its answer", "Which AI brain answered you", "Step-by-step reasoning"], ACCENT_PURPLE),
        ("3. Tool Runs", ["Commands Copilot ran for you", "How many seconds each took", "Whether tests passed or failed"], ACCENT_AMBER),
        ("4. Before & After Code", ["Red minus lines = old code", "Green plus lines = new code", "Nothing is ever lost!"], ACCENT_GREEN),
    ]
    for i, (ctitle, cbullets, col) in enumerate(clues):
        add_card(s2, 0.6 + i * 3.08, 2.05, 2.90, 2.85, ctitle, cbullets, accent=col, title_pt=16.5, body_pt=13.2)

    add_card(
        s2, 0.6, 5.15, 12.13, 1.60,
        "The Catch? Those Clues Live Inside Giant Messy .jsonl Files!",
        [
            "Humans don't want to read 10,000 lines of raw computer brackets — so today WE are building Chronicle: a fast, colorful magnifying glass that opens right in your browser!",
        ],
        accent=ACCENT_CORAL,
        fill_rgb=BG_CARD_ALT,
        title_pt=16.5,
        body_pt=14,
    )
    add_footer(s2, 2, total)

    # ---------------- SLIDE 3: WHAT YOU WILL BUILD ----------------
    s3 = add_blank_slide(
        prs,
        "Walk learners around the finished app they will launch at http://127.0.0.1:3210/ by the end of Lab 04.",
    )
    add_header(
        s3,
        "YOUR FINISHED APP",
        ACCENT_CYAN,
        "What You Will Build at http://127.0.0.1:3210/",
        "Four kid-friendly features powered 100% by your own code:",
    )
    add_card(
        s3, 0.6, 2.0, 5.65, 2.25,
        "Two Pre-Filled 'Open' Doors",
        [
            "Open session → finds classic VS Code workspaceStorage chats",
            "Agent sessions → finds Copilot Agent & CLI (.copilot\\session-state)",
            "Both doors pre-fill your computer's folder automatically!",
        ],
        accent=ACCENT_CYAN,
        title_pt=16.5,
        body_pt=13.2,
    )
    add_card(
        s3, 0.6, 4.45, 5.65, 2.30,
        "Sort, Flip Themes & Search Everything",
        [
            "Sort chats by Date (Newest / Oldest) or Name (A → Z / Z → A)",
            "Flip between sleek Dark Mode and bright high-contrast White Mode",
            "Read full stories, inspect code diffs, and search in milliseconds!",
        ],
        accent=ACCENT_GREEN,
        title_pt=16.5,
        body_pt=13.2,
    )
    add_framed_screenshot(s3, SHOTS / "04-library-sortable-dark.png", 6.55, 2.05, 6.15, "Sortable Library + Dual Open Buttons", ACCENT_PURPLE)
    add_footer(s3, 3, total)

    # ---------------- SLIDE 4: ZERO PACKAGES (LEGO ANALOGY) ----------------
    s4 = add_blank_slide(
        prs,
        "Use the LEGO analogy! Most apps borrow hundreds of mystery boxes (npm install). If one box breaks, your castle falls down. Today we build with ONLY the LEGO bricks already inside Node.js and our browser!",
    )
    add_header(
        s4,
        "OUR GOLDEN RULE",
        ACCENT_AMBER,
        "Zero Outside Packages! (Own LEGO Bricks Only)",
        "Why we NEVER type npm install during this entire workshop:",
    )
    add_card(
        s4, 0.6, 2.05, 5.85, 4.65,
        "Borrowing 500 Mystery Boxes (Old Way)",
        [
            "Typing npm install express marked diff downloads hundreds of stranger-written folders into node_modules",
            "School or office Wi-Fi firewalls can block downloads",
            "One broken outside package can break your whole app",
            "Hard to see how things actually work under the hood!",
        ],
        accent=ACCENT_CORAL,
        title_pt=18,
        body_pt=14,
    )
    add_card(
        s4, 6.85, 2.05, 5.88, 4.65,
        "Building With Our Own Bricks (Chronicle Way!)",
        [
            "✓  0 dependencies in package.json — zero node_modules!",
            "✓  Node's built-in node:http runs our local web server",
            "✓  Node's built-in node:test checks our work in 3 seconds",
            "✓  Plain HTML, CSS, JS + SVG icons run right in the browser!",
            "✓  Works offline forever and starts up in under 1 second!",
        ],
        accent=ACCENT_GREEN,
        fill_rgb=BG_CARD_ALT,
        title_pt=18,
        body_pt=14,
    )
    add_footer(s4, 4, total)

    # ---------------- SLIDE 5: 3 TECHNIQUES YOU WILL LEARN ----------------
    s5 = add_blank_slide(
        prs,
        "Highlight the three transferable AI engineering habits students take home today—without needing multi-agent setups yet.",
    )
    add_header(
        s5,
        "TECHNIQUES YOU'LL LEARN",
        ACCENT_GREEN,
        "Three Easy Copilot Habits That Feel Like Magic",
        "No complex setup — just smart prompts, a Rulebook file, and quick green tests!",
    )
    techs = [
        (
            "1. The Magic Rulebook",
            [
                "Put your project rules in .github/copilot-instructions.md",
                "VS Code feeds this file to Copilot on EVERY single chat turn",
                "Copilot remembers 'Zero Packages!' without being nagged!",
            ],
            ACCENT_CYAN,
        ),
        (
            "2. Prompt → Peek → Test",
            [
                "Copy one clear, bite-sized prompt into Copilot Agent mode",
                "Peek at the files Copilot wrote in the Explorer sidebar",
                "Run npm test to see green checkmarks prove it works!",
            ],
            ACCENT_AMBER,
        ),
        (
            "3. Safe Local Playground",
            [
                "Read-only: never changes your real VS Code chat files",
                "Locked door: 127.0.0.1 means ONLY your computer can look",
                "Safety shield: strips out sneaky scripts from chat previews",
            ],
            ACCENT_PURPLE,
        ),
    ]
    for i, (ttitle, tbullets, col) in enumerate(techs):
        add_card(s5, 0.6 + i * 4.12, 2.05, 3.88, 4.65, ttitle, tbullets, accent=col, title_pt=18.5, body_pt=14)
    add_footer(s5, 5, total)

    # ---------------- SLIDE 6: 60-MINUTE ADVENTURE MAP (NATIVE TABLE) ----------------
    s6 = add_blank_slide(
        prs,
        "Review the exact 60-minute lab budget: 7 + 8 + 15 + 10 + 20 = 60 minutes total.",
    )
    add_header(
        s6,
        "60-MINUTE GAME PLAN",
        ACCENT_BLUE,
        "Five Bite-Sized Steps from Empty Folder to Working App",
        "Every minute is planned so nobody gets left behind (7 + 8 + 15 + 10 + 20 = 60 minutes):",
    )
    rows_data = [
        ("Stage", "Time", "What You & Copilot Do Together", "Victory Checkpoint"),
        ("Lab 00 · Setup", "7 min", "Check Node v22+, open sampleapp folder, pick Frontier Model", "Empty folder trusted & Agent ready"),
        ("Lab 01 · Rulebook", "8 min", "Create .github/copilot-instructions.md & package.json", "0 dependencies in package.json"),
        ("Lab 02 · Brain", "15 min", "Build Myers line diff, dual session parser & search library", "npm test passes with 0 failures"),
        ("Lab 03 · Server", "10 min", "Build local 127.0.0.1:3210 web server with node:http", "Security & API routes pass tests"),
        ("Lab 04 · Browser UI", "20 min", "Build SVG icons, Markdown, Dark/White UI & explore live!", "App live at http://127.0.0.1:3210/"),
    ]
    tbl_shape = s6.shapes.add_table(len(rows_data), 4, Inches(0.6), Inches(2.02), Inches(12.13), Inches(4.7))
    tbl = tbl_shape.table
    col_widths = [Inches(2.25), Inches(1.15), Inches(5.38), Inches(3.35)]
    for idx, cw in enumerate(col_widths):
        tbl.columns[idx].width = cw

    for r_idx, row in enumerate(rows_data):
        for c_idx, val in enumerate(row):
            cell = tbl.cell(r_idx, c_idx)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            cell.fill.solid()
            if r_idx == 0:
                cell.fill.fore_color.rgb = RGBColor(38, 52, 88)
            else:
                cell.fill.fore_color.rgb = BG_CARD if r_idx % 2 == 1 else BG_CARD_ALT
            tf = cell.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.text = val
            p.font.name = FONT_HEAD if (r_idx == 0 or c_idx in (0, 1)) else FONT_BODY
            p.font.size = Pt(13.5 if r_idx == 0 else 13)
            p.font.bold = r_idx == 0 or c_idx == 0
            if r_idx == 0:
                p.font.color.rgb = ACCENT_CYAN
            elif c_idx == 1:
                p.font.color.rgb = ACCENT_AMBER
            elif c_idx == 3:
                p.font.color.rgb = ACCENT_GREEN
            else:
                p.font.color.rgb = INK_WHITE
    add_footer(s6, 6, total)

    # ---------------- SLIDE 7: BACKPACK CHECK (PREREQUISITES) ----------------
    s7 = add_blank_slide(
        prs,
        "Have everyone check these 3 items together right before starting Lab 00.",
    )
    add_header(
        s7,
        "READY, SET, GO!",
        ACCENT_CYAN,
        "Quick Backpack Check Before We Start Coding",
        "Make sure these 3 things are ready on your screen:",
    )
    add_card(
        s7, 0.6, 2.05, 3.85, 4.6,
        "1. Visual Studio Code",
        [
            "Open VS Code on your laptop",
            "Press Ctrl + ` (above Tab) to peek at the built-in Terminal",
            "Keep Explorer open on the left (Ctrl + Shift + E)",
        ],
        accent=ACCENT_CYAN,
    )
    add_card(
        s7, 4.72, 2.05, 3.85, 4.6,
        "2. Node.js v22 or Newer",
        [
            "Type node --version in Terminal",
            "Confirm you see v22.x or v24.x+",
            "Gives us built-in node:http and node:test with zero installs!",
        ],
        accent=ACCENT_GREEN,
    )
    add_card(
        s7, 8.84, 2.05, 3.89, 4.6,
        "3. GitHub Copilot Chat",
        [
            "Click Toggle Chat in the top bar (Ctrl + Alt + I)",
            "Set mode to Autopilot or Interactive (Agent)",
            "Pick Claude Sonnet 5.5, GPT-6.1, or Gemini 4 (Medium speed!)",
        ],
        accent=ACCENT_PURPLE,
    )
    add_footer(s7, 7, total)

    # ---------------- SLIDE 8: LAB 00 ----------------
    s8 = add_blank_slide(
        prs,
        "Crucial tip for Lab 00: Students MUST open workshop/Fundamentals/sampleapp directly via File -> Open Folder, NOT the parent repository root, so Copilot loads THEIR .github/copilot-instructions.md in Lab 01!",
    )
    add_header(
        s8,
        "LAB 00  ·  7 MINUTES",
        ACCENT_CYAN,
        "Open Your Empty Starter Folder & Pick Your AI Brain",
        "Open workshop/Fundamentals/sampleapp as the ROOT folder of VS Code!",
    )
    add_card(
        s8, 0.6, 2.05, 6.2, 4.65,
        "Follow These 4 Simple Clicks",
        [
            "1. Click File → Open Folder... in VS Code",
            "2. Select workshop/Fundamentals/sampleapp and click Trust",
            "3. Open Terminal (Ctrl + `) and run node --version",
            "4. Open Chat (Ctrl + Alt + I), choose Agent / Autopilot, and pick a Frontier Model at standard / Medium reasoning!",
        ],
        accent=ACCENT_CYAN,
        title_pt=18,
        body_pt=14,
    )
    add_code_panel(
        s8, 7.1, 2.05, 5.63, 2.35,
        "TERMINAL CHECK",
        [
            "PS sampleapp> node --version",
            "v22.23.5   ✓ Ready!",
            "",
            "# Folder should look totally empty!",
        ],
        accent=ACCENT_GREEN,
    )
    add_card(
        s8, 7.1, 4.62, 5.63, 2.08,
        "Why Open sampleapp Directly?",
        [
            "VS Code looks for .github/copilot-instructions.md at the top of your open folder — opening sampleapp makes you the boss!",
        ],
        accent=ACCENT_AMBER,
        fill_rgb=BG_CARD_ALT,
        title_pt=16.5,
        body_pt=13.5,
    )
    add_footer(s8, 8, total)

    # ---------------- SLIDE 9: LAB 00 RECAP ----------------
    s9 = add_blank_slide(prs, "Quick 60-second thumbs-up check around the room before pasting Prompt #1.")
    add_header(
        s9,
        "LAB 00 RECAP  ·  HIGH-FIVE CHECK",
        ACCENT_GREEN,
        "Everyone Ready in Their Clean Sandbox?",
        "Give your neighbor a thumbs-up when all 3 boxes are green:",
    )
    add_card(s9, 0.6, 2.15, 3.85, 3.9, "✓  Node v22+ Works", ["Terminal printed v22 or newer", "Zero extra tools needed"], ACCENT_GREEN)
    add_card(s9, 4.72, 2.15, 3.85, 3.9, "✓  Empty sampleapp Root", ["Explorer sidebar shows sampleapp", "Folder is trusted and clean"], ACCENT_CYAN)
    add_card(s9, 8.84, 2.15, 3.89, 3.9, "✓  Frontier Agent Ready", ["Chat is in Agent / Autopilot mode", "Sonnet 5.5, GPT, or Gemini picked"], ACCENT_PURPLE)
    add_footer(s9, 9, total)

    # ---------------- SLIDE 10: LAB 01 ----------------
    s10 = add_blank_slide(
        prs,
        "Lab 01 is only 8 minutes and finishes in ~1 minute of Copilot generation! Show learners where 'References' appears at the top of Copilot's reply afterward.",
    )
    add_header(
        s10,
        "LAB 01  ·  8 MINUTES",
        ACCENT_AMBER,
        "Write Copilot's Magic Rulebook!",
        "Paste the Lab 01 prompt into Chat so Copilot builds our 3 foundation files:",
    )
    add_card(
        s10, 0.6, 2.05, 5.95, 4.65,
        "What Prompt #1 Creates for You",
        [
            "1. .github/copilot-instructions.md — strict Zero-Package Rule!",
            "2. package.json — npm start, npm test, npm run check (NO dependencies section at all!)",
            "3. .gitignore — keeps local cache files neat and tidy",
            "Click Keep when Copilot finishes!",
        ],
        accent=ACCENT_AMBER,
        title_pt=17.5,
        body_pt=14,
    )
    add_code_panel(
        s10, 6.85, 2.05, 5.88, 4.65,
        ".github/copilot-instructions.md",
        [
            "# Ground Rules for Copilot",
            "- ZERO NPM PACKAGES ALLOWED!",
            "- Never run npm install",
            "- Backend: only node:http, node:fs...",
            "- Tests: only node:test & node:assert",
            "- Frontend: plain HTML/CSS/JS + SVG",
            "- Bind strictly to 127.0.0.1 (read-only)",
        ],
        accent=ACCENT_CYAN,
    )
    add_footer(s10, 10, total)

    # ---------------- SLIDE 11: LAB 01 RECAP ----------------
    s11 = add_blank_slide(prs, "Point out the References dropdown in Copilot Chat—students love seeing Copilot automatically read their rulebook!")
    add_header(
        s11,
        "LAB 01 RECAP  ·  HIGH-FIVE CHECK",
        ACCENT_GREEN,
        "Look! Copilot Now Reads Your Rulebook Automatically",
        "From now on, every prompt you send follows your Zero-Package Rule!",
    )
    add_card(
        s11, 0.6, 2.1, 5.9, 4.35,
        "Peek Inside package.json",
        [
            "✓  \"type\": \"module\" is enabled",
            "✓  No \"dependencies\" block anywhere!",
            "✓  No \"devDependencies\" block anywhere!",
            "✓  No giant node_modules folder on disk!",
        ],
        accent=ACCENT_GREEN,
    )
    add_card(
        s11, 6.8, 2.1, 5.93, 4.35,
        "Cool Pro Trick to Spot in Chat",
        [
            "Expand 'Used 1 reference' at the top of Copilot's next reply",
            "You'll see .github/copilot-instructions.md attached automatically!",
            "That's how real engineering teams keep AI assistants on track.",
        ],
        accent=ACCENT_PURPLE,
        fill_rgb=BG_CARD_ALT,
    )
    add_footer(s11, 11, total)

    # ---------------- SLIDE 12: LAB 02 ----------------
    s12 = add_blank_slide(
        prs,
        "Lab 02 builds the engine under the hood: Myers line diff, dual-format parser (VS Code + Agent Host), and background child-process search indexer.",
    )
    add_header(
        s12,
        "LAB 02  ·  15 MINUTES",
        ACCENT_PURPLE,
        "Teach Node to Read Chats & Spot Code Changes!",
        "Paste the Lab 02 prompt to build 4 smart backend helpers + automated tests:",
    )
    modules = [
        ("src/diff.js", ["Spot-the-Difference engine!", "Compares old vs. new code line by line (+ green / − red)"], ACCENT_GREEN),
        ("src/parser.js", ["Reads BOTH VS Code chatSessions AND Agent events.jsonl + workspace.yaml!"], ACCENT_CYAN),
        ("src/indexer.js", ["Runs in a background helper process so big chats never freeze your app"], ACCENT_AMBER),
        ("src/library.js", ["Remembers summaries on disk & searches every word in milliseconds!"], ACCENT_PURPLE),
    ]
    for idx, (mtitle, mbullets, col) in enumerate(modules):
        col_x = 0.6 + (idx % 2) * 6.2
        row_y = 2.05 + (idx // 2) * 2.38
        add_card(s12, col_x, row_y, 5.92, 2.18, mtitle, mbullets, accent=col, title_pt=17.5, body_pt=13.8)
    add_footer(s12, 12, total)

    # ---------------- SLIDE 13: LAB 02 RECAP ----------------
    s13 = add_blank_slide(prs, "Celebrate seeing npm test print green 'ok' lines with zero testing libraries installed!")
    add_header(
        s13,
        "LAB 02 RECAP  ·  HIGH-FIVE CHECK",
        ACCENT_GREEN,
        "Green Checkmarks! Your Engine Reads History & Diffs",
        "Run npm test in Terminal — watch Node's built-in test runner verify everything!",
    )
    add_code_panel(
        s13, 0.6, 2.05, 5.65, 4.55,
        "PS sampleapp> npm test",
        [
            "✔ diffLines keeps newline tokens & merges chunks",
            "✔ replay blocks prototype pollution keys",
            "✔ discover finds VS Code & Agent formats",
            "✔ loadSession pairs tools & edit diffs",
            "✔ library indexes & searches both formats",
            "",
            "# pass 15+  |  fail 0  |  0 npm packages!",
        ],
        accent=ACCENT_GREEN,
    )
    add_framed_screenshot(s13, SHOTS / "07-file-diff-view.png", 6.55, 2.1, 6.15, "Powered by src/diff.js  ·  Before vs. After Diff", ACCENT_GREEN)
    add_footer(s13, 13, total)

    # ---------------- SLIDE 14: LAB 03 ----------------
    s14 = add_blank_slide(
        prs,
        "Lab 03 proves you don't need Express to build a secure JSON API and static file server in Node.js!",
    )
    add_header(
        s14,
        "LAB 03  ·  10 MINUTES",
        ACCENT_CYAN,
        "Build Your Private Web Server (No Express Needed!)",
        "Paste the Lab 03 prompt so Copilot creates src/server.js using pure node:http:",
    )
    add_card(
        s14, 0.6, 2.05, 5.7, 4.65,
        "What src/server.js Protects & Serves",
        [
            "Locks the door to 127.0.0.1:3210 (only YOUR computer can visit!)",
            "Blocks sneaky cross-site websites with 403 Forbidden",
            "Auto-detects your computer's default VS Code & Agent chat folders",
            "Serves /api/sessions, /api/import, /api/search & static files!",
        ],
        accent=ACCENT_CYAN,
        title_pt=17.5,
        body_pt=13.8,
    )
    add_framed_screenshot(s14, SHOTS / "02-open-vscode-dialog.png", 6.6, 2.1, 6.1, "Default workspaceStorage Path Pre-Filled!", ACCENT_CYAN)
    add_footer(s14, 14, total)

    # ---------------- SLIDE 15: LAB 03 RECAP ----------------
    s15 = add_blank_slide(prs, "Quick check: npm run check && npm test both pass with 0 errors, and Agent sessions also get their own default path!")
    add_header(
        s15,
        "LAB 03 RECAP  ·  HIGH-FIVE CHECK",
        ACCENT_GREEN,
        "Two Smart Doors Ready for Your Browser!",
        "Run npm run check and npm test — your backend is 100% complete!",
    )
    add_card(
        s15, 0.6, 2.05, 5.7, 4.65,
        "Why Two Separate 'Open' Buttons?",
        [
            "Door #1 (Open session): pre-filled with VS Code workspaceStorage",
            "Door #2 (Agent sessions): pre-filled with .copilot\\session-state",
            "No hunting through hidden Windows or Mac folders — just click Open!",
            "All 20+ backend & security tests pass!",
        ],
        accent=ACCENT_PURPLE,
        title_pt=17.5,
        body_pt=13.8,
    )
    add_framed_screenshot(s15, SHOTS / "03-open-agent-dialog.png", 6.6, 2.1, 6.1, "Default .copilot\\session-state Path Pre-Filled!", ACCENT_PURPLE)
    add_footer(s15, 15, total)

    # ---------------- SLIDE 16: LAB 04 ----------------
    s16 = add_blank_slide(
        prs,
        "Lab 04 has two quick prompts: Step 1 builds icons.js + markdown.js (SVG icons, Markdown, sanitizer, code highlighter), and Step 2 builds index.html, styles.css, and app.js!",
    )
    add_header(
        s16,
        "LAB 04  ·  20 MINUTES",
        ACCENT_CORAL,
        "Paint the Interactive Browser Explorer UI!",
        "Two fun prompts build our entire zero-package frontend in public/:",
    )
    add_card(
        s16, 0.6, 2.05, 5.7, 2.22,
        "Prompt 1: Icons, Markdown & Safety Shield",
        [
            "public/icons.js — 60+ crisp SVG icons drawn right in code",
            "public/markdown.js — tables, colored code & HTML sanitizer!",
        ],
        accent=ACCENT_AMBER,
        title_pt=16.5,
        body_pt=13.5,
    )
    add_card(
        s16, 0.6, 4.45, 5.7, 2.25,
        "Prompt 2: Full Explorer + Dark & White Themes",
        [
            "Sortable session list (Date Newest/Oldest & Name A → Z / Z → A)",
            "Big, comfy fonts + high-contrast Bright White Mode!",
        ],
        accent=ACCENT_CORAL,
        title_pt=16.5,
        body_pt=13.5,
    )
    add_framed_screenshot(s16, SHOTS / "05-library-light-mode.png", 6.6, 2.1, 6.1, "High-Contrast Bright White Mode + Name (A → Z) Sort", ACCENT_AMBER)
    add_footer(s16, 16, total)

    # ---------------- SLIDE 17: LAB 04 LIVE TREASURE HUNT ----------------
    s17 = add_blank_slide(
        prs,
        "Everyone runs npm start and opens http://127.0.0.1:3210/! Have them find the very workshop conversation they are having right now inside Agent sessions!",
    )
    add_header(
        s17,
        "LAB 04 LIVE PLAYTIME!",
        ACCENT_GREEN,
        "Run npm start & Explore http://127.0.0.1:3210/",
        "Try this 5-item Treasure Hunt inside your brand-new Chronicle app:",
    )
    add_card(
        s17, 0.6, 2.05, 5.7, 4.65,
        "Your 5-Minute Live Treasure Hunt",
        [
            "1. Click Open session → load your VS Code workspaceStorage chats",
            "2. Click Agent sessions → find TODAY'S workshop chat live!",
            "3. Sort your library A → Z, then click the Sun icon for White Mode",
            "4. Click Read full session & inspect a green/red File Diff",
            "5. Press Ctrl + Shift + F to search across ALL sessions at once!",
        ],
        accent=ACCENT_GREEN,
        title_pt=17.5,
        body_pt=13.6,
    )
    add_framed_screenshot(s17, SHOTS / "08-global-search.png", 6.6, 2.1, 6.1, "Instant Search Across Every Conversation", ACCENT_GREEN)
    add_footer(s17, 17, total)

    # ---------------- SLIDE 18: CELEBRATION & NEXT STEPS ----------------
    s18 = add_blank_slide(
        prs,
        "Big applause! Summarize everything they built from an empty folder with zero packages, and invite them to the Advanced Workshop!",
    )
    add_header(
        s18,
        "MISSION COMPLETE!",
        ACCENT_AMBER,
        "Look What You Built from an Empty Folder in 1 Hour!",
        "Zero npm packages. Real automated tests. Your own local AI chat observatory!",
    )
    add_card(
        s18, 0.6, 2.05, 5.85, 4.65,
        "Skills You Now Own Forever",
        [
            "✓  Writing .github/copilot-instructions.md guardrails",
            "✓  Building pure Node.js apps (node:http + node:test)",
            "✓  Parsing JSONL logs, Myers diffs & safe HTML sanitizing",
            "✓  Prompting, verifying & testing step by step like a pro!",
        ],
        accent=ACCENT_GREEN,
        title_pt=18,
        body_pt=14,
    )
    add_card(
        s18, 6.85, 2.05, 5.88, 4.65,
        "Coming Next: Advanced Workshop (90 Min)",
        [
            "→  Build an Orchestrator + 4 Specialist Agents (Dev, Test, Security, Docs) with Custom Skills!",
            "→  Connect Microsoft Foundry AI to summarize sessions into <session>-summary.md handoff docs",
            "→  Package Chronicle into a Windows Desktop App & Installer!",
        ],
        accent=ACCENT_PURPLE,
        fill_rgb=BG_CARD_ALT,
        title_pt=18,
        body_pt=14,
    )
    add_footer(s18, 18, total)

    out_path = CONTENT_DIR / "Fundamentals-Workshop-Deck.pptx"
    return save_safe(prs, out_path)


def build_instructor_deck() -> Path:
    prs = new_presentation()
    total = 10
    footer_lbl = "Chronicle Fundamentals  ·  Instructor Coaching & Delivery Playbook"

    # Slide 1: Title
    s1 = add_blank_slide(prs, "Facilitator playbook for delivering the 60-minute Chronicle Fundamentals Hands-On Lab.")
    add_pill(s1, 0.6, 0.55, 3.8, 0.40, "INSTRUCTOR PLAYBOOK  ·  FUNDAMENTALS", ACCENT_PURPLE, INK_WHITE, 11)
    tb = s1.shapes.add_textbox(Inches(0.6), Inches(1.2), Inches(6.0), Inches(2.2))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Delivering Chronicle Fundamentals"
    p.font.name = FONT_HEAD
    p.font.size = Pt(38)
    p.font.bold = True
    p.font.color.rgb = INK_WHITE
    p2 = tf.add_paragraph()
    p2.text = "Scenario, Kid-Friendly Coaching, Pacing & Live Troubleshooting"
    p2.font.name = FONT_BODY
    p2.font.size = Pt(18.5)
    p2.font.color.rgb = ACCENT_CYAN
    p2.space_before = Pt(8)

    add_card(
        s1, 0.6, 3.55, 5.8, 3.05,
        "Instructor Mission",
        [
            "Guide complete beginners from an empty folder to a tested, zero-package Node.js web app in 60 minutes",
            "Keep explanations playful, visual, and jargon-free",
            "Model disciplined AI habits: Rulebook → Prompt → Peek → Test!",
        ],
        accent=ACCENT_PURPLE,
    )
    add_framed_screenshot(s1, SHOTS / "06-full-story-view.png", 6.65, 1.35, 6.05, "Target Learner Outcome  ·  http://127.0.0.1:3210/", ACCENT_PURPLE)
    add_footer(s1, 1, total, footer_lbl)

    # Slide 2: Scenario & Pedagogical Hook
    s2 = add_blank_slide(prs, "Why this scenario hooks beginners and experienced devs alike.")
    add_header(s2, "THE SCENARIO", ACCENT_CYAN, "Why 'Chronicle' + 'Zero Packages' Hooks Every Learner", "A tangible, personal payoff with zero npm/firewall friction:")
    add_card(
        s2, 0.6, 2.05, 5.85, 4.65,
        "Immediate Personal Payoff",
        [
            "Learners inspect THEIR OWN real VS Code and Agent chats at the end of Lab 04!",
            "Makes abstract AI concepts (prompts, reasoning, tool calls, diffs) visible and concrete",
            "No cloud keys, Azure accounts, or paid APIs required in Fundamentals",
        ],
        accent=ACCENT_CYAN,
    )
    add_card(
        s2, 6.85, 2.05, 5.88, 4.65,
        "Zero Classroom Wi-Fi / Firewall Failures",
        [
            "Zero npm install calls = zero registry timeouts or corporate proxy blocks!",
            "Proves how powerful .github/copilot-instructions.md is: without it, every LLM reaches for express + marked",
            "Sets up the clean baseline app used in the Advanced Workshop",
        ],
        accent=ACCENT_GREEN,
        fill_rgb=BG_CARD_ALT,
    )
    add_footer(s2, 2, total, footer_lbl)

    # Slide 3: Pre-Flight Room Readiness
    s3 = add_blank_slide(prs, "Check these 4 items 10 minutes before kicking off.")
    add_header(s3, "PRE-FLIGHT CHECKLIST", ACCENT_AMBER, "Instructor Setup 10 Minutes Before Doors Open", "Eliminate 90% of setup stalls before Lab 00 starts:")
    add_card(s3, 0.6, 2.05, 5.85, 2.2, "1. Demo App Pre-Running on Port 3210", ["Start a finished copy at http://127.0.0.1:3210/ to show the finish line in the first 2 minutes!"], ACCENT_CYAN)
    add_card(s3, 6.85, 2.05, 5.88, 2.2, "2. Node.js v22+ Verified", ["Built-in node:test and node:http require modern Node (v22 or v24 LTS recommended)."], ACCENT_GREEN)
    add_card(s3, 0.6, 4.48, 5.85, 2.2, "3. Frontier Model + Medium Reasoning", ["Recommend Claude Sonnet 5.5, GPT-6.1 Sol, or Gemini 4 at Medium effort (High reasoning can double turn time to 10+ min!)."], ACCENT_AMBER)
    add_card(s3, 6.85, 4.48, 5.88, 2.2, "4. Permissions Set to Assisted / Allow All", ["In isolated sampleapp folders, Assisted or Allow all prevents students missing hidden 'Allow terminal' prompts."], ACCENT_PURPLE)
    add_footer(s3, 3, total, footer_lbl)

    # Slide 4: Run-of-Show Pacing Table
    s4 = add_blank_slide(prs, "Minute-by-minute run-of-show with instructor cues.")
    add_header(s4, "RUN OF SHOW", ACCENT_BLUE, "60-Minute Lab Pacing & Facilitator Cues", "Keep energy high with short micro-demos and loud group checkpoints:")
    ros = [
        ("Clock", "Lab Stage", "Facilitator Action", "Watch-For Signal"),
        ("00–07m", "Lab 00 · Setup (7m)", "Live-demo finished app (90s), guide Open Folder -> sampleapp", "Check Explorer title says SAMPLEAPP"),
        ("07–15m", "Lab 01 · Rulebook (8m)", "Paste Prompt #1 together; spotlight 'Used 1 reference' badge", "Confirm 0 dependencies in package.json"),
        ("15–30m", "Lab 02 · Parser & Diff (15m)", "Explain LEGO diff/replay story while Copilot codes (~4m)", "Everyone sees green pass in npm test"),
        ("30–40m", "Lab 03 · HTTP Server (10m)", "Explain 127.0.0.1 lock-and-key while Copilot builds server.js", "npm run check && npm test pass"),
        ("40–60m", "Lab 04 · Browser UI (20m)", "Run Step 1 then Step 2; lead group Treasure Hunt on :3210!", "Learners open their own live Agent chat!"),
    ]
    t_s = s4.shapes.add_table(len(ros), 4, Inches(0.6), Inches(2.02), Inches(12.13), Inches(4.7))
    tb_obj = t_s.table
    for idx, w in enumerate([Inches(1.35), Inches(2.55), Inches(4.88), Inches(3.35)]):
        tb_obj.columns[idx].width = w
    for r_i, row in enumerate(ros):
        for c_i, val in enumerate(row):
            c = tb_obj.cell(r_i, c_i)
            c.vertical_anchor = MSO_ANCHOR.MIDDLE
            c.fill.solid()
            c.fill.fore_color.rgb = RGBColor(38, 52, 88) if r_i == 0 else (BG_CARD if r_i % 2 == 1 else BG_CARD_ALT)
            p = c.text_frame.paragraphs[0]
            p.text = val
            p.font.name = FONT_HEAD if (r_i == 0 or c_i == 0) else FONT_BODY
            p.font.size = Pt(12.8)
            p.font.bold = r_i == 0 or c_i == 0
            p.font.color.rgb = ACCENT_CYAN if r_i == 0 else (ACCENT_AMBER if c_i == 0 else (ACCENT_GREEN if c_i == 3 else INK_WHITE))
    add_footer(s4, 4, total, footer_lbl)

    # Slide 5: Coaching Techniques for Kids & Beginners
    s5 = add_blank_slide(prs, "How to fill the 2-4 minute AI generation windows productively.")
    add_header(s5, "COACHING TECHNIQUES", ACCENT_GREEN, "How to Coach Like a Pro During AI Generation Windows", "Turn Copilot's 2–4 minute coding turns into active learning moments:")
    add_card(
        s5, 0.6, 2.05, 3.85, 4.65,
        "Narrate the 'Why', Not Syntax",
        [
            "Use kid-friendly metaphors: LEGO bricks (built-ins), Rulebook (copilot-instructions), Detective Clues (.jsonl)",
            "Never lecture on regexes — celebrate what each file DOES!",
        ],
        accent=ACCENT_CYAN,
    )
    add_card(
        s5, 4.72, 2.05, 3.85, 4.65,
        "Teach 'Trust, But Verify'",
        [
            "Have students open package.json after Lab 01 to prove dependencies is gone",
            "Always run npm test in Terminal — green tests beat guessing!",
        ],
        accent=ACCENT_GREEN,
    )
    add_card(
        s5, 8.84, 2.05, 3.89, 4.65,
        "Pair-Buddy Checkpoints",
        [
            "Use 'Turn & Show Your Neighbor' at the end of every lab",
            "Fast finishers become ' Rocket Helpers' for neighbors waiting on a turn!",
        ],
        accent=ACCENT_AMBER,
    )
    add_footer(s5, 5, total, footer_lbl)

    # Slide 6: Troubleshooting Pitfalls #1 & #2
    s6 = add_blank_slide(prs, "Real pitfalls discovered during live Playwright validation of the labs!")
    add_header(s6, "TROUBLESHOOTING  ·  PART 1", ACCENT_CORAL, "Common Learner Pitfalls & 30-Second Rescues (1 of 2)", "Battle-tested fixes from full automated Playwright classroom runs:")
    add_card(
        s6, 0.6, 2.05, 5.85, 4.65,
        "Pitfall 1: Copilot Didn't Read copilot-instructions.md",
        [
            "Symptom: 'Used 1 reference' doesn't show .github/copilot-instructions.md, or Copilot tries npm install.",
            "Cause: Student opened parent repo folder instead of workshop/Fundamentals/sampleapp!",
            "30s Fix: File → Open Folder → select sampleapp directly. Delete any node_modules folder if created.",
        ],
        accent=ACCENT_CORAL,
    )
    add_card(
        s6, 6.85, 2.05, 5.88, 4.65,
        "Pitfall 2: Copilot Paused Waiting for Confirmation",
        [
            "Symptom: Chat spinner sits still for 2+ minutes with '1 confirmation pending'.",
            "Cause: Manual permissions mode is waiting for student to click Allow / Continue on node --test or Keep on edits.",
            "30s Fix: Click Allow / Keep in Chat, and switch Permissions dropdown to Assisted or Allow all.",
        ],
        accent=ACCENT_AMBER,
        fill_rgb=BG_CARD_ALT,
    )
    add_footer(s6, 6, total, footer_lbl)

    # Slide 7: Troubleshooting Pitfalls #3 & #4
    s7 = add_blank_slide(prs, "Windows EBUSY file locks and external MCP browser tool distractions—both solved in our lab prompts, plus rescue commands if encountered.")
    add_header(s7, "TROUBLESHOOTING  ·  PART 2", ACCENT_CORAL, "Common Learner Pitfalls & 30-Second Rescues (2 of 2)", "Platform quirks on Windows laptops & developer machines:")
    add_card(
        s7, 0.6, 2.05, 5.85, 4.65,
        "Pitfall 3: Windows EBUSY Lock or Port 3210 Busy",
        [
            "Symptom: EADDRINUSE: 127.0.0.1:3210 or EBUSY cleaning temp folder.",
            "Cause: Previous npm start terminal still running, or tests wrote inside workspace public/ while VS Code watched it.",
            "30s Fix: Press Ctrl+C in old terminal (or set $env:PORT=3211; npm start). Keep test fixtures in os.tmpdir()!",
        ],
        accent=ACCENT_CYAN,
    )
    add_card(
        s7, 6.85, 2.05, 5.88, 4.65,
        "Pitfall 4: Slow 8–10 Min Turn on Lab 04",
        [
            "Symptom: Copilot finishes writing public/*.js quickly, then spends 5+ min launching Chrome DevTools MCP tools or deep-thinking.",
            "Cause: Reasoning effort set to High/Max, or user has global browser MCP servers enabled.",
            "30s Fix: Set model reasoning effort to Medium; Lab 04 prompts explicitly tell Copilot to use node --check only!",
        ],
        accent=ACCENT_PURPLE,
        fill_rgb=BG_CARD_ALT,
    )
    add_footer(s7, 7, total, footer_lbl)

    # Slide 8: Emergency Catch-Up Valve
    s8 = add_blank_slide(prs, "Nobody ever gets stranded! Workshop/Advanced/sampleapp is the exact finished Fundamentals app.")
    add_header(s8, "EMERGENCY CATCH-UP VALVE", ACCENT_AMBER, "Running Out of Time or Laptop Joined 20 Minutes Late?", "We built a golden safety net right into the repository!")
    add_card(
        s8, 0.6, 2.05, 6.15, 4.65,
        "Instant Rescue Stage in the Repo",
        [
            "workshop/Advanced/sampleapp/ contains a clean, working copy of the completed Fundamentals web app!",
            "If a student's Wi-Fi drops in Lab 02 or Lab 03, copy missing src/ files from workshop/Advanced/sampleapp/src/ so they still build Lab 04 live",
            "Time-cut option: If 10 minutes behind at Lab 04, paste Step 1 & Step 2 back-to-back and focus 5 full minutes on live exploration!",
        ],
        accent=ACCENT_AMBER,
    )
    add_code_panel(
        s8, 7.05, 2.05, 5.68, 4.65,
        "UNIVERSAL RESCUE PROMPT",
        [
            "Run npm run check and npm test,",
            "inspect any failing assertion or",
            "syntax error, and fix the bug in",
            "src/ or public/ without adding",
            "any npm packages until all checks",
            "and tests pass!",
        ],
        accent=ACCENT_GREEN,
    )
    add_footer(s8, 8, total, footer_lbl)

    # Slide 9: Facilitating the Live Show-and-Tell
    s9 = add_blank_slide(prs, "Questions to ask during the final 5-minute Show & Tell.")
    add_header(s9, "RECAP & DEBRIEF PROMPTS", ACCENT_GREEN, "3 Fun Questions to Ask at the Finish Line", "Lock in the learning while everyone has http://127.0.0.1:3210/ open:")
    add_card(
        s9, 0.6, 2.05, 5.7, 4.65,
        "Ask the Room!",
        [
            "1. 'Who found TODAY'S workshop chat inside Agent sessions? What tools did Copilot run under the hood?'",
            "2. 'What would Copilot have done on Lab 03 if we hadn't created .github/copilot-instructions.md in Lab 01?' (Answer: Installed Express!)",
            "3. 'Flip to White Mode and click a File Diff — why is read-only + 127.0.0.1 so important for developer tools?'",
        ],
        accent=ACCENT_GREEN,
    )
    add_framed_screenshot(s9, SHOTS / "05-library-light-mode.png", 6.6, 2.1, 6.1, "Verify High-Contrast White Mode & Sorting Together", ACCENT_GREEN)
    add_footer(s9, 9, total, footer_lbl)

    # Slide 10: Bridge to Advanced Workshop
    s10 = add_blank_slide(prs, "Bridge from single-agent prompt engineering in Fundamentals to multi-agent orchestration + skills in Advanced.")
    add_header(s10, "BRIDGING TO ADVANCED", ACCENT_PURPLE, "Teasing Session 2: From Solo Agent to Multi-Agent Team!", "Show how Fundamentals sets the stage for the 90-minute Advanced Workshop:")
    add_card(
        s10, 0.6, 2.05, 5.85, 4.65,
        "Today (Fundamentals · 60 Min)",
        [
            "✓  1 Developer + 1 Frontier Agent + 1 Rulebook",
            "✓  Zero-package Node.js parser, diff engine, server & UI",
            "✓  Direct sequential prompts (Labs 00 → 04)",
        ],
        accent=ACCENT_CYAN,
    )
    add_card(
        s10, 6.85, 2.05, 5.88, 4.65,
        "Next Session (Advanced · 90 Min)",
        [
            "→  1 Orchestrator Agent dispatching to Dev, Test, Security & Docs Specialist Agents + reusable SKILL.md packs",
            "→  Microsoft Foundry AI session-handoff summaries (<session>-summary.md)",
            "→  Electron Desktop App + Windows NSIS Setup Installer!",
        ],
        accent=ACCENT_PURPLE,
        fill_rgb=BG_CARD_ALT,
    )
    add_footer(s10, 10, total, footer_lbl)

    out_path = CONTENT_DIR / "Instructor-Delivery-Guide.pptx"
    return save_safe(prs, out_path)


if __name__ == "__main__":
    p1 = build_fundamentals_deck()
    p2 = build_instructor_deck()
    print(f"Built editable decks:\n  - {p1}\n  - {p2}")
