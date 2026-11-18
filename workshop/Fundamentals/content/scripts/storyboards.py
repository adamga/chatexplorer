"""
Storyboards and verbatim narration scripts for the two Chronicle Fundamentals explainer videos:
  1. participant — Kid-friendly, simple, exciting intro to lab goals, techniques, and steps (Labs 00-04)
  2. instructor  — Facilitator guide covering the scenario, pre-flight, pacing, coaching & troubleshooting

Zero credentials or personal paths appear anywhere in this file.
"""
from __future__ import annotations

PARTICIPANT_STORYBOARD = {
    "id": "participant",
    "title": "Build Chronicle! — Participant Lab Explainer",
    "voice": "coral",
    "output_mp4": "Participant-Explainer.mp4",
    "output_srt": "Participant-Explainer.srt",
    "output_vtt": "Participant-Explainer.vtt",
    "output_transcript": "transcripts/Participant-Explainer-Transcript.md",
    "scenes": [
        {
            "id": "p01_welcome",
            "badge": "WELCOME BUILDERS!",
            "accent": "cyan",
            "layout": "video_hero",
            "clip_range": (0.0, 12.0),
            "screenshot": "01-hero-overview-dark.png",
            "headline": "Turn Copilot's Secret Notebook Into Your Own App!",
            "subhead": "60-Minute Hands-On Lab  ·  http://127.0.0.1:3210/",
            "cards": [
                ("Questions & Replies", "Read every chat story cleanly"),
                ("Thinking & Tools", "Peek inside Copilot's brain"),
                ("Before & After Code", "Spot green + and red - changes"),
            ],
            "spotlight": (0.64, 0.48),
            "narration": (
                "Welcome to the Chronicle Fundamentals Workshop! "
                "Have you ever wondered where your GitHub Copilot chats go after you close Visual Studio Code? "
                "Every question you ask, every thinking bubble, every command, and every code change is saved inside a hidden detective notebook on your computer. "
                "Today, in just sixty fun minutes, you are going to build Chronicle—your very own local web app to explore it all!"
            ),
        },
        {
            "id": "p02_lego_rule",
            "badge": "OUR GOLDEN RULE",
            "accent": "amber",
            "layout": "split_cards",
            "screenshot": "04-library-sortable-dark.png",
            "headline": "Zero Outside Packages — Own LEGO Bricks Only!",
            "subhead": "No npm install  ·  No Mystery Boxes  ·  100% Your Own Code",
            "cards": [
                ("Skip 500 Mystery Boxes", "Never run npm install or get blocked by Wi-Fi firewalls"),
                ("Built-In Node Superpowers", "Use node:http for our server and node:test for checks"),
                ("Pure Browser Magic", "Plain HTML, CSS, JavaScript, and custom SVG icons!"),
            ],
            "spotlight": (0.72, 0.36),
            "narration": (
                "Here is our coolest superpower today: the Zero-Package Rule! "
                "Most apps download hundreds of outside mystery boxes from the internet. If even one box breaks, the whole castle falls down! "
                "Instead, we will build every single piece using the clean LEGO bricks already built into Node.js and your web browser. "
                "Zero npm installs, zero node_modules, and lightning-fast startup!"
            ),
        },
        {
            "id": "p03_lab00_setup",
            "badge": "STEP 1  ·  LAB 00 (7 MIN)",
            "accent": "cyan",
            "layout": "steps_showcase",
            "screenshot": "01-hero-overview-dark.png",
            "headline": "Quick Backpack Check & Open Your Empty Sandbox",
            "subhead": "Open workshop/Fundamentals/sampleapp right at the top of VS Code",
            "cards": [
                ("1. Check Node v22+", "Run node --version in your VS Code Terminal"),
                ("2. Open sampleapp Folder", "Use File -> Open Folder so your sandbox is the root"),
                ("3. Pick a Frontier Brain", "Choose Agent mode with Sonnet 5.5, GPT, or Gemini!"),
            ],
            "spotlight": (0.50, 0.50),
            "narration": (
                "We kick off in Lab Zero with an easy seven-minute backpack check. "
                "Check that Node version twenty-two or newer is ready in your terminal, open the empty sampleapp folder directly in VS Code, "
                "and switch Copilot Chat into Agent mode with a frontier model like Claude Sonnet, GPT, or Gemini!"
            ),
        },
        {
            "id": "p04_lab01_rulebook",
            "badge": "STEP 2  ·  LAB 01 (8 MIN)",
            "accent": "purple",
            "layout": "code_and_shot",
            "screenshot": "04-library-sortable-dark.png",
            "headline": "Write Copilot's Magic Rulebook!",
            "subhead": ".github/copilot-instructions.md teaches Copilot your rules forever",
            "code_title": ".github/copilot-instructions.md",
            "code_lines": [
                "ZERO NPM PACKAGES ALLOWED!",
                "- Never run npm install",
                "- Backend: built-in node:http & node:fs",
                "- Tests: built-in node:test runner",
                "- Frontend: plain HTML, CSS, JS & SVG",
                "- Local safety: 127.0.0.1 read-only!",
            ],
            "cards": [
                ("Teach Copilot Once", "VS Code attaches your rulebook on every chat turn!"),
                ("Clean package.json", "Confirm there is zero dependencies block inside"),
            ],
            "spotlight": (0.70, 0.42),
            "narration": (
                "Next, in Lab One, you paste your first prompt to create Copilot's magic rulebook: dot-github slash copilot-instructions-dot-md. "
                "From that moment on, VS Code automatically hands your rulebook to Copilot on every single prompt—so Copilot remembers never to install outside packages!"
            ),
        },
        {
            "id": "p05_lab02_brain",
            "badge": "STEP 3  ·  LAB 02 (15 MIN)",
            "accent": "green",
            "layout": "zoom_shot",
            "screenshot": "07-file-diff-view.png",
            "headline": "Build the Chat Reader & Spot-the-Difference Engine",
            "subhead": "src/diff.js + src/parser.js + src/library.js  ·  Verified by node --test!",
            "cards": [
                ("Reads Both Chat Formats", "VS Code workspaceStorage + Copilot Agent events.jsonl"),
                ("Green + & Red - Diffs", "Myers line-diff engine highlights every code edit"),
                ("Green Test Checkmarks", "Run node --test to prove every piece works!"),
            ],
            "spotlight": (0.68, 0.52),
            "narration": (
                "In Lab Two, Copilot builds the brain of your app! "
                "It learns how to read both classic VS Code chats and new Copilot Agent sessions, indexes every word in a speedy background worker, "
                "and builds a Spot-the-Difference engine so deleted lines glow red and new lines glow green. "
                "Then you run node --test and watch green checkmarks light up your terminal!"
            ),
        },
        {
            "id": "p06_lab03_server",
            "badge": "STEP 4  ·  LAB 03 (10 MIN)",
            "accent": "cyan",
            "layout": "dual_shots",
            "screenshot": "02-open-vscode-dialog.png",
            "screenshot_alt": "03-open-agent-dialog.png",
            "headline": "Lock the Front Door with Your Own node:http Server",
            "subhead": "Private 127.0.0.1:3210 server + two smart pre-filled Open buttons!",
            "cards": [
                ("Door 1: Open Session", "Pre-filled with your VS Code workspaceStorage path"),
                ("Door 2: Agent Sessions", "Pre-filled with your .copilot\\session-state path"),
            ],
            "spotlight": (0.50, 0.52),
            "narration": (
                "In Lab Three, you build a fast, private local web server in src/server.js using Node's built-in http module—no Express required! "
                "It locks the door to 127.0.0.1 so random websites can never peek at your chats, and automatically finds your computer's default VS Code and Agent session folders!"
            ),
        },
        {
            "id": "p07_lab04_ui",
            "badge": "STEP 5  ·  LAB 04 (20 MIN)",
            "accent": "coral",
            "layout": "video_and_light",
            "clip_range": (7.5, 22.0),
            "screenshot": "05-library-light-mode.png",
            "headline": "Paint Dark & Bright White Mode, Sort & Read Full Stories!",
            "subhead": "60+ custom SVG icons, colored Markdown, A -> Z sorting & safety shield",
            "cards": [
                ("Sort Any Way You Like", "Date Newest/Oldest or Name A to Z in one click"),
                ("Dark & Bright White Mode", "Crisp, high-contrast colors that are easy to read"),
                ("Full Story Streaming", "Read prompts, thoughts, tools, and diffs together!"),
            ],
            "spotlight": (0.62, 0.45),
            "narration": (
                "Finally, in Lab Four, two fun prompts paint your entire browser playground! "
                "You will create over sixty crisp SVG icons, a Markdown highlighter and HTML safety shield, "
                "easy sorting by Date or Name, and a one-click toggle between sleek Dark Mode and super-clear Bright White Mode!"
            ),
        },
        {
            "id": "p08_launch",
            "badge": "LET'S BUILD IT!",
            "accent": "green",
            "layout": "finale",
            "screenshot": "08-global-search.png",
            "headline": "Launch Chronicle in your browser",
            "subhead": "Open Lab-00-Intro-and-Setup.md and start your 60-minute adventure!",
            "cards": [
                ("Find Today's Chat Live!", "Open Agent sessions and see your own workshop chat"),
                ("Instant Global Search", "Press Ctrl+Shift+F to search every project at once"),
                ("100% Built By You", "Zero outside packages — ready for Lift-Off!"),
            ],
            "spotlight": (0.66, 0.44),
            "narration": (
                "At the finish line, use the Node start command in Lab Four, open the local address it prints, "
                "and even find the very workshop conversation you are having right now! "
                "Open Lab Zero in VS Code, trust your empty sampleapp folder, and let's build Chronicle together!"
            ),
        },
    ],
}


