# Delivering Chronicle Fundamentals — Instructor Explainer — Full Narration Transcript

- **Video File:** `Instructor-Explainer.mp4`
- **Subtitles:** `Instructor-Explainer.srt` / `Instructor-Explainer.vtt`
- **TTS Model & Voice:** Microsoft Foundry `gpt-audio-1.5` (`alloy`)
- **Total Duration:** `4m 34.1s` (`274.15s`)

---

## Scene 1: The Fundamentals Scenario: Empty Folder to Zero-Dep App (`00:00:00 – 00:00:36`)

Welcome, instructors! In the Chronicle Fundamentals lab, you will guide participants—from curious kids to first-time Copilot builders—from a completely empty folder to a tested, zero-dependency Node.js web app in sixty minutes. Because learners finish by opening their own real VS Code and Copilot Agent sessions at http://127.0.0.1:3210, the payoff feels magical—and our strict zero-package design eliminates classroom npm and firewall failures completely.

## Scene 2: Four Pre-Flight Checks Before Kickoff (`00:00:36 – 00:01:15`)

Ten minutes before doors open, lock in four pre-flight checks. First, keep a finished Chronicle server running on port 3210 so you can demo the finish line in ninety seconds. Second, verify Node twenty-two or newer and make sure everyone opens workshop slash Fundamentals slash sampleapp directly as their VS Code root folder. Third, have students pick a frontier model at standard or Medium reasoning effort—High reasoning can stretch a three-minute build past ten minutes! And fourth, suggest Assisted or Allow all permissions inside their isolated starter folder.

## Scene 3: Minute-by-Minute Pacing & Group Checkpoints (`00:01:15 – 00:01:41`)

Keep a brisk, celebratory rhythm across five timed checkpoints: seven minutes for Lab Zero setup, eight minutes for the Lab One rulebook, fifteen minutes for Lab Two's dual-format parser, Myers diff engine, and unit tests, ten minutes for Lab Three's loopback http server, and twenty minutes for Lab Four's browser interface and five-minute live treasure hunt.

## Scene 4: Turning 3-Minute AI Turns Into Active Learning (`00:01:41 – 00:02:13`)

While Copilot spends two to four minutes generating code in Labs Two through Four, fill the air with visual stories rather than syntax lectures! Right after Lab One, have every student click the References toggle at the top of Copilot's reply so they actually see dot-github slash copilot-instructions-dot-md attached automatically. Model the core engineering loop on every lab: Prompt clearly, Peek at the generated files, and run npm test to verify!

## Scene 5: Fast Rescues: Wrong Root Folder & Pending Approvals (`00:02:13 – 00:02:42`)

Here are your fastest classroom rescues. First, if Copilot ignores the zero-package rule and tries to run npm install, glance at the student's Explorer sidebar—nine times out of ten, they opened the parent repository instead of opening sampleapp as the root folder! Have them re-open sampleapp directly. Second, if a turn seems stuck with a spinning indicator, scroll the Chat pane to click any waiting Allow or Keep confirmation button.

## Scene 6: Windows File-Watcher Locks & MCP Tool Distractions (`00:02:42 – 00:03:16`)

On developer laptops, watch for two subtle platform quirks we already guarded against in the lab prompts. On Windows, server tests should write temporary static fixtures to os.tmpdir rather than inside the workspace public folder, preventing VS Code file-watcher EBUSY locks. And if an advanced attendee has Chrome DevTools or Playwright MCP servers installed globally, remind them to validate Lab Four generation with node dash-dash-check first rather than spinning up browser MCP tools mid-turn!

## Scene 7: Built-In Catch-Up Snapshot & Time-Cut Valves (`00:03:16 – 00:03:52`)

If a participant joins late or hits a network hiccup in Lab Two or Three, you have a built-in golden safety net: workshop slash Advanced slash sampleapp contains a clean, tested snapshot of the exact finished Fundamentals app! You can copy any missing backend file into their folder in seconds so everyone builds the Lab Four UI and celebrates at the finish line together. And when projecting on a bright room screen, toggle Chronicle's high-contrast White Mode so every row is crystal clear from the back row!

## Scene 8: Lead the Live Treasure Hunt & Bridge to Advanced! (`00:03:52 – 00:04:34`)

Save the final five minutes for an energizing group treasure hunt at http://127.0.0.1:3210! Have learners click Agent sessions to inspect the very workshop conversation they just used to build the app, flip sorting from A to Z, inspect a green-and-red file diff, and run a global search. Then close by teasing the ninety-minute Advanced Workshop—where they will evolve this exact app using an Orchestrator agent, four specialist agents with custom skills, Microsoft Foundry AI session summaries, and a Windows desktop installer. Have an awesome delivery!
