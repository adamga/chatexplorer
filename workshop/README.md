# Chronicle Hands-On Workshop Series

Across two sessions, participants build a zero-package, read-only local explorer for VS Code and GitHub Copilot chat history, then extend it with custom agents, skills, and Microsoft Foundry session summarization. Both tracks run directly on **Node.js 22+** with no npm, npx, or package installs. The Windows desktop installer is an optional reference-app build, not a workshop requirement.

---

## Workshop Tracks

| Track | Duration | Starting Folder | What Participants Build |
|---|---|---|---|
| **[1. Fundamentals](./Fundamentals/README.md)** | **60 minutes** (1.0 hr) | `workshop/Fundamentals/sampleapp/` *(empty)* | Using only VS Code, GitHub Copilot, `.github/copilot-instructions.md`, and a frontier model (Claude Sonnet 5.5, GPT, or Gemini), build the complete **zero-package Node.js web application** to load, sort, search, and inspect VS Code (`workspaceStorage`) and Copilot Agent (`.copilot\session-state`) chat sessions. *(No custom agents/skills, no Electron, no LLM summarizer.)* |
| **[2. Advanced](./Advanced/README.md)** | **90 minutes** (1.5 hrs) | `workshop/Advanced/sampleapp/` *(completed Fundamentals web app)* | Design an **Orchestrator Agent**, **role-based subagents** and **reusable Agent Skills**, then add **Microsoft Foundry session handoff summarization** and verify a browser release. |

> **Instructor Reference:** The [reference app](../appsample/README.md) includes the workshop features and an optional desktop wrapper.
