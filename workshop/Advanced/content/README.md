# Chronicle | The session handoff

**The challenge:** a teammate opens a fresh workspace tomorrow. Can they tell what changed, what was tested, and what to do next without replaying the entire chat?

## Choose your path

| Audience | Start here | How to use it |
|---|---|---|
| Presenter | [Advanced Presenter](./Advanced-Presenter.pptx) | Open in PowerPoint Presenter View. Rehearse the demos against the [completed browser app](../../../appsample/README.md); teach from the [starter](../sampleapp/README.md). |
| Attendee | [Advanced Attendee](./Advanced-Attendee.pptx) | Keep this beside the [six lab guides](../README.md). Pause at each checkpoint and show the evidence before moving on. |

The live workshop runs **90 minutes**. Watch the explainers before or after the session, or pause them while working independently. Do not play the full video series inside the lab timeboxes.

### Watch

| Video | Watch for |
|---|---|
| [Whole-session explainer](./Session-Explainer.mp4) · [captions](./Session-Explainer.vtt) | Follow a chat through the explorer, the specialist team, and the final handoff. Why does a large session need more than one summarization pass? |
| [Instructor preparation](./Instructor-Explainer.mp4) · [captions](./Instructor-Explainer.vtt) | Rehearse what to show, what to ask, and how to keep the room learning if the live connection is unavailable. |
| [Attendee lab walkthrough](./Attendee-Explainer.mp4) · [captions](./Attendee-Explainer.vtt) | Work through the starter, compare it with the finished app, and check your results at each lab boundary. |

Open the MP4 in your usual player; if captions aren't selected automatically, choose the English subtitle track or load its same-name SRT. [Readable transcripts](./transcripts/) are also provided. The initial media build uses Windows preview narration, not a recording from the Foundry deployment.

## Instructor cue sheet

| Clock | Do this | Ask for evidence before moving on |
|---|---|---|
| 00:00–00:08 · [Baseline](../Lab-00-Intro-and-Baseline.md) | Open the starter as the workspace root. Run `node --test`. Show an imported, approved sample session in the explorer. | Can a learner find the turn that changed a file? If the summary button already exists, check that they did not open the finished app. |
| 00:08–00:25 · [Agents](../Lab-01-Orchestrator-and-Role-Agents.md) | Build the Orchestrator and its four specialists. Hand the team one bounded change. | Ask who edits the source and who returns a read-only review. A plan in chat is not evidence of a delegated result. |
| 00:25–00:40 · [Skills](../Lab-02-Creating-Agent-Skills.md) | Contrast a job title with a recipe: the Tester owns verification; its skill explains how to stand up a local HTTP mock. | Ask a pair to show the skill file and a test produced with it. If discovery fails, check the description, workspace root and folder name; explicitly reference the file. |
| 00:40–00:55 · [Connection](../Lab-03-Foundry-Config-and-Connectivity.md) | Use the **Summary agent** dialog. Rehearse auth and agent invocation separately. Enter credentials off screen. | A saved configuration is not a connection test. Look for `READY`, both timings, and a log that contains no secret or token. |
| 00:55–01:13 · [Handoff](../Lab-04-Session-Summarizer-and-Log-Popup.md) | Run **Create session summary** on a synthetic or approved session. Show one saved change in the source, then find it in the output. | Give the Markdown to a partner. Can they name the next action and its evidence? If Azure is unavailable, demonstrate local mock tests and clearly label the live checkpoint unfinished. |
| 01:13–01:30 · [Browser release](../Lab-05-Desktop-Electron-and-Installer.md) | Check the local icon, run regressions, reopen a session. Review the desktop wrapper as a diagram or source tour only. | A working browser app, a locally served icon and passing checks are the finish line. No installer, npm or Electron install is required. |

**Before class:** verify Node.js 22+, Copilot access, and the team names in the target VS Code build. Rehearse a *real* `READY` with the class's text **agent**, not the audio model. A project URL and its system-assigned identity's object ID do not supply the client application credentials used in Lab 03. Distribute any lab credentials privately using your organization's approved process; never paste them into prompts. Prepare one synthetic coding session and keep an offline copy of the media.

**Use the session shown on screen:** choose **Open session** and enter the absolute path to [practice-session.jsonl](./assets/practice-session.jsonl). Look for **Verify the route migration**: two prompts and one tool call. The [starter](./assets/screenshots/starter.png), [finished app](./assets/screenshots/finished.png), [configuration dialog](./assets/screenshots/config.png), and [operation log](./assets/screenshots/log.png) were captured from the running apps. The summary job used local mock Entra and Foundry responses, not a live cloud connection.

**If you fall behind:** shorten the optional desktop source tour before cutting the handoff review. If a group is blocked, let them inspect the [completed reference](../../../appsample/) in a separate window rather than overwrite their starter.

## Voice production

On Windows the narrator uses the system `curl.exe` (8.3+ with Schannel) rather than Python OpenSSL. Certificate verification stays enabled. A Foundry HTTP status means the TLS connection completed; it is distinct from a Python `SSLEOFError` during the handshake.

The narrator saves streaming WAV responses using the size of the received PCM samples rather than the placeholder length in the streaming header.

The narration build targets the highlighted deployment **`gpt-audio-1.5-2`** via the resource's OpenAI v1 chat completions route, not the project's agent Responses route. The included script sends narration text only. It does not publish a deck, a screenshot, a chat history, or application source. Foundry generation consumes the deployment's quota and may incur charges.

From the repository root, in **your own Windows PowerShell session**, sign in with an identity allowed to invoke that deployment. Use the tenant and subscription IDs from your Azure project details:

```powershell
$tenant = Read-Host 'Tenant ID'
$sub = Read-Host 'Subscription ID'
$build = '.\workshop\Advanced\content\scripts\build_foundry_audio.ps1'
& $build -TenantId $tenant -SubscriptionId $sub -SmokeTestOnly
```

The command prompts through Azure PowerShell; do not paste a token or client secret into chat. A successful smoke test decodes a short spoken WAV in the ignored cache. To regenerate the videos with Foundry narration, run the same command without `-SmokeTestOnly` in a media-ready Python environment (`-Python` selects the interpreter). Back up any existing MP4s you want to retain first. An unsuccessful request does **not** silently switch to local speech.

**Rebuild prerequisites (authors only):** the full video render uses Windows, Python with Pillow and NumPy, the x64 Visual C++ compiler, and the Windows SDK. On the production machine the tested Python interpreter was `"$env:LOCALAPPDATA\Programs\Strata\control\python\python.exe"`; pass that path with `-Python` if the default interpreter lacks the media libraries. The smoke test alone does not require the compiler, Pillow, or NumPy. Attendees need none of these tools to use the delivered slides and videos.

## References

Checked 22 November 2026: [VS Code custom agents](https://code.visualstudio.com/docs/agent-customization/custom-agents), [VS Code agent skills](https://code.visualstudio.com/docs/agent-customization/agent-skills), [Microsoft Foundry audio completions](https://learn.microsoft.com/azure/foundry/openai/audio-completions-quickstart). Role instructions and discoverable skills serve different purposes; optional frontmatter and agent controls vary by harness.
