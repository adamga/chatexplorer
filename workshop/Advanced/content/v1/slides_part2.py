"""Slides 18–32: Part 3 (Hooks, Canvases, Structuring .github & Subagents) and Part 4 (Chronicle Labs 00–05 + Closing)."""
from __future__ import annotations

from pptx.enum.text import MSO_ANCHOR, PP_ALIGN

from deck_lib import (
    C_AMBER, C_BLUE, C_BORDER, C_BORDER_SLATE, C_CARD, C_CARD_ALT, C_CODE_BG,
    C_CYAN, C_DEEP_AMBER, C_DEEP_BLUE, C_DEEP_PURPLE, C_DEEP_RED, C_FOREST,
    C_GREEN, C_MINT, C_MUTED, C_PINK, C_PURPLE, C_RED, C_TEXT, C_WHITE,
    FONT_MONO, FONT_SANS, SlideCanvas, pt,
)


def _lab_slide(c: SlideCanvas, subtitle: str, steps: list[str], checkpoint: str,
               open_files: str = "", screenshot_stem: str | None = None, screenshot_caption: str = ""):
    c.textbox(38, 84, 540, 38, subtitle, size=12.0, color=C_MINT, bold=False)
    step_gap = 72 if len(steps) <= 4 else 58
    for idx, step_txt in enumerate(steps, 1):
        sy = 128 + (idx - 1) * step_gap
        c.oval(38, sy + 2, 28, 28, fill=C_FOREST, text=str(idx), text_color=C_MINT, size=11.0)
        c.textbox(78, sy, 492, step_gap - 4, step_txt, size=11.3, color=C_TEXT)
    c.mark_region("Lab Steps", 36, 124, 538, 355, C_GREEN)

    if screenshot_stem:
        c.screenshot_card(590, 92, 332, 206, screenshot_stem, screenshot_caption, accent=C_BLUE)
        c.accent_card(590, 310, 332, 174, "Checkpoint ✅", checkpoint, accent=C_GREEN, badge="VERIFY BEFORE NEXT LAB")
    else:
        c.accent_card(590, 96, 332, 212, "Checkpoint ✅", checkpoint, accent=C_GREEN, badge="VERIFY BEFORE NEXT LAB")
        c.accent_card(590, 322, 332, 160, "Workspace Paths", open_files, accent=C_BLUE, badge="OPEN / INSPECT", fill=C_CARD_ALT)


def _recap_slide(c: SlideCanvas, questions: list[str], the_point: str, takeaways: list[str]):
    c.textbox(38, 92, 510, 20, "ASK THE ROOM, THEN CONFIRM:", size=9.5, color=C_GREEN, bold=True, rich=False)
    for idx, q in enumerate(questions, 1):
        qy = 124 + (idx - 1) * 108
        c.oval(38, qy + 4, 30, 30, fill=C_FOREST, text=str(idx), text_color=C_MINT, size=11.5)
        c.textbox(80, qy, 475, 92, q, size=12.2, color=C_WHITE)
    c.mark_region("Recap Questions", 36, 118, 522, 330, C_BLUE)

    c.accent_card(578, 96, 344, 210, "The Point", the_point, accent=C_GREEN, badge="LOCK IT IN")
    c.accent_card(578, 320, 344, 162, "Watch For", takeaways, accent=C_AMBER, badge="INSTRUCTOR CUE", fill=C_CARD_ALT)


