# Chronicle Advanced — Lab walkthrough

Video: [Attendee-Explainer.mp4](../Attendee-Explainer.mp4) · Runtime: 00:09:49.292

Narration: **Microsoft Foundry (gpt-audio-1.5-2, alloy)** (mode: `foundry`).

Times below are playback positions. Lab allocations refer to the separate 90-minute workshop. App views show local fixtures, not a live Foundry run.

## Lab 00 — Baseline (8 workshop minutes)

**00:00:00 · Open the starter, not the repository**

In lab zero, start the eight-minute block by opening the sampleapp folder itself. The session library already works. You are extending this reader, not generating a new app or installing its dependencies.

**00:00:21 · Record your starting point**

Check Node is at least version twenty-two, syntax-check the server and run the native test suite. Stop on a failure. Choose a frontier model in Copilot Agent mode and keep the instructor's connection sheet private for later.

## Lab 01 — Role agents (17 workshop minutes)

**00:01:36 · Create four workers and one dispatcher**

Use the lab one prompts in default Agent mode. Spend ten minutes creating the developer, tester, security and documentation workers, five on the orchestrator, and two inspecting the result. Only the orchestrator is user-invocable.

**00:02:29 · Inspect before delegating**

Look for five agents and no YAML warnings. Read the security tools list: read and search only. Now check the lead: read, search, agent and todo. If the lead can edit files, fix that before you rely on delegation.

## Lab 02 — Reusable skills (15 workshop minutes)

**00:03:21 · Give each worker its playbook**

Over the next fifteen minutes, create the four skill folders. Match each name to its parent folder exactly. Attach zero-package engineering to the developer and Foundry OAuth testing to the tester using their skills arrays.

**00:03:54 · Switch entry points**

Attach the security audit and handoff documentation skills to their respective workers. Confirm all four in Customizations, then start a new chat and select Chronicle Orchestrator. From now on, give feature requests to the lead, not individual workers.

## Lab 03 — Connectivity (15 workshop minutes)

**00:04:22 · Dispatch phase one, then configure**

During the fifteen-minute connectivity lab, ask the lead for the agentconfig guides, server routes and settings dialog. After security and test sign-off, start the server and open the loopback address on port thirty-two ten. Click Summary agent.

**00:04:51 · Save first, then test**

Enter the five supplied values privately and save to dot env. Test the connection and look for READY plus separate Entra and Foundry timings. Open the connectivity log and confirm no secret or bearer token appears before copying it.

## Lab 04 — Session handoff (18 workshop minutes)

**00:05:39 · Select a session you may send**

Lab four gives you twelve minutes to dispatch the summarizer change and six to try it. Restart the updated server. Open an approved multi-turn session, choose Create session summary and watch the progress phases. Missing settings should send you back to configuration.

**00:06:20 · Inspect the job, not just its percentage**

Open the operation log while the job runs. In this fixture, the route checks passed but the sample client still needs updating. Check your own saved Markdown for an equally concrete outcome and next step, not just a recap of conversation topics.

**00:06:45 · Try the handoff on paper**

Open the generated summary. Pick a file path and confirm that it makes sense from the workspace root on another machine. Find an unfinished item and the command or test that would verify it. Leave the original session untouched.

## Lab 05 — Browser release (17 workshop minutes)

**00:07:56 · Render the local icon**

Use lab five's seventeen minutes to finish the browser release. Copy the reference icon renderer into build, or inspect an existing copy. Have the lead generate the icon, copy the PNG into public, and update the favicon link without changing the server.

**00:08:18 · Verify the actual bytes**

Syntax-check the renderer and run the suite. Restart the browser app, open the icon URL directly, then reopen a conversation. Try a fresh tab if the favicon is stale. Only count a live summary if you actually used the configured agent.

**00:09:15 · Stop at the browser release**

Stop your server. Review the desktop reference to see the sandbox, narrow preload bridge and separate backend process. No installer is built. Your finish line is a working browser app, a locally served icon, and a summary another developer can use.
