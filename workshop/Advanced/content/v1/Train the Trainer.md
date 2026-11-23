# Train the Trainer



- **Deck:** [Advanced Workshop Deck v1.pptx](../../Advanced%20Workshop%20Deck%20v1.pptx) (32 slides)

- **Video:** [Train the Trainer.mp4](./Train%20the%20Trainer.mp4) · 1920×1080 @ 30 fps · Runtime `00:15:19`

- **Narration:** Microsoft Foundry (gpt-audio-1.5)



## 00:00:00 | Slide 01 — Advanced: Agents, Skills & Subagents

Welcome to the Train-the-Trainer walkthrough for Advanced GitHub Copilot: Agents, Skills, and Subagents. This deck follows the v2 conceptual arc—surfaces, runtime harnesses, Markdown customization, guardrails, and safe parallelism—and lands directly in Chronicle's six 90-minute hands-on labs. Open with energy: learners move from prompting one generalist assistant to directing an engineering team.

## 00:00:28 | Slide 02 — Workshop agenda & 90-minute lab clock

Walk the room through the two-part structure: present the mental model cleanly up front, then run six tightly timeboxed labs totaling exactly ninety minutes. Point out the hard clock gates: by minute forty, every learner has their Orchestrator and four skilled workers wired up; by minute fifty-five, Foundry connectivity is verified; and the final seventeen minutes protect browser verification.

## 00:00:52 | Slide 03 — Outcomes and the Chronicle running app

Anchor the five learning outcomes in Chronicle, our zero-package Node twenty-two session explorer. Why does Chronicle resonate so well in class? Because learners experience context growth firsthand while building an app that solves session handoff! Stress the two invariants early: zero external npm packages in package.json, and original chat history files remain strictly read-only.

## 00:01:20 | Slide 04 — PART 1 · WHERE HELPERS LIVE

Transition into Part One: the Agent Landscape. Your goal in the next seven slides is to clear up vocabulary confusion around surfaces, harnesses, the Agent Host, permissions, and context budgets before anyone writes a customization file.

## 00:01:36 | Slide 05 — From one assistant to a team of agents

Use this four-step progression to reframe the developer's job. Most attendees already use inline completions, Chat, and single-agent mode. Today's leap is the rightmost box: directing specialist agents. Warn them early that more agents only speed you up when tasks have clear boundaries and non-overlapping files.

## 00:01:59 | Slide 06 — Five surfaces, one shared customization model

Position all five surfaces as one family sharing your repo's customizations. Contrast IDE Chat—best when inspecting lines right beside src/server.js—with VS Code's Agents Window for multi-session oversight, Copilot CLI for terminal-first planning and scripting, the standalone GitHub Copilot App built on the CLI engine, and the Cloud coding agent on GitHub-hosted runners. Reassure learners: our labs only require VS Code.

## 00:02:30 | Slide 07 — Inside the Agents Window, CLI & Copilot App

Give a concrete 30-second tour here. Show how code dash-dash-agents opens the VS Code Agents Window with a session grid, Branch-versus-New-Worktree picker, and turn-level Changes view. Then highlight how Copilot CLI and the desktop Copilot App pair slash-plan with slash-fleet for parallel subagent execution and pull-request review—all reading the exact same dot-github skills and agents.

## 00:03:04 | Slide 08 — Mode · Permissions · Isolation

Hammer home that Mode, Permissions, and Isolation are three separate dials—never conflate them! Plan mode is a workflow conversation, NOT a security boundary. And a Git worktree isolates file edits, NOT machine or network access. Because Chronicle labs use private Foundry credentials in dot-env, forbid blanket Approve-All in local checkouts.

## 00:03:30 | Slide 09 — Harnesses and the Agent Host

This slide resolves one of the most common points of confusion in advanced workshops. Separate three layers: the UI client window, the Harness runtime—such as Copilot SDK, VS Code Local, Claude, or Codex—and the Agent Host process. Ask the room two check questions: Does switching from Sonnet to GPT change the harness? No, only the model. Is Cloud a harness? No—Cloud is where execution runs! And because Agent Host owns the session in its own process, closing a window doesn't kill the run.

## 00:04:07 | Slide 10 — Every turn re-sends the story so far

Walk through the seven layers competing inside one context window and point to the rising ten-turn bar chart. Every turn re-sends the accumulated conversation and tool outputs, driving up token consumption and causing middle-of-context drift, or context rot. Connect this directly to BOTH halves of our labs: subagents keep noisy exploration out of your main chat, and Chronicle's chunked summarizer turns huge transcripts into lean handoff files.

## 00:04:40 | Slide 11 — Research → Plan → Implement

