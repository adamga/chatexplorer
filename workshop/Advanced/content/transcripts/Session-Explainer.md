# Chronicle Advanced — Concepts

Video: [Session-Explainer.mp4](../Session-Explainer.mp4) · Runtime: 00:07:01.833

Narration: **Microsoft Foundry (gpt-audio-1.5-2, alloy)** (mode: `foundry`).

Times below are playback positions. Lab allocations refer to the separate 90-minute workshop. App views show local fixtures, not a live Foundry run.

## Lab 00 — Baseline (8 workshop minutes)

**00:00:00 · What did the last developer leave behind?**

Imagine inheriting a route migration. You can see three saved conversations in Chronicle, but which change landed, which check passed, and what should you do next?

**00:01:06 · Start with a known reader**

Lab zero gives us eight minutes to establish a baseline. Chronicle already parses two session formats and reconstructs file changes. A passing local suite gives us something to compare against after each change.

## Lab 01 — Role agents (17 workshop minutes)

**00:01:20 · One request, several responsibilities**

Lab one spends seventeen minutes on ownership. A single public orchestrator reads, searches, delegates and tracks a checklist. It cannot edit the application, so a request has to cross an explicit boundary to the developer.

**00:01:36 · A green test is not a security review**

The tester can run the code. The security reviewer can only read and search. Documentation explains the contract. If a test fails or the reviewer finds a serious leak, the lead sends the change back rather than declaring victory.

## Lab 02 — Reusable skills (15 workshop minutes)

**00:01:52 · Separate a role from its recipe**

Lab two gives the team fifteen minutes to encode its methods. The developer's zero-package skill teaches an atomic write: build a temporary file and rename it, so a partial write never becomes the saved configuration.

**00:02:07 · Make failure repeatable**

The tester's playbook replaces identity and model servers with loopback mocks. Security checks what can leave the process. Documentation specifies the handoff format. Each skill name matches its folder and is attached to the matching role.

## Lab 03 — Connectivity (15 workshop minutes)

**00:03:05 · A configured app is not a connected app**

Lab three takes fifteen minutes. The dialog collects the tenant, client, secret, endpoint and agent name. The browser may learn that a secret is saved, but must not retrieve its value from the configuration API.

**00:03:22 · Two exchanges, two kinds of evidence**

The local server asks Entra for a token, then uses it for a Foundry Responses request. A READY reply proves more than saving the settings. Separate authentication and agent timings help locate a failure without printing credentials.

## Lab 04 — Session handoff (18 workshop minutes)

**00:03:37 · Choose the evidence deliberately**

Lab four has eighteen minutes to turn a selected session into portable Markdown. The button lives next to Read full session. The input is a read-only source; the new summary belongs in a separate output folder.

**00:03:52 · Shrink a long session without losing the ending**

Build a chronological digest of prompts, recorded decisions, tools and edits. Replace machine paths with workspace-relative ones. A short digest goes straight to synthesis; a long one becomes bounded chunks whose individual digests feed the final pass.

**00:05:38 · Prove the handoff is useful**

The progress dialog reports phases, not just a spinner. Inspect a redacted operation log for the job history. Then read the Markdown as the next developer: can you name a tested result and the next unfinished task?

## Lab 05 — Browser release (17 workshop minutes)

**00:06:17 · Ship a browser asset, not an installer**

Lab five closes with seventeen minutes on release evidence. A pure Node renderer produces the icon. Test its URL, media type and signature. A visible browser tab icon alone could be an old cached copy.

**00:06:44 · What crosses machines?**

The optional desktop wrapper adds a sandboxed window, a separate server process and narrow native pickers. Inspect it without running it. Our deliverable is still the browser app, and the next developer gets a portable plan instead of somebody else's environment.
