# Little Helpers



- **Deck:** [Advanced Workshop Deck v1.pptx](../../Advanced%20Workshop%20Deck%20v1.pptx) (32 slides)

- **Video:** [Little Helpers.mp4](./Little%20Helpers.mp4) · 1920×1080 @ 30 fps · Runtime `00:12:01`

- **Narration:** Microsoft Foundry (gpt-audio-1.5)



## 00:00:00 | Slide 01 — Advanced: Agents, Skills & Subagents

Imagine you are building a giant LEGO spaceship, and instead of just one robot helper, you get a whole team of smart robot friends! Today we are going to meet that team in GitHub Copilot, see how each helper gets its own special job, and build a neat treasure map for Chronicle so the next builder knows just what to do!

## 00:00:25 | Slide 02 — Workshop agenda & 90-minute lab clock

First, we take a quick tour to see where our robot helpers live, how their brains work, and how we give them rules and recipe cards. Then we jump across six fun stepping-stone missions—from checking our toy box in Lab Zero all the way to putting a shiny badge on our finished app in Lab Five!

## 00:00:48 | Slide 03 — Outcomes and the Chronicle running app

Have you ever stopped playing a big game, and the next day your friend asked, wait—what happened so far? Reading every single word from yesterday takes way too long! Our app, Chronicle, reads big chat stories safely without changing a single word, and our robot team writes a short, crystal-clear handoff note for tomorrow's builder!

## 00:01:14 | Slide 04 — PART 1 · WHERE HELPERS LIVE

Part One! Let's peek inside the robot clubhouse and discover all the different rooms where our helpers can work, plus the secret engine room that keeps them running!

## 00:01:27 | Slide 05 — From one assistant to a team of agents

At first, a helper could only finish the next word you were typing, or answer one little question. Then one helper learned to use tools all by itself. Now, you get to be the conductor of a whole band—giving each specialist its own instrument so nobody plays over anyone else!

## 00:01:51 | Slide 06 — Five surfaces, one shared customization model

Where do our helpers hang out? In five cool spots! They can sit right beside your blocks in VS Code Chat, watch lots of tables at once in the Agents Window, talk fast on a walkie-talkie in the terminal CLI, open their own big Copilot App desk, or even work up in the Cloud while your computer takes a nap!

## 00:02:20 | Slide 07 — Inside the Agents Window, CLI & Copilot App

Look at those two big control rooms! On the left, the Agents Window lets you see all your helpers side by side and check every single block they touched. On the right, the CLI and Copilot App have magic words like slash-plan to draw a blueprint first, and slash-fleet to send a whole squad zooming off together!

## 00:02:46 | Slide 08 — Mode · Permissions · Isolation

Before a helper touches your blocks, you set three dials! Dial one says: let's make a plan before building. Dial two says: ask a grown-up before using big tools. And dial three gives each builder their very own table, so two friends never accidentally smash the same tower!

## 00:03:08 | Slide 09 — Harnesses and the Agent Host

Here is a cool secret: the chat window on your screen is just the glass window you peek through! Behind the glass is the Harness—that is the helper's thinking loop that picks tools and checks its work. And holding it all is the Agent Host—a sturdy engine room that keeps your helper working even if you close the window!

## 00:03:35 | Slide 10 — Every turn re-sends the story so far

Every robot helper carries just one backpack for memory! Every time you take another turn, the helper has to carry the rules, everything you both said before, and every big page it opened all over again! If the backpack gets way too stuffed, the helper forgets things in the middle—so keeping notes tiny is a superpower!

## 00:04:02 | Slide 11 — Research → Plan → Implement

Instead of dumping every LEGO brick on the floor at once, smart builders work in three neat steps! First, look around without touching anything. Second, draw a simple plan on one card. Third, build just what is on the card and test that it stands up strong!

## 00:04:24 | Slide 12 — PART 2 · BADGES & RECIPE CARDS

Part Two! Now let's see how we write simple note cards in Markdown to give our helpers house rules, job badges with special tool belts, and step-by-step recipe cards!

## 00:04:38 | Slide 13 — The Copilot customization stack

Look at all six ways we guide our team! House Rules on the door are for everyone. Recipe Cards teach tricky tricks only when needed. Job Badges pick which tools each helper can hold. Little Notepads keep side-jobs tidy. Safety Gates check rules automatically, and Magic Whiteboards let us draw together!

## 00:05:03 | Slide 14 — Anatomy of an Agent Skill (`SKILL.md`)

A Skill is like a laminated recipe card kept inside its own labeled folder! At first, your helper only reads the short label on the outside tab so its backpack stays super light. Only when you ask for that exact job does it open the folder, read the steps, and run helper scripts!

## 00:05:27 | Slide 15 — Write skill descriptions that reliably trigger

Imagine two drawers in the kitchen. One says Stuff—nobody knows when to open that! The other says Pancake Recipe—Open When Making Breakfast! When your skill description says both WHAT it does and WHEN to use it, your helper grabs the right card every time!

## 00:05:50 | Slide 16 — Controlling custom agents in `.agent.md`