Present Research, Plan, Implement as the rhythm learners will see their Chronicle Orchestrator execute automatically. Research reads files and surfaces risks; Plan produces an explicit file contract; Implement writes a focused diff and runs node dash-dash-test. Each phase passes forward a compact summary instead of raw tool noise.

## 00:05:04 | Slide 12 — PART 2 · BADGES & RECIPE CARDS

Welcome to Part Two: Controlling Agents and Skills in Markdown. Slow down slightly on the next five slides—learners will author these exact YAML frontmatter fields in Labs One and Two, so clarity on syntax and enforcement pays off immediately.

## 00:05:21 | Slide 13 — The Copilot customization stack

Walk this table top to bottom and spotlight the rightmost column: Guarantee! Instructions and Skills are model-driven—prose guides behavior, it doesn't enforce security. Custom Agent tool lists enforce capability boundaries, Subagents enforce context isolation, Hooks enforce deterministic shell checks, and Canvases provide shared visual state. Ask the room this distinction during recaps!

## 00:05:48 | Slide 14 — Anatomy of an Agent Skill (`SKILL.md`)

Break down the open Agent Skills format under dot-github slash skills. Stress rule number one for Lab Two: the YAML name field must match the parent folder name character-for-character—lowercase with hyphens! Highlight three-stage progressive disclosure on the right: metadata costs roughly a hundred tokens at startup, the SKILL.md body loads only when matched, and bundled scripts execute deterministically without bloating prompt prose.

## 00:06:17 | Slide 15 — Write skill descriptions that reliably trigger

The description field is the router trigger! Contrast the red anti-pattern—'Helpful test utilities'—against our actual Lab Two skill description that names local mock servers, OAuth2, and Foundry client changes. Coach learners to test skill discovery with natural user prompts that do NOT mention the skill's filename—if it doesn't fire, sharpen the description!

## 00:06:42 | Slide 16 — Controlling custom agents in `.agent.md`

Walk every YAML field in chronicle-security.agent.md. Point out tools: read and search—omitting edit and execute creates a true read-only auditor enforced by the harness, not polite prose. Explain user-invocable: false—it hides specialist workers from the user's Chat dropdown to prevent clutter, while keeping disable-model-invocation false so Chronicle Orchestrator can still invoke them as subagents, preloaded with their matching skills array!

## 00:07:12 | Slide 17 — Harness differences that bite

Keep this compatibility table handy during Labs One and Two! Notice why harness awareness matters: the Copilot harness, CLI, Copilot App, and Cloud agent support skills, mcp-servers, and hooks frontmatter, whereas VS Code's Local harness uses agents allow-lists and handoffs. Also flag subagent instruction inheritance: never assume a subagent silently read your root instructions—reinforce critical invariants like zero-packages in each worker's agent file!

## 00:07:43 | Slide 18 — PART 3 · GATES, BOARDS & TEAMWORK

Move into Part Three: Hooks, Canvases, repository structure, and subagent orchestration. These four slides complete the conceptual toolkit and show how deterministic guardrails, visual workspaces, and hub-and-spoke delegation fit together.

## 00:08:02 | Slide 19 — Agent Hooks: deterministic lifecycle guardrails

Connect BOC's lifecycle table with a concrete dot-github-slash-hooks JSON example. Unlike instructions—which ask an LLM nicely—hooks run deterministic non-AI scripts at events like preToolUse, postToolUse, sessionStart, and subagentStart. A preToolUse script inspects the proposed tool JSON on stdin and can return permissionDecision deny to block out-of-lane edits or secret access. Remind trainers: hooks execute code on the machine, so review hook scripts and timeouts carefully!

## 00:08:53 | Slide 20 — Canvases: interactive workspaces beside Chat

Explain Canvases clearly: instead of burying interactive artifacts inside scrolling chat text, supported sessions in the GitHub Copilot App and VS Code open a side-by-side interactive surface—addressed by canvasId for the type and instanceId for the live panel. Both the developer and the agent can inspect and drive actions on that panel—like Microsoft Foundry's Agent Builder canvas or custom workspace canvases. Stress two caveats: opening a canvas doesn't replace running tests, and secrets never belong on boards.

## 00:09:29 | Slide 21 — Structuring `.github/` & isolating subagent context

Give attendees this exact blueprint on the left so they see how instructions, agents, skills, and hooks coexist cleanly under dot-github. Then trace the subagent context diagram on the right: subagents are stateless per invocation and do NOT see your main chat history! That's a feature, not a bug—the Orchestrator must pass a self-contained brief with allowed files and acceptance criteria, and the subagent absorbs thousands of tokens of file reads and test output, returning only a crisp verdict.

## 00:10:04 | Slide 22 — The Chronicle orchestrator & five safety layers

