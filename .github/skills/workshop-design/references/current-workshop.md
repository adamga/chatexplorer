# The workflow encoded from this repository

The first workshop used a separate Agent Atlas sample. The revamp explicitly replaced it with the user's existing AI credits calculator in `sampleapp`; never reintroduce the other sample.

## Sources
- `sampleapp`: finished zero-runtime-dependency Node ES-module app. Inspect `package.json`, README, ENHANCEMENTS, `data/models.json`, `lib/calc.js`, `lib/session.js`, `lib/export.js`, `server.js`, `server/routes`, `public/features`, tests.
- `workshop/lab-starter`: frozen single-turn baseline captured before multi-turn work; not the finished app copied backwards after the fact.
- `workshop/lab-kit`: setup/catch-up, backlog, scope hook, lane setup, overlap checker and tests.
- `workshop/docs/session-contract.md`: session, turn, HTTP, store and export contract. Setup copies executable contracts from finished app tests.
- `workshop/solutions`, `labs`, `INSTRUCTOR.md`, `STUDENT.md`: reference skill/team/lane briefs and audience-specific guidance.

## Multi-turn semantics
Use existing pricing logic, passing carried history as token counts. Each turn stores its inputs, result, carriedIn/out and cumulative totals. Carried out is kept input plus expected visible response, excluding billed hidden reasoning. Truncation and tier switches are surfaced. UI supports each turn's full breakdown, previous/next and keyboard selection, totals and CSV/Markdown export. Preserve single-turn behavior. Explicitly label estimates; this is not a real model conversation generator.

## Teaching sequence
1. Agents window Plan-mode budget helper and Copilot app Autopilot/Assisted model comparison: new files, no shared price math.
2. add-model skill: short trigger description, schema reference, template and deterministic validator, natural invocation test.
3. calc-lead/researcher/implementer/reviewer team: contract-first multi-turn engine, red test then green, bounded delegation and minimal tools.
4. Task 0 creates seams; API, composer, browser and summary lanes work independently through the contract/store. Same base commit, distinct worktrees/ports, doc fragments, scope guard, overlap check, sequential merge/test, browser gate.
5. Recap after every lab; whole presentation delivered first.

## Evidence discipline
Run `npm test` in sampleapp and starter, kit node tests, script dry runs for setup/catch-up, a simulated lane integration, actual UI checks and rendered media checks. Tests counts are snapshots, not assertions to hard-code into narration. Do not claim real learner/agent sessions were executed when only reference files were merged. Path guards cover edit tools, not arbitrary shell writes; worktrees isolate files, not ports/DBs/credentials.