INSTRUCTOR_STORYBOARD = {
    "id": "instructor",
    "title": "Delivering Chronicle Fundamentals — Instructor Explainer",
    "voice": "alloy",
    "output_mp4": "Instructor-Explainer.mp4",
    "output_srt": "Instructor-Explainer.srt",
    "output_vtt": "Instructor-Explainer.vtt",
    "output_transcript": "transcripts/Instructor-Explainer-Transcript.md",
    "scenes": [
        {
            "id": "i01_scenario",
            "badge": "INSTRUCTOR BRIEFING",
            "accent": "purple",
            "layout": "video_hero",
            "clip_range": (0.0, 13.0),
            "screenshot": "06-full-story-view.png",
            "headline": "The Fundamentals Scenario: Empty Folder to Zero-Dep App",
            "subhead": "Coaching beginners to build http://127.0.0.1:3210/ in 60 minutes",
            "cards": [
                ("Immediate Personal Hook", "Learners browse their OWN VS Code & Agent chats live"),
                ("Zero Wi-Fi / npm Friction", "No npm install = zero proxy or registry failures"),
                ("Clean Baseline Architecture", "Feeds directly into the 90-minute Advanced Workshop"),
            ],
            "spotlight": (0.65, 0.48),
            "narration": (
                "Welcome, instructors! In the Chronicle Fundamentals lab, you will guide participants—from curious kids to first-time Copilot builders—from a completely empty folder to a tested, zero-dependency Node.js web app in sixty minutes. "
                "Because learners finish by opening their own real VS Code and Copilot Agent sessions at http://127.0.0.1:3210, the payoff feels magical—and our strict zero-package design eliminates classroom npm and firewall failures completely."
            ),
        },
        {
            "id": "i02_preflight",
            "badge": "10-MIN PRE-FLIGHT",
            "accent": "amber",
            "layout": "steps_showcase",
            "screenshot": "01-hero-overview-dark.png",
            "headline": "Four Pre-Flight Checks Before Kickoff",
            "subhead": "Prevent 90% of classroom delays before Lab 00 even begins",
            "cards": [
                ("1. Live Finish-Line Demo", "Keep http://127.0.0.1:3210 running for a 90s opener"),
                ("2. Node v22+ & Root Folder", "Open workshop/Fundamentals/sampleapp directly as root"),
                ("3. Medium Reasoning Speed", "Avoid High/Max reasoning so turns finish in 2–4 min!"),
            ],
            "spotlight": (0.66, 0.44),
            "narration": (
                "Ten minutes before doors open, lock in four pre-flight checks. "
                "First, keep a finished Chronicle server running on port 3210 so you can demo the finish line in ninety seconds. "
                "Second, verify Node twenty-two or newer and make sure everyone opens workshop slash Fundamentals slash sampleapp directly as their VS Code root folder. "
                "Third, have students pick a frontier model at standard or Medium reasoning effort—High reasoning can stretch a three-minute build past ten minutes! "
                "And fourth, suggest Assisted or Allow all permissions inside their isolated starter folder."
            ),
        },
        {
            "id": "i03_pacing",
            "badge": "60-MINUTE RUN OF SHOW",
            "accent": "cyan",
            "layout": "timeline_map",
            "screenshot": "04-library-sortable-dark.png",
            "headline": "Minute-by-Minute Pacing & Group Checkpoints",
            "subhead": "7m Setup  +  8m Rulebook  +  15m Parser  +  10m Server  +  20m UI  =  60m",
            "cards": [
                ("Min 00–15: Labs 00 & 01", "Setup sandbox + lock in .github/copilot-instructions.md"),
                ("Min 15–40: Labs 02 & 03", "Myers diff, dual parser, worker index & node:http server"),
                ("Min 40–60: Lab 04 & Hunt", "SVG/Markdown UI, Dark & White themes + live exploration!"),
            ],
            "spotlight": (0.68, 0.45),
            "narration": (
                "Keep a brisk, celebratory rhythm across five timed checkpoints: "
                "seven minutes for Lab Zero setup, eight minutes for the Lab One rulebook, "
                "fifteen minutes for Lab Two's dual-format parser, Myers diff engine, and unit tests, "
                "ten minutes for Lab Three's loopback http server, and twenty minutes for Lab Four's browser interface and five-minute live treasure hunt."
            ),
        },
        {
            "id": "i04_coaching",
            "badge": "COACHING TECHNIQUE",
            "accent": "green",
            "layout": "code_and_shot",
            "screenshot": "06-full-story-view.png",
            "headline": "Turning 3-Minute AI Turns Into Active Learning",
            "subhead": "Teach Prompt -> Peek -> Test with playful, jargon-free analogies",
            "code_title": "FACILITATOR TALKING CUES",
            "code_lines": [
                "1. Built-in modules = 'Our Own LEGO Bricks'",
                "2. copilot-instructions.md = 'Magic Rulebook'",
                "3. Expand 'Used 1 reference' in Chat UI!",
                "4. Peek inside package.json (0 dependencies)",
                "5. Always prove it with green node --test runs!",
            ],
            "cards": [
                ("Spotlight Chat References", "Show learners VS Code injecting their rulebook live"),
                ("Pair-Buddy High Fives", "Fast finishers coach neighbors before advancing"),
            ],
            "spotlight": (0.70, 0.48),
            "narration": (
                "While Copilot spends two to four minutes generating code in Labs Two through Four, fill the air with visual stories rather than syntax lectures! "
                "Right after Lab One, have every student click the References toggle at the top of Copilot's reply so they actually see dot-github slash copilot-instructions-dot-md attached automatically. "
                "Model the core engineering loop on every lab: Prompt clearly, Peek at the generated files, and run node --test to verify!"
            ),
        },
        {
            "id": "i05_pitfalls_1",
            "badge": "TROUBLESHOOTING  ·  1 OF 2",
            "accent": "coral",
            "layout": "split_cards",
            "screenshot": "02-open-vscode-dialog.png",
            "headline": "Fast Rescues: Wrong Root Folder & Pending Approvals",
            "subhead": "Diagnose and fix the top two classroom snags in under 30 seconds",
            "cards": [
                ("Snag 1: Copilot Runs npm install", "Student opened parent repo! Re-open sampleapp directly as root & delete node_modules."),
                ("Snag 2: Turn Appears Frozen", "Look in Chat for a waiting Allow / Continue / Keep button; switch Permissions to Assisted."),
                ("Snag 3: Failing Test Assertion", "Use the 1-line Rescue Prompt in Lab 02 to let Copilot self-heal from node --test output!"),
            ],
            "spotlight": (0.72, 0.45),
            "narration": (
                "Here are your fastest classroom rescues. "
                "First, if Copilot ignores the zero-package rule and tries to run npm install, glance at the student's Explorer sidebar—nine times out of ten, they opened the parent repository instead of opening sampleapp as the root folder! Have them re-open sampleapp directly. "
                "Second, if a turn seems stuck with a spinning indicator, scroll the Chat pane to click any waiting Allow or Keep confirmation button."
            ),
        },
        {
            "id": "i06_pitfalls_2",
            "badge": "TROUBLESHOOTING  ·  2 OF 2",
            "accent": "cyan",
            "layout": "zoom_shot",
            "screenshot": "07-file-diff-view.png",
            "headline": "Windows File-Watcher Locks & MCP Tool Distractions",
            "subhead": "Real platform lessons uncovered during live Playwright validation",
            "cards": [
                ("Windows EBUSY Temp Locks", "Keep server static-file tests in os.tmpdir(), never inside watched workspace public/"),
                ("Port 3210 Already in Use", "Stop previous terminal with Ctrl+C or launch with PORT=3211"),
                ("Skip Browser MCP Mid-Build", "Validate Steps 1 & 2 with node --check & node --test; launch browser in Step 3!"),
            ],
            "spotlight": (0.68, 0.50),
            "narration": (
                "On developer laptops, watch for two subtle platform quirks we already guarded against in the lab prompts. "
                "On Windows, server tests should write temporary static fixtures to os.tmpdir rather than inside the workspace public folder, preventing VS Code file-watcher EBUSY locks. "
                "And if an advanced attendee has Chrome DevTools or Playwright MCP servers installed globally, remind them to validate Lab Four generation with node dash-dash-check first rather than spinning up browser MCP tools mid-turn!"
            ),
        },
        {
            "id": "i07_catchup",
            "badge": "SAFETY NET & PACING",
            "accent": "amber",
            "layout": "video_and_light",
            "clip_range": (11.0, 23.0),
            "screenshot": "05-library-light-mode.png",
            "headline": "Built-In Catch-Up Snapshot & Time-Cut Valves",
            "subhead": "workshop/Advanced/sampleapp holds the exact completed Fundamentals app!",
            "cards": [
                ("Instant File Rescue", "Copy any missed src/ module from workshop/Advanced/sampleapp/src/"),
                ("10-Min Time-Cut Valve", "Run Lab 04 Step 1 & Step 2 back-to-back to protect live exploration time"),
                ("Accessibility Check", "Showcase Bright White Mode & larger fonts on classroom projectors!"),
            ],
            "spotlight": (0.62, 0.45),
            "narration": (
                "If a participant joins late or hits a network hiccup in Lab Two or Three, you have a built-in golden safety net: "
                "workshop slash Advanced slash sampleapp contains a clean, tested snapshot of the exact finished Fundamentals app! "
                "You can copy any missing backend file into their folder in seconds so everyone builds the Lab Four UI and celebrates at the finish line together. "
                "And when projecting on a bright room screen, toggle Chronicle's high-contrast White Mode so every row is crystal clear from the back row!"
            ),
        },
        {
            "id": "i08_debrief",
            "badge": "FINISH LINE & BRIDGE",
            "accent": "green",
            "layout": "finale",
            "screenshot": "08-global-search.png",
            "headline": "Lead the Live Treasure Hunt & Bridge to Advanced!",
            "subhead": "Celebrate 0 packages + 20+ passing tests -> Tease Multi-Agent Orchestration",
            "cards": [
                ("Inspect Today's Chat!", "Have everyone open Agent sessions to see the lab chat they just ran"),
                ("Ask 'What If No Rulebook?'", "Reinforce why .github/copilot-instructions.md prevented Express/marked"),
                ("Bridge to Session 2", "Next up: 5-Agent Team + Custom Skills + Foundry AI Summaries + a browser release!"),
            ],
            "spotlight": (0.66, 0.44),
            "narration": (
                "Save the final five minutes for an energizing group treasure hunt at http://127.0.0.1:3210! "
                "Have learners click Agent sessions to inspect the very workshop conversation they just used to build the app, flip sorting from A to Z, inspect a green-and-red file diff, and run a global search. "
                "Then close by teasing the ninety-minute Advanced Workshop—where they will evolve this exact app using an Orchestrator agent, four specialist agents with custom skills, Microsoft Foundry AI session summaries, and a Windows desktop installer. Have an awesome delivery!"
            ),
        },
    ],
}

ALL_STORYBOARDS = {
    "participant": PARTICIPANT_STORYBOARD,
    "instructor": INSTRUCTOR_STORYBOARD,
}
