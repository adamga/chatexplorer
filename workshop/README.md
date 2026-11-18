# Chronicle Hands-On Workshop Series

Welcome to the **Chronicle / Chat Explorer** hands-on GitHub Copilot workshop curriculum! Across two progressive sessions, participants build a zero-package, read-only local observatory for VS Code and GitHub Copilot chat history—first using prompt-driven Copilot Agent Mode from an empty folder, and then scaling up to a multi-agent engineering team with custom skills, Microsoft Foundry LLM session summarization, and a packaged Windows Electron desktop installer.

---

## Workshop Tracks

| Track | Duration | Starting Folder | What Participants Build |
|---|---|---|---|
| **[1. Fundamentals](./Fundamentals/README.md)** | **60 minutes** (1.0 hr) | `workshop/Fundamentals/sampleapp/` *(empty)* | Using only VS Code, GitHub Copilot, `.github/copilot-instructions.md`, and a frontier model (Claude Sonnet 5.5, GPT, or Gemini), build the complete **zero-package Node.js web application** to load, sort, search, and inspect VS Code (`workspaceStorage`) and Copilot Agent (`.copilot\session-state`) chat sessions. *(No custom agents/skills, no Electron, no LLM summarizer.)* |
| **[2. Advanced](./Advanced/README.md)** | **90 minutes** (1.5 hrs) | `workshop/Advanced/sampleapp/` *(completed Fundamentals web app)* | Design an **Orchestrator Agent**, a team of **role-based subagents** (Developer, Tester, Security, Documentation), and **reusable Agent Skills (`SKILL.md`)**, then dispatch work across the team to add **Microsoft Foundry LLM Session Handoff Summarization** (`<session-name>-summary.md`), an **Electron Desktop App**, and a **Windows NSIS Setup Installer**. |

> **Instructor Reference:** The complete, finished end-state application after both workshops lives at [`../../appsample/`](../appsample/README.md).
