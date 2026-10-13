---
name: frontend-slides
description: Create well-designed HTML presentations that don't look AI-generated, from scratch or by converting PowerPoint files. Use when the user wants to build a presentation, convert a PPT/PPTX to web, improve an existing HTML deck, or create slides for a talk, pitch, report or lesson. Produces a single self-contained HTML file with presenter view, PDF export and in-browser editing.
---

# Frontend Slides

Build single-file HTML decks that look like a person with taste designed them for this talk. The runtime, layouts and checker are done; your job is the design decisions and the content.

## How this skill works

| Piece | What it does | You |
| --- | --- | --- |
| `scripts/new-deck.mjs` | Scaffolds a deck with the runtime and layout library inlined | Run it; never hand-write a slide controller |
| Runtime | Navigation, 1920×1080 stage scaling, builds, notes, presenter view, overview, edit mode, print, accessibility | Use its markup ([reference/runtime.md](reference/runtime.md)) |
| Layout library | 18 slide layouts on a 12-column grid, driven by tokens | Pick a layout per slide ([reference/layouts.md](reference/layouts.md)) |
| Theme | The deck's design system in `<style data-deck-theme>` | Write it from a visual brief |
| `scripts/check-deck.mjs` | Renders every slide, reports overflow, overlap, contrast, fonts, and design tells; writes screenshots | Run it, fix everything, look at the screenshots |

## Non-negotiables

1. **Fixed stage.** Every slide is a `<section class="slide">` in `.deck-stage`, authored in px at 1920×1080. No `vw`, `vh`, `clamp()` or breakpoints for slide content. The runtime scales the whole stage.
2. **Single file.** Inline CSS and JS; fonts from Google Fonts or Fontshare; images may sit in an `assets/` folder beside the file.
3. **Never edit** the `data-deck-runtime` or `data-deck-layouts` blocks. All deck CSS goes in `<style data-deck-theme>`. Refresh with `new-deck.mjs --upgrade`.
4. **Never style `.slide` visibility.** Don't set `display: none`, `visibility`, `opacity` or `position` on `.slide`; the runtime owns them. Grid and flex are fine.
5. **Visual brief first.** No CSS before the five-line brief ([reference/design-principles.md](reference/design-principles.md)).
6. **Checked before shown.** No deck or preview goes to the user until `check-deck` has no errors and you have looked at the screenshots.
7. **Nothing internal on a slide.** No "Option A", "Preview", "Template", style names, file names, or notes about the brief. Only real content and real chrome (title, section, date, author, page number, source).

## Workflow

### 0. Mode

