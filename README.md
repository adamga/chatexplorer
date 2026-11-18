# Chronicle / Chat Explorer — Reference App & Hands-On Workshops

This repository contains **Chronicle / Chat Explorer**—a zero-package, read-only local observatory for persisted VS Code and Copilot Agent chat sessions—along with two progressive hands-on GitHub Copilot workshops.

---

## Repository Structure

| Path | Description |
|---|---|
| [`appsample/`](./appsample/README.md) | **Complete Reference Application** — full zero-package Node.js web app, Agent Host + `workspaceStorage` session parser, Microsoft Foundry LLM session handoff summarizer, Electron Windows desktop app, and NSIS setup installer. |
| [`workshop/Fundamentals/`](./workshop/Fundamentals/README.md) | **60-Minute Beginner Workshop** — step-by-step, beginner-friendly prompts to build the core zero-package Chronicle web app from an empty `sampleapp/` folder using VS Code, GitHub Copilot, a frontier model, and `.github/copilot-instructions.md`. |
| [`workshop/Advanced/`](./workshop/Advanced/README.md) | **90-Minute Advanced Workshop** — build an orchestrator, specialist agents, and reusable skills to add Microsoft Foundry session summarization and verify a package-free browser release. Review the optional desktop architecture without building it. |

---

## Architectural Rule: Zero Runtime npm Packages

**Neither workshop requires npm or npx.** Use Node.js 22+ directly for the browser app, syntax checks, and tests. The reference app's Electron installer build and Playwright suite are optional maintainer workflows.

Across `appsample/` and both workshop tracks, Chronicle uses **zero runtime Node.js / npm package dependencies** (`"dependencies"` is omitted completely). HTTP serving, Myers line diffing, background worker indexing, GFM Markdown rendering, DOM HTML sanitization, syntax highlighting, SVG icons, and PNG/ICO icon generation are all designed directly into the application source code using Node.js built-ins (`node:*`) and native browser APIs.