Here is the exact hub-and-spoke team learners build in Labs One and Two, paired with v2's five collision-protection layers along the bottom! Point out why Chronicle Orchestrator only gets read, search, agent, and todo—it structurally cannot write code itself! And emphasize that while subagents isolate context, parallel writers in one checkout still collide—so combine worktree isolation, file partitioning, module seams, tool and hook enforcement, and human integration testing.

## 00:10:38 | Slide 23 — PART 4 · LET'S BUILD CHRONICLE!

Presentation complete—now transition the room into hands-on execution! From Slide Twenty-Four onward, keep the relevant lab slide projected as a visual anchor while circulating the room and checking concrete pass-fail evidence at each boundary.

## 00:10:54 | Slide 24 — How the six Chronicle labs run

Set the ground rules before starting the clock. Rule one: everyone must File Open Folder directly on workshop slash Advanced slash sampleapp—if they open the repo root instead, VS Code won't discover the workspace agents they create! Rule two: Node twenty-two built-ins only—never run npm install. Rule three: verify every checkpoint before advancing.

## 00:11:18 | Slide 25 — Baseline verification, surfaces & setup

Start the eight-minute Lab Zero timer. Have learners run node dash-dash-version, node dash-dash-check src slash server.js, and node dash-dash-test—expecting ten passing tests and zero failures out of the box. Verify they selected Agent mode on the Copilot harness with a frontier model, and distribute the five Foundry Service Principal parameters privately—never display client secrets on the projector!

## 00:11:44 | Slide 26 — Build Orchestrator & four specialist subagents

Give ten minutes for the four worker dot-agent-dot-md files, five minutes for Chronicle Orchestrator, and two minutes to open Chat: Open Customizations and inspect all five profiles. Walk the room and check two things: Security must ONLY list read and search, and Orchestrator must omit edit and execute while setting user-invocable to true. Fix any YAML indent warnings right away.

## 00:12:12 | Slide 27 — Equip each role agent with a domain `SKILL.md`

In Lab Two, learners generate four SKILL.md playbooks, verify each YAML name matches its folder name, and attach each skill to its specialist worker via skills frontmatter. At minute thirty-eight, have everyone open a fresh chat, type slash to see their skills in the menu, and switch the agent dropdown to Chronicle Orchestrator—from here on, they only prompt the Orchestrator!

## 00:12:38 | Slide 28 — Lock it in: surfaces, roles & skills

Pause for ninety seconds at the forty-minute mark to lock in the foundation before hitting Azure APIs. Cold-call these three questions: Why didn't Orchestrator edit files itself? Because edit wasn't in its tool list! What loads at startup for a skill? Only name and description! And why hide workers with user-invocable false? Clean UX with full subagent delegation!

## 00:13:04 | Slide 29 — Foundry `.env` config, `/agentconfig` & live `READY`

In Lab Three, learners send one prompt to Chronicle Orchestrator and watch it dispatch Developer, Documentation, Security, and Tester! Highlight three coaching points: GET config returns hasClientSecret boolean—never the secret; Tester validates Entra OAuth2 and Foundry responses against local node-http mock servers; and when testing live credentials, separate Entra token timing from Foundry READY timing. If Azure is unreachable, mocked tests pass and mark live pending.

## 00:13:37 | Slide 30 — Session handoff summarizer & live log popup

Lab Four is the architectural payoff of the workshop! Orchestrator coordinates building buildSessionDigest and chunkSessionDigest—stripping machine-specific workspace prefixes into portable relative paths, running single-pass synthesis for short chats or map-reduce chunk digests for huge sessions, and wiring the live progress modal plus popup log viewer. Have learners inspect their generated summaries markdown file and verify a teammate on another laptop could continue immediately!

## 00:14:10 | Slide 31 — Browser release & desktop sandbox review

Use Lab Five to prove disciplined scope control! Learners give Orchestrator a tight release brief with explicit allowed files: generate the PNG and ICO via pure-Node zlib in render-icon.cjs, wire the favicon, pass release-icon.test.js, and verify in the browser. Spend the final three minutes on a read-only tour of appsample's Electron main and preload files—showing utility-process isolation and why dot-env stays outside installers—without wasting class time on gigabyte Electron downloads!

## 00:14:46 | Slide 32 — What to bring back to your own repositories

Close strong with concrete Monday-morning habits: trim bloated copilot-instructions down to non-negotiables, turn one repeated team workflow into a SKILL.md with a sharp trigger description, create one read-only security or code-review agent, add a preToolUse guardrail where mistakes hurt, and verify every handoff with real tests. Point trainers and attendees to the lab guides, finished appsample reference, and video kit—and open the floor for Q&A!
