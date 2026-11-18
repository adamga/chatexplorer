# The AI-Powered Workshop Studio

**Scale the craft. Not the busywork.**

## Open these

| File | Purpose |
| --- | --- |
| `AI-Powered-Workshop-Studio.pptx` | 12 native, editable slides with delivery cues and pacing in speaker notes. |
| `Workshop-Studio-Explainer.mp4` | 5:40 process explainer, 1080p/24 fps, narrated with offline Microsoft Zira Desktop speech. |
| `Deck-Preview.jpg` | All-slide visual overview. |
| `Explainer-Transcript.md` | Timestamped, readable narration. |
| `Workshop-Studio-Explainer.srt` / `.vtt` | Matching English captions for reuse. |

Open the deck in PowerPoint and use Presenter View for notes. The video plays
independently in a standard MP4 player. Captions are burned into a separate band
below the visuals; an optional English subtitle track is also embedded. Leave
the optional track off to avoid duplicate captions.

The story is scenario-independent: how frontier AI capabilities help produce
labs, delivery decks and audience-specific explainers, with reusable agents,
skills and human review. It does not tour the sample application.

## Delivery: 12 minutes, plus discussion

| Slide | Story beat | Target |
| --- | --- | --- |
| 1 | Less prep. More possibility. | 0:45 |
| 2 | From preparation treadmill to reusable flywheel | 0:55 |
| 3 | One scenario, one connected learning experience | 1:00 |
| 4 | Hands-on labs with observable checkpoints | 1:05 |
| 5 | Creating and adapting an editable delivery deck | 0:55 |
| 6 | Replayable explanations for students and future instructors | 1:00 |
| 7 | Agents own roles; skills capture repeatable playbooks | 1:30 |
| 8 | Technical, visual and human quality gates | 1:00 |
| 9 | CSU: creation speed, CSA reuse, lighter customization | 0:55 |
| 10 | Customers: clarity, structure, leave-behinds and relevance | 0:55 |
| 11 | Adapt the scenario; retain the production discipline | 1:15 |
| 12 | Scale the craft, not the busywork | 0:45 |

The 12-minute target leaves up to 3 minutes in a 15-minute slot. Rehearsal,
not an automated narration duration, determines the live delivery time.

Benefits are opportunities to measure, not claimed productivity statistics.
“Any scenario” means a reusable starting process; new domains and changed
labs still need technical validation and subject-matter review.

## Rebuild locally

Authoring source is `build.py`. It creates the PPTX and `story.json`, the shared
source for video narration. It reuses the repository's existing PowerPoint
builder for presentation setup and safe, versioned saves. Original visual
styling uses native text and shapes with installed Segoe UI fonts.

Requirements: Python with the existing `python-pptx`, `Pillow`, and
`imageio-ffmpeg` installations; Windows PowerPoint; Windows PowerShell with
`System.Speech` and the Microsoft Zira Desktop voice. No npm runtime packages
or online generation services are used.

From the repository root in PowerShell:

```powershell
python caip\build.py
& .\workshop\Fundamentals\content\scripts\export_slides.ps1 `
  -Deck (Get-Content caip\story.json -Raw | ConvertFrom-Json).deck `
  -Out "$PWD\caip\.build\slides" -Width 1920
& .\caip\narrate.ps1
python caip\video.py
```

The exporter opens only the requested presentation read-only. Its output path
is a dedicated generated directory. Close a final MP4 before rebuilding it.
If the PPTX is locked, the deck builder saves an adjacent versioned copy;
`story.json` points to that copy so downstream rendering stays synchronized.

The voice is local synthetic speech, not a cloud neural voice. Audio levels
were checked programmatically; pronunciation was not assessed by listening.
Visual review covered all slides and sampled encoded video frames. Generated
audio, renders and intermediate clips remain in ignored `.build`.

## Process grounding

Agent roles reflect the existing builder, researcher, producer and reviewer
customizations in `.github\agents`. Playbooks reflect the resources, design,
labs, media and verification skills in `.github\skills`. These are
coding-assistant workflow customizations, not deployed hosted agents.
This deck describes that approach; it does not claim an independent live
execution of every agent or a validated workshop for every possible domain.
