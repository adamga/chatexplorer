# Lab acceptance checklist

For every lab, establish:
- Starting source app and commit/snapshot; green baseline command, intentionally red tests separated.
- Observable objective; useful app task, exact files and executable contract.
- Six-field brief: outcome, allowed files, acceptance, preserved behavior, out of scope, validation.
- Time budget with recap; dependencies actually satisfied by earlier checkpoints.
- Native tools/agent/skill availability verified in chosen harness, with a fallback that still teaches the goal.
- Reference answers not installed into learner workspace by default.
- Generated fixture/demo seed for independently checking UI lanes without waiting for other writers.
- Pass/fail checkpoint and explanation; recap questions + correct answers; troubleshooting + stretch.
- Setup/catch-up refuse accidental overwrite or require explicit consent; don't silently commit unrelated learner work.
- Disjoint branch scopes, same base, port/resource ownership, overlap detection, sequential integration/test.
- Human reviewer/CI backstop, explicit limitations of guard hooks and instructions.
- Honest evidence: unit/API tests, browser checks, simulated merges, actual live agent execution kept distinct.

Current Chronicle commands (from the app's workspace folder):
- `appsample` and `workshop/Advanced/sampleapp`: `node --test` and `node --max-old-space-size=8192 src/server.js`.
- `workshop/Fundamentals/sampleapp` starts empty; Labs 02–04 introduce the tests, server, and UI in that order.
- Run `node --check <file>` for each changed JavaScript file. Do not require npm, npx, or package installs for workshop exercises.
