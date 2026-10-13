# Deck runtime

Every deck uses the shared runtime in `runtime/deck.css` and `runtime/deck.js`. You never write a slide controller, stage scaler, or editing code. `scripts/new-deck.mjs` inlines the runtime into the deck file, so the output is still one self-contained HTML file with no dependencies.

## Workflow

```bash
# 1. Scaffold (from the skill directory, or give the full path to the script)
node scripts/new-deck.mjs talk.html --title "Field notes from the pilot" --slides 12

# 2. Write the theme inside <style data-deck-theme> and the slide markup.

# 3. Check: overflow, overlap, clipping, contrast, phone scaling, screenshots
node scripts/check-deck.mjs talk.html

# 4. Look at .deck-check/talk/overview.png and any slide with issues. Fix. Repeat 3–4.
```

Never edit the `<style data-deck-runtime>` or `<script data-deck-runtime>` blocks. To move a deck to a newer runtime: `node scripts/new-deck.mjs --upgrade talk.html`.

## Markup contract

```html
<main class="deck">
  <div class="deck-stage">
    <section class="slide" data-label="Title">
      <h1>…</h1>
      <aside class="notes">What to say on this slide.</aside>
    </section>
    <section class="slide" data-label="Three findings">
      <ol>
        <li class="step">First, on press 1</li>
        <li class="step">Second, on press 2</li>
      </ol>
    </section>
  </div>
</main>
```

| Piece | Rule |
| --- | --- |
| `.deck` | One per file. Optional `data-width` / `data-height` (default 1920×1080), `data-ui="none"` hides the counter, `data-progress="off"` hides the progress line, `data-wheel="off"` disables wheel navigation. |
| `.deck-stage` | Holds the slides. Always 1920×1080; the runtime scales it as one frame. |
| `.slide` | Direct child of `.deck-stage`. Lay out content in px at 1920×1080. Do not set `position`, `visibility`, `opacity` or `display: none` on `.slide` itself; the runtime owns those. Set `display: grid` or `flex` freely. |
| `data-label` | Short name used in the overview, the presenter view and screen-reader announcements. Falls back to the first heading. |
| `.notes` | Speaker notes. Never shown on the slide; shown in the presenter view. Any HTML. |
| `.step` | Appears one press at a time, in DOM order. `data-step="3"` puts an element on press 3; equal numbers appear together. |
| `data-animate` | `fade`, `rise`, `scale` or `wipe`. Plays each time the slide opens. Stagger with `style="--delay: 120ms"`, change length with `--duration`. |
| `data-check` | `off`, `overlap-ok` or `clip-ok` silences check-deck for a deliberate exception. Use sparingly. |

Hidden slides are `inert` and `aria-hidden`, so links and buttons on them cannot be tabbed into.

## Styling hooks

Set these in the theme's `:root`:

| Variable | Default | Use |
| --- | --- | --- |
| `--slide-bg` | `#fff` | Default slide background |
| `--deck-backdrop` | `#0d0d0d` | Letterbox colour around the stage |
| `--deck-transition` | `220ms` | Cross-fade between slides. `0ms` for hard cuts |
| `--deck-ease` | soft ease-out | Easing for transitions and `data-animate` |
| `--deck-ui-fg`, `--deck-ui-bg`, `--deck-ui-accent`, `--deck-ui-font` | neutral | Counter, progress line, help panel, overview highlight |

State classes you can style against: `.slide.active` (the current slide), `.step.step-visible`, `.deck.is-overview`, `.deck.is-editing`, `.deck.is-print`.

Custom entrance animations should be keyed off `.slide.active` and use `animation-fill-mode: both`, so print and PDF show their end state.

## Keyboard

| Key | Action |
| --- | --- |
| → ↓ Space PgDn N Enter | Next step, then next slide |
| ← ↑ PgUp Backspace Shift+Space | Previous step or slide |
| Home / End | First / last slide |
| digits then Enter | Go to that slide |
| O | Overview grid; arrows and Enter pick a slide |
| S | Presenter view in a new window: current and next slide, notes, timer, clock. Both windows stay in sync |
| F | Fullscreen |
| B or . | Black screen (clickers often send these) |
| E | Edit text in place. Cmd/Ctrl+S downloads the edited file. Esc finishes |
| ? | Shortcut help |

Touch: swipe left/right, or tap the left third of the screen to go back and anywhere else to go on. Taps on links, buttons, media and form fields work normally; add `data-no-tap` to anything else that needs taps.

## Links

`#/7` opens slide 7, `#/7/2` opens slide 7 with two build steps shown. The address updates as you navigate, so a copied URL lands on the same slide.

## JavaScript API

Only needed for interactive slides (a live demo, a chart that animates on entry).

```js
deck.index; deck.step; deck.total;          // read state (0-based index)
deck.goTo(4); deck.next(); deck.prev();
deck.on('deck:change', ({ index, previousIndex, step, slide, reason }) => { … });
document.addEventListener('deck:change', (e) => e.detail.index);
```

Also available: `deck.toggleOverview()`, `deck.toggleEdit(on)`, `deck.openPresenter()`, `deck.setPrintMode(on)`, `deck.serialize()` (the clean document as authored), `deck.stepsOf(i)`.

## Print and PDF

`node scripts/export-pdf.mjs talk.html` writes one page per slide with every step revealed and every animation finished. Text stays selectable. Use `--raster` if a deck depends on effects print engines render differently (`backdrop-filter`, blend modes). Browser Print → Save as PDF gives the same result.

## What check-deck reports

| Type | Severity | Meaning |
| --- | --- | --- |
| `text-outside-slide` | error | Text runs past the slide edge |
| `text-escapes-box` | error | Text spills out of the card or panel that contains it |
| `clipped-content` | error | An `overflow: hidden` box is cutting content off |
| `text-overlap` | error | Two pieces of text overlap |
| `low-contrast` | error below 3:1, warning below WCAG AA | Text is hard to read on its background |
| `small-text` | warning | Under 18px at 1920×1080 |
| `broken-image` | error | Image failed to load |
| `empty-slide` | warning | Nothing visible on the slide |
| `console-error` | error | A script error on load |
| `phone-scaling` | error | On a phone the stage does not stay one 16:9 frame |
| `font-failed` | warning | A web font did not load, so a fallback is showing |
| `no-runtime` | warning | The deck does not use the shared runtime |

`--json` gives the same report for scripts. Exit code is 1 when there are errors. Every slide is checked with all steps revealed. Screenshots go to `.deck-check/<deck>/` next to the deck: `overview.png` shows every slide at once; `slide-NN.png` shows each one at full size. Delete that folder before delivering if the user does not want it.
