"""Build the editable CAIP presentation and synchronized offline video inputs."""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
sys.dont_write_bytecode = True
SPEC = importlib.util.spec_from_file_location(
    "workshop_decks",
    REPO / "workshop" / "Fundamentals" / "content" / "scripts" / "build_decks.py",
)
BASE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BASE)

NAVY = "101F2A"
CREAM = "F6F4EA"
LIME = "D7FA52"
CORAL = "FF8976"
TEAL = "8AE3D1"
MUTED = "A8B9C1"
SLATE = "1D3440"
INK = "18313B"
FONT = "Segoe UI"
HEAD = "Segoe UI Semibold"

SLIDES = [
    dict(section="THE BIG IDEA", title="Less prep.\nMore possibility.", seconds=45,
         notes="Open with: What if the next customer scenario started with a reusable studio, not a blank page? This is about augmenting CSA expertise, not replacing it. Frame the ambition without promising measured time savings.",
         narration="What if the next customer workshop started with a reusable studio, instead of a blank page? We use AI to help create the learning experience around a customer scenario: hands-on labs, an editable delivery deck, and explainer videos. The goal is simple. Less repetitive preparation, more time for customer understanding and great facilitation. The architect still owns the outcome."),
    dict(section="WHY CHANGE", title="The frontier moves fast.\nOur prep model should too.", seconds=55,
         notes="Ask for a show of hands: Who has updated a workshop, only to find the technology changed again? Contrast disconnected artifacts with one coherent package. No numeric productivity claims.",
         narration="In a fast-moving AI space, a workshop is never really finished. Features evolve, audiences differ, and customer constraints change. Rebuilding each artifact independently creates drift. A lab says one thing, a slide says another, and the instructor has to bridge the gap. Our approach turns that treadmill into a learning loop: create a coherent package, validate it, deliver it, and feed the lessons into the next version."),
    dict(section="THE APPROACH", title="One scenario.\nA whole learning experience.", seconds=60,
         notes="Walk left to right. Explain frontier capabilities in plain English: reasoning plans the learning journey; coding creates exercises; multimodal generation helps produce visual and narrated explanations; agents coordinate bounded work. Availability varies by tooling.",
         narration="Start with the scenario, the audience, and an observable outcome. AI reasoning helps shape the learning journey. Code generation helps turn ideas into runnable exercises. Visual composition and speech tools help explain the same concepts in different ways. Bounded agents coordinate the work, while reusable skills make the process consistent. These are complementary capabilities, not a magic one-click workshop. Tool availability and human review still matter."),
    dict(section="01 / HANDS-ON LABS", title="Don't just explain it.\nLet them build it.", seconds=65,
         notes="Describe the lab pattern: goal, steps, checkpoint, recap. Emphasize runnable commands, expected results, starter/solution separation and rescue stages. A scenario brief is not sufficient evidence that a lab works.",
         narration="For hands-on labs, AI helps translate learning goals into a sequence of small, achievable tasks. Each task needs clear steps, an observable checkpoint, and a short recap of why it matters. We can generate starter material, solution paths, troubleshooting guidance, and catch-up points. Then we run the exercises. The standard is not that the instructions sound convincing. It is that a learner can follow them and reach the intended outcome."),
    dict(section="02 / DELIVERY DECK", title="From slide surgery\nto story design.", seconds=55,
         notes="Distinguish net-new authoring from modification. AI can restructure a story and tailor depth, examples and demo cues. Native editable text/shapes let the next CSA adapt it without starting over.",
         narration="For the delivery deck, AI helps us move from slide surgery to story design. We can create a new narrative, or reshape an existing workshop for a different customer. That includes adjusting depth, replacing examples, tightening the flow, and adding presenter cues. The deck stays editable. The important part is alignment: the presentation introduces what the labs actually teach, with the same terminology, sequence, and outcomes."),
    dict(section="03 / EXPLAINER VIDEOS", title="Teach once.\nMake it replayable.", seconds=60,
         notes="Students need preparation, workflow and checkpoints. Future instructors need pacing, demo cues, pitfalls and rescue points. Explain captions/transcripts as first-class leave-behinds. This explainer describes the process, not the existing sample app.",
         narration="Explainer videos extend the workshop beyond the live session. Students can preview a concept, replay a tricky step, or return to a checkpoint later. Future instructors need a different explanation: pacing, demo cues, common pitfalls, and where to cut or rescue an exercise. AI helps draft and narrate those audience-specific stories. Captions and transcripts make the material easier to navigate. When the source changes, the affected media needs to change with it."),
    dict(section="04 / AGENTS + SKILLS", title="Not a mega-prompt.\nA workshop production system.", seconds=90,
         notes="The repo contains builder, researcher, producer and reviewer agents, with resources/design/labs/media/verify skills. These are coding-assistant customizations, not deployed Foundry agents. Roles describe bounded responsibilities; available orchestration and authoring capability vary. Any scenario is a starting point, not a promise that every domain is already validated.",
         narration="We formalized the approach as a suite of agents and skills. The builder owns the end-to-end package. A researcher gathers evidence. A producer creates bounded deliverables. A reviewer challenges the result. Skills capture the reusable playbooks for resources, design, labs, media, and verification. Agents answer who owns the work. Skills answer how good work gets done. A new scenario changes the brief and examples, while the production discipline stays reusable. A new domain still needs subject-matter review."),
    dict(section="THE QUALITY GATE", title="Fast drafts.\nDeliberate trust.", seconds=60,
         notes="AI output is a draft until checked. Run code and checkpoints, review deck rendering, reconcile narration with slides and verify privacy. Distinguish machine checks from an instructor actually rehearsing the customer journey.",
         narration="Speed only helps if the workshop is trustworthy. We check technical claims, execute the labs, inspect the rendered slides, and reconcile narration with the final visuals. We protect customer information and use approved tools. Automated checks catch some problems, but they do not replace an instructor rehearsal or subject-matter review. Human approval is the release gate. The loop is generate, verify, rehearse, and improve, not generate and hope."),
    dict(section="FOR THE CSU", title="Less reinvention.\nMore customer time.", seconds=55,
         notes="Expand CSU as Customer Success Unit and CSA as Cloud Solution Architect if the audience needs it. Present benefits as expected value, not measured outcomes. Reuse means sharing the source, not just a final PDF.",
         narration="For the Customer Success Unit, this creates three opportunities. First, faster workshop creation because we are not starting every artifact from scratch. Second, easier reuse and sharing across Cloud Solution Architects, because the package includes editable sources, guidance, and a repeatable structure. Third, less repetitive work when tailoring an existing workshop or creating a new one. Measure the value through preparation effort, learner progress, and reuse across teams."),
    dict(section="FOR CUSTOMERS", title="Easy to follow.\nWorth coming back to.", seconds=55,
         notes="Connect structure to experience: explain, try, check, recap. Leave-behinds include deck, labs, video and transcript. Repeatability means a customer can revisit the experience, not a guaranteed business result.",
         narration="For customers, a connected learning experience is easier to follow. The story, the exercise, and the checkpoint reinforce one another. Clear structure reduces the effort of figuring out what to do next. Useful leave-behinds include the editable deck, labs, explainers, and transcripts, so teams can revisit the material after the event. Customization starts with their goals, skill level, and constraints, rather than asking them to fit a generic demonstration."),
    dict(section="THE REUSE LOOP", title="Same studio.\nDifferent customer story.", seconds=75,
         notes="Use a hypothetical example, not a claim about workshops already delivered. Change a generic AI scenario to knowledge discovery or operations. Keep verified structure, adapt content, re-run affected validation and media. Avoid assuming a reusable lab works unchanged.",
         narration="Imagine adapting the same approach for a knowledge-discovery session, an operations scenario, or a customer-specific AI prototype. We change the audience, examples, environment, and success criteria. We keep the useful structure: objectives, runnable labs, checkpoints, presenter guidance, and review gates. Then we revalidate what changed and regenerate the affected media. Reuse is not copy and forget. It is a controlled starting point that gets better with delivery feedback."),
    dict(section="THE TAKEAWAY", title="Scale the craft.\nNot the busywork.", seconds=45,
         notes="Close with one practical action: choose a customer scenario, define a learner outcome, and build one verified reusable package. Measure preparation effort, learner checkpoints and reuse feedback. Leave 2-3 minutes for discussion within a 15-minute slot.",
         narration="The point is not to produce more content for its own sake. It is to scale the craft of a great workshop. Start with one customer scenario and one clear learning outcome. Build a connected package, keep the sources reusable, and release it only after review. Then measure preparation effort, learner progress, and what the next instructor can reuse. Let AI handle more of the busywork, so we can focus on the customer."),
]


