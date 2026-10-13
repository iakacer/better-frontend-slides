# Design principles

The goal: a deck that looks like a specific person with taste designed it for this talk. A generated deck looks like the average of every slide on the internet. The fix is not more decoration. It is a point of view, applied consistently.

Read this before designing any preview or deck. Then read [anti-ai-tells.md](anti-ai-tells.md) for what to avoid, and use [layouts.md](layouts.md), [typography.md](typography.md), [color.md](color.md), [motion.md](motion.md) and [writing.md](writing.md) as you build.

## 1. Write a visual brief first

Before any CSS, write five lines. Put them in a comment at the top of `<style data-deck-theme>`, and keep every later decision consistent with them.

```css
/* ===== VISUAL BRIEF =====
   Tradition:  Swiss International Style, 1960s exhibition posters
   Grid:       12 columns, 112px margins, 40px gutters; headings hang from column 1
   Type:       Schibsted Grotesk 800 for display, Source Serif 4 for text
   Palette:    warm white #f3f1ec, ink #111, signal red #e2231a (accent only)
   Device:     a thick red rule that marks the one thing to remember per slide */
```

**Tradition.** Name a real design lineage that suits the content and audience, and borrow its actual rules: its type, its grid, how it uses colour, how it treats images. Some starting points:

| Tradition | Borrow | Good for |
| --- | --- | --- |
| Swiss / International Style | Strict grid, flush-left grotesque, asymmetric white space, one signal colour | Strategy, research, engineering |
| Broadsheet newspaper | Heavy headline grotesque, serif body, hairline column rules, folio lines | Reports, reviews, policy, data stories |
| Magazine feature | Big serif display, dramatic scale contrast, pull quotes, full-bleed photos | Storytelling, brand, culture |
| Annual report | Calm sans, generous margins, big numbers with footnotes, muted palette | Finance, board, investor updates |
| Museum wall text | Small precise labels, lots of air, object first, one serif | Portfolios, case studies, design reviews |
| Transit signage | Bold legible sans, colour coding, arrows, pictograms, high contrast | Roadmaps, onboarding, processes |
| Technical drawing | Monospace labels, thin lines, dimension marks, blueprint or drafting paper | Architecture, systems, infrastructure |
| Academic paper | Serif text, numbered sections, figure captions, footnotes, restraint | Research talks, methods, reviews |
| Risograph zine | Two or three spot inks, overprint, misregistration, chunky type | Community, culture, informal talks |
| Japanese editorial | Precise grid, vertical rhythm, restrained colour, mixed scripts, big margins | Product, craft, calm launches |
| Bauhaus / Constructivist | Geometric sans, primary colours, diagonals, bold blocks | Manifestos, launches, bold pitches |

Pick one. Mixing two traditions reads as indecision.

**Grid.** Declare columns, margins and gutters, and actually align to them. The layout library uses 12 columns with `--m` margins and `--gutter` gutters; change the tokens, not the idea.

**Type.** One display face and one text face, at most a third for numbers or code. See [typography.md](typography.md).

**Palette.** A ground, an ink, and one accent. A second accent only if the tradition calls for it (riso, transit). See [color.md](color.md).

**Device.** One recurring graphic idea that belongs to this deck: a rule, a corner mark, a numbering style, a crop, a texture. Use it on most slides. This is what makes a deck recognisable.

## 2. Composition

- **Align to an edge, not the centre.** Flush-left headings that hang from a grid line read as designed. Centred text on every slide reads as a template. Centre one or two moments (a quote, the closing line) at most.
- **Use the whole frame.** Anchor content to the top or bottom of the body, not floating in the middle. Leave large, deliberate empty areas instead of spreading things evenly.
- **Contrast of scale.** Make the important thing much bigger than everything else: 300px number, 23px caption. Timid steps (48px heading, 36px body) look flat.
- **Vary layout by job.** Every slide has one job (state, show, compare, list, quote). Pick the layout for the job from [layouts.md](layouts.md). The same layout four times in a row is a warning sign.
- **Fewer boxes.** Separate content with whitespace and rules before reaching for cards. If you need a panel, make it flat and square-ish, not a floating rounded card with a shadow.
- **Real chrome.** A running head, folio and source line make a deck feel published. Fill them with real information: section, date, author, source.

## 3. Content shapes the design

- **Headlines are assertions.** "Ridership grew 45% after the bridge opened" beats "Ridership". See [writing.md](writing.md).
- **Show the number.** If a slide makes a quantitative claim, give the number big and the context small.
- **Charts are designed too.** Label directly instead of using legends, highlight the one bar that matters in the accent colour, drop gridlines you don't need, write the takeaway as the heading.
- **Images get full commitment.** Crop boldly, bleed to the edge, or don't use them. A small stock photo in a rounded rectangle is worse than none.

## 4. Density

Respect the density mode from discovery:

- **Speaker-led:** one idea per slide, very large type, short phrases, many slides. The speaker carries the detail; notes go in `<aside class="notes">`.
- **Reading-first:** self-contained slides, tables, annotated charts, captions, `l-dense` for appendices. Still one point per slide, stated in the heading.

If a slide overflows, split it. Never shrink text below 20px to make it fit.

## 5. Critique before you show anything

After `check-deck` passes, open `overview.png` and a few full-size slides and answer these honestly. Fix what fails, then look again.

1. **Squint test.** In the overview, can you tell the slides apart by shape alone? Is there rhythm (big moments, quiet moments)?
2. **Brief test.** Does every slide follow the visual brief: same grid edges, same type pairing, same palette, the device present?
3. **Template test.** Would this deck look at home as a SaaS landing page? If yes, it is generic. Push toward the tradition.
4. **Hierarchy test.** On each slide, is there exactly one thing you see first? Is it the right thing?
5. **Copy test.** Read only the headings in order. Do they tell the story? Any stock phrases (see [writing.md](writing.md))?
6. **Detail test.** Real quotation marks and apostrophes, en dashes in ranges, non-breaking spaces before units, tabular figures in tables, no orphaned single words in headings, nothing touching the frame edge by accident.
7. **Lint.** The design section of `check-deck` is clean, or every remaining warning is a deliberate choice marked with `data-check="design-ok"`.
