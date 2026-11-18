# Current media runbook

Run from correct directories; don't assume cwd persists across shell tool calls. On Windows use native paths. Installed-tool reuse precedes installation; only install missing dependencies for the chosen build.

## Decks
Within `workshop/deck`:
```
python build_deck.py "<approved-template.pptx>"
python build_student.py "<approved-template.pptx>"
python build_instructor.py "<approved-template.pptx>"
```
Helpers: `lib.py`; source assets: `assets`. Outputs: main `Advanced-Copilot-Workshop.pptx`, `Student-Guide.pptx`, `Instructor-Guide.pptx`; narrated variant JSON is written to `../video/narration-main|student|instructor.json`. Locked output may become `-v2.pptx`; don't close the user's application. Specify template path from registry, never rely on the builder's historical TEMP fallback.

Render review:
```
.\export-slides.ps1 -Deck "<output.pptx>" -Out "<owned-temp-directory>" -Width 1600
```
Only export into a dedicated owned temp path: exporter clears its output directory. PowerPoint export needs Windows and PowerPoint. Template exploration can use python-pptx, ZIP XML/theme extraction and PowerPoint renders. Dependencies: python-pptx, Pillow, lxml; missing-font fallback must be disclosed.

## Videos
Within `workshop/video`:
```
python build_video.py main
python build_video.py student
python build_video.py instructor
python make_script.py
```
Outputs: `Advanced-Copilot-Explainer.mp4`, `Student-Guide.mp4`, `Instructor-Guide.mp4`, paired SRT/VTT and `script-main|student|instructor.md`. `build/<variant>/slides` uses Slide1.PNG naming; `audio` holds cached narration and source stamps. `--no-export` supports pre-exported slides; `--subs-only` retimes/remuxes without re-encoding. Use the variant argument; old narration.json is obsolete.

Dependencies: edge-tts, moviepy, Pillow, imageio-ffmpeg, python-pptx. Edge TTS sends narration online; only use it with authorized content. No silent remote fallback or automatic paid retries. Use configured adapters or offline narration if policy requires it. Existing script retries a free provider; review/change that policy before use with paid services.

## Verify
- PowerPoint opens outputs; shape/text rendering is reviewed, not only ZIP integrity.
- Narration count = slide count, every variant's source and binary are current.
- FFmpeg probe: 1920×1080 video, audible AAC, English subtitle track, actual duration recorded.
- Extract encoded frames at section boundaries; inspect captions, frame appearance and audio levels. Listen to representative segments if playback tooling exists; don't claim listening based on a probe alone.
- Rebuild after test-count, duration, model-price, contract or filename corrections.
- Clean owned temporary artifacts only after validation; keep useful caches if another rebuild is planned. Don't poll active jobs indefinitely; use tracked process/session IDs and completion notifications.