def shape(slide, kind, x, y, w, h, color):
    s = slide.shapes.add_shape(kind, Inches(x), Inches(y), Inches(w), Inches(h))
    s.fill.solid()
    s.fill.fore_color.rgb = RGBColor.from_string(color)
    s.line.fill.background()
    return s


def box(slide, x, y, w, h, text, size=22, color=CREAM, bold=False):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, line in enumerate(text.split("\n")):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = line
        p.font.name = HEAD if bold else FONT
        p.font.size = Pt(size)
        p.font.color.rgb = RGBColor.from_string(color)
        p.space_after = Pt(3)
    return tb


def pill(slide, x, y, w, text, fill=LIME, color=NAVY):
    s = shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, .4, fill)
    s.adjustments[0] = .5
    tb = box(slide, x + .16, y + .065, w - .28, .29, text, 11, color, True)
    tb.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE


def card(slide, x, y, w, number, title, body, accent=LIME, light=False, h=2.1):
    shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h, "FFFFFF" if light else SLATE)
    box(slide, x + .22, y + .16, w - .44, .35, number, 13, INK if light else accent, True)
    box(slide, x + .22, y + .64, w - .44, .55, title, 23, INK if light else CREAM, True)
    box(slide, x + .22, y + 1.27, w - .44, h - 1.35, body, 16, INK if light else MUTED)