Now look at a Custom Agent badge in dot-agent-dot-md! Our Safety Owl gets eyes to read and a magnifying glass to search—but NO pencil and NO hammer! Even if Safety Owl spots a mistake, it cannot scribble on your castle—it tells the Team Captain which block to fix!

## 00:06:15 | Slide 17 — Harness differences that bite

Just like train tracks come in slightly different sizes, different harnesses read a few badge stickers differently! Checking which engine you picked in VS Code makes sure every sticker on your helper's badge works on the very first try!

## 00:06:33 | Slide 18 — PART 3 · GATES, BOARDS & TEAMWORK

Part Three! Let's check out automatic safety bells called Hooks, shared magic drawing boards called Canvases, and how our Team Captain keeps four helpers working smoothly together!

## 00:06:50 | Slide 19 — Agent Hooks: deterministic lifecycle guardrails

What if a builder reaches for the wrong shelf by mistake? A Hook is like a friendly robot referee standing right by the door! Before any tool runs, the Hook checks the rulebook in a split second—and if someone tries to touch a secret file, it blows the whistle and says Stop!

## 00:07:11 | Slide 20 — Canvases: interactive workspaces beside Chat

Scrolling up and down a giant chat list can make your eyes dizzy! A Canvas opens a bright magic whiteboard right next to your chat! You and your helper can look at the same picture, test an agent, or move cards together—while keeping secret keys safely locked away!

## 00:07:32 | Slide 21 — Structuring `.github/` & isolating subagent context

Look how tidy our dot-github shelf is: one file for house rules, one folder for helper badges, one folder for recipe cards, and one for safety hooks! And whenever the Captain sends a helper on an errand, that helper gets its own clean notepad—so all the messy searching stays out of the Captain's head!

## 00:07:57 | Slide 22 — The Chronicle orchestrator & five safety layers

Meet our Chronicle dream team! Captain Orchestrator holds the checklist and calls four friends: Developer builds, Tester tries pretend doorbells, Security checks with its magnifying glass, and Documentation writes the guidebook! With five safety rules, nobody steps on anyone else's toes!

## 00:08:21 | Slide 23 — PART 4 · LET'S BUILD CHRONICLE!

Part Four—adventure time! Now we roll up our sleeves for six hands-on missions! Let's watch our robot team connect a real AI brain and turn a big coding story into a portable treasure map!

## 00:08:39 | Slide 24 — How the six Chronicle labs run

Every mission follows the same rhythm: tell the Captain the goal, let the specialists do their jobs, check our green checkmark together, and celebrate what we learned! Look at our starting app on the right—it already opens chat stories right in your browser with zero extra packages!

## 00:09:01 | Slide 25 — Baseline verification, surfaces & setup

Mission Zero! Before adding rocket boosters to a toy car, you roll it on the floor to make sure the wheels spin! We open our starter folder, run a quick test to see green lights, pick our smart brain model, and keep our secret key card tucked safely away for later!

## 00:09:22 | Slide 26 — Build Orchestrator & four specialist subagents

Mission One! Time to make five shiny badges inside dot-github-slash-agents! Developer and Tester get building tools, Documentation writes guides, Security gets look-only glasses, and Captain Orchestrator gets the megaphone to lead the team!

## 00:09:43 | Slide 27 — Equip each role agent with a domain `SKILL.md`

Mission Two! Now each specialist gets its very own recipe card in dot-github-slash-skills! Builder learns how to build without store-bought kits, Tester learns pretend-doorbell tests, Security gets a six-point safety checklist, and Story Writer learns how to write clear guides!

## 00:10:06 | Slide 28 — Lock it in: surfaces, roles & skills

High five—our whole robot team is ready! Let's remember our three big secrets so far: the Agent Host keeps helpers running behind the window, taking away the pencil guarantees Safety Owl can't scribble, and clear recipe labels help helpers grab the right card!

## 00:10:29 | Slide 29 — Foundry `.env` config, `/agentconfig` & live `READY`

Mission Three! Now we ask Captain Orchestrator to build a safe secret lockbox and a doorbell to Microsoft Foundry! Tester tries a pretend doorbell first, Safety Owl checks that our secret password never leaks into the logbook, and then we press Test Connection and hear READY!

## 00:10:51 | Slide 30 — Session handoff summarizer & live log popup

Mission Four—the magic moment! Some chat stories are as long as a giant chapter book! Our app chops big stories into bite-sized pieces, turns computer paths into neat portable names, shows a live progress bar, and writes one clean summary note for the next builder!

## 00:11:13 | Slide 31 — Browser release & desktop sandbox review

Mission Five—our grand finale! Developer paints a crisp Chronicle icon from pure math—still zero extra packages! Tester checks the icon, we open our finished browser app, and we peek at how a desktop box keeps secrets safe outside the installer. Mission complete!

## 00:11:38 | Slide 32 — What to bring back to your own repositories

You did it! Now you know how robot helpers work in different rooms, how job badges, recipe cards, safety bells, and magic whiteboards fit together, and how one great Team Captain helps everyone build amazing things safely. Happy building, explorers!
