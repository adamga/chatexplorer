# Lab 00 — Intro & Setup: What Are We Building?

⏱️ **Estimated Time:** 7 minutes

---

## 1. Welcome! What Is Chronicle?

Every time you chat with GitHub Copilot in VS Code, VS Code saves a hidden history file on your computer containing:
- Every **question (prompt)** you asked
- Every **reply** Copilot wrote back
- Any saved **thinking / reasoning** steps
- Every **tool or terminal command** Copilot ran (and what happened!)
- Every **file edit** (before and after!)

Normally, those files are giant, messy `.jsonl` logs tucked away inside hidden system folders that are nearly impossible for humans to read.

In the next **60 minutes**, you are going to team up with GitHub Copilot to build **Chronicle / Chat Explorer**—your very own local web application!

### What Your Finished App Will Do Today
- **Open & Discover Conversations:** Two easy "Open" buttons pre-filled with your computer's default VS Code (`workspaceStorage`) and Copilot Agent (`.copilot\session-state`) folders.
- **Browse & Sort Your Library:** View all your past chats grouped by project folder, and sort them by **Date** (newest/oldest) or **Name** (A→Z / Z→A).
- **Inspect Everything Safely:** Click any prompt to read the full conversation story, inspect tool inputs/outputs, see color-coded **Before vs. After** file diffs, and switch between **Dark Mode** and high-contrast **Light Mode**.
- **Instant Search:** Search across every conversation on your machine in milliseconds.
- **100% Zero Packages:** Your app will not download *any* third-party `npm` libraries—everything is built cleanly into your own code using standard Node.js and browser JavaScript!

*(Note: Today we are building the core web explorer—no desktop installer and no cloud AI session-summary service yet. Those are saved for the Advanced Workshop!)*

---

## 2. Check Your Tools (2 Minutes)

Before we start, make sure you have three things ready:

1. **Visual Studio Code** installed and open.
2. **GitHub Copilot** signed in (check the Copilot icon in the bottom-right status bar of VS Code).
3. **Node.js (v22 or newer)** installed.

Let's test Node.js right now:
1. In VS Code, press `` Ctrl+` `` (the key above Tab) to open the **Terminal**.
2. Type this command and press **Enter**:
   ```powershell
   node --version
   ```
3. Confirm you see `v22.x.x`, `v24.x.x`, or higher!

---

## 3. Open Your Empty Starter Folder in VS Code (2 Minutes)

This step is super important—opening your starter folder as the root of VS Code ensures Copilot automatically discovers the instruction file we create in Lab 01!

1. In VS Code, click **File → Open Folder...**
2. Browse to this repository and select:
   ```text
   workshop/Fundamentals/sampleapp
   ```
3. Click **Select Folder**. (If VS Code asks *"Do you trust the authors of the files in this folder?"*, click **Yes, I trust the authors**.)
4. Look at the **Explorer** sidebar on the left (`Ctrl+Shift+E`). The folder should be completely empty (except for a tiny `.gitkeep` placeholder if hidden files are shown).

---

## 4. Configure Copilot Chat & Pick a Frontier Model (3 Minutes)

1. Open the **GitHub Copilot Chat** panel in VS Code by clicking the **Toggle Chat** icon in the top titlebar (or pressing `Ctrl+Alt+I` on Windows/Linux, `Cmd+Ctrl+I` on Mac).
2. Around the chat input box:
   - Set **Agent mode** to **Autopilot** or **Interactive** *(or select **Agent** if using the classic mode dropdown)* so Copilot can create files, edit code, and run tests for you. *(Tip: In your isolated workshop folder, you can also set the **Permissions** dropdown next to mode to **Assisted** or **Allow all** so Copilot can run `node --test` without pausing on every step.)*
   - Click the **Model Picker** dropdown (`Ctrl+Alt+.`) and choose a **Frontier Model**:
     - **Claude Sonnet 5.5**, or
     - Your latest frontier **GPT** (e.g., **GPT-6.1 Sol** / **GPT-5.x**) or **Gemini** (e.g., **Gemini 4**) model *(Tip: If your model picker includes a reasoning-effort toggle, keep it on standard/`Medium` rather than `High` for snappy 2–4 minute responses during the 60-minute workshop!)*.

---

## ✅ Lab 00 Checkpoint

- [x] `node --version` prints `v22` or newer.
- [x] VS Code is open directly inside `workshop/Fundamentals/sampleapp`.
- [x] Copilot Chat is set to **Agent** mode with a **Frontier Model** selected.

👉 **Next up: [Lab 01 — Teaching Copilot Your Ground Rules (`copilot-instructions.md`)](./Lab-01-Copilot-Instructions-Zero-Packages.md)**