def ribbon(slide, text, light=False):
    shape(slide, MSO_SHAPE.RECTANGLE, .65, 6.13, .07, .42, INK if light else LIME)
    box(slide, .88, 6.12, 11.7, .45, text, 19, INK if light else CREAM)


def base(prs, i, light=False):
    d = SLIDES[i]
    s = prs.slides.add_slide(prs.slide_layouts[6])
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = RGBColor.from_string(CREAM if light else NAVY)
    color = INK if light else CREAM
    box(s, .65, .35, 10.8, .26, "CAIP  /  THE AI-POWERED WORKSHOP STUDIO", 10, color, True)
    box(s, 11.65, .35, 1, .26, f"{i+1:02d} / 12", 10, color)
    shape(s, MSO_SHAPE.RECTANGLE, .65, .83, 12.02, .014, INK if light else SLATE)
    box(s, .65, 1.05, 12, .3, d["section"], 12, INK if light else LIME, True)
    s.notes_slide.notes_text_frame.text = (
        f"TARGET: {d['seconds']} seconds | Total talk: 12:00; reserve 3:00 for discussion.\n\n"
        + d["notes"] + "\n\nPROCESS EXPLAINER NARRATION\n" + d["narration"]
    )
    shape(s, MSO_SHAPE.RECTANGLE, .65, 7.07, 12.02, .018, INK if light else SLATE)
    shape(s, MSO_SHAPE.RECTANGLE, .65, 7.07, 12.02 * (i+1)/12, .025, INK if light else LIME)
    box(s, .65, 7.19, 11, .18, "HUMAN EXPERTISE, AMPLIFIED.   /   SCENARIO > EXPERIENCE > REUSE", 8, INK if light else MUTED)
    return s


