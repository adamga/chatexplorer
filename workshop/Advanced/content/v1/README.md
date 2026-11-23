# Advanced Workshop Deck v1 & Motion-Graphics Explainers

Open the 32-slide editable presentation [**Advanced Workshop Deck v1.pptx**](../../Advanced%20Workshop%20Deck%20v1.pptx) to teach the full architecture flow and the six 90-minute Chronicle hands-on labs.

Both 1080p30 motion-graphics videos present all 32 slides in order with animated region spotlights, real-time audio-reactive waveforms, kinetic takeaway cards, burned-in lower-third captions, an embedded English subtitle track, and standalone `.srt` / `.vtt` / `.md` transcripts—narrated by Microsoft Foundry **`gpt-audio-1.5`**.

| Video | Voice (`gpt-audio-1.5`) | Audience & Focus |
|---|---|---|
| [**Little Helpers.mp4**](./Little%20Helpers.mp4) · [captions](./Little%20Helpers.vtt) · [transcript](./Little%20Helpers.md) | `coral` | **Fundamental / "Explain Like I'm 5" walkthrough:** Playful, crystal-clear everyday metaphors mapped directly to where agents run, harnesses vs. Agent Host, `.agent.md` badges, `SKILL.md` recipe cards, Hooks, Canvases, subagents, and Labs 00–05. |
| [**Train the Trainer.mp4**](./Train%20the%20Trainer.mp4) · [captions](./Train%20the%20Trainer.vtt) · [transcript](./Train%20the%20Trainer.md) | `ash` | **Instructor masterclass:** Slide-by-slide pacing, live VS Code demo cues, harness compatibility gotchas, credential safety in Lab 03, checkpoint verification, and rescue strategies. |

### Topics Covered Across the 32 Slides

1. **Opening (Slides 01–03):** Workshop framing, 90-minute agenda, outcomes, and the zero-package **Chronicle** running application (`workshop/Advanced/sampleapp/`).
2. **Part 1 — Where Agents Run, Harnesses & the Agent Host (Slides 04–11):** IDE Chat view, VS Code Agents Window (`code --agents`), Copilot CLI (`/plan`, `/fleet`), GitHub Copilot App, Cloud coding agent, Mode · Permissions · Isolation, Harnesses vs. the dedicated Agent Host process, multi-turn context growth, and Research → Plan → Implement.
3. **Part 2 — Controlling Agents & Skills in Markdown (Slides 12–17):** Full customization stack, `SKILL.md` anatomy & progressive disclosure, writing trigger descriptions that fire, `.agent.md` frontmatter (`tools`, `skills`, `user-invocable`, `model`), and harness compatibility differences.
4. **Part 3 — Hooks, Canvases & Subagent Architecture (Slides 18–22):** Deterministic `.github/hooks/*.json` lifecycle guardrails (`preToolUse`, `postToolUse`, etc.), side-by-side interactive **Canvases** (`canvasId` & `instanceId`), structuring `.github/`, stateless subagent context isolation, and the 5 layers of parallel collision protection.
5. **Part 4 — Hands-On Chronicle Labs 00–05 & Wrap-Up (Slides 23–32):** Step-by-step lab guides, UI previews, checkpoints, Lock-It-In recaps, and the Monday-Morning Playbook.

### Rebuilding the Deck & Videos

1. **Rebuild the editable PowerPoint deck and slide metadata (`narration.json`):**
   ```powershell
   python -B .\workshop\Advanced\content\v1\build.py
   ```
2. **Re-render the 1080p30 motion-graphics videos (`gpt-audio-1.5`):**
   ```powershell
   .\workshop\Advanced\content\v1\render-videos.ps1 -Voice Foundry
   ```
   The script checks Python media packages (`pillow`, `numpy`, `python-pptx`, `imageio-ffmpeg`) up front, prompts securely for the Azure Service Principal secret if `CHRONICLE_AUDIO_TOKEN` is not already set in your process environment, exports fresh 1080p PNGs from `Advanced Workshop Deck v1.pptx` without disturbing open PowerPoint windows, caches synthesized WAV takes under Git-ignored `content\.cache\deck-v1-mg`, and encodes both MP4s. Use `-Voice LocalPreview` for offline narration rehearsals.
