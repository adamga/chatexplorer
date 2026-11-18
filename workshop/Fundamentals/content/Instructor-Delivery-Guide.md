# Instructor Delivery & Coaching Guide — Chronicle Fundamentals (60-Min Lab)

This facilitator playbook accompanies **`Fundamentals-Workshop-Deck.pptx`**, **`Instructor-Delivery-Guide.pptx`**, and **`Instructor-Explainer.mp4`**.

---

## 1. Workshop Scenario & Why It Works

Participants start with **only Visual Studio Code, Node.js v22+, and GitHub Copilot** inside an empty folder (`workshop/Fundamentals/sampleapp`). Without creating multi-agent harnesses yet, they learn foundational AI-assisted engineering habits—teaching Copilot persistent project rules via **`.github/copilot-instructions.md`**, prompting iteratively, inspecting diffs, and verifying with `node:test`—to ship **Chronicle / Chat Explorer** (`http://127.0.0.1:3210/`) with **zero external npm packages**.

### Why Learners Love This Scenario
- **No package registry needed:** No npm or npx. Copilot itself still needs network access.
- **Immediate Personal Payoff:** In the final 5 minutes, learners click **Open session** and **Agent sessions** (both pre-filled with their machine's default paths!) and inspect *the exact Copilot Agent session they just used to build Chronicle*.
- **Clean Runway to the Advanced Workshop:** Their completed Fundamentals app is the exact baseline (`workshop/Advanced/sampleapp`) used in Session 2 to add a 5-Agent Team + Custom Skills + Microsoft Foundry AI Session Summaries + a browser release.

---

## 2. 10-Minute Pre-Flight Checklist

1. **Keep the Finish-Line App Running on Port `3210`:** Launch a completed copy (`node --max-old-space-size=8192 src/server.js` → `http://127.0.0.1:3210/`) before learners arrive so you can show the 90-second live demo during Slide 1–3.
2. **Verify Workspace Root (`sampleapp`):** Make sure every learner uses **File → Open Folder...** directly on `workshop/Fundamentals/sampleapp` (NOT the repository root!). VS Code discovers `.github/copilot-instructions.md` relative to the open workspace root.
3. **Frontier Model + Standard/`Medium` Reasoning Effort:** Have learners select `Claude Sonnet 5.5`, `GPT-6.1 Sol`, or `Gemini 4` at **standard / Medium** reasoning effort (`High` reasoning effort can turn a snappy 2–3 minute turn into an 8–10 minute wait!).
4. **Permissions Dropdown:** Inside their empty isolated `sampleapp` folder, setting Permissions to **Assisted** or **Allow all** prevents silent stalls waiting on hidden terminal-run approvals.

---

## 3. Minute-by-Minute Run of Show (60 Minutes)

| Clock | Stage | Duration | Facilitator Cue & Demo | Group Checkpoint |
| :---: | :--- | :---: | :--- | :--- |
| `00–07m` | **Lab 00 — Intro & Setup** | `7 min` | Show finished app at `:3210` (90s); guide `Open Folder -> sampleapp` + model picker | `node --version` prints `v22+`; Explorer header says `SAMPLEAPP` |
| `07–15m` | **Lab 01 — Ground Rules** | `8 min` | Everyone pastes Lab 01 prompt; point out **`Used 1 reference`** badge in Chat | `.github/copilot-instructions.md` exists; `package.json` has `0` dependencies |
| `15–30m` | **Lab 02 — Parser & Diff** | `15 min` | Tell the "Spot-the-Difference + Secret Notebook" story while Copilot codes (~3–4m) | `node --test` prints `0` failures (`src/diff.js`, `parser.js`, `indexer.js`, `library.js`) |
| `30–40m` | **Lab 03 — HTTP Server** | `10 min` | Explain `127.0.0.1` lock-and-key + `defaultPaths` while Copilot builds `src/server.js` | `node --check src/server.js && node --test` pass with isolated `os.tmpdir()` fixtures |
| `40–60m` | **Lab 04 — Browser UI & Live Hunt** | `20 min` | Run Step 1 (`icons.js`, `markdown.js`) then Step 2 (`index.html`, `styles.css`, `app.js`), then `node --max-old-space-size=8192 src/server.js`! | Everyone explores `http://127.0.0.1:3210/` in Dark & Bright White Mode! |

---

## 4. Battle-Tested Troubleshooting Rescues

| Symptom | Root Cause | 30-Second Classroom Fix |
| :--- | :--- | :--- |
| Copilot proposes a package install | The lab instructions may not be in scope | Decline the command and use **File → Open Folder...** → `workshop/Fundamentals/sampleapp`. Inspect the diff and discard only unrelated changes from that turn. |
| Chat spinner appears stuck for 2+ minutes | Waiting on inline `Allow` / `Continue` / `Keep` confirmation in Manual permissions mode | Scroll Chat to bottom, click **Allow** / **Keep**, and switch Permissions dropdown to **Assisted**. |
| `EADDRINUSE: 127.0.0.1:3210` on `node --max-old-space-size=8192 src/server.js` | Previous server instance still running in another terminal tab | Press `Ctrl+C` in the earlier terminal, or run `$env:PORT=3211; node --max-old-space-size=8192 src/server.js`. |
| Windows `EBUSY` directory lock during server tests | Static-file test wrote temp files inside watched workspace `public/` instead of `os.tmpdir()` | Already prevented in Lab 03 prompt (`publicDir` option); if needed, prompt Copilot to move temp fixtures to `os.tmpdir()`. |
| Lab 04 turn spends 5+ extra minutes after writing files | Attendee has global Chrome DevTools / Playwright MCP servers enabled and Copilot starts browser-testing early | Already guarded in Lab 04 Step 1 & Step 2 prompts (`node --check` only); click Stop if files already pass `node --check src/server.js && node --test`. |

---

## 5. Emergency Catch-Up Safety Net

Never let a late arrival or Wi-Fi hiccup strand a learner!
- **`workshop/Advanced/sampleapp/`** is a clean, pre-built, tested copy of the exact finished Fundamentals application.
- If a learner falls behind in Lab 02 or Lab 03, copy any missing `src/*.js` file from `workshop/Advanced/sampleapp/src/` into their `workshop/Fundamentals/sampleapp/src/` folder so they can build the Lab 04 UI and participate in the live group Treasure Hunt!