- **New deck:** steps 1–7.
- **PowerPoint:** run `python scripts/extract-pptx.py <file.pptx> <out_dir>` (needs `pip install python-pptx`), show the user the extracted titles and image counts, then steps 2–7. Keep all text, images, order and notes (`<aside class="notes">`).
- **Existing HTML deck:** read it, then see [Changing an existing deck](#changing-an-existing-deck).

### 1. Discovery

Ask everything in one message (use a structured-question UI if there is one):

1. **Occasion and audience.** What is it for, who is in the room, what should they do afterwards?
2. **Length.** Roughly how many slides, or how many minutes.
3. **Content.** Ready, rough notes, or topic only? Ask them to share it, plus any images, logo, or brand rules.
4. **Density.** Speaker-led (big ideas, few words, the speaker carries the detail) or reading-first (self-contained slides for async reading)?
5. **Taste, optional.** Any decks, publications or brands they like, or anything to avoid.

Don't ask about editing, fonts or colours; those come from the previews. If they provided images, read [reference/images.md](reference/images.md), evaluate each image, and draft the outline around the usable ones. Confirm the outline before designing.

### 2. Visual briefs and previews

Read [reference/design-principles.md](reference/design-principles.md) and [reference/anti-ai-tells.md](reference/anti-ai-tells.md).

Write **three visual briefs from three different traditions** that each suit the occasion and audience (for a policy review, say: broadsheet newspaper, annual report, Swiss). Use [reference/typography.md](reference/typography.md) and [reference/color.md](reference/color.md) for type and palette. For conservative or high-stakes decks keep all three restrained; for expressive ones push at least one further. If the user named a style, one brief follows it.

[STYLE_PRESETS.md](STYLE_PRESETS.md) and [bold-template-pack/selection-index.json](bold-template-pack/selection-index.json) are optional starting points. If one fits a brief, read only that template's `preview.md`; translate it into a brief rather than copying it.

Build each preview as a real first slide plus one content slide from the user's material:

```bash
node scripts/new-deck.mjs .frontend-slides/previews/a.html --slides 2 --title "<deck title>"
node scripts/check-deck.mjs .frontend-slides/previews/a.html
```

Fix every error and design warning, look at the screenshots, then open the three previews for the user. In your message, name each direction in a few words (the tradition and what it feels like), and ask which one, or what to mix.

### 3. Build

Read [reference/layouts.md](reference/layouts.md), [reference/runtime.md](reference/runtime.md), [reference/writing.md](reference/writing.md) and, if anything moves, [reference/motion.md](reference/motion.md). If the user picked a bold template, read that template's `design.md` now (and no other); keep its fonts, palette and devices, and translate any viewport-fluid values to 1920×1080 px.

1. Scaffold: `node scripts/new-deck.mjs <name>.html --title "<title>" --slides <n>`.
2. Add the font `<link>` in `<head>`.
3. Write the theme: the visual brief as a comment, the tokens in `:root`, then the deck's device and any custom layouts. Comment it by section so people can find things.
4. Write each slide: choose the layout for its job, write an assertion heading, add `data-label`, real chrome, and `<aside class="notes">` for speaker-led decks.

Use the density mode throughout. Speaker-led: one idea per slide, more slides, large type. Reading-first: self-contained slides, tables, annotated figures, `l-dense` for appendices. If a slide overflows, split it; never shrink text below 20px.

### 4. Check

```bash
node scripts/check-deck.mjs <name>.html
```

Fix every error. Fix layout warnings unless they are deliberate, and mark those with `data-check="overlap-ok"` or `clip-ok`. The **Design** section lists AI tells (overused fonts, violet gradients, centred everything, icon-card grids, emoji, stock phrases and more); fix them or, if one is a deliberate part of the brief, mark the element `data-check="design-ok"`. `--strict` turns design warnings into errors.

### 5. Critique

Open `.deck-check/<name>/overview.png`, then the full-size screenshots of the title, two content slides and anything that looks off. Run the seven-point critique in [design-principles.md §5](reference/design-principles.md#5-critique-before-you-show-anything): squint, brief, template, hierarchy, copy, detail, lint. Fix what fails and check again. Do this at least once even when the checker is clean.

### 6. Deliver

1. Delete `.frontend-slides/previews/` and `.deck-check/`.
2. Open the deck (`open <name>.html` or the platform's equivalent).
3. Tell the user: where the file is, the direction, the slide count, and how to use it:
   - Arrows, Space or a clicker to move; `#/5` in the address opens slide 5.
   - **S** presenter view (notes, next slide, timer), **O** overview, **B** black screen, **?** all shortcuts.
   - **E** edit text in the browser, Cmd/Ctrl+S saves a copy.
   - Colours and fonts are tokens in `:root` in the theme block.

### 7. Share (offer, don't push)

Ask whether they want a live link, a PDF, both, or neither.

- **PDF:** `node scripts/export-pdf.mjs <deck.html> [out.pdf]`. One page per slide, all builds shown, text selectable. If an effect prints wrongly, add `--raster`. The first run may download Chromium.
- **Live link (Vercel):** `bash scripts/deploy.sh <deck.html or folder>`. Needs `npx vercel login` once; walk a first-time user through signing up at vercel.com. Deploy a folder when the deck has many assets, then open the URL and check every image loads. Redeploying updates the same URL.

## Changing an existing deck

- **Decks with the runtime** (`data-deck-runtime` blocks): edit the theme and slides; run `new-deck.mjs --upgrade <deck>` to pick up runtime fixes.
- **Older decks without it:** keep their controller unless the user wants runtime features. To migrate, scaffold a new deck, move the theme CSS into `<style data-deck-theme>` and the slides into `.deck-stage`, and drop the old controller.
- **Adding content:** check what the slide already holds first. If the addition won't fit the density mode, split into a new slide and tell the user.
- After any change, run steps 4 and 5 again.

## Supporting files

| File | Read when |
| --- | --- |
| [reference/design-principles.md](reference/design-principles.md) | Before any preview or deck: the visual brief, traditions, composition, critique |
| [reference/anti-ai-tells.md](reference/anti-ai-tells.md) | Before designing, and when the checker's Design section reports something |
| [reference/typography.md](reference/typography.md) | Writing a brief: pairings by tradition, scale, typographic detail |
| [reference/color.md](reference/color.md) | Writing a brief: palettes by tradition, contrast, charts |
| [reference/layouts.md](reference/layouts.md) | Building: the 18 layouts, their markup and tokens |
| [reference/writing.md](reference/writing.md) | Building: headings, copy, words to avoid |
| [reference/motion.md](reference/motion.md) | Only if something should move |
| [reference/runtime.md](reference/runtime.md) | Building: markup contract, keys, steps, notes, checker flags |
| [reference/images.md](reference/images.md) | Only with images |
| [STYLE_PRESETS.md](STYLE_PRESETS.md) | Optional: preset starting points for briefs |
| [bold-template-pack/selection-index.json](bold-template-pack/selection-index.json) | Optional: bold template metadata; then one `preview.md`, then one `design.md` after the user picks |
| [runtime/](runtime/) | Only when debugging the runtime or layout library |

Example decks: [runtime-tour.html](../../examples/runtime-tour.html) shows the runtime features; [layout-gallery.html](../../examples/layout-gallery.html) shows every layout in one design system.
