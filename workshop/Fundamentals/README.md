# GitHub Copilot Workshop — Fundamentals (60 Minutes)

**Build a Complete Zero-Package Chat History Explorer from Scratch with VS Code & GitHub Copilot**

Welcome! In this 1-hour hands-on workshop, you will start from a completely empty folder (`sampleapp/`) and guide GitHub Copilot step-by-step to build **Chronicle**—a sleek local web app that opens, sorts, searches, and replays your saved VS Code and Copilot chat conversations right in your browser.

No custom agents, no frameworks, and **zero `npm install` packages**—every piece of logic (web server, file parser, diff viewer, Markdown renderer, syntax highlighter, and icons) is written directly into your own source code!

---

## Schedule & Lab Map (60 Minutes Total)

| Lab | Topic | Time |
|---|---|---|
| **[Lab 00 — Intro & Setup](./Lab-00-Intro-and-Setup.md)** | Meet Chronicle, check Node.js & VS Code, pick a Frontier Model (Claude Sonnet 5.5 / GPT / Gemini), and open the empty `sampleapp` workspace | **7 min** |
| **[Lab 01 — Ground Rules (`copilot-instructions.md`)](./Lab-01-Copilot-Instructions-Zero-Packages.md)** | Teach Copilot your #1 project rule—**Node.js built-ins only, ZERO npm packages**—and create your starter `package.json` | **8 min** |
| **[Lab 02 — Reading Chat History & File Diffs](./Lab-02-Session-Parser-and-Diff-Engine.md)** | Prompt Copilot to build the line-diff engine, session parser (`workspaceStorage` + `.copilot\session-state`), background indexer, and unit tests | **15 min** |
| **[Lab 03 — Zero-Package Local Web Server](./Lab-03-Zero-Package-Web-Server.md)** | Prompt Copilot to build a secure `127.0.0.1` web server using Node's built-in `node:http` module | **10 min** |
| **[Lab 04 — Interactive Browser Explorer UI](./Lab-04-Interactive-Explorer-UI.md)** | Prompt Copilot to build inline SVG icons, Markdown + sanitizer + code highlighter, sortable dark/light UI, and explore real chats live! | **20 min** |

---

## Golden Tips for Every Lab

1. **Stay inside `workshop/Fundamentals/sampleapp`:** Open *only* that folder in VS Code (`File → Open Folder...`) so Copilot puts every file in the right place and automatically reads `.github/copilot-instructions.md`.
2. **Use Agent Mode + a Frontier Model:** Make sure the Copilot Chat mode dropdown is set to **Agent** and the model picker is set to **Claude Sonnet 5.5** (or an equivalent frontier GPT or Gemini model).
3. **Copy, Paste, Watch, Test:** Every lab gives you exact **Copy & Paste Prompts**. Watch Copilot create files and run terminal checks, then run the quick **Test Checkpoint** before moving to the next lab.

👉 **Ready? Start with [Lab 00 — Intro & Setup](./Lab-00-Intro-and-Setup.md)!**
