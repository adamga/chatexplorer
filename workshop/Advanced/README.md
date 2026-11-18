# GitHub Copilot Workshop — Advanced (90 Minutes / 1.5 Hours)

**Multi-Agent Orchestration, Custom Agent Skills, Microsoft Foundry LLM Session Analysis & Windows Desktop Installer**

Welcome to the **Advanced Workshop**! You are starting from `workshop/Advanced/sampleapp/`—the complete, working **zero-package Chronicle web explorer** from the Fundamentals track.

Instead of prompting a single default coding assistant directly for every task, you will first engineer a **coordinated multi-agent team** inside `.github/agents/`—led by a single **Orchestrator Agent** that delegates work to specialized **Developer**, **Tester**, **Security**, and **Documentation** subagents—and equip each role with reusable **Agent Skills** (`.github/skills/<skill>/SKILL.md`).

Then you will command your **Orchestrator Agent** to build three production-grade enhancements onto Chronicle:
1. **Microsoft Foundry Agent Configuration & `.env` Connectivity Testing** (connecting to the shared workshop Foundry Agent using Service Principal credentials supplied at lab time, plus `/agentconfig` setup guides).
2. **Portable LLM Session Handoff Summarization (`<session-name>-summary.md`)** with token-disciplined chunking, a live progress dialog, and a popup operation log viewer with clipboard copy and secret redaction.
3. **Sandboxed Electron Windows Desktop Application & NSIS Setup Installer (`Chronicle-Setup-1.0.0.exe`)**—packaging **zero `node_modules`** inside `app.asar`!

---

## Schedule & Lab Map (90 Minutes Total)

| Lab | Topic | Time |
|---|---|---|
| **[Lab 00 — Intro, Baseline & Workshop Credentials](./Lab-00-Intro-and-Baseline.md)** | Open `workshop/Advanced/sampleapp`, verify the baseline zero-package app (`npm test`), select a frontier model, and review the shared Foundry Service Principal parameters | **8 min** |
| **[Lab 01 — Orchestrator & Specialist Role Agents](./Lab-01-Orchestrator-and-Role-Agents.md)** | Create `.github/agents/chronicle-orchestrator.agent.md` plus four role-scoped worker subagents (`Developer`, `Tester`, `Security`, `Documentation`) | **17 min** |
| **[Lab 02 — Equipping Agents with Custom Skills](./Lab-02-Creating-Agent-Skills.md)** | Author four domain `SKILL.md` modules under `.github/skills/` and attach each skill to its matching specialist agent | **15 min** |
| **[Lab 03 — Foundry `.env` Config & Connectivity Test](./Lab-03-Foundry-Config-and-Connectivity.md)** | Use **Chronicle Orchestrator** to build `/agentconfig` docs, Entra ID Service Principal OAuth2 + Foundry Responses client, and the `.env` config/test dialog—then test live connectivity | **15 min** |
| **[Lab 04 — LLM Session Summarizer & Log Popup](./Lab-04-Session-Summarizer-and-Log-Popup.md)** | Use **Chronicle Orchestrator** to add comprehensive, token-bounded `<session-name>-summary.md` generation, progress dialog, and popup operation log viewer with clipboard copy | **18 min** |
| **[Lab 05 — Desktop Electron App & Setup Installer](./Lab-05-Desktop-Electron-and-Installer.md)** | Use **Chronicle Orchestrator** to add a pure-Node PNG/ICO icon generator, sandboxed Electron utility-process wrapper, `.env` seeding, and `Chronicle-Setup-1.0.0.exe` NSIS installer | **17 min** |

---

## Core Architectural Invariant

Read `sampleapp/.github/copilot-instructions.md`: Chronicle uses **zero runtime Node.js / npm package dependencies** (`"dependencies"` is never added to `package.json`). Even in Lab 05 when packaging the Windows Electron installer, `electron` and `electron-builder` exist strictly as build-time `devDependencies`—`app.asar` ships **100% pure application source code and zero `node_modules`**.

👉 **Start here: [Lab 00 — Intro, Baseline & Workshop Credentials](./Lab-00-Intro-and-Baseline.md)**
