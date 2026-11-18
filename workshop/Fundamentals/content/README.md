# Chronicle Fundamentals Workshop — Decks, Explainer Videos & Media Kit

This folder contains the decks, narrated explainers, captions, transcripts, and live app screenshots for the **60-Minute Chronicle Fundamentals Hands-On Lab**. Participants do not need the media authoring tools.

---

## 📦 Deliverables at a Glance

### 1. Native Editable PowerPoint Slide Decks (`.pptx`)
- **[`Fundamentals-Workshop-Deck.pptx`](./Fundamentals-Workshop-Deck.pptx)** *(18 widescreen 16:9 editable slides)* — Playful, jargon-free, **"explain it like I'm five"** workshop slide deck covering the Secret Notebook story, our Zero-Package LEGO Rule, core Copilot techniques, 60-minute agenda (`7 + 8 + 15 + 10 + 20 = 60 min`), backpack check, and step-by-step Labs `00` → `04` with a **High-Five Recap** slide after every lab and framed screenshots from live `http://127.0.0.1:3210/`.
- **[`Instructor-Delivery-Guide.pptx`](./Instructor-Delivery-Guide.pptx)** *(10 widescreen 16:9 editable slides)* — Facilitator companion deck covering the pedagogical hook, 10-minute pre-flight checklist, minute-by-minute run of show, active coaching habits, top 4 classroom troubleshooting rescues, catch-up safety net, and bridge to the Advanced Workshop.

### 2. 1080p Motion-Graphics Explainer Videos (Narrated with Windows Speech)
- **[`Participant-Explainer.mp4`](./Participant-Explainer.mp4)** *(approximately 3m 02s)*
  - Kid-friendly, energetic participant intro covering lab goals, the Zero-Package LEGO Rule, a quick walkthrough of all 5 steps (`Lab 00` → `Lab 04`), and live motion footage of the finished app running at `http://127.0.0.1:3210/`.
  - Paired captions & transcript: [`Participant-Explainer.srt`](./Participant-Explainer.srt) · [`Participant-Explainer.vtt`](./Participant-Explainer.vtt) · [`transcripts/Participant-Explainer-Transcript.md`](./transcripts/Participant-Explainer-Transcript.md)
- **[`Instructor-Explainer.mp4`](./Instructor-Explainer.mp4)** *(approximately 4m 28s)*
  - Facilitator briefing covering the workshop scenario, 10-minute pre-flight setup, 60-minute pacing rhythm, coaching during AI generation turns, battle-tested 30-second troubleshooting rescues, emergency catch-up valves, and debrief cues.
  - Paired captions & transcript: [`Instructor-Explainer.srt`](./Instructor-Explainer.srt) · [`Instructor-Explainer.vtt`](./Instructor-Explainer.vtt) · [`transcripts/Instructor-Explainer-Transcript.md`](./transcripts/Instructor-Explainer-Transcript.md)

### 3. Printable / Markdown Companion Guides & Live App Media
- **[`Participant-Quickstart-Guide.md`](./Participant-Quickstart-Guide.md)** — One-page learner cheat sheet & finish-line Treasure Hunt.
- **[`Instructor-Delivery-Guide.md`](./Instructor-Delivery-Guide.md)** — Complete facilitator run-of-show, coaching cues, and troubleshooting table.
- **[`assets/screenshots/`](./assets/screenshots/)** — 8 crisp `1920×1080` PNG screenshots captured from the completed Fundamentals lab app running locally at `http://127.0.0.1:3210/`.
- **[`assets/clips/live-app-tour.webm`](./assets/clips/live-app-tour.webm)** — Live Playwright screen-recording tour of `http://127.0.0.1:3210/` (Open dialogs, Date/Name sorting, Dark/White mode toggle, full conversation story, before/after Myers diff, and Global Search).

---

## 🔁 Rebuilding Any Asset From Source

These optional maintainer scripts live in [`scripts/`](./scripts/). Recapturing the browser tour uses the reference app's Playwright tooling; rebuilding the decks and videos from checked-in screenshots does not require that step or npm.

```powershell
# 1. Re-capture live 1920x1080 screenshots & browser tour from http://127.0.0.1:3210/
node .\workshop\Fundamentals\content\scripts\capture_app_media.mjs

# 2. Rebuild both native editable PowerPoint decks (.pptx)
python .\workshop\Fundamentals\content\scripts\build_decks.py

# 3. Synthesize narration offline (Windows with Zira and David desktop voices)
python .\workshop\Fundamentals\content\scripts\generate_tts.py --windows-voice participant instructor

# 4. Render 1080p30 motion-graphics MP4 videos with AAC audio & embedded English subtitles
python .\workshop\Fundamentals\content\scripts\build_videos.py participant instructor
```
