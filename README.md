# Chronicle / Chat Explorer — Reference App & Hands-On Workshops

This repository contains **Chronicle / Chat Explorer**—a zero-package, read-only local observatory for persisted VS Code and Copilot Agent chat sessions—along with two progressive hands-on GitHub Copilot workshops.

---

## Repository Structure

| Path | Description |
|---|---|
| [`appsample/`](./appsample/README.md) | **Complete Reference Application** — full zero-package Node.js web app, Agent Host + `workspaceStorage` session parser, Microsoft Foundry LLM session handoff summarizer, Electron Windows desktop app, and NSIS setup installer. |
| [`workshop/Fundamentals/`](./workshop/Fundamentals/README.md) | **60-Minute Beginner Workshop** — step-by-step, beginner-friendly prompts to build the core zero-package Chronicle web app from an empty `sampleapp/` folder using VS Code, GitHub Copilot, a frontier model, and `.github/copilot-instructions.md`. |
| [`workshop/Advanced/`](./workshop/Advanced/README.md) | **90-Minute Advanced Workshop** — multi-agent orchestration & skills lab starting from the basic Chronicle app in `sampleapp/`, building an Orchestrator + specialized role agents (Dev, Test, Security, Docs) + reusable skills to add Microsoft Foundry LLM session summarization, an Electron desktop shell, and a Windows NSIS setup installer. |

---

## Architectural Rule: Zero Runtime npm Packages

Across `appsample/` and both workshop tracks, Chronicle uses **zero runtime Node.js / npm package dependencies** (`"dependencies"` is omitted completely). HTTP serving, Myers line diffing, background worker indexing, GFM Markdown rendering, DOM HTML sanitization, syntax highlighting, SVG icons, and PNG/ICO icon generation are all designed directly into the application source code using Node.js built-ins (`node:*`) and native browser APIs.
