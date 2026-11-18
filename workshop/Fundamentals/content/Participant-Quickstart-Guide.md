# Build Chronicle! — Kid-Friendly Participant Quickstart Card

⏱️ **Total Hands-On Time:** 60 Minutes  
🎯 **Your Goal:** Start from a **completely empty folder** and team up with GitHub Copilot to build **Chronicle / Chat Explorer** (`http://127.0.0.1:3210/`) with **zero outside packages**!

---

## 🎒 Before You Start (3-Check Backpack!)

1. **VS Code Open** inside `workshop/Fundamentals/sampleapp` *(use **File → Open Folder...** so `sampleapp` is right at the top of Explorer!)*.
2. **Node.js v22+** ready (`node --version` in Terminal `` Ctrl+` ``). No npm, npx, or package installs.
3. **GitHub Copilot Chat** (`Ctrl+Alt+I`) set to **Agent / Autopilot** mode with a **Frontier Model** (**Claude Sonnet 5.5**, **GPT-6.1**, or **Gemini 4**) at standard/**Medium** speed.

---

## 🧱 Our Golden Rule: Own LEGO Bricks Only!

Most apps download hundreds of outside "mystery boxes" (`npm install`). Today we build **100% of our app** with the clean LEGO bricks already built into **Node.js** (`node:http`, `node:fs`, `node:test`) and your **Browser** (plain HTML, CSS, JS, and SVG icons)!

---

## 🗺️ Your 5 Bite-Sized Steps (60 Minutes)

| Step | Time | Lab File | What You & Copilot Build | Victory Check |
| :--- | :---: | :--- | :--- | :--- |
| **Step 1** | `7 min` | [`Lab-00-Intro-and-Setup.md`](../Lab-00-Intro-and-Setup.md) | Trust empty `sampleapp` folder & pick your Frontier Model | `node --version` prints `v22+` |
| **Step 2** | `8 min` | [`Lab-01-Copilot-Instructions-Zero-Packages.md`](../Lab-01-Copilot-Instructions-Zero-Packages.md) | Create Copilot's Magic Rulebook (`.github/copilot-instructions.md`) & `package.json` | `0` dependencies in `package.json` |
| **Step 3** | `15 min` | [`Lab-02-Session-Parser-and-Diff-Engine.md`](../Lab-02-Session-Parser-and-Diff-Engine.md) | Build Spot-the-Difference (`diff.js`), Dual Chat Reader (`parser.js`) & Search Library | `node --test` prints green `pass`! |
| **Step 4** | `10 min` | [`Lab-03-Zero-Package-Web-Server.md`](../Lab-03-Zero-Package-Web-Server.md) | Build private `127.0.0.1:3210` web server with built-in `node:http` | Security & API tests pass |
| **Step 5** | `20 min` | [`Lab-04-Interactive-Explorer-UI.md`](../Lab-04-Interactive-Explorer-UI.md) | Paint 60+ SVG icons, Markdown, Dark & Bright White Mode, Sort & Search! | App live at `http://127.0.0.1:3210/`! |

---

## 🏆 Finish-Line Treasure Hunt (`node --max-old-space-size=8192 src/server.js`)

Once your app opens at **http://127.0.0.1:3210/**:
1. Click **Open session** → explore your classic VS Code `workspaceStorage` chats!
2. Click **Agent sessions** → find **TODAY'S workshop chat** right inside `.copilot\session-state`!
3. Sort your chats **Name (A → Z)** and **Date (Newest first)**.
4. Click the **Sun** icon (bottom-left) to flip between **Dark Mode** and **Bright White Mode**.
5. Click **Read full session**, inspect a green/red **File Diff**, and press `Ctrl+Shift+F` to search across all chats!
