"""Build Advanced Workshop Deck v1.pptx and rich narration/region metadata."""
from __future__ import annotations

import json
import posixpath
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile

from deck_lib import ADV_DIR, HERE, SlideCanvas, create_presentation, set_speaker_notes
from narration_data import NARRATION
from slides_part1 import build_slides_1_to_17
from slides_part2 import build_slides_18_to_32

TARGET_PPTX = ADV_DIR / "Advanced Workshop Deck v1.pptx"
NARRATION_JSON = HERE / "narration.json"


def build() -> Path:
    prs, assets = create_presentation()
    blank_layout = prs.slide_layouts[6]
    canvases: list[SlideCanvas] = []

    def add_slide(eyebrow: str, title: str, bg_media: str | None = "image13.png",
                  footer: bool = True, header: bool = True) -> SlideCanvas:
        idx = len(canvases) + 1
        meta = NARRATION[idx - 1]
        sld = prs.slides.add_slide(blank_layout)
        canvas = SlideCanvas(
            sld,
            assets,
            index=idx,
            eyebrow=eyebrow if header else "",
            title=title if header else "",
            bg_media=bg_media,
            footer=footer,
        )
        # Keep display title for metadata even on section/cover slides
        canvas.display_title = title or meta["badge"]
        set_speaker_notes(sld, f"{meta['trainer']}\n\nFacilitator Notes: {meta['notes']}")
        canvases.append(canvas)
        return canvas

    build_slides_1_to_17(add_slide)
    build_slides_18_to_32(add_slide)

    assert len(canvases) == len(NARRATION), f"Expected {len(NARRATION)} slides, built {len(canvases)}"

    tmp_pptx = TARGET_PPTX.with_suffix(".tmp.pptx")
    prs.save(str(tmp_pptx))
    tmp_pptx.replace(TARGET_PPTX)

    manifest = []
    for idx, (canvas, meta) in enumerate(zip(canvases, NARRATION), 1):
        manifest.append({
            "slide": idx,
            "title": canvas.display_title,
            "section": meta["section"],
            "badge": meta["badge"],
            "lab": meta["lab"],
            "child": meta["eli5"],
            "trainer": meta["trainer"],
            "regions": canvas.regions,
        })

    NARRATION_JSON.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return TARGET_PPTX


def verify(target: Path):
    data = json.loads(NARRATION_JSON.read_text(encoding="utf-8"))
    with ZipFile(target, "r") as zf:
        assert zf.testzip() is None, "Corrupt ZIP archive"
        names = set(zf.namelist())
        for name in names:
            if name.endswith((".xml", ".rels")):
                root = ET.fromstring(zf.read(name))
                if name.endswith(".rels"):
                    owner_dir = posixpath.dirname(posixpath.dirname(name))
                    for rel in root:
                        if rel.get("TargetMode") != "External":
                            resolved = posixpath.normpath(posixpath.join(owner_dir, rel.get("Target", "")))
                            assert resolved in names, f"Broken relationship in {name}: {resolved}"
        slide_xmls = [n for n in names if n.startswith("ppt/slides/slide") and n.endswith(".xml")]
        assert len(slide_xmls) == len(data) == 32, f"Slide count mismatch: {len(slide_xmls)}"
    print(f"PASS: Built {target.name} ({len(data)} rich editable slides, {target.stat().st_size // 1024} KB) + {NARRATION_JSON.name}")


if __name__ == "__main__":
    verify(build())