def build():
    prs = BASE.new_presentation()
    prs.core_properties.title = "The AI-Powered Workshop Studio"
    prs.core_properties.subject = "Scaling workshop craft with frontier AI"
    prs.core_properties.author = "CAIP"

    s = base(prs, 0)
    box(s, .65, 1.65, 8.6, 2.25, SLIDES[0]["title"], 58, CREAM, True)
    box(s, .7, 4.12, 7.3, .9, "Frontier AI. Better workshops.\nMore time for the customer.", 25, MUTED)
    pill(s, .7, 5.52, 4.45, "12-MINUTE STORY  /  BUILT FOR REUSE")
    for j, (label, col) in enumerate([("LAB", TEAL), ("DECK", CORAL), ("PLAY", LIME)]):
        x, y = 9.1 + (j % 2)*.7, 1.7 + j*1.35
        shape(s, MSO_SHAPE.ROUNDED_RECTANGLE, x, y, 2.35, 1.18, col)
        box(s, x+.25, y+.28, 1.9, .55, label, 28, NAVY, True)

    s = base(prs, 1, True)
    box(s, .65, 1.55, 12, 1.35, SLIDES[1]["title"], 39, INK, True)
    card(s, .65, 3.25, 5.5, "THE TREADMILL", "Rebuild. Reconcile. Repeat.", "Disconnected artifacts.\nThe instructor fills the gaps.", light=True, h=2.35)
    card(s, 6.45, 3.25, 6.2, "THE FLYWHEEL", "Create. Verify. Deliver. Learn.", "One connected learning package.\nEvery delivery improves the next.", light=True, h=2.35)
    ribbon(s, "Move expertise forward, instead of moving content around.", True)

    s = base(prs, 2)
    box(s, .65, 1.55, 12, 1.35, SLIDES[2]["title"], 40, CREAM, True)
    items = [("01", "Scenario", "Audience + outcome"), ("02", "Labs", "Build + checkpoint"),
             ("03", "Deck", "Story + demo"), ("04", "Video", "Explain + replay")]
    for j, (n, t, b) in enumerate(items):
        card(s, .65+j*3.05, 3.15, 2.86, n, t, b, [LIME,TEAL,CORAL,LIME][j], h=2.05)
    box(s, .7, 5.48, 12, .4, "Reasoning  +  code generation  +  visual / speech tools  +  bounded agents", 18, MUTED)
    ribbon(s, "Connected sources. Consistent terminology. Human release gate.")

    s = base(prs, 3)
    box(s, .65, 1.55, 12, 1.35, SLIDES[3]["title"], 40, CREAM, True)
    for j, (title, body) in enumerate([("GOAL", "What will I build?"), ("STEPS", "What do I do?"), ("CHECK", "Did it work?"), ("RECAP", "Why does it matter?")]):
        card(s, .65+j*3.05, 3.15, 2.86, f"0{j+1}", title, body, TEAL)
    pill(s, .7, 5.5, 3.65, "STARTER + SOLUTION + RESCUE", TEAL)
    ribbon(s, "The quality bar: runnable, not just readable.")

    s = base(prs, 4, True)
    box(s, .65, 1.55, 8.0, 1.4, SLIDES[4]["title"], 40, INK, True)
    box(s, .7, 3.35, 6.8, 1.8, "Create net-new stories.\nAdapt existing workshops.\nKeep the teaching flow aligned.", 27, INK)
    shape(s, MSO_SHAPE.ROUNDED_RECTANGLE, 8.25, 2.0, 4.1, 3.65, NAVY)
    pill(s, 8.58, 2.35, 2.9, "EDITABLE, NOT FLATTENED")
    box(s, 8.6, 3.15, 3.4, 1.8, "Story\nDemo cues\nLab handoffs", 27, CREAM, True)
    ribbon(s, "Change the depth, examples and pacing. Keep the sources reusable.", True)

    s = base(prs, 5)
    box(s, .65, 1.55, 12, 1.35, SLIDES[5]["title"], 43, CREAM, True)
    card(s, .65, 3.2, 5.85, "FOR STUDENTS", "Prepare. Replay. Revisit.", "Concepts, workflows and checkpoints.", TEAL, h=2.3)
    card(s, 6.8, 3.2, 5.85, "FOR FUTURE INSTRUCTORS", "Pick up the playbook.", "Pacing, demo cues, pitfalls and rescue points.", CORAL, h=2.3)
    ribbon(s, "Audience-specific narration + captions + transcripts. Not just a recording.")

    s = base(prs, 6)
    box(s, .65, 1.55, 12, 1.3, SLIDES[6]["title"], 39, CREAM, True)
    roles = [("BUILDER", "Own the package"), ("RESEARCHER", "Ground the facts"), ("PRODUCER", "Create the assets"), ("REVIEWER", "Challenge quality")]
    for j, (t, b) in enumerate(roles):
        card(s, .65+j*3.05, 3.12, 2.86, "AGENT / ROLE", t, b, size_color(j), h=1.95)
    box(s, .7, 5.34, 12, .35, "SKILLS / PLAYBOOKS", 12, LIME, True)
    box(s, .7, 5.76, 12, .4, "Resources   /   Design   /   Labs   /   Media   /   Verify", 24, CREAM)
    box(s, .7, 6.4, 12, .32, "Agents = who owns the work.   Skills = how good work gets done.", 19, MUTED)

    s = base(prs, 7, True)
    box(s, .65, 1.55, 12, 1.35, SLIDES[7]["title"], 43, INK, True)
    for j, (t,b) in enumerate([("Ground it", "Verify claims.\nProtect customer data."), ("Run it", "Execute labs.\nCheck the visuals."), ("Rehearse it", "Review as an instructor.\nApprove before release.")]):
        card(s, .65+j*4.08, 3.15, 3.86, f"GATE 0{j+1}", t, b, light=True, h=2.4)
    ribbon(s, "AI accelerates production. People remain accountable.", True)

    s = base(prs, 8)
    box(s, .65, 1.55, 12, 1.35, SLIDES[8]["title"], 43, CREAM, True)
    for j, (t,b) in enumerate([("Create faster", "Move from blank page\nto a structured first draft."), ("Share better", "Give other CSAs sources,\nnot just finished slides."), ("Customize lighter", "Adapt existing content.\nBuild net-new scenarios.")]):
        card(s, .65+j*4.08, 3.15, 3.86, ["RAPID CREATION", "CSA-TO-CSA REUSE", "LESS REWORK"][j], t, b, h=2.4)
    ribbon(s, "More capacity for customer context, facilitation and follow-through.")

    s = base(prs, 9, True)
    box(s, .65, 1.55, 12, 1.35, SLIDES[9]["title"], 43, INK, True)
    values = [("Clarity", "Easier to follow"), ("Structure", "Explain > try > check"), ("Continuity", "Useful leave-behinds"), ("Relevance", "Fit to their needs")]
    for j,(t,b) in enumerate(values):
        card(s, .65+j*3.05, 3.2, 2.86, f"0{j+1}", t, b, light=True, h=2.2)
    ribbon(s, "A learning experience they can revisit, repeat and share.", True)

    s = base(prs, 10)
    box(s, .65, 1.55, 12, 1.35, SLIDES[10]["title"], 42, CREAM, True)
    card(s, .65, 3.15, 5.85, "CHANGE THE BRIEF", "Make it their scenario.", "Audience / examples / environment / outcomes", CORAL, h=2.3)
    card(s, 6.8, 3.15, 5.85, "KEEP THE DISCIPLINE", "Reuse the studio.", "Structure / playbooks / review / source assets", TEAL, h=2.3)
    ribbon(s, "Adapt > revalidate > regenerate > share > learn. Every time.")

    s = base(prs, 11)
    box(s, .65, 1.55, 12, 2.1, SLIDES[11]["title"], 58, CREAM, True)
    box(s, .7, 4.1, 11.8, .85, "One scenario. One clear outcome.\nOne verified, reusable learning package.", 28, MUTED)
    pill(s, .7, 5.58, 5.3, "LET AI DO MORE OF THE BUSYWORK. KEEP THE CRAFT.")
    box(s, .7, 6.28, 11.8, .35, "Measure: prep effort  /  learner checkpoints  /  reuse feedback", 19, CREAM)

    assert sum(x["seconds"] for x in SLIDES) == 720
    target = BASE.save_safe(prs, ROOT / "AI-Powered-Workshop-Studio.pptx")
    manifest = {"deck": str(target), "talk_seconds": 720, "slides": SLIDES}
    (ROOT / "story.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Created {target} ({len(prs.slides)} editable slides, 12:00 talk)")


def size_color(j):
    return [LIME, TEAL, CORAL, LIME][j]


if __name__ == "__main__":
    build()
