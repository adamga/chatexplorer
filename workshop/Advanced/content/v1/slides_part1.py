"""Slides 01–17: Opening, Part 1 (Where Agents Run, Harnesses, Agent Host, Context), Part 2 (Markdown Control)."""
from __future__ import annotations

from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Pt

from deck_lib import (
    C_AMBER, C_BLUE, C_BORDER, C_BORDER_SLATE, C_CARD, C_CARD_ALT, C_CODE_BG,
    C_CYAN, C_DEEP_AMBER, C_DEEP_BLUE, C_DEEP_PURPLE, C_DEEP_RED, C_FOREST,
    C_GREEN, C_MINT, C_MUTED, C_PINK, C_PURPLE, C_RED, C_TEXT, C_WHITE,
    FONT_MONO, FONT_SANS, SlideCanvas, pt,
)


def build_slides_1_to_17(add_slide):
    # 01 — Cover (BOC image23.png hero artwork + GitHub mark)
    c: SlideCanvas = add_slide("Opening", "Advanced: Agents, Skills & Subagents", bg_media="image23.png", footer=False, header=False)
    c.slide.shapes.add_picture(c.assets.bytes_of("image22.png"), pt(42), pt(34), width=pt(28), height=pt(28))
    c.textbox(78, 38, 420, 22, "GITHUB COPILOT  ·  ADVANCED HANDS-ON WORKSHOP", size=10.5, color=C_GREEN, bold=True, rich=False)
    c.textbox(42, 108, 600, 128, "Advanced Copilot:\nAgents, Skills & Subagents", size=38.0, color=C_WHITE, bold=True, rich=False, line_spacing=1.08)
    c.textbox(42, 248, 555, 64, "Engineer a coordinated multi-agent team, reusable Markdown skills,\nand a Microsoft Foundry session handoff for **Chronicle**.", size=15.0, color=C_TEXT)
    c.pill(42, 342, 185, 30, "90-Min Hands-On Labs", fill=C_FOREST, color=C_MINT, border=C_GREEN, size=10.0)
    c.pill(238, 342, 185, 30, "Zero External Packages", fill="12253A", color=C_WHITE, border=C_BLUE, size=10.0)
    c.pill(434, 342, 155, 30, "Node.js 22+  ·  VS Code", fill="26163E", color=C_WHITE, border=C_PURPLE, size=10.0)
    c.textbox(42, 488, 560, 22, "Surfaces  ·  Harnesses & Agent Host  ·  .agent.md & SKILL.md  ·  Hooks & Canvases  ·  Subagents", size=9.5, color=C_MUTED, bold=True, rich=False)
    c.mark_region("Hero Title", 36, 98, 610, 285, C_GREEN)

    # 02 — Agenda (v2 Slide 2 visual timeline)
    c = add_slide("PRESENT FIRST, THEN BUILD", "Workshop agenda & 90-minute lab clock")
    rows = [
        ("Part 1", "Where agents run, harnesses, Agent Host & context budget", "Concept", "TALK", C_PURPLE),
        ("Part 2", "Controlling agents (`.agent.md`) & skills (`SKILL.md`) in Markdown", "Concept", "TALK", C_PURPLE),
        ("Part 3", "Hooks, Canvases, structuring `.github/` & subagent orchestration", "Concept", "TALK", C_PURPLE),
        ("00:00", "Lab 00 · Verify zero-package baseline, surfaces & Foundry sheet", "8 min", "LAB", C_BLUE),
        ("00:08", "Lab 01 · Build `Chronicle Orchestrator` + 4 role subagents", "17 min", "LAB", C_GREEN),
        ("00:25", "Lab 02 · Author 4 domain `SKILL.md` playbooks & wire team", "15 min", "LAB", C_GREEN),
        ("00:40", "Lab 03 · Foundry `.env` OAuth2 config, `/agentconfig` & live `READY`", "15 min", "LAB", C_AMBER),
        ("00:55", "Lab 04 · Token-bounded session handoff summarizer & log popup", "18 min", "LAB", C_AMBER),
        ("01:13", "Lab 05 · Pure-Node browser icon release & Electron sandbox tour", "17 min", "LAB", C_CYAN),
    ]
    for i, (clock, desc, dur, tag, col) in enumerate(rows):
        y = 92 + i * 42
        c.rect(38, y, 884, 36, fill=C_CARD if tag == "LAB" else C_CARD_ALT, border=C_BORDER if tag == "LAB" else C_BORDER_SLATE, rounded=True, radius=0.12)
        c.textbox(52, y + 8, 72, 20, clock, size=10.5, color=col, bold=True, font=FONT_MONO, rich=False)
        c.textbox(132, y + 7, 575, 22, desc, size=11.5, color=C_WHITE if tag == "LAB" else C_TEXT)
        c.textbox(720, y + 8, 75, 20, dur, size=10.5, color=C_MUTED, bold=True, align=PP_ALIGN.RIGHT, rich=False)
        c.pill(812, y + 6, 94, 24, tag, fill=C_FOREST if tag == "LAB" else "271745", color=C_MINT if tag == "LAB" else "E9D5FF", border=col, size=8.8)
    c.mark_region("Concept Parts 1-3", 38, 92, 884, 124, C_PURPLE)
    c.mark_region("Labs 00-05 (90m)", 38, 218, 884, 250, C_GREEN)

    # 03 — Outcomes & Running Example (v2 Slide 3 style)
    c = add_slide("WHAT YOU WILL LEAVE WITH", "Outcomes and the Chronicle running app")
    outcomes = [
        "**Choose the right surface & host:** IDE Chat, Agents Window, CLI, Copilot App, or Cloud",
        "**Separate UI, Harness & Agent Host:** know what runs your tools and owns session state",
        "**Control behavior in Markdown:** least-privilege `.agent.md` roles + on-demand `SKILL.md` playbooks",
        "**Add guardrails & shared surfaces:** deterministic lifecycle **Hooks** and interactive **Canvases**",
        "**Orchestrate subagents cleanly:** hub-and-spoke delegation without context bloat or edit collisions",
    ]
    c.bullets(38, 104, 515, 320, outcomes, size=12.5, bullet_char="✓", bullet_color=C_GREEN, gap_pt=11.0)
    c.mark_region("Learning Outcomes", 38, 100, 515, 320, C_GREEN)

    c.rect(575, 96, 347, 365, fill=C_CARD, border=C_BORDER, rounded=True, radius=0.03)
    c.rect(575, 96, 347, 4, fill=C_GREEN)
    c.textbox(595, 112, 305, 16, "RUNNING APPLICATION  ·  CHRONICLE", size=9.0, color=C_GREEN, bold=True, rich=False)
    c.textbox(595, 132, 305, 28, "Session Handoff Explorer", size=17.0, color=C_WHITE, bold=True, rich=False)
    c.textbox(595, 164, 308, 62, "Starts in `workshop/Advanced/sampleapp/`: a working **zero-package** Node.js 22+ web explorer for VS Code & Copilot chat logs.", size=10.8, color=C_TEXT)
    layers = [
        ("Lab 00 Baseline: read-only parser + diff UI", C_FOREST, C_WHITE),
        ("Labs 01–02: Orchestrator + 4 skilled subagents", C_DEEP_PURPLE, C_WHITE),
        ("Lab 03: Entra OAuth2 + Foundry `READY` check", C_DEEP_BLUE, C_WHITE),
        ("Labs 04–05: `<session>-summary.md` + release", C_DEEP_AMBER, C_WHITE),
    ]
    for idx, (lbl, fill_c, txt_c) in enumerate(layers):
        c.pill(595, 238 + idx * 50, 307, 38, lbl, fill=fill_c, color=txt_c, size=10.0)
    c.mark_region("Chronicle Stack", 575, 96, 347, 365, C_BLUE)
    c.callout_strip(472, "**Core invariant:** Zero runtime `dependencies` in `package.json` — built 100% with `node:*` modules & browser APIs.", C_GREEN)

    # 04 — Part 1 Section Divider (BOC image1.png)
    c = add_slide("", "", bg_media="image1.png", footer=True, header=False)
    c.textbox(48, 42, 480, 20, "PART 1  ·  ARCHITECTURE & SURFACES", size=10.5, color=C_GREEN, bold=True, rich=False)
    c.textbox(48, 175, 560, 145, "Where agents run,\nharnesses & the\nAgent Host", size=40.0, color=C_WHITE, bold=True, rich=False, line_spacing=1.06)
    c.textbox(48, 345, 510, 55, "IDE Chat  ·  VS Code Agents Window  ·  Copilot CLI  ·  GitHub Copilot App  ·  Context Budget", size=13.0, color=C_MINT)
    c.mark_region("Part 1 Title", 42, 165, 570, 235, C_GREEN)

    # 05 — From One Assistant to a Team of Agents (v2 Slide 5)
    c = add_slide("WHERE WE ARE", "From one assistant to a team of agents")
    stages = [
        ("1 · Suggest", "Inline completions\nas you type", C_FOREST, False),
        ("2 · Chat", "Ask questions,\nexplain & refactor", C_DEEP_BLUE, False),
        ("3 · Single Agent", "Multi-step loop,\ntools & test runs", "374151", False),
        ("4 · Agent Team", "Orchestrator + role\nsubagents in parallel", C_DEEP_PURPLE, True),
    ]
    for i, (head, sub, col, focus) in enumerate(stages):
        x = 38 + i * 226
        if focus:
            c.pill(x + 42, 102, 120, 22, "TODAY'S FOCUS", fill=C_PURPLE, color="0B0F14", size=8.5)
        c.rect(x, 132, 202, 118, fill=col, border=C_GREEN if focus else C_BORDER_SLATE, border_w=2.2 if focus else 1.0, rounded=True, radius=0.06)
        c.textbox(x + 12, 148, 178, 30, head, size=15.0, color=C_WHITE, bold=True, align=PP_ALIGN.CENTER, rich=False)
        c.textbox(x + 12, 184, 178, 50, sub, size=11.0, color=C_TEXT, align=PP_ALIGN.CENTER, rich=False)
        if i < 3:
            c.arrow(x + 204, 191, x + 224, 191, color=C_GREEN, width=2.0)
        c.mark_region(head, x, 130, 202, 122, C_PURPLE if focus else C_GREEN)
    c.bullets(38, 282, 884, 175, [
        "You already know inline completions, Chat, and single-agent mode — **this workshop is about what comes next**.",
        "Your role shifts from typing every line to **engineering the system**: defining roles, scoping tools, writing task briefs, and verifying diffs.",
        "Multiple agents only accelerate delivery when **context stays lean** and **file ownership never collides**.",
    ], size=13.0, gap_pt=10.0)

    # 06 — Where Agents Run: Five Surfaces, One Ecosystem (Topic 1)
    c = add_slide("WHERE AGENTS RUN  ·  TOPIC 1", "Five surfaces, one shared customization model")
    surfaces = [
        ("IDE · Chat View", C_GREEN, "IN EDITOR", [
            "Lives right beside your code, tabs & inline diffs in VS Code",
            "Ideal for surgical edits, `#file` inspection & debugging",
        ], "Used in Chronicle Labs 00–05"),
        ("VS Code · Agents Window", C_BLUE, "MULTI-SESSION", [
            "Open via `code --agents` or **Chat: Open Agents Window**",
            "Grid of parallel sessions across folders/worktrees + `Changes` pane",
        ], "Best for supervising multiple tasks"),
        ("GitHub Copilot CLI", C_PURPLE, "TERMINAL", [
            "Terminal-native `copilot` agent: `/plan`, `/fleet`, `/model`",
            "Scriptable with `-p` over SSH, containers & automation pipelines",
        ], "Best for terminal & headless flows"),
        ("GitHub Copilot App", C_AMBER, "DESKTOP APP", [
            "Dedicated desktop app built on the CLI runtime (Win/macOS/Linux)",
            "Parallel git worktrees, GitHub Issues, PR review & **Canvases**",
        ], "Best for repo-wide parallel PR flow"),
    ]
    for i, (title, acc, badge, buls, foot) in enumerate(surfaces):
        x = 38 + i * 224
        c.accent_card(x, 96, 212, 322, title, buls, accent=acc, badge=badge, footer_note=foot)
    c.callout_strip(434, "**5th Surface — Cloud Coding Agent:** Assign a GitHub Issue or `@copilot` PR task to run in an ephemeral GitHub Actions sandbox while your laptop sleeps — reading the **same** `.github/` instructions, skills, agents & hooks!", C_CYAN)
    c.mark_region("Cloud Coding Agent", 38, 434, 884, 32, C_CYAN)

    # 07 — Inside the Control Rooms: Agents Window vs Copilot App & CLI
    c = add_slide("SURFACE ANATOMY  ·  TOPIC 1", "Inside the Agents Window, CLI & Copilot App")
    # Left panel: VS Code Agents Window wireframe
    c.rect(38, 96, 430, 355, fill=C_CARD_ALT, border=C_BLUE, border_w=1.4, rounded=True, radius=0.03)
    c.textbox(54, 108, 398, 22, "VS CODE AGENTS WINDOW  (`code --agents`)", size=11.0, color=C_BLUE, bold=True)
    c.rect(54, 138, 108, 175, fill="0B131E", border=C_BORDER_SLATE, rounded=True)
    c.textbox(62, 146, 92, 155, "**Sessions**\n• Auth refactor\n• Icon release\n• OAuth mocks\n\n*Across repos*", size=9.5, color=C_TEXT)
    c.rect(170, 138, 172, 175, fill="09241A", border=C_GREEN, rounded=True)
    c.textbox(180, 146, 152, 155, "**Active Session Grid**\nMode: `Plan` / `Agent`\nIsolation: `New Worktree`\nHarness: `Copilot`\nLive tool approvals", size=9.5, color=C_TEXT)
    c.rect(350, 138, 102, 175, fill="0B131E", border=C_BORDER_SLATE, rounded=True)
    c.textbox(358, 146, 86, 155, "**Changes**\n• Branch\n• Session\n• Last turn\n• Preview", size=9.5, color=C_MINT)
    c.bullets(54, 326, 398, 115, [
        "Separate **agent command center** inside VS Code — distinct from the standalone Copilot App",
        "Always check the active **Branch vs Worktree** badge before approving file edits",
    ], size=10.5, bullet_color=C_BLUE)
    c.mark_region("VS Code Agents Window", 38, 96, 430, 355, C_BLUE)

    # Right panel: Copilot CLI + Copilot App workflow
    c.rect(492, 96, 430, 355, fill=C_CARD_ALT, border=C_PURPLE, border_w=1.4, rounded=True, radius=0.03)
    c.textbox(508, 108, 398, 22, "COPILOT CLI  &  GITHUB COPILOT APP", size=11.0, color=C_PURPLE, bold=True)
    c.code_box(508, 138, 398, 132, "terminal  ·  copilot", (
        "/plan     # Design file-level plan before any code edits\n"
        "/fleet    # Fan out independent subtasks to parallel subagents\n"
        "/model    # Pick frontier model & reasoning effort per task\n"
        "/delegate # Push session to Cloud Agent & open draft PR"
    ), accent=C_PURPLE, track_region=False)
    c.bullets(508, 282, 398, 158, [
        "**GitHub Copilot App** wraps the CLI engine in a native multi-workspace desktop UI",
        "Spins up isolated **git worktrees** per task from local folders, repos, or GitHub Issues",
        "Supports side-by-side **Canvases**, PR creation, CI status tracking & review",
    ], size=10.5, bullet_color=C_PURPLE)
    c.mark_region("Copilot CLI & App", 492, 96, 430, 355, C_PURPLE)
    c.callout_strip(465, "**Lab takeaway:** Chronicle labs run right inside VS Code — no separate CLI or App install required, and every skill/agent you write works across all of them.", C_GREEN)

    # 08 — Mode · Permissions · Isolation (v2 Slide 9 3-dial matrix)
    c = add_slide("THREE SEPARATE CHOICES", "Mode · Permissions · Isolation")
    dials = [
        ("1 · Mode", "How the agent collaborates with you", C_GREEN, [
            ("Ask / Interactive", "Turn-by-turn Q&A and guided edits", C_FOREST),
            ("Plan", "Agree on architecture & file scope first", C_DEEP_BLUE),
            ("Agent / Autopilot", "Autonomous multi-step loop until verified", C_DEEP_PURPLE),
        ]),
        ("2 · Permissions", "When tools require human approval", C_BLUE, [
            ("Ask every time", "Explicitly approve commands & writes", C_FOREST),
            ("Assisted", "Auto-approve safe reads; gate risky actions", C_DEEP_BLUE),
            ("Approve all", "Unattended execution — use ONLY in sandboxes", C_DEEP_RED),
        ]),
        ("3 · Isolation", "Where file edits & commands execute", C_AMBER, [
            ("Current checkout", "Edits your open folder directly", "374151"),
            ("Git worktree", "Separate working copy + branch on disk", C_DEEP_BLUE),
            ("Cloud / Local sandbox", "Isolated container or ephemeral VM", C_DEEP_AMBER),
        ]),
    ]
    for i, (head, sub, acc, pills) in enumerate(dials):
        x = 38 + i * 300
        c.rect(x, 96, 284, 344, fill=C_CARD, border=C_BORDER, rounded=True, radius=0.03)
        c.rect(x, 96, 284, 3.5, fill=acc)
        c.textbox(x + 16, 110, 252, 26, head, size=16.0, color=C_WHITE, bold=True, rich=False)
        c.textbox(x + 16, 138, 252, 22, sub, size=10.5, color=C_MUTED, rich=False)
        for j, (p_title, p_desc, p_fill) in enumerate(pills):
            py = 174 + j * 82
            c.rect(x + 16, py, 252, 68, fill=p_fill, border=acc if j == 1 else None, rounded=True, radius=0.08)
            c.textbox(x + 26, py + 8, 232, 22, p_title, size=12.5, color=C_WHITE, bold=True, rich=False)
            c.textbox(x + 26, py + 32, 232, 30, p_desc, size=9.8, color=C_TEXT, rich=False)
        c.mark_region(head, x, 96, 284, 344, acc)
    c.callout_strip(456, "**Critical distinction:** A **Plan** is not a permission boundary, and a **Git worktree** isolates files—not `.env` secrets or machine access!", C_AMBER)

    # 09 — Harnesses and the Agent Host (Topic 2 — v2 Slide 10 + Runtime Diagram)
    c = add_slide("SAME WINDOW, DIFFERENT ENGINES  ·  TOPIC 2", "Harnesses and the Agent Host")
    harnesses = [
        ("Copilot Harness", C_GREEN, "Copilot SDK runtime — shared engine across VS Code, CLI & Copilot App. **Used in our labs.**"),
        ("Local Harness", C_BLUE, "VS Code's built-in editor harness; tightly coupled to open IDE UI features & `handoffs`."),
        ("Claude Harness", C_PURPLE, "Anthropic Claude Agent SDK runtime integrated into VS Code (subject to org policy)."),
        ("Codex Harness", C_AMBER, "OpenAI Codex agent harness integration (subject to org enablement)."),
    ]
    for i, (h_name, acc, desc) in enumerate(harnesses):
        x = 38 + i * 224
        c.accent_card(x, 94, 212, 168, h_name, desc, accent=acc, badge="HARNESS")

    # Visual Architecture Strip: UI Client -> Agent Host -> Harness -> Execution Location
    c.rect(38, 278, 884, 152, fill=C_CARD_ALT, border=C_BORDER_SLATE, rounded=True, radius=0.03)
    c.textbox(54, 288, 850, 20, "HOW A SESSION ACTUALLY RUNS UNDER THE HOOD", size=9.5, color=C_GREEN, bold=True, rich=False)
    arch_nodes = [
        ("1 · Client Window", "Editor Chat, Agents Window,\nor Copilot App UI", "162436", C_BLUE),
        ("2 · Agent Host", "Dedicated background process;\nowns live sessions across windows!", C_DEEP_PURPLE, C_PURPLE),
        ("3 · Agent Harness", "Prompt loop, tool dispatch,\nskills, subagents & hooks", C_FOREST, C_GREEN),
        ("4 · Where It Runs", "Local OS, SSH remote,\nor Cloud runner (NOT a harness!)", C_DEEP_AMBER, C_AMBER),
    ]
    for i, (nt, nd, nf, nb) in enumerate(arch_nodes):
        nx = 54 + i * 216
        c.rect(nx, 316, 196, 96, fill=nf, border=nb, border_w=1.5, rounded=True, radius=0.06)
        c.textbox(nx + 10, 326, 176, 22, nt, size=11.5, color=C_WHITE, bold=True, align=PP_ALIGN.CENTER, rich=False)
        c.textbox(nx + 10, 352, 176, 52, nd, size=9.5, color=C_TEXT, align=PP_ALIGN.CENTER, rich=False)
        if i < 3:
            c.arrow(nx + 198, 364, nx + 214, 364, color=C_MINT, width=1.8)
    c.mark_region("Agent Host Architecture", 38, 278, 884, 152, C_PURPLE)
    c.callout_strip(446, "**Remember:** Switching the **model** (Sonnet vs GPT vs Gemini) does **not** switch the **harness** — and closing a window doesn't kill an **Agent Host** session!", C_GREEN)

    # 10 — Context Budget & Multi-Turn Growth (v2 Slides 11-12 combined visual chart)
    c = add_slide("WORKING MEMORY IS THE BUDGET", "Every turn re-sends the story so far")
    segs = [
        ("System", 78, "374151"), ("Instructions", 108, C_FOREST), ("Skill meta", 88, C_DEEP_BLUE),
        ("Prompt", 86, C_DEEP_PURPLE), ("Chat history", 175, C_DEEP_AMBER),
        ("Open files", 135, "0E7490"), ("Tool outputs", 214, C_DEEP_RED),
    ]
    sx = 38
    c.textbox(38, 92, 600, 18, "ONE SHARED CONTEXT WINDOW (MEASURED IN TOKENS)", size=9.0, color=C_MUTED, bold=True, rich=False)
    for lbl, sw, col in segs:
        c.rect(sx, 114, sw - 3, 34, fill=col, rounded=True, radius=0.08)
        c.textbox(sx + 2, 121, sw - 7, 20, lbl, size=8.8, color=C_WHITE, bold=True, align=PP_ALIGN.CENTER, rich=False)
        sx += sw
    c.mark_region("7 Context Window Layers", 38, 92, 884, 60, C_BLUE)

    # Bar chart on left (Turns 1..10 growing carried context)
    c.rect(38, 166, 540, 272, fill=C_CARD, border=C_BORDER, rounded=True, radius=0.03)
    c.textbox(54, 178, 500, 20, "CARRIED INPUT TOKENS RE-SENT ON EACH TURN (T1 → T10)", size=9.5, color=C_GREEN, bold=True, rich=False)
    for t in range(1, 11):
        bx = 62 + (t - 1) * 49
        bh = 32 + (t - 1) * 16
        by = 392 - bh
        bar_col = C_GREEN if t <= 4 else (C_AMBER if t <= 7 else C_RED)
        c.rect(bx, by, 32, bh, fill=bar_col, rounded=False)
        c.textbox(bx - 2, by - 16, 36, 14, f"{t*7}k", size=8.0, color=C_TEXT, align=PP_ALIGN.CENTER, rich=False)
        c.textbox(bx, 396, 32, 16, f"T{t}", size=8.5, color=C_MUTED, bold=True, align=PP_ALIGN.CENTER, rich=False)
    c.textbox(54, 416, 508, 18, "Long sessions suffer **context rot**: strong recall at start/end, drift in the noisy middle.", size=9.5, color=C_MUTED)
    c.mark_region("Multi-Turn Token Growth", 38, 166, 540, 272, C_AMBER)

    # Right solution cards
    c.accent_card(596, 166, 326, 128, "Fix 1 · Subagent Isolation (Lab 01)", [
        "Offload noisy file searches, mock runs & audits to a fresh subagent window",
        "Main Orchestrator receives **only the short summary**",
    ], accent=C_PURPLE)
    c.accent_card(596, 310, 326, 128, "Fix 2 · Session Handoff (Lab 04)", [
        "Chronicle distills huge multi-turn chats via map-reduce chunking into one lean `<session>-summary.md`",
    ], accent=C_GREEN)
    c.callout_strip(454, "**Rule of thumb:** One coherent feature per session — compact instructions, on-demand skills, and clean handoffs!", C_GREEN)

    # 11 — Research -> Plan -> Implement (v2 Slide 13)
    c = add_slide("DIVIDE AND CONQUER", "Research → Plan → Implement")
    phases = [
        ("1 · Research", "Read-only discovery: inspect routes, parsers & constraints", C_BLUE,
         [("System", "374151"), ("Task", C_DEEP_BLUE), ("Read src/", "0E7490"), ("Read test/", "0E7490"), ("Findings", C_FOREST)]),
        ("2 · Plan", "Agree on allowed files, interfaces & test checkpoints", C_PURPLE,
         [("System", "374151"), ("Findings", C_FOREST), ("File Contract & Todo Checklist", C_DEEP_PURPLE)]),
        ("3 · Implement & Verify", "Focused diff + local mock tests + read-only security audit", C_GREEN,
         [("System", "374151"), ("Contract", C_DEEP_PURPLE), ("Edit Lane", C_DEEP_BLUE), ("node --test ✅", C_FOREST)]),
    ]
    for i, (p_name, p_desc, acc, blocks) in enumerate(phases):
        y = 100 + i * 112
        c.rect(38, y, 884, 96, fill=C_CARD, border=C_BORDER, rounded=True, radius=0.03)
        c.rect(38, y, 5, 96, fill=acc)
        c.textbox(56, y + 14, 275, 26, p_name, size=15.0, color=C_WHITE, bold=True, rich=False)
        c.textbox(56, y + 42, 275, 42, p_desc, size=10.2, color=C_MUTED, rich=False)
        bx = 348
        for idx, (b_lbl, b_col) in enumerate(blocks):
            bw = 540 // len(blocks) - 8
            c.pill(bx, y + 28, bw, 40, b_lbl, fill=b_col, color=C_WHITE, border=acc if idx == len(blocks) - 1 else None, size=9.5)
            if idx < len(blocks) - 1:
                c.arrow(bx + bw + 1, y + 48, bx + bw + 7, y + 48, color=C_MUTED, width=1.2)
            bx += bw + 8
        c.mark_region(p_name, 38, y, 884, 96, acc)
    c.callout_strip(448, "Each phase passes forward a **clean artifact** (findings → file contract → verified diff) instead of raw exploration noise.", C_GREEN)

    # 12 — Part 2 Section Divider (BOC image3.png)
    c = add_slide("", "", bg_media="image3.png", footer=True, header=False)
    c.textbox(48, 42, 520, 20, "PART 2  ·  CONTROLLING AGENTS & SKILLS IN MARKDOWN", size=10.5, color=C_PURPLE, bold=True, rich=False)
    c.textbox(48, 172, 560, 145, "Controlling Agents\n& Skills in\nMarkdown", size=40.0, color=C_WHITE, bold=True, rich=False, line_spacing=1.06)
    c.textbox(48, 340, 520, 55, "The customization stack  ·  `SKILL.md` anatomy  ·  `.agent.md` frontmatter  ·  Harness compatibility", size=13.0, color=C_TEXT)
    c.mark_region("Part 2 Title", 42, 165, 570, 235, C_PURPLE)

    # 13 — The Customization Stack (v2 Slide 15 table)
    c = add_slide("PICK THE RIGHT MECHANISM  ·  TOPICS 3–5", "The Copilot customization stack")
    c.styled_table(
        38, 94, 884, 344,
        headers=["Mechanism", "Where It Lives", "When It Enters Context / Runs", "Guarantee"],
        rows=[
            ["Repository Instructions", "`.github/copilot-instructions.md` · `AGENTS.md`", "Always-on baseline rules (paid on every turn — keep short!)", "Model-driven (advisory)"],
            ["Scoped Instructions", "`.github/instructions/*.instructions.md`", "Matched via `applyTo:` file globs when touching matching paths", "Model-driven (advisory)"],
            ["Agent Skills", "`.github/skills/<name>/SKILL.md` + `scripts/`", "Metadata (~100 tok) always indexed; body loads **on demand**", "Progressive load + scripts"],
            ["Custom Agents", "`.github/agents/*.agent.md`", "Selected by user or invoked as specialist role with scoped `tools`", "**Tool list enforced!**"],
            ["Subagents", "Invoked via `agent` tool by lead session", "Runs in its **own fresh context window**; returns summary only", "**Context isolated!**"],
            ["Hooks & Canvases", "`.github/hooks/*.json` · Canvas extensions", "Hooks fire deterministic scripts on tool events; Canvases render UI", "**Code-enforced / Live UI**"],
        ],
        col_weights=[1.35, 1.75, 2.35, 1.35],
        badge_col=3,
    )
    c.callout_strip(454, "**Golden rule:** Prose asks nicely; **tool lists** and **preToolUse hooks** actually enforce boundaries!", C_GREEN)

    # 14 — Controlling Agent Skills in Markdown (Topic 3 — v2 Slide 17)
    c = add_slide("ADD ON-DEMAND CAPABILITIES  ·  TOPIC 3", "Anatomy of an Agent Skill (`SKILL.md`)")
    c.code_box(38, 96, 462, 344, ".github/skills/foundry-oauth-testing/SKILL.md", (
        "# Folder structure: parent dir MUST equal YAML name!\n"
        "# .github/skills/foundry-oauth-testing/\n"
        "#   ├── SKILL.md\n"
        "#   ├── scripts/      (optional deterministic helpers)\n"
        "#   └── references/   (optional schemas & examples)\n"
        "---\n"
        "name: foundry-oauth-testing\n"
        "description: >\n"
        "  Deterministic zero-package testing patterns using\n"
        "  node:test and local node:http mock servers. Use when\n"
        "  testing Entra OAuth2, Foundry responses, or redaction.\n"
        "argument-hint: '[module or route to test]'\n"
        "user-invocable: true\n"
        "---\n"
        "1. Bind ephemeral http.createServer on 127.0.0.1:0.\n"
        "2. Simulate 401/500 & assert logs redact clientSecret.\n"
        "3. Run node --check <file> and node --test."
    ), accent=C_GREEN)

    tiers = [
        ("1 · Metadata (~100 tokens)", "Always indexed", "`name` + `description` let Copilot decide *whether* this skill applies without bloating context.", C_GREEN),
        ("2 · Instructions (`SKILL.md` body)", "Loaded when matched", "Step-by-step domain workflow enters context **only** when triggered or preloaded via `skills: [...]`.", C_BLUE),
        ("3 · Scripts & References", "Executed on demand", "Helper scripts (`node`, `python`, `pwsh`) perform exact mechanical checks; reference docs stay on disk until read.", C_PURPLE),
    ]
    for i, (t_head, t_tag, t_body, acc) in enumerate(tiers):
        c.accent_card(518, 96 + i * 116, 404, 108, t_head, t_body, accent=acc, badge=t_tag)
    c.callout_strip(454, "Follows the open **Agent Skills standard (`agentskills.io`)** — `name` (lowercase + hyphens) **must match** its parent directory!", C_GREEN)

    # 15 — Writing Skill Descriptions That Fire (v2 Slide 18)
    c = add_slide("THE DESCRIPTION IS THE ROUTER  ·  TOPIC 3", "Write skill descriptions that reliably trigger")
    c.accent_card(38, 98, 430, 215, "Too vague — never fires (or fires randomly)", [
        "`description: Helpful testing utilities for our app.`",
        "Zero domain nouns — the model has no signal **when** to load it",
        "Forces humans to manually `/invoke` every single time",
    ], accent=C_RED, badge="✗  ANTI-PATTERN", fill="1D0D12")

    c.accent_card(492, 98, 430, 215, "Specific — states WHAT it does + WHEN to use it", [
        "`description: Test Chronicle Entra OAuth2 & Foundry client changes with local node:http mock servers and secret redaction assertions.`",
        "Matches natural developer prompts like *\"add tests for Foundry token errors\"*",
    ], accent=C_GREEN, badge="✓  TRIGGERS CLEANLY", fill=C_CARD)

    c.bullets(38, 334, 884, 110, [
        "**Test discovery honestly:** Open a fresh chat and ask for the task **without** naming the skill — check if Copilot loads `SKILL.md`.",
        "**Attach directly to specialist workers:** In Lab 02 we ALSO bind `skills: ['foundry-oauth-testing']` on `Chronicle Tester` for guaranteed availability.",
        "**Validate YAML syntax:** Unquoted colons or tabs in YAML frontmatter can silently break discovery — check **Chat: Open Customizations**!",
    ], size=11.5, gap_pt=7.0)
    c.callout_strip(454, "Keep `SKILL.md` focused (<500 lines) — move big schemas into `references/` and mechanical checks into `scripts/`.", C_BLUE)

    # 16 — Controlling Custom Agents in Markdown (Topic 3 — v2 Slide 19)
    c = add_slide("DESIGN ROLES & CAPABILITY BOUNDARIES  ·  TOPIC 3", "Controlling custom agents in `.agent.md`")
    c.code_box(38, 96, 470, 344, ".github/agents/chronicle-security.agent.md", (
        "---\n"
        "name: Chronicle Security\n"
        "description: >\n"
        "  Read-only security & privacy auditor for Chronicle.\n"
        "  Delegate reviews of .env storage, OAuth/Foundry calls,\n"
        "  localhost/CSP headers, and secret redaction.\n"
        "tools: ['read', 'search']\n"
        "skills: ['local-app-security-audit']\n"
        "user-invocable: false\n"
        "disable-model-invocation: false\n"
        "# Optional: model: Claude Sonnet 5.5\n"
        "---\n"
        "Never edit files. Inspect diffs and report findings\n"
        "by severity (Critical / High / Medium / Pass) with\n"
        "exact file:line citations and redacted values."
    ), accent=C_PURPLE)

    fields = [
        ("`description`", "How the Orchestrator (and humans) decide when to delegate to this specialist.", C_GREEN),
        ("`tools: [...]`", "**Hard enforcement boundary!** No `edit` or `execute` means Security *cannot* modify code or run shell commands.", C_RED),
        ("`skills: [...]`", "Preloads domain playbooks (`local-app-security-audit`) whenever this specialist runs.", C_BLUE),
        ("`user-invocable`", "`true` on `Chronicle Orchestrator` (clean picker); `false` on worker subagents so only the lead dispatches them!", C_PURPLE),
        ("`model`", "Optional override — pin a fast model for routine checks or a frontier reasoning model for architecture/security.", C_AMBER),
    ]
    for i, (f_key, f_desc, acc) in enumerate(fields):
        fy = 96 + i * 70
        c.rect(524, fy, 398, 62, fill=C_CARD, border=C_BORDER, rounded=True, radius=0.04)
        c.rect(524, fy, 4, 62, fill=acc)
        c.textbox(538, fy + 6, 130, 20, f_key, size=10.5, color=acc, bold=True)
        c.textbox(538, fy + 25, 374, 34, f_desc, size=9.6, color=C_TEXT)
    c.mark_region("Agent YAML Fields", 524, 96, 398, 344, C_GREEN)
    c.callout_strip(454, "Inspect workspace profiles anytime in VS Code via `Ctrl+Shift+P` → **Chat: Open Customizations → Agents**.", C_PURPLE)

    # 17 — Harness Differences That Bite (v2 Slide 22)
    c = add_slide("READ BEFORE YOU COPY  ·  TOPICS 2 & 3", "Harness differences that bite")
    c.styled_table(
        38, 96, 884, 340,
        headers=["Frontmatter / Feature", "VS Code Local Harness", "Copilot Harness · CLI · Copilot App · Cloud"],
        rows=[
            ["`tools` & `user-invocable`", "Supported — enforces tool allow-list & picker visibility", "Supported — enforces tool allow-list & picker visibility"],
            ["`skills: [...]` preload", "Skills discovered via description / `/` slash menu", "Supported directly in `.agent.md` frontmatter"],
            ["`hooks` & `mcp-servers`", "Configured at workspace / extension level", "Supported in agent frontmatter & `.github/hooks/*.json`"],
            ["`agents: [...]` allow-list", "Supported — restricts which subagents a lead may call", "Not used — control subagents via `disable-model-invocation`"],
            ["`handoffs: [...]` UI buttons", "Supported — renders guided next-step buttons in Chat", "Ignored by CLI and Cloud coding agent"],
            ["Subagent repo instructions", "Inherits workspace instructions automatically", "Subagents start clean — repeat key rules (zero-deps!) in `.agent.md`"],
        ],
        col_weights=[1.35, 1.85, 2.1],
        badge_col=2,
    )
    c.callout_strip(454, "**Lab tip:** Always check editor YAML hover tooltips for your selected harness — and state core invariants explicitly in worker prompts!", C_AMBER)
