---
name: workshop-labs
description: "Create or rewrite sequential hands-on labs, executable contracts, starter snapshots, agent/skill exercises and collision-free parallel capstones from an existing app. Use for workshop lab guides, answer keys, catch-up stages and instructor recaps."
---
# Reproducible hands-on labs

1. Identify the starting app revision and capture a frozen starter BEFORE implementing enhancements. Preserve unrelated files; omit Git metadata, credentials, caches, dependencies and generated media. Do not overwrite a starter users already edited.
2. Define a shared contract (pure engine, API, store, export) and executable acceptance tests. The intentionally red contract is separate from the green baseline. Move or enable it as part of the lab checkpoint, never weaken tests to make implementation pass.
3. Build a progression: surface/mode/permission exercise → reusable skill with scripts/resources → bounded custom agent team → parallel capstone. Every task uses the real app and adds useful behavior.
4. Write each lab with learning goal, starting checkpoint, timed steps, exact paths/commands, expected behavior, validation, troubleshooting, stretch and a short recap with questions AND answer landing points. Count recaps inside allocated time. Use Windows-native instructions plus correctly scoped macOS/Linux alternatives; don't claim an absent catch-up.sh exists.
5. Separate learner deliverables from instructor answers. Provide reference implementations and a non-destructive setup script with explicit target path. Catch-up warns before overwriting learner files/committing and brings students to specific boundaries (engine, seams, finished). Test the scripts in temporary repos and remove only owned temporary files/worktrees.
6. Make parallelism structural: one API route per auto-loaded file; UI mount point/module/style per feature, a fixed store contract, fixtures/test/doc fragments per lane. One owner settles shared files and integration. Define allowed files, acceptance, preserve/out-of-scope, port, validation and stop condition per lane.
7. Isolate writers using worktrees or equivalent supported harness isolation. Do not equate subagent context isolation or another chat with a filesystem boundary. Use tools restrictions and supported preToolUse hooks as extra controls, never advertise advisory instructions as enforcement. Document shell-write and timeout limitations.
8. Dry-run the reference lanes from the same base, detect overlap, merge/test sequentially, inspect browser behavior and compare merged artifacts to reference output. If real agent/learner sessions aren't run, explicitly label this simulation, not full live lab validation.
9. Synchronize contract, backlog, setup/catch-up, solutions, labs, recaps, guides and deck. Update lesson/student/instructor narration when workflows change; next use workshop-media.

Authoring checklist: [lab acceptance](./references/lab-acceptance.md).
