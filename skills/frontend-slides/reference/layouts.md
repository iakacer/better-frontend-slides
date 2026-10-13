# Layouts

`runtime/layouts.css` is inlined into every deck by `new-deck`. It gives you 18 layouts on a 12-column grid. Add the layout class to the slide and use the documented child classes. Themes set the tokens and restyle anything; layout rules have zero specificity, so any theme rule wins.

See every layout rendered in [examples/layout-gallery.html](../../../examples/layout-gallery.html).

## Anatomy

```html
<section class="slide l-split" data-label="Kerbs, not paint">
  <header class="runhead"><span>Section name</span><span>Deck or date</span></header>
  <div class="body">
    … layout children …
  </div>
  <footer class="foot"><span class="source">Source: …</span><span class="folio">8</span></footer>
  <aside class="notes">Speaker notes.</aside>
</section>
```

`.runhead`, `.foot` and `.notes` are optional. `.body` fills the space between them and is the 12-column grid. Children of `.body` span the full width unless the layout places them.

Shared parts: `.kicker` (small label above a heading), `.lead` (larger muted paragraph), `.caption`, `.source`, `.folio`, `.value` (a big figure), `.accent` (accent colour), `.rule` (top rule).

## Choosing a layout

| Slide's job | Layout |
| --- | --- |
| Open the deck | `l-title` |
| Start a part | `l-section` |
| Make one point land | `l-statement` |
| Explain with a heading and supporting text | `l-split` |
| Several findings or steps in order | `l-list` |
| Show a chart or diagram | `l-figure` |
| One number that matters | `l-number` |
| Two to four options side by side | `l-compare` |
| Four to six parallel items | `l-grid` |
| Someone else's words | `l-quote` |
| Picture and text | `l-media` |
| Picture as the whole slide | `l-bleed` |
| Dates | `l-timeline` |
| A method or sequence | `l-process` |
| Numbers in rows and columns | `l-table` |
| What's coming | `l-agenda` |
| Appendix, method notes, handout text | `l-dense` |
| End | `l-closing` |

A good deck uses many of these. If four slides in a row use the same one, rethink the middle ones.

## Reference

Markup shows only `.body` content.

**`l-title`**: title bottom-left, large.
```html
<span class="kicker">Annual review</span>
<h1>Riverside rode more bikes than buses this year</h1>
<p class="lead">What changed, who it reached, what to fund next.</p>
```

**`l-section`**: huge section number, section name beside it.
```html
<span class="num">02</span>
<h2>Where the lanes went</h2>
```

**`l-statement`**: one sentence across ten columns, optional aside.
```html
<p class="statement">Most of the growth came from people who did not own a bike a year ago.</p>
<p class="aside">Share sign-ups tripled after May.</p>
```

**`l-split`**: heading column (4) and content column (7). Add `is-even` for 6/6.
```html
<div class="side"><h2>Kerbs, not paint</h2><p class="lead">Every new metre is separated.</p></div>
<div class="main"><p>…</p></div>
```

**`l-list`**: heading column and numbered rows with rules. Add `class="step"` to rows to build them.
```html
<div class="side"><h2>Three groups drove the growth</h2></div>
<ol class="items main"><li>…</li><li>…</li><li>…</li></ol>
```

**`l-figure`**: takeaway column (3) and figure (8).
```html
<div class="side"><h2>The bridge changed the curve</h2><p class="caption">Monthly trips, thousands</p></div>
<figure><svg>…</svg><figcaption>Source: …</figcaption></figure>
```

**`l-number`**: a very large figure with context to its right.
```html
<p class="number">4.2m</p>
<div class="context"><h3>bike trips logged</h3><p class="caption">Up from 2.9m.</p></div>
```

**`l-compare`**: heading on top, columns anchored at the bottom. Mark the recommended column `is-key`.
```html
<h2>What the same money buys</h2>
<div class="cols">
  <div><p class="value">11 km</p><h3>Protected lanes</h3><p class="caption">…</p></div>
  <div class="is-key">…</div>
  <div>…</div>
</div>
```

**`l-grid`**: heading on top, items anchored at the bottom, three per row (`style="--grid-cols: 2"` for two).
```html
<h2>Six proposals</h2>
<div class="items"><div><h3>Eastern route</h3><p>…</p></div>…</div>
```

**`l-quote`**
```html
<blockquote>I used to wait forty minutes for the first bus.</blockquote>
<p class="cite">Night nurse, Riverside General</p>
```

**`l-media`**: image left (7 columns, full height), text right. Add `is-right` to swap.
```html
<div class="media"><img src="assets/route.jpg" alt="…"></div>
<div class="text"><h2>Eleven kilometres of protected lane</h2><p>…</p></div>
```

**`l-bleed`**: the image fills the slide; `.media` is a direct child of the slide, not of `.body`. Text sits bottom-left in `--on-media`. Make sure the image is dark or light enough behind the text.
```html
<section class="slide l-bleed">
  <div class="media"><img src="…" alt="…"></div>
  <div class="body"><h2>One line, south to station</h2></div>
</section>
```

**`l-timeline`**: dated points on a line; mark the key one `is-key`.
```html
<h2>The next eighteen months</h2>
<ol class="timeline"><li><span class="when">Jan</span><p>Consult</p></li>…</ol>
```

**`l-process`**: numbered steps in a row.
```html
<h2>How a street gets chosen</h2>
<ol class="steps"><li><h3>Count</h3><p>…</p></li>…</ol>
```

**`l-table`**: heading column (3) and table (8). Add `is-full` for a full-width table. Use `class="num"` on numeric cells.
```html
<div class="side"><h2>Where the money went</h2></div>
<table class="main">…</table>
```

**`l-agenda`**: mark the current part `is-current`.
```html
<div class="side"><h2>In this review</h2></div>
<ol class="items main"><li class="is-current">The year in numbers <span class="when">3 min</span></li>…</ol>
```

**`l-dense`**: reading text in three columns (`style="--text-cols: 2"` for two).
```html
<h2>How the figures were produced</h2>
<div class="columns"><h3>Counters</h3><p>…</p>…</div>
```

**`l-closing`**
```html
<p class="statement">Fund the eastern route.</p>
<p class="lead">Questions: transport@example.org</p>
```

## Tokens

Set in the theme's `:root`. Defaults are in `runtime/layouts.css`.

| Group | Tokens |
| --- | --- |
| Colour | `--bg` `--ink` `--muted` `--accent` `--rule` `--on-media` |
| Fonts | `--font-display` `--font-text` `--font-mono` |
| Weights | `--fw-display` `--fw-head` `--fw-text` `--fw-strong` |
| Grid | `--cols` `--m` `--m-top` `--m-bottom` `--gutter` `--row-gap` |
| Type scale | `--fs-number` `--fs-display` `--fs-h1` `--fs-h2` `--fs-h3` `--fs-lead` `--fs-body` `--fs-small` `--fs-label` `--fs-agenda` |
| Leading | `--lh-tight` `--lh-head` `--lh-body`, plus `--track-label` for small caps labels |

A slide can override tokens locally, for example a dark closing slide: `.l-closing { --bg: #111; --ink: #f3f1ec; --muted: #b9b4a8; --rule: #f3f1ec; }`.

## Custom layouts

The library is a starting point, not a cage. When a slide needs something else (a diagram, a map, a full-slide typographic composition), write it in the theme. Keep it on the same grid and margins so it still belongs to the deck. Use `--no-layouts` with `new-deck` only when the deck's tradition has nothing in common with a column grid.
