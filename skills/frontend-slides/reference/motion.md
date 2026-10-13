# Motion

A talk has a speaker. Motion should help them pace the story, not decorate the slide. Most slides in a well-designed deck simply appear. A few moments get a build or an entrance because the order of information matters.

`check-deck` flags decks where most slides animate (`motion-everywhere`).

## Decide first: does this moment need motion?

| Moment | Use |
| --- | --- |
| A list the speaker talks through one item at a time | `.step` on each item |
| A reveal: the question, then the answer | `.step` on the answer |
| A chart whose point is a change | `.step` on the highlighted series or annotation |
| The opening title or a key statement | One `data-animate` on the main element, or nothing |
| A section divider | Nothing, or a hard cut |
| Everything else | Nothing |

Builds (`.step`) are controlled by the speaker; entrances (`data-animate`) play by themselves. Prefer builds: they match the speaker's timing.

## Built-in primitives

The runtime gives you everything most decks need. See [runtime.md](runtime.md) for the contract.

```html
<ol class="items">
  <li class="step">Commuters who switched from the bus</li>
  <li class="step">Students on the new campus route</li>
  <li class="step" data-step="3">Night-shift workers</li>
</ol>

<p class="statement" data-animate="rise">Fund the eastern route.</p>
<p class="lead" data-animate="fade" style="--delay: 200ms">£6.1m over two years.</p>
```

- `data-animate`: `fade`, `rise`, `scale`, `wipe`. Change length with `--duration` (default 640ms) and stagger with `--delay`.
- `--deck-transition` on `:root` sets the cross-fade between slides (default 220ms). `0ms` gives hard cuts.
- `--deck-ease` sets the easing for transitions, steps and entrances.

All of these replay when a slide is revisited, respect `prefers-reduced-motion`, and print at their end state.

## Motion by tradition

Choose one vocabulary for the deck and keep it.

| Tradition | Slide change | Builds and entrances |
| --- | --- | --- |
| Swiss, technical drawing, transit | Hard cut (`--deck-transition: 0ms`) | Steps appear instantly; `wipe` along a line or rule |
| Broadsheet, annual report, academic | Short cross-fade (150–220ms) | `fade` only, short |
| Magazine feature, museum | Slower cross-fade (300–450ms) | `fade` or a slow `rise` on one element; images can `scale` from 0.97 |
| Riso, Bauhaus | Hard cut | `wipe` or `scale`, quick and graphic |
| Japanese editorial | Gentle fade (300ms) | Almost none |

## Timing

- Builds and entrances: 200–400ms for small elements, up to 700ms for one large element. Nothing over a second.
- Stagger: 60–120ms between items, and only for three or four items. Beyond that, show them together.
- Ease out (fast start, slow finish) for things entering. Never bounce or spring in a talk.
- Move short distances: 16–32px. Large slides across the frame look like a web page.

## Custom motion

When the deck needs something the primitives don't give, such as a line that draws itself or a counter, key it off `.slide.active` and keep the end state when animation is off:

```css
.route path {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
}
.slide.active .route path {
    animation: draw 1200ms var(--deck-ease) 200ms both;
}
@keyframes draw { to { stroke-dashoffset: 0; } }
```

(`pathLength="1"` on the `<path>` makes the dash values work for any length.)

- Animate only `transform`, `opacity`, `clip-path` and SVG stroke properties.
- Use `animation-fill-mode: both` so print, PDF and overview show the finished state.
- For something tied to a press, use a `.step` and style `.step-visible` instead of a timer.

## Do not use

Particles, custom cursors, parallax and 3D tilt, magnetic buttons, typewriter or scramble text, glitch effects, infinite looping motion behind content, blur-in on every element, and anything that animates on hover. They are landing-page habits and read as generated. See [anti-ai-tells.md](anti-ai-tells.md).

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Animation doesn't play | Key it off `.slide.active`, or use `data-animate` |
| Animation doesn't replay on revisit | Use `data-animate` (the runtime restarts it), or a transition keyed off `.slide.active` instead of a one-shot keyframe |
| Element missing in PDF or overview | Add `animation-fill-mode: both` so the end state applies when animations are skipped |
| Steps appear in the wrong order | Steps run in DOM order; use `data-step="n"` to group or reorder |
| Choppy motion | Animate only `transform` and `opacity`; avoid animating `filter: blur()` and layout properties |
