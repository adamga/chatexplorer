---
name: workshop-verify
description: "Verify complete workshop delivery before claiming success: app/starter/kit tests, lab checkpoints and simulated integration, editable deck/narration/media consistency, audience coverage, credential hygiene and honest validation reporting."
---
# Workshop delivery gate

1. Run [validate-customizations.mjs](./scripts/validate-customizations.mjs) from the repository root. It checks the workshop agent/skill definitions, linked resources and ignored registry path without reading credentials.
2. Run the installed project's smallest relevant tests: sample app, starter, kit and resource-helper tests. The starter baseline must pass; its separate intentionally red contract is expected only at the pre-engine stage. Record real counts/results, not stale README claims.
3. Dry-run setup/catch-up in owned temporary repositories, test each boundary and simulate reference lane integration with overlap detection and sequential merges/tests. Check HTTP API and browser behavior (keyboard focus, turn navigation, reset, totals, exports, truncation). Report simulation distinctly from actual Copilot/learner runs.
4. Validate current sources, objective/exercise/checkpoint mapping, timing sum, uninterrupted initial presentation, ordered labs with recaps, and distinct student/instructor/lesson coverage. Resolve missing links and inconsistent paths/contracts.
5. Build every affected deck and narration, visually inspect changed layouts, rebuild videos/subtitles/transcripts after changes. Probe dimensions, duration, audio and English subtitles. A build command completing is not sufficient for visual/audio quality claims.
6. Confirm root resourceinfo.txt is ignored and not tracked/staged. Never grep or print its values. Remove transient requests/secret-bearing outputs. A discovered tracked credential requires stopping and an appropriate remediation report, not printing it.
7. Preserve unrelated modifications, user processes and open PowerPoint. Clean only owned temporary files/worktrees/helpers. Don't commit or publish without authorization.
8. Close current-request todos only after the expected outputs are persistent and verified. Final report lists artifact entry points, test/media evidence, privacy boundary, and real limitations (font substitution, locked versioned deck, unexecuted live agent labs). Don't declare incomplete binaries complete.