def build_slides_18_to_32(add_slide):
    # 18 — Part 3 Section Divider (BOC image11.png glowing green rings)
    c: SlideCanvas = add_slide("", "", bg_media="image11.png", footer=True, header=False)
    c.textbox(48, 42, 540, 20, "PART 3  ·  GUARDRAILS, SHARED UI & ORCHESTRATION", size=10.5, color=C_GREEN, bold=True, rich=False)
    c.textbox(48, 168, 560, 150, "Hooks, Canvases &\nStructuring\nSubagent Teams", size=39.0, color=C_WHITE, bold=True, rich=False, line_spacing=1.06)
    c.textbox(48, 342, 535, 55, "Deterministic lifecycle hooks  ·  Interactive Canvases  ·  `.github/` layout  ·  Hub-and-spoke subagents", size=13.0, color=C_MINT)
    c.mark_region("Part 3 Title", 42, 162, 570, 240, C_GREEN)

    # 19 — Agent Hooks: Deterministic Lifecycle Guardrails (Topic 4 — BOC s10-11 + v2 s30)
    c = add_slide("ENFORCE, DON'T JUST ASK  ·  TOPIC 4", "Agent Hooks: deterministic lifecycle guardrails")
    c.code_box(38, 96, 418, 224, ".github/hooks/chronicle-guard.json", (
        '{\n'
        '  "version": 1,\n'
        '  "hooks": {\n'
        '    "preToolUse": [{\n'
        '      "type": "command",\n'
        '      "bash": "node tools/guard-lane.mjs",\n'
        '      "powershell": "node tools/guard-lane.mjs"\n'
        '    }]\n'
        '  }\n'
        '}'
    ), accent=C_AMBER)
    c.code_box(38, 330, 418, 110, "guard-lane.mjs stdout  (blocks disallowed write)", (
        '{ "permissionDecision": "deny",\n'
        '  "permissionDecisionReason":\n'
        '    "Chronicle Docs may only edit agentconfig/ & README.md" }'
    ), accent=C_RED)

    c.styled_table(
        472, 96, 450, 344,
        headers=["Lifecycle Event", "When It Fires", "High-Value Use Case"],
        rows=[
            ["`preToolUse`", "Before a tool executes", "**Block** out-of-lane edits, `npm install`, or `.env` reads"],
            ["`postToolUse`", "After tool completes", "Auto-run `node --check`, formatters, or redacted audit log"],
            ["`userPromptSubmit`", "Prompt submitted", "Inject dynamic repo status or policy reminders"],
            ["`sessionStart`", "Session initializes", "Verify Node 22+ runtime & clean working tree"],
            ["`subagentStart`", "Worker subagent spawns", "Log delegated role & enforce subagent guardrails"],
            ["`stop` / `preCompact`", "Turn ends / context full", "Save state digest before truncation; gate completion"],
        ],
        col_weights=[1.25, 1.15, 1.95],
        badge_col=0,
    )
    c.callout_strip(454, "**Security rule:** Hooks execute real shell code on your machine — review `.github/hooks/` diffs like production code & never log raw secrets!", C_AMBER)

    # 20 — Canvases: Shared Interactive Surfaces Alongside Chat (Topic 4)
    c = add_slide("BEYOND SCROLLING TEXT  ·  TOPIC 4", "Canvases: interactive workspaces beside Chat")
    # Left visual split-screen diagram (Chat + Live Canvas side-panel + BOC holographic Copilot icon)
    c.rect(38, 96, 444, 344, fill=C_CARD_ALT, border=C_PURPLE, border_w=1.5, rounded=True, radius=0.03)
    c.textbox(54, 108, 412, 20, "COPILOT APP  &  VS CODE  ·  SIDE-BY-SIDE CANVAS MODEL", size=9.5, color=C_PURPLE, bold=True, rich=False)
    # Chat pane
    c.rect(54, 136, 174, 232, fill="0B131E", border=C_BORDER_SLATE, rounded=True)
    c.textbox(64, 144, 154, 214, "**Chat Stream**\n\nUser:\n*\"Design & test our Foundry agent\"*\n\nCopilot:\n• Continues task in Chat\n• Calls `open_canvas`\n• Syncs live state →", size=9.2, color=C_TEXT)
    # Bi-directional arrow
    c.arrow(232, 248, 254, 248, color=C_GREEN, width=2.0)
    # Canvas pane
    c.rect(258, 136, 208, 232, fill=C_CARD, border=C_GREEN, border_w=1.5, rounded=True)
    c.textbox(268, 144, 188, 20, "LIVE CANVAS PANEL", size=9.0, color=C_GREEN, bold=True, rich=False)
    c.pill(268, 170, 188, 28, "`canvasId`: surface type", fill=C_DEEP_PURPLE, color=C_WHITE, size=8.5)
    c.pill(268, 204, 188, 28, "`instanceId`: panel handle", fill=C_DEEP_BLUE, color=C_WHITE, size=8.5)
    c.textbox(268, 242, 188, 118, "• Interactive UI, previews, plans, editors & dashboards\n• **Both** human & agent inspect and trigger actions", size=9.0, color=C_TEXT)
    c.slide.shapes.add_picture(c.assets.bytes_of("image43.png"), pt(62), pt(376), width=pt(48), height=pt(48))
    c.textbox(118, 382, 348, 44, "Opening a Canvas **augments** Chat — it never abandons validation or test runs in Chat!", size=9.8, color=C_MINT)
    c.mark_region("Chat + Canvas Split View", 38, 96, 444, 344, C_PURPLE)

    # Right 4 crisp cards
    canvas_cards = [
        ("When to use a Canvas", "Architecture diagrams, UI previews, Foundry agent config/testing panels, or structured tables where chat diffs fall short.", C_GREEN),
        ("Addressable handles", "`open_canvas(canvasId, instanceId)` opens/focuses a panel; `invoke_canvas_action(instanceId, ...)` updates that exact instance.", C_BLUE),
        ("Authoring custom Canvases", "Build workspace, user, or plugin extension canvases when your team wants rich domain-specific visual workflows.", C_PURPLE),
        ("Verification & secret rule", "Moving a visual card is **not** proof of passing tests — and never render `.env` secrets or tokens onto a canvas!", C_AMBER),
    ]
    for i, (ct, cb, acc) in enumerate(canvas_cards):
        c.accent_card(498, 96 + i * 88, 424, 80, ct, cb, accent=acc)
    c.callout_strip(454, "**Hooks + Canvases together:** Hooks guard *actions* deterministically; Canvases make complex *artifacts* visible and interactive.", C_GREEN)

    # 21 — Structuring .github/ & Subagent Context Isolation (Topic 5)
    c = add_slide("CLEAN REPOSITORY ARCHITECTURE  ·  TOPIC 5", "Structuring `.github/` & isolating subagent context")
    c.code_box(38, 96, 444, 344, "workshop/Advanced/sampleapp/.github/", (
        ".github/\n"
        "├── copilot-instructions.md      # Tiny always-on invariants\n"
        "├── agents/                      # WHO acts + tool boundaries\n"
        "│   ├── chronicle-orchestrator.agent.md  (user-invocable: true)\n"
        "│   ├── chronicle-dev.agent.md           (edit + execute)\n"
        "│   ├── chronicle-test.agent.md          (edit + execute)\n"
        "│   ├── chronicle-security.agent.md      (read + search ONLY)\n"
        "│   └── chronicle-docs.agent.md          (read + edit + search)\n"
        "├── skills/                      # HOW workflows execute\n"
        "│   ├── zero-package-engineering/SKILL.md\n"
        "│   ├── foundry-oauth-testing/SKILL.md\n"
        "│   ├── local-app-security-audit/SKILL.md\n"
        "│   └── foundry-handoff-docs/SKILL.md\n"
        "└── hooks/                       # Optional deterministic gates\n"
        "    └── chronicle-guard.json"
    ), accent=C_GREEN)

    # Right diagram: Main Session vs Stateless Subagent Window (v2 Slide 20)
    c.rect(498, 96, 424, 344, fill=C_CARD, border=C_BORDER, rounded=True, radius=0.03)
    c.textbox(514, 108, 392, 20, "SUBAGENTS RUN IN SEPARATE, STATELESS CONTEXT WINDOWS", size=9.5, color=C_GREEN, bold=True, rich=False)
    # Lead box
    c.rect(514, 138, 392, 74, fill=C_DEEP_PURPLE, border=C_PURPLE, border_w=1.4, rounded=True)
    c.textbox(526, 145, 368, 20, "Main Session  ·  Chronicle Orchestrator", size=11.0, color=C_WHITE, bold=True, rich=False)
    c.textbox(526, 167, 368, 38, "Holds user goal + `todo` checklist + short worker verdicts.\n**Stays tiny & sharp across all 6 labs!**", size=9.6, color=C_TEXT)
    c.arrow(635, 214, 635, 250, color=C_BLUE, width=2.0)
    c.textbox(520, 222, 110, 22, "Self-contained\ntask brief ↓", size=8.5, color=C_BLUE, bold=True, align=PP_ALIGN.RIGHT, rich=False)
    c.arrow(785, 250, 785, 214, color=C_GREEN, width=2.0)
    c.textbox(794, 222, 112, 22, "↑ Short summary\n+ test counts", size=8.5, color=C_MINT, bold=True, rich=False)
    # Worker box
    c.rect(514, 254, 392, 92, fill="0E2235", border=C_BLUE, border_w=1.4, rounded=True)
    c.textbox(526, 262, 368, 20, "Subagent Window  ·  e.g., Chronicle Tester", size=11.0, color=C_WHITE, bold=True, rich=False)
    c.textbox(526, 284, 368, 56, "Loads its `.agent.md` + `foundry-oauth-testing` skill → reads 8 files → spins up mock servers → runs `node --test` → **discards raw noise on exit!**", size=9.4, color=C_TEXT)
    c.textbox(514, 358, 392, 74, "• Subagents **do not see** prior chat messages — pass explicit paths, invariants & acceptance criteria in every brief!\n• Context isolation ≠ filesystem isolation: subagents in one session share your checkout.", size=9.5, color=C_MUTED)
    c.mark_region("Subagent Context Isolation", 498, 96, 424, 344, C_BLUE)
    c.callout_strip(454, "**Open `workshop/Advanced/sampleapp` directly** so VS Code discovers `.github/agents/`, `.github/skills/`, and `.github/copilot-instructions.md`!", C_GREEN)

    # 22 — Hub-and-Spoke Orchestrator & 5 Layers of Protection (Topic 5 — v2 Slides 21 & 25)
    c = add_slide("COORDINATOR, SPECIALISTS & COLLISION CONTROLS  ·  TOPIC 5", "The Chronicle orchestrator & five safety layers")
    # Top hub node
    c.rect(310, 92, 340, 68, fill=C_DEEP_PURPLE, border=C_PURPLE, border_w=2.0, rounded=True, radius=0.08)
    c.textbox(322, 99, 316, 24, "Chronicle Orchestrator  (`user-invocable: true`)", size=12.0, color=C_WHITE, bold=True, align=PP_ALIGN.CENTER)
    c.textbox(322, 125, 316, 28, "`tools: ['read', 'search', 'agent', 'todo']`  —  **plans & dispatches; NO edit!**", size=9.5, color=C_MINT, align=PP_ALIGN.CENTER)
    c.mark_region("Chronicle Orchestrator Hub", 310, 92, 340, 68, C_PURPLE)

    workers = [
        ("Chronicle Developer", "`read · edit · search · execute`\nSkill: `zero-package-engineering`\nOwns `src/`, `public/`, `build/`", C_DEEP_BLUE, C_BLUE),
        ("Chronicle Tester", "`read · edit · search · execute`\nSkill: `foundry-oauth-testing`\nOwns `test/*.test.js` & mocks", "0E4F5C", C_CYAN),
        ("Chronicle Security", "`read · search`  **(READ-ONLY)**\nSkill: `local-app-security-audit`\nAudits `.env`, CSP, redaction", C_FOREST, C_GREEN),
        ("Chronicle Documentation", "`read · edit · search`\nSkill: `foundry-handoff-docs`\nOwns `agentconfig/` & `README`", C_DEEP_AMBER, C_AMBER),
    ]
    for i, (w_name, w_body, w_fill, w_edge) in enumerate(workers):
        wx = 38 + i * 224
        c.arrow(480, 160, wx + 106, 194, color=w_edge, width=1.6)
        c.rect(wx, 196, 212, 118, fill=w_fill, border=w_edge, border_w=1.5, rounded=True, radius=0.05)
        c.textbox(wx + 10, 204, 192, 22, w_name, size=11.5, color=C_WHITE, bold=True, align=PP_ALIGN.CENTER, rich=False)
        c.textbox(wx + 10, 230, 192, 78, w_body, size=9.2, color=C_TEXT, align=PP_ALIGN.CENTER)
        c.mark_region(w_name, wx, 196, 212, 118, w_edge)

    # Bottom 5 layers of parallel protection (v2 Slide 25)
    c.textbox(38, 328, 884, 18, "FIVE LAYERS THAT PREVENT MULTI-AGENT COLLISIONS", size=9.0, color=C_MUTED, bold=True, rich=False)
    five = [
        ("1 · ISOLATE", "Worktree / cloud sandbox\nfor parallel writers", C_PURPLE),
        ("2 · PARTITION", "Disjoint allowed files\nin every task brief", C_BLUE),
        ("3 · SHAPE", "Clean module seams\n(`summarizer.js`, `log.js`)", C_CYAN),
        ("4 · ENFORCE", "Scoped `tools` lists\n+ `preToolUse` hooks", C_AMBER),
        ("5 · INTEGRATE", "Human diff check +\n`node --test` gate", C_GREEN),
    ]
    for i, (l_head, l_sub, l_col) in enumerate(five):
        lx = 38 + i * 179
        c.rect(lx, 350, 169, 86, fill=C_CARD_ALT, border=l_col, border_w=1.3, rounded=True, radius=0.06)
        c.textbox(lx + 8, 358, 153, 20, l_head, size=10.2, color=l_col, bold=True, align=PP_ALIGN.CENTER, rich=False)
        c.textbox(lx + 8, 382, 153, 46, l_sub, size=9.2, color=C_TEXT, align=PP_ALIGN.CENTER)
    c.mark_region("5 Collision Layers", 38, 328, 884, 112, C_GREEN)
    c.callout_strip(452, "**Sequence smartly:** Implement (`Developer`) → then fan out `Security` + `Tester` + `Documentation` in parallel → remediate & verify!", C_GREEN)

    # 23 — Part 4 Section Divider (BOC image2.png checkmark robot)
    c = add_slide("", "", bg_media="image2.png", footer=True, header=False)
    c.textbox(48, 42, 540, 20, "PART 4  ·  90-MINUTE HANDS-ON LAB TRACK", size=10.5, color=C_GREEN, bold=True, rich=False)
    c.textbox(48, 168, 560, 150, "Hands-On Labs:\nBuilding Chronicle\n(Labs 00 – 05)", size=39.0, color=C_WHITE, bold=True, rich=False, line_spacing=1.06)
    c.textbox(48, 342, 535, 55, "Baseline check  ·  5 Agents  ·  4 Skills  ·  Foundry OAuth2  ·  Session Handoff  ·  Browser Release", size=13.0, color=C_MINT)
    c.mark_region("Part 4 Labs Title", 42, 162, 570, 240, C_GREEN)

    # 24 — How the Chronicle Labs Run (v2 Slide 36 + real starter.png screenshot)
    c = add_slide("FROM CONCEPTS TO KEYBOARD", "How the six Chronicle labs run")
    loop = [("1 · Brief", C_PURPLE), ("2 · Delegate", C_BLUE), ("3 · Checkpoint ✅", C_FOREST), ("4 · Lock It In", C_DEEP_AMBER)]
    for i, (st_lbl, st_col) in enumerate(loop):
        lx = 38 + i * 134
        c.pill(lx, 96, 120, 36, st_lbl, fill=st_col, color=C_WHITE, size=10.0)
        if i < 3:
            c.arrow(lx + 122, 114, lx + 132, 114, color=C_MINT, width=1.4)
    c.bullets(38, 150, 520, 290, [
        "**Open the exact starter folder:** `File → Open Folder → workshop/Advanced/sampleapp` so VS Code indexes `.github/` customizations.",
        "**Zero npm packages:** Never run `npm install` or `npx` — use **Node.js 22+** built-ins (`node --check`, `node --test`, `fetch`, `zlib`).",
        "**Labs 01–02 build your team; Labs 03–05 use ONLY `Chronicle Orchestrator`** to coordinate all code, docs, audits, and tests!",
        "**Protect credentials:** Keep your 5 Foundry Service Principal values in git-ignored `.env` — local mock servers cover offline tests.",
    ], size=11.5, gap_pt=9.0)
    c.mark_region("Lab Workflow Rules", 38, 94, 525, 345, C_GREEN)
    c.screenshot_card(578, 96, 344, 248, "starter", "Chronicle Starter Baseline (sampleapp/)", accent=C_GREEN)
    c.accent_card(578, 356, 344, 86, "Stuck or behind?", "Compare with the finished reference in `appsample/` in a second window without overwriting your starter!", accent=C_AMBER, fill=C_CARD_ALT)
    c.callout_strip(456, "Every lab timebox includes its verification checkpoint — prove the checkpoint passes before moving on!", C_GREEN)

    # 25 — Lab 00 (8 min)
    c = add_slide("LAB 00  ·  00:00–00:08  ·  8 MINUTES", "Baseline verification, surfaces & setup")
    _lab_slide(
        c,
        "Prove the zero-package Fundamentals app passes before customizing anything.",
        [
            "In VS Code, choose **File → Open Folder** directly on `workshop/Advanced/sampleapp`.",
            "Run `node --version` (22+), `node --check src/server.js`, and `node --test` (10 passing, 0 failing).",
            "Open Copilot Chat (`Ctrl+Alt+I`), inspect the **Copilot** agent harness, and pick a frontier model (Claude Sonnet 5.5 / GPT / Gemini).",
            "Privately confirm your instructor's 5 Microsoft Foundry & Entra Service Principal values are ready for Lab 03.",
        ],
        "`workshop/Advanced/sampleapp` is the workspace root; `node --check` and `node --test` pass with zero errors; private Foundry sheet is on hand.",
        "`Lab-00-Intro-and-Baseline.md`\n`sampleapp/.github/copilot-instructions.md`\n`sampleapp/package.json`",
    )

    # 26 — Lab 01 (17 min)
    c = add_slide("LAB 01  ·  00:08–00:25  ·  17 MINUTES", "Build Orchestrator & four specialist subagents")
    _lab_slide(
        c,
        "Engineer a hub-and-spoke `.github/agents/*.agent.md` team with enforced least privilege.",
        [
            "Generate the 4 specialist workers (`user-invocable: false`): `Chronicle Developer`, `Chronicle Tester`, `Chronicle Security`, and `Chronicle Documentation`.",
            "Verify **Security** has `tools: ['read', 'search']` only — structurally incapable of editing files!",
            "Create `chronicle-orchestrator.agent.md` (`user-invocable: true`, `tools: ['read', 'search', 'agent', 'todo']` — no `edit` or `execute`).",
            "Run **Chat: Open Customizations → Agents** and confirm all 5 workspace agents show zero YAML schema warnings.",
        ],
        "All 5 `.agent.md` files validate cleanly; only `Chronicle Orchestrator` appears in the user dropdown while all 4 workers are subagent-callable.",
        "`Lab-01-Orchestrator-and-Role-Agents.md`\n`.github/agents/chronicle-orchestrator.agent.md`\n`.github/agents/chronicle-*.agent.md`",
    )

    # 27 — Lab 02 (15 min)
    c = add_slide("LAB 02  ·  00:25–00:40  ·  15 MINUTES", "Equip each role agent with a domain `SKILL.md`")
    _lab_slide(
        c,
        "Package repeatable zero-package, mock-server, security, and Foundry workflows as on-demand skills.",
        [
            "Create 4 skills under `.github/skills/<name>/SKILL.md`: `zero-package-engineering`, `foundry-oauth-testing`, `local-app-security-audit`, and `foundry-handoff-docs`.",
            "Confirm each skill's YAML `name:` **matches its parent folder** and its `description:` states both WHAT and WHEN.",
            "Update the 4 worker `.agent.md` files to preload their matching `skills: [...]` array.",
            "Open a new Chat, type `/` to verify skill discovery, then select **`Chronicle Orchestrator`** in the agent picker!",
        ],
        "4 `SKILL.md` playbooks appear under **Chat: Open Customizations → Skills**, workers link their skills, and `Chronicle Orchestrator` is active.",
        "`Lab-02-Creating-Agent-Skills.md`\n`.github/skills/*/SKILL.md`\n`.github/agents/*.agent.md`",
    )

    # 28 — Mid-Point Recap (Labs 00–02)
    c = add_slide("MID-WORKSHOP RECAP  ·  MINUTE 00:40", "Lock it in: surfaces, roles & skills")
    _recap_slide(
        c,
        [
            "**Why couldn't `Chronicle Orchestrator` or `Chronicle Security` edit `src/server.js` directly?**\n*(Capability enforcement via `tools:` vs polite prose!)*",
            "**What enters the context window at session start for your 4 `SKILL.md` files?**\n*(Only compact `name` + `description` metadata — bodies load on demand!)*",
            "**Why did we set `user-invocable: false` on the 4 workers instead of deleting them?**\n*(Keeps the human picker clean while letting Orchestrator dispatch them!)*",
        ],
        "**Agents** define *who* may act and enforce tool boundaries. **Skills** define *how* to execute domain recipes without bloating every turn.",
        [
            "If agents/skills don't appear, check that `sampleapp/` itself is the VS Code workspace root",
            "From Lab 03 onward, learners prompt **only** `Chronicle Orchestrator`!",
        ],
    )

    # 29 — Lab 03 (15 min + config.png)
    c = add_slide("LAB 03  ·  00:40–00:55  ·  15 MINUTES", "Foundry `.env` config, `/agentconfig` & live `READY`")
    _lab_slide(
        c,
        "Send one high-level brief to Chronicle Orchestrator — watch 4 subagents ship Phase 1!",
        [
            "Prompt `Chronicle Orchestrator` to coordinate `Developer`, `Documentation`, `Security`, and `Tester`.",
            "Build `agentconfig/` setup guides, atomic `.env` storage (`hasClientSecret` boolean only!), and Entra OAuth2 + Foundry `/responses` client.",
            "Add the **Summary agent** config dialog + popup connectivity log (`public/log.html`), audited by Security & mocked by Tester.",
            "Start `src/server.js`, save your workshop credentials to `.env`, click **Test connection**, and verify `Reply: \"READY\"` + redacted logs!",
        ],
        "`agentconfig/` guides include the zero-package rule, mocked `node --test` passes, live **Test connection** returns `READY`, and no secret appears in logs.",
        screenshot_stem="config",
        screenshot_caption="Configure Session Summarizer (#config-dialog)",
    )

    # 30 — Lab 04 (18 min + finished.png)
    c = add_slide("LAB 04  ·  00:55–01:13  ·  18 MINUTES", "Session handoff summarizer & live log popup")
    _lab_slide(
        c,
        "Turn noisy multi-turn chat logs into a clean, cross-machine `<session-name>-summary.md`.",
        [
            "Dispatch `Chronicle Orchestrator` to build `buildSessionDigest` & `chunkSessionDigest` in `src/summarizer.js`.",
            "Normalize workspace paths to **portable repo-relative paths**; run single-pass summary for small chats or **map-reduce chunk synthesis** for big sessions.",
            "Add **Create session summary** beside **Read full session**, with a `.env` config gate, live progress modal, and clipboard-enabled popup log.",
            "Generate a real `summaries/<session>-summary.md` and verify another developer could pick up the task immediately!",
        ],
        "Config gate, live progress bar, popup log copy, and multi-chunk unit tests all pass; portable `summaries/<session>-summary.md` is saved cleanly.",
        screenshot_stem="finished",
        screenshot_caption="Finished Session Overview + Summary Trigger",
    )

    # 31 — Lab 05 (17 min) + Final Lab Recap
    c = add_slide("LAB 05  ·  01:13–01:30  ·  17 MINUTES", "Browser release & desktop sandbox review")
    _lab_slide(
        c,
        "Ship a zero-package browser release with strict file-ownership discipline, then tour the desktop wrapper.",
        [
            "Copy `build/render-icon.cjs` and brief `Chronicle Orchestrator` with explicit **allowed files** (`build/`, `public/chronicle-icon.png`, `index.html`, `test/release-icon.test.js`, `README.md`).",
            "`Developer` generates pure-Node `zlib` PNG/ICO icons; `Tester` asserts HTTP 200 + PNG signature; `Security` audits zero-package compliance.",
            "Open `http://127.0.0.1:3210`, verify the live browser tab icon, open a session, and confirm zero regressions.",
            "**3-min read-only tour** (`appsample/electron/`): See how `sandbox: true`, narrow `preload.cjs`, and external `.env` isolate desktop builds without installing Electron today!",
        ],
        "`node --test` passes with `release-icon.test.js`, `/chronicle-icon.png` loads locally in the browser, and `package.json` still has zero dependencies!",
         screenshot_stem="log",
        screenshot_caption="Redacted Operation Log Popup (/log.html)",
    )

    # 32 — Closing: Monday Morning Playbook & Thank You (BOC image21.png + image44.png Octocat Astronaut)
    c = add_slide("MONDAY MORNING PLAYBOOK  ·  WRAP-UP", "What to bring back to your own repositories", bg_media="image21.png")
    c.accent_card(38, 96, 365, 344, "Five Monday-Morning Moves ✓", [
        "**Trim `copilot-instructions.md`** down to true repo-wide invariants",
        "**Package 1 team workflow** as `.github/skills/<name>/SKILL.md` with a sharp WHAT+WHEN description",
        "**Add 1 read-only `.agent.md`** (`tools: ['read', 'search']`) for security or PR review",
        "**Add a `preToolUse` hook** where accidental edits or secret reads hurt",
        "**Delegate briefs, not wishes:** outcome, allowed files, invariants & test command",
    ], accent=C_GREEN, badge="DO THIS NEXT")

    c.accent_card(418, 96, 315, 344, "Anti-Patterns to Avoid ✗", [
        "600-line `copilot-instructions.md` paid on every turn",
        "An Orchestrator agent that still has `edit` access",
        "Skill descriptions like *\"helpful project utilities\"*",
        "Blanket **Approve All** near `.env` credentials",
        "Two write-enabled agents in one shared checkout",
    ], accent=C_RED, badge="WATCH OUT FOR", fill="1B0E14")

    # Right hero mascot from BOC (Mona Astronaut image44.png) + Questions/Links
    c.slide.shapes.add_picture(c.assets.bytes_of("image44.png"), pt(752), pt(106), width=pt(166), height=pt(168))
    c.rect(748, 282, 174, 158, fill=C_CARD, border=C_PURPLE, border_w=1.4, rounded=True, radius=0.05)
    c.textbox(756, 290, 158, 50, "Questions?\nThank You!", size=16.0, color=C_WHITE, bold=True, align=PP_ALIGN.CENTER, rich=False)
    c.textbox(756, 344, 158, 90, "`workshop/Advanced/`\n• Labs 00–05\n• `appsample/` ref\n• Video explainers", size=9.5, color=C_MINT, align=PP_ALIGN.CENTER)
    c.mark_region("Thank You & Takeaways", 748, 106, 174, 334, C_PURPLE)
    c.callout_strip(454, "**Before any handoff:** Show the artifact, show the passing check, and state honestly what ran locally vs live!", C_GREEN)
