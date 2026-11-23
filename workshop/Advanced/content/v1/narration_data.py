"""Slide-aligned scripts for both explainers + instructor speaker notes (32 slides)."""

NARRATION = [
    # 01 Cover
    {
        "section": "Opening",
        "lab": None,
        "badge": "WELCOME TO THE WORKSHOP",
        "eli5": (
            "Imagine you are building a giant LEGO spaceship, and instead of just one robot helper, "
            "you get a whole team of smart robot friends! Today we are going to meet that team in GitHub Copilot, "
            "see how each helper gets its own special job, and build a neat treasure map for Chronicle so the next builder knows just what to do!"
        ),
        "trainer": (
            "Welcome to the Train-the-Trainer walkthrough for Advanced GitHub Copilot: Agents, Skills, and Subagents. "
            "This deck follows the v2 conceptual arc—surfaces, runtime harnesses, Markdown customization, guardrails, and safe parallelism—"
            "and lands directly in Chronicle's six 90-minute hands-on labs. Open with energy: learners move from prompting one generalist assistant to directing an engineering team."
        ),
        "notes": "Welcome & framing. Total hands-on track: 90 minutes across Labs 00–05 on Chronicle (workshop/Advanced/sampleapp). Sources verified Nov 2026: code.visualstudio.com/docs/agents/overview and docs.github.com/en/copilot.",
    },
    # 02 Agenda
    {
        "section": "Opening",
        "lab": None,
        "badge": "OUR GAME PLAN",
        "eli5": (
            "First, we take a quick tour to see where our robot helpers live, how their brains work, and how we give them rules and recipe cards. "
            "Then we jump across six fun stepping-stone missions—from checking our toy box in Lab Zero all the way to putting a shiny badge on our finished app in Lab Five!"
        ),
        "trainer": (
            "Walk the room through the two-part structure: present the mental model cleanly up front, then run six tightly timeboxed labs totaling exactly ninety minutes. "
            "Point out the hard clock gates: by minute forty, every learner has their Orchestrator and four skilled workers wired up; by minute fifty-five, Foundry connectivity is verified; and the final seventeen minutes protect browser verification."
        ),
        "notes": "Run of show: Concept walkthrough (Parts 1–3) followed by 90-minute lab block: Lab 00 (8m) + Lab 01 (17m) + Lab 02 (15m) + Lab 03 (15m) + Lab 04 (18m) + Lab 05 (17m) = 90 minutes.",
    },
    # 03 Outcomes & Running Example
    {
        "section": "Opening",
        "lab": 0,
        "badge": "WHAT WE ARE BUILDING",
        "eli5": (
            "Have you ever stopped playing a big game, and the next day your friend asked, wait—what happened so far? "
            "Reading every single word from yesterday takes way too long! Our app, Chronicle, reads big chat stories safely without changing a single word, "
            "and our robot team writes a short, crystal-clear handoff note for tomorrow's builder!"
        ),
        "trainer": (
            "Anchor the five learning outcomes in Chronicle, our zero-package Node twenty-two session explorer. "
            "Why does Chronicle resonate so well in class? Because learners experience context growth firsthand while building an app that solves session handoff! "
            "Stress the two invariants early: zero external npm packages in package.json, and original chat history files remain strictly read-only."
        ),
        "notes": "Connect outcomes to Chronicle (workshop/Advanced/sampleapp). Highlight zero-package Node.js 22+ invariant and read-only session parsing.",
    },
    # 04 Part 1 Divider
    {
        "section": "Part 1 · Agent Landscape",
        "lab": 0,
        "badge": "PART 1 · WHERE HELPERS LIVE",
        "eli5": (
            "Part One! Let's peek inside the robot clubhouse and discover all the different rooms where our helpers can work, "
            "plus the secret engine room that keeps them running!"
        ),
        "trainer": (
            "Transition into Part One: the Agent Landscape. Your goal in the next seven slides is to clear up vocabulary confusion around surfaces, harnesses, the Agent Host, permissions, and context budgets before anyone writes a customization file."
        ),
        "notes": "Part 1 Section Divider: Where Agents Run, Harnesses, Agent Host, Permissions & Context.",
    },
    # 05 Evolution
    {
        "section": "Part 1 · Agent Landscape",
        "lab": 0,
        "badge": "FROM ONE HELPER TO A TEAM",
        "eli5": (
            "At first, a helper could only finish the next word you were typing, or answer one little question. "
            "Then one helper learned to use tools all by itself. Now, you get to be the conductor of a whole band—giving each specialist its own instrument so nobody plays over anyone else!"
        ),
        "trainer": (
            "Use this four-step progression to reframe the developer's job. Most attendees already use inline completions, Chat, and single-agent mode. "
            "Today's leap is the rightmost box: directing specialist agents. Warn them early that more agents only speed you up when tasks have clear boundaries and non-overlapping files."
        ),
        "notes": "Progression: Suggest -> Chat -> Single Agent -> Agent Team. Stress shift from typing code to briefing, reviewing, and integrating.",
    },
    # 06 Where Agents Run
    {
        "section": "Part 1 · Agent Landscape",
        "lab": 0,
        "badge": "FIVE PLACES AGENTS RUN",
        "eli5": (
            "Where do our helpers hang out? In five cool spots! They can sit right beside your blocks in VS Code Chat, "
            "watch lots of tables at once in the Agents Window, talk fast on a walkie-talkie in the terminal CLI, "
            "open their own big Copilot App desk, or even work up in the Cloud while your computer takes a nap!"
        ),
        "trainer": (
            "Position all five surfaces as one family sharing your repo's customizations. Contrast IDE Chat—best when inspecting lines right beside src/server.js—with VS Code's Agents Window for multi-session oversight, "
            "Copilot CLI for terminal-first planning and scripting, the standalone GitHub Copilot App built on the CLI engine, and the Cloud coding agent on GitHub-hosted runners. Reassure learners: our labs only require VS Code."
        ),
        "notes": "Topic 1: Where agents run — IDE Chat, VS Code Agents Window (code --agents), Copilot CLI, GitHub Copilot App, and Cloud Agent. Refs: code.visualstudio.com/docs/agents/overview, docs.github.com/en/copilot/concepts/copilot-surfaces/github-copilot-app.",
    },
    # 07 Inside Agents Window, CLI & App
    {
        "section": "Part 1 · Agent Landscape",
        "lab": 0,
        "badge": "INSIDE THE CONTROL ROOMS",
        "eli5": (
            "Look at those two big control rooms! On the left, the Agents Window lets you see all your helpers side by side and check every single block they touched. "
            "On the right, the CLI and Copilot App have magic words like slash-plan to draw a blueprint first, and slash-fleet to send a whole squad zooming off together!"
        ),
        "trainer": (
            "Give a concrete 30-second tour here. Show how code dash-dash-agents opens the VS Code Agents Window with a session grid, Branch-versus-New-Worktree picker, and turn-level Changes view. "
            "Then highlight how Copilot CLI and the desktop Copilot App pair slash-plan with slash-fleet for parallel subagent execution and pull-request review—all reading the exact same dot-github skills and agents."
        ),
        "notes": "Compare VS Code Agents Window (code --agents, session grid, Changes pane) with Copilot CLI & Copilot App (/plan, /fleet, worktree sessions, PR lifecycle).",
    },
    # 08 Mode, Permissions, Isolation
    {
        "section": "Part 1 · Agent Landscape",
        "lab": 0,
        "badge": "THREE SAFETY DIALS",
        "eli5": (
            "Before a helper touches your blocks, you set three dials! Dial one says: let's make a plan before building. "
            "Dial two says: ask a grown-up before using big tools. And dial three gives each builder their very own table, so two friends never accidentally smash the same tower!"
        ),
        "trainer": (
            "Hammer home that Mode, Permissions, and Isolation are three separate dials—never conflate them! "
            "Plan mode is a workflow conversation, NOT a security boundary. And a Git worktree isolates file edits, NOT machine or network access. "
            "Because Chronicle labs use private Foundry credentials in dot-env, forbid blanket Approve-All in local checkouts."
        ),
        "notes": "Three independent dials: Mode (Ask/Interactive, Plan, Autopilot), Permissions (Ask every time, Assisted, Approve all), Isolation (Checkout, Git Worktree, Cloud/Local Sandbox).",
    },
    # 09 Harnesses & Agent Host
    {
        "section": "Part 1 · Agent Landscape",
        "lab": 0,
        "badge": "THE BRAIN LOOP & ENGINE ROOM",
        "eli5": (
            "Here is a cool secret: the chat window on your screen is just the glass window you peek through! "
            "Behind the glass is the Harness—that is the helper's thinking loop that picks tools and checks its work. "
            "And holding it all is the Agent Host—a sturdy engine room that keeps your helper working even if you close the window!"
        ),
        "trainer": (
            "This slide resolves one of the most common points of confusion in advanced workshops. Separate three layers: the UI client window, the Harness runtime—such as Copilot SDK, VS Code Local, Claude, or Codex—and the Agent Host process. "
            "Ask the room two check questions: Does switching from Sonnet to GPT change the harness? No, only the model. Is Cloud a harness? No—Cloud is where execution runs! And because Agent Host owns the session in its own process, closing a window doesn't kill the run."
        ),
        "notes": "Topic 2: Harnesses and the Agent Host. Harnesses: Copilot (Copilot SDK), Local (VS Code built-in), Claude, Codex. Agent Host runs harnesses in a dedicated process decoupled from editor windows. Ref: code.visualstudio.com/docs/agents/concepts/agent-host.",
    },
    # 10 Context Budget
    {
        "section": "Part 1 · Agent Landscape",
        "lab": 4,
        "badge": "DON'T OVERSTUFF THE BACKPACK",
        "eli5": (
            "Every robot helper carries just one backpack for memory! Every time you take another turn, the helper has to carry the rules, "
            "everything you both said before, and every big page it opened all over again! If the backpack gets way too stuffed, the helper forgets things in the middle—so keeping notes tiny is a superpower!"
        ),
        "trainer": (
            "Walk through the seven layers competing inside one context window and point to the rising ten-turn bar chart. Every turn re-sends the accumulated conversation and tool outputs, driving up token consumption and causing middle-of-context drift, or context rot. "
            "Connect this directly to BOTH halves of our labs: subagents keep noisy exploration out of your main chat, and Chronicle's chunked summarizer turns huge transcripts into lean handoff files."
        ),
        "notes": "Context window budget (7 layers) + multi-turn re-send token growth + context rot. Motivates both subagent isolation (Lab 01) and Chronicle's digest chunking (Lab 04).",
    },
    # 11 Research -> Plan -> Implement
    {
        "section": "Part 1 · Agent Landscape",
        "lab": 1,
        "badge": "LOOK, PLAN, THEN BUILD",
        "eli5": (
            "Instead of dumping every LEGO brick on the floor at once, smart builders work in three neat steps! "
            "First, look around without touching anything. Second, draw a simple plan on one card. Third, build just what is on the card and test that it stands up strong!"
        ),
        "trainer": (
            "Present Research, Plan, Implement as the rhythm learners will see their Chronicle Orchestrator execute automatically. "
            "Research reads files and surfaces risks; Plan produces an explicit file contract; Implement writes a focused diff and runs node dash-dash-test. Each phase passes forward a compact summary instead of raw tool noise."
        ),
        "notes": "Research -> Plan -> Implement workflow. Each phase can run in a clean session or specialist subagent.",
    },
    # 12 Part 2 Divider
    {
        "section": "Part 2 · Markdown Control",
        "lab": 1,
        "badge": "PART 2 · BADGES & RECIPE CARDS",
        "eli5": (
            "Part Two! Now let's see how we write simple note cards in Markdown to give our helpers house rules, "
            "job badges with special tool belts, and step-by-step recipe cards!"
        ),
        "trainer": (
            "Welcome to Part Two: Controlling Agents and Skills in Markdown. Slow down slightly on the next five slides—learners will author these exact YAML frontmatter fields in Labs One and Two, so clarity on syntax and enforcement pays off immediately."
        ),
        "notes": "Part 2 Section Divider: Controlling Agents & Skills in Markdown + Harness Compatibility.",
    },
    # 13 Customization Stack
    {
        "section": "Part 2 · Markdown Control",
        "lab": 1,
        "badge": "THE TOOLBOX STACK",
        "eli5": (
            "Look at all six ways we guide our team! House Rules on the door are for everyone. Recipe Cards teach tricky tricks only when needed. "
            "Job Badges pick which tools each helper can hold. Little Notepads keep side-jobs tidy. Safety Gates check rules automatically, and Magic Whiteboards let us draw together!"
        ),
        "trainer": (
            "Walk this table top to bottom and spotlight the rightmost column: Guarantee! "
            "Instructions and Skills are model-driven—prose guides behavior, it doesn't enforce security. "
            "Custom Agent tool lists enforce capability boundaries, Subagents enforce context isolation, Hooks enforce deterministic shell checks, and Canvases provide shared visual state. Ask the room this distinction during recaps!"
        ),
        "notes": "Customization stack table comparing Instructions, Skills, Custom Agents, Subagents, Hooks, and Canvases—especially Advisory vs Enforced guarantees.",
    },
    # 14 Anatomy of an Agent Skill
    {
        "section": "Part 2 · Markdown Control",
        "lab": 2,
        "badge": "RECIPE CARDS THAT LOAD ON DEMAND",
        "eli5": (
            "A Skill is like a laminated recipe card kept inside its own labeled folder! "
            "At first, your helper only reads the short label on the outside tab so its backpack stays super light. "
            "Only when you ask for that exact job does it open the folder, read the steps, and run helper scripts!"
        ),
        "trainer": (
            "Break down the open Agent Skills format under dot-github slash skills. Stress rule number one for Lab Two: the YAML name field must match the parent folder name character-for-character—lowercase with hyphens! "
            "Highlight three-stage progressive disclosure on the right: metadata costs roughly a hundred tokens at startup, the SKILL.md body loads only when matched, and bundled scripts execute deterministically without bloating prompt prose."
        ),
        "notes": "Topic 3a: Controlling Agent Skills in SKILL.md. Folder name must equal YAML name. Progressive disclosure: metadata -> body -> scripts/references. Ref: agentskills.io & code.visualstudio.com/docs/agent-customization/agent-skills.",
    },
    # 15 Descriptions That Fire
    {
        "section": "Part 2 · Markdown Control",
        "lab": 2,
        "badge": "WRITING LABELS THAT CLICK",
        "eli5": (
            "Imagine two drawers in the kitchen. One says Stuff—nobody knows when to open that! "
            "The other says Pancake Recipe—Open When Making Breakfast! When your skill description says both WHAT it does and WHEN to use it, your helper grabs the right card every time!"
        ),
        "trainer": (
            "The description field is the router trigger! Contrast the red anti-pattern—'Helpful test utilities'—against our actual Lab Two skill description that names local mock servers, OAuth2, and Foundry client changes. "
            "Coach learners to test skill discovery with natural user prompts that do NOT mention the skill's filename—if it doesn't fire, sharpen the description!"
        ),
        "notes": "Skill trigger engineering: Bad ('Helpful test utilities') vs Good (explicit WHAT + WHEN keywords). Test without naming the skill.",
    },
    # 16 Anatomy of a Custom Agent
    {
        "section": "Part 2 · Markdown Control",
        "lab": 1,
        "badge": "JOB BADGES & TOOL BELTS",
        "eli5": (
            "Now look at a Custom Agent badge in dot-agent-dot-md! Our Safety Owl gets eyes to read and a magnifying glass to search—but NO pencil and NO hammer! "
            "Even if Safety Owl spots a mistake, it cannot scribble on your castle—it tells the Team Captain which block to fix!"
        ),
        "trainer": (
            "Walk every YAML field in chronicle-security.agent.md. Point out tools: read and search—omitting edit and execute creates a true read-only auditor enforced by the harness, not polite prose. "
            "Explain user-invocable: false—it hides specialist workers from the user's Chat dropdown to prevent clutter, while keeping disable-model-invocation false so Chronicle Orchestrator can still invoke them as subagents, preloaded with their matching skills array!"
        ),
        "notes": "Topic 3b: Controlling Custom Agents in .github/agents/*.agent.md. Cover name, description, tools, skills, model, user-invocable, disable-model-invocation. Ref: code.visualstudio.com/docs/agent-customization/custom-agents.",
    },
    # 17 Harness Differences That Bite
    {
        "section": "Part 2 · Markdown Control",
        "lab": 2,
        "badge": "CHECK WHICH ENGINE YOU PICKED",
        "eli5": (
            "Just like train tracks come in slightly different sizes, different harnesses read a few badge stickers differently! "
            "Checking which engine you picked in VS Code makes sure every sticker on your helper's badge works on the very first try!"
        ),
        "trainer": (
            "Keep this compatibility table handy during Labs One and Two! Notice why harness awareness matters: the Copilot harness, CLI, Copilot App, and Cloud agent support skills, mcp-servers, and hooks frontmatter, whereas VS Code's Local harness uses agents allow-lists and handoffs. "
            "Also flag subagent instruction inheritance: never assume a subagent silently read your root instructions—reinforce critical invariants like zero-packages in each worker's agent file!"
        ),
        "notes": "Harness compatibility matrix: VS Code Local harness vs Copilot SDK harness / CLI / Copilot App / Cloud. Essential troubleshooting reference during Labs 01–02.",
    },
    # 18 Part 3 Divider
    {
        "section": "Part 3 · Hooks, Canvases & Subagents",
        "lab": 1,
        "badge": "PART 3 · GATES, BOARDS & TEAMWORK",
        "eli5": (
            "Part Three! Let's check out automatic safety bells called Hooks, shared magic drawing boards called Canvases, "
            "and how our Team Captain keeps four helpers working smoothly together!"
        ),
        "trainer": (
            "Move into Part Three: Hooks, Canvases, repository structure, and subagent orchestration. These four slides complete the conceptual toolkit and show how deterministic guardrails, visual workspaces, and hub-and-spoke delegation fit together."
        ),
        "notes": "Part 3 Section Divider: Hooks, Canvases, Structuring .github/, and Subagent Orchestration.",
    },
    # 19 Agent Hooks
    {
        "section": "Part 3 · Hooks, Canvases & Subagents",
        "lab": None,
        "badge": "AUTOMATIC SAFETY BELLS (HOOKS)",
        "eli5": (
            "What if a builder reaches for the wrong shelf by mistake? A Hook is like a friendly robot referee standing right by the door! "
            "Before any tool runs, the Hook checks the rulebook in a split second—and if someone tries to touch a secret file, it blows the whistle and says Stop!"
        ),
        "trainer": (
            "Connect BOC's lifecycle table with a concrete dot-github-slash-hooks JSON example. Unlike instructions—which ask an LLM nicely—hooks run deterministic non-AI scripts at events like preToolUse, postToolUse, sessionStart, and subagentStart. "
            "A preToolUse script inspects the proposed tool JSON on stdin and can return permissionDecision deny to block out-of-lane edits or secret access. Remind trainers: hooks execute code on the machine, so review hook scripts and timeouts carefully!"
        ),
        "notes": "Topic 4a: Agent Hooks (.github/hooks/*.json). Lifecycle events: preToolUse, postToolUse, userPromptSubmit, sessionStart, preCompact, subagentStart, stop. Deterministic enforcement vs advisory prose. Ref: code.visualstudio.com/docs/agent-customization/hooks.",
    },
    # 20 Canvases
    {
        "section": "Part 3 · Hooks, Canvases & Subagents",
        "lab": None,
        "badge": "SHARED MAGIC WHITEBOARDS (CANVASES)",
        "eli5": (
            "Scrolling up and down a giant chat list can make your eyes dizzy! A Canvas opens a bright magic whiteboard right next to your chat! "
            "You and your helper can look at the same picture, test an agent, or move cards together—while keeping secret keys safely locked away!"
        ),
        "trainer": (
            "Explain Canvases clearly: instead of burying interactive artifacts inside scrolling chat text, supported sessions in the GitHub Copilot App and VS Code open a side-by-side interactive surface—addressed by canvasId for the type and instanceId for the live panel. "
            "Both the developer and the agent can inspect and drive actions on that panel—like Microsoft Foundry's Agent Builder canvas or custom workspace canvases. Stress two caveats: opening a canvas doesn't replace running tests, and secrets never belong on boards."
        ),
        "notes": "Topic 4b: Canvases — interactive side-panel surfaces alongside Chat (canvasId vs instanceId, human+agent co-editing, previews/dashboards/Foundry canvas). Ref: code.visualstudio.com/docs/agents/run/canvases & docs.github.com/en/copilot/how-tos/github-copilot-app/working-with-canvas-extensions.",
    },
    # 21 Structuring .github & Subagents
    {
        "section": "Part 3 · Hooks, Canvases & Subagents",
        "lab": 1,
        "badge": "NEAT SHELVES & CLEAN NOTEPADS",
        "eli5": (
            "Look how tidy our dot-github shelf is: one file for house rules, one folder for helper badges, one folder for recipe cards, and one for safety hooks! "
            "And whenever the Captain sends a helper on an errand, that helper gets its own clean notepad—so all the messy searching stays out of the Captain's head!"
        ),
        "trainer": (
            "Give attendees this exact blueprint on the left so they see how instructions, agents, skills, and hooks coexist cleanly under dot-github. "
            "Then trace the subagent context diagram on the right: subagents are stateless per invocation and do NOT see your main chat history! "
            "That's a feature, not a bug—the Orchestrator must pass a self-contained brief with allowed files and acceptance criteria, and the subagent absorbs thousands of tokens of file reads and test output, returning only a crisp verdict."
        ),
        "notes": "Topic 5a: Structuring .github/ (copilot-instructions.md, agents/, skills/, hooks/) + Stateless Subagent context window isolation.",
    },
    # 22 Orchestrator Pattern & 5 Layers
    {
        "section": "Part 3 · Hooks, Canvases & Subagents",
        "lab": 1,
        "badge": "CAPTAIN, SPECIALISTS & FIVEELDS OF SAFETY",
        "eli5": (
            "Meet our Chronicle dream team! Captain Orchestrator holds the checklist and calls four friends: Developer builds, Tester tries pretend doorbells, "
            "Security checks with its magnifying glass, and Documentation writes the guidebook! With five safety rules, nobody steps on anyone else's toes!"
        ),
        "trainer": (
            "Here is the exact hub-and-spoke team learners build in Labs One and Two, paired with v2's five collision-protection layers along the bottom! "
            "Point out why Chronicle Orchestrator only gets read, search, agent, and todo—it structurally cannot write code itself! "
            "And emphasize that while subagents isolate context, parallel writers in one checkout still collide—so combine worktree isolation, file partitioning, module seams, tool and hook enforcement, and human integration testing."
        ),
        "notes": "Topic 5b: Chronicle Hub-and-Spoke Orchestrator + 4 Specialist Subagents + 5 Layers of Parallel Protection (Isolate, Partition, Shape, Enforce, Integrate).",
    },
    # 23 Part 4 Divider
    {
        "section": "Part 4 · Hands-On Labs",
        "lab": 0,
        "badge": "PART 4 · LET'S BUILD CHRONICLE!",
        "eli5": (
            "Part Four—adventure time! Now we roll up our sleeves for six hands-on missions! "
            "Let's watch our robot team connect a real AI brain and turn a big coding story into a portable treasure map!"
        ),
        "trainer": (
            "Presentation complete—now transition the room into hands-on execution! From Slide Twenty-Four onward, keep the relevant lab slide projected as a visual anchor while circulating the room and checking concrete pass-fail evidence at each boundary."
        ),
        "notes": "Part 4 Section Divider: 90-Minute Hands-On Lab Track (Labs 00–05).",
    },
    # 24 How the Labs Run
    {
        "section": "Part 4 · Hands-On Labs",
        "lab": 0,
        "badge": "HOW OUR SIX MISSIONS WORK",
        "eli5": (
            "Every mission follows the same rhythm: tell the Captain the goal, let the specialists do their jobs, check our green checkmark together, and celebrate what we learned! "
            "Look at our starting app on the right—it already opens chat stories right in your browser with zero extra packages!"
        ),
        "trainer": (
            "Set the ground rules before starting the clock. Rule one: everyone must File Open Folder directly on workshop slash Advanced slash sampleapp—if they open the repo root instead, VS Code won't discover the workspace agents they create! "
            "Rule two: Node twenty-two built-ins only—never run npm install. Rule three: verify every checkpoint before advancing."
        ),
        "notes": "Lab ground rules + starter UI preview (starter.png). Critical setup check: open workshop/Advanced/sampleapp directly as the VS Code workspace root.",
    },
    # 25 Lab 00
    {
        "section": "Part 4 · Hands-On Labs",
        "lab": 0,
        "badge": "LAB 00 · CHECK THE STARTING LINE (8 MIN)",
        "eli5": (
            "Mission Zero! Before adding rocket boosters to a toy car, you roll it on the floor to make sure the wheels spin! "
            "We open our starter folder, run a quick test to see green lights, pick our smart brain model, and keep our secret key card tucked safely away for later!"
        ),
        "trainer": (
            "Start the eight-minute Lab Zero timer. Have learners run node dash-dash-version, node dash-dash-check src slash server.js, and node dash-dash-test—expecting ten passing tests and zero failures out of the box. "
            "Verify they selected Agent mode on the Copilot harness with a frontier model, and distribute the five Foundry Service Principal parameters privately—never display client secrets on the projector!"
        ),
        "notes": "Lab 00 (00:00–00:08, 8 min): Open sampleapp root, verify Node 22+ & baseline tests, select Copilot harness + frontier model, confirm private Foundry credentials sheet.",
    },
    # 26 Lab 01
    {
        "section": "Part 4 · Hands-On Labs",
        "lab": 1,
        "badge": "LAB 01 · HIRE YOUR FIVE HELPERS (17 MIN)",
        "eli5": (
            "Mission One! Time to make five shiny badges inside dot-github-slash-agents! "
            "Developer and Tester get building tools, Documentation writes guides, Security gets look-only glasses, and Captain Orchestrator gets the megaphone to lead the team!"
        ),
        "trainer": (
            "Give ten minutes for the four worker dot-agent-dot-md files, five minutes for Chronicle Orchestrator, and two minutes to open Chat: Open Customizations and inspect all five profiles. "
            "Walk the room and check two things: Security must ONLY list read and search, and Orchestrator must omit edit and execute while setting user-invocable to true. Fix any YAML indent warnings right away."
        ),
        "notes": "Lab 01 (00:08–00:25, 17 min): Author 4 specialist workers (user-invocable: false) + Chronicle Orchestrator (user-invocable: true, no edit/execute). Inspect via Chat: Open Customizations.",
    },
    # 27 Lab 02
    {
        "section": "Part 4 · Hands-On Labs",
        "lab": 2,
        "badge": "LAB 02 · HAND OUT RECIPE CARDS (15 MIN)",
        "eli5": (
            "Mission Two! Now each specialist gets its very own recipe card in dot-github-slash-skills! "
            "Builder learns how to build without store-bought kits, Tester learns pretend-doorbell tests, Security gets a six-point safety checklist, and Story Writer learns how to write clear guides!"
        ),
        "trainer": (
            "In Lab Two, learners generate four SKILL.md playbooks, verify each YAML name matches its folder name, and attach each skill to its specialist worker via skills frontmatter. "
            "At minute thirty-eight, have everyone open a fresh chat, type slash to see their skills in the menu, and switch the agent dropdown to Chronicle Orchestrator—from here on, they only prompt the Orchestrator!"
        ),
        "notes": "Lab 02 (00:25–00:40, 15 min): Author zero-package-engineering, foundry-oauth-testing, local-app-security-audit, and foundry-handoff-docs skills; attach to workers; select Chronicle Orchestrator.",
    },
    # 28 Mid-Point Recap
    {
        "section": "Part 4 · Hands-On Labs",
        "lab": 2,
        "badge": "CHECKPOINT RECAP · LOCK IT IN!",
        "eli5": (
            "High five—our whole robot team is ready! Let's remember our three big secrets so far: "
            "the Agent Host keeps helpers running behind the window, taking away the pencil guarantees Safety Owl can't scribble, and clear recipe labels help helpers grab the right card!"
        ),
        "trainer": (
            "Pause for ninety seconds at the forty-minute mark to lock in the foundation before hitting Azure APIs. "
            "Cold-call these three questions: Why didn't Orchestrator edit files itself? Because edit wasn't in its tool list! What loads at startup for a skill? Only name and description! And why hide workers with user-invocable false? Clean UX with full subagent delegation!"
        ),
        "notes": "Mid-Workshop Recap (Labs 00–02, minute 40): Confirm least-privilege tool enforcement, progressive skill loading, and clean orchestrator UX.",
    },
    # 29 Lab 03
    {
        "section": "Part 4 · Hands-On Labs",
        "lab": 3,
        "badge": "LAB 03 · RING THE AI DOORBELL SAFELY (15 MIN)",
        "eli5": (
            "Mission Three! Now we ask Captain Orchestrator to build a safe secret lockbox and a doorbell to Microsoft Foundry! "
            "Tester tries a pretend doorbell first, Safety Owl checks that our secret password never leaks into the logbook, and then we press Test Connection and hear READY!"
        ),
        "trainer": (
            "In Lab Three, learners send one prompt to Chronicle Orchestrator and watch it dispatch Developer, Documentation, Security, and Tester! "
            "Highlight three coaching points: GET config returns hasClientSecret boolean—never the secret; Tester validates Entra OAuth2 and Foundry responses against local node-http mock servers; and when testing live credentials, separate Entra token timing from Foundry READY timing. If Azure is unreachable, mocked tests pass and mark live pending."
        ),
        "notes": "Lab 03 (00:40–00:55, 15 min): Dispatch Orchestrator for /agentconfig docs, atomic .env store, Entra ID OAuth2 + Foundry Responses client, #config-dialog & log popup, then live Test connection -> READY.",
    },
    # 30 Lab 04
    {
        "section": "Part 4 · Hands-On Labs",
        "lab": 4,
        "badge": "LAB 04 · WRITE THE TREASURE MAP (18 MIN)",
        "eli5": (
            "Mission Four—the magic moment! Some chat stories are as long as a giant chapter book! "
            "Our app chops big stories into bite-sized pieces, turns computer paths into neat portable names, shows a live progress bar, and writes one clean summary note for the next builder!"
        ),
        "trainer": (
            "Lab Four is the architectural payoff of the workshop! Orchestrator coordinates building buildSessionDigest and chunkSessionDigest—stripping machine-specific workspace prefixes into portable relative paths, running single-pass synthesis for short chats or map-reduce chunk digests for huge sessions, and wiring the live progress modal plus popup log viewer. "
            "Have learners inspect their generated summaries markdown file and verify a teammate on another laptop could continue immediately!"
        ),
        "notes": "Lab 04 (00:55–01:13, 18 min): Token-disciplined session digest, map-reduce chunking, portable relative paths, Create session summary progress modal, live redacted log popup, and summaries/<session>-summary.md.",
    },
    # 31 Lab 05 & Final Recap
    {
        "section": "Part 4 · Hands-On Labs",
        "lab": 5,
        "badge": "LAB 05 · SHINY BADGE & FINISH LINE (17 MIN)",
        "eli5": (
            "Mission Five—our grand finale! Developer paints a crisp Chronicle icon from pure math—still zero extra packages! "
            "Tester checks the icon, we open our finished browser app, and we peek at how a desktop box keeps secrets safe outside the installer. Mission complete!"
        ),
        "trainer": (
            "Use Lab Five to prove disciplined scope control! Learners give Orchestrator a tight release brief with explicit allowed files: generate the PNG and ICO via pure-Node zlib in render-icon.cjs, wire the favicon, pass release-icon.test.js, and verify in the browser. "
            "Spend the final three minutes on a read-only tour of appsample's Electron main and preload files—showing utility-process isolation and why dot-env stays outside installers—without wasting class time on gigabyte Electron downloads!"
        ),
        "notes": "Lab 05 (01:13–01:30, 17 min): Pure-Node PNG/ICO icon release, test/release-icon.test.js, browser verification, and read-only Electron architecture review + Final Workshop Recap.",
    },
    # 32 Closing & Monday Morning
    {
        "section": "Closing",
        "lab": None,
        "badge": "READY FOR MONDAY MORNING!",
        "eli5": (
            "You did it! Now you know how robot helpers work in different rooms, how job badges, recipe cards, safety bells, and magic whiteboards fit together, "
            "and how one great Team Captain helps everyone build amazing things safely. Happy building, explorers!"
        ),
        "trainer": (
            "Close strong with concrete Monday-morning habits: trim bloated copilot-instructions down to non-negotiables, turn one repeated team workflow into a SKILL.md with a sharp trigger description, create one read-only security or code-review agent, add a preToolUse guardrail where mistakes hurt, and verify every handoff with real tests. "
            "Point trainers and attendees to the lab guides, finished appsample reference, and video kit—and open the floor for Q&A!"
        ),
        "notes": "Closing: Five Monday-morning actions + anti-patterns to avoid + Q&A. Thank participants and share workshop/Advanced/README.md.",
    },
]
