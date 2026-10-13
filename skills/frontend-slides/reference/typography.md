# Typography

Type carries most of a deck's personality. The fastest way to look generated is to use the font every generated page uses. Pick a pairing that belongs to the deck's tradition (see [design-principles.md](design-principles.md)), load it properly, and set it with care.

## Rules

- **Two faces.** One display face, one text face. A third only for numbers or code. Many good decks use one family in two weights.
- **Not the defaults.** Inter, Roboto, Poppins, Montserrat, Space Grotesk, Syne, Satoshi, Clash Display, Plus Jakarta Sans, Manrope, DM Sans, Sora, Outfit and Lexend are what every template and generator reaches for. `check-deck` flags them (`overused-font`). They are fine typefaces; they just say "default".
- **Load them.** Add the `<link>` in `<head>` and check that `check-deck` reports no `font-failed` and no `system-font` warning. A deck that silently falls back to Arial or Georgia has lost its design.
- **Weights you load are the weights you use.** Request only those, for example `wght@400;800`.
- **Never use a face for its mood alone.** Monospace does not make a deck technical; a script face does not make it warm.

## Pairings by tradition

Every family below is on Google Fonts unless marked *Fontshare*. Weights are suggestions.

| Tradition | Display | Text | Numbers / code |
| --- | --- | --- | --- |
| Swiss / International | Schibsted Grotesk 800, Hanken Grotesk 700, Instrument Sans 700, Familjen Grotesk 700, Archivo 800 | Same family 400 | Archivo Narrow for tables |
| Broadsheet newspaper | Libre Franklin 800 | Source Serif 4 400 | Libre Franklin 600 with tabular figures |
| Newspaper, older | Libre Caslon Display | Libre Caslon Text, Newsreader | |
| Magazine feature | Young Serif, Gloock, Bodoni Moda 700 (with `opsz`) | Literata, Spectral, Newsreader | |
| Literary / book | EB Garamond 500 | EB Garamond 400 | |
| Annual report | Public Sans 700, IBM Plex Sans 600 | Public Sans 400, IBM Plex Serif 400 | IBM Plex Mono |
| Museum wall text | Instrument Serif, Gloock | Instrument Sans 400 | |
| Technical drawing | Archivo Narrow 700, Barlow Condensed 600 | IBM Plex Sans 400 | IBM Plex Mono, Martian Mono, Azeret Mono |
| Transit signage | Overpass 800, Atkinson Hyperlegible 700 | Overpass 400, Atkinson Hyperlegible 400 | B612 Mono |
| Academic paper | STIX Two Text 700, Source Serif 4 700 | STIX Two Text 400, Source Serif 4 400 | Source Sans 3 for labels |
| Risograph zine | Rubik Mono One, Bowlby One SC, Anton | Courier Prime, Work Sans | |
| Japanese editorial | Shippori Mincho 700, Zen Kaku Gothic New 700 | Zen Kaku Gothic New 400 | |
| Bauhaus / Constructivist | Jost 700, League Spartan 800, Big Shoulders Display 800 | Jost 400 | |
| Contemporary editorial (*Fontshare*) | Gambetta, Zodiak, Erode, Boska, Tanker, Author | Sentient, Switzer, Supreme | |

Loading, Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@600;800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;1,8..60,400&display=swap" rel="stylesheet">
```

Fontshare:

```html
<link href="https://api.fontshare.com/v2/css?f[]=gambetta@500,700&f[]=switzer@400,600&display=swap" rel="stylesheet">
```

Then set the tokens:

```css
:root {
    --font-display: 'Libre Franklin', 'Helvetica Neue', sans-serif;
    --font-text: 'Source Serif 4', Georgia, serif;
    --fw-display: 800;
}
```

## Scale

Slides are authored at 1920×1080 in px. The layout library's defaults are a starting point; the tokens are `--fs-number` … `--fs-label` (see [layouts.md](layouts.md)).

| Role | Speaker-led | Reading-first |
| --- | --- | --- |
| Hero number | 280–400px | 200–280px |
| Title / statement | 120–180px | 88–120px |
| Slide heading | 72–104px | 56–72px |
| Lead | 40–48px | 32–40px |
| Body | 32–40px | 24–28px |
| Caption, source, label | 20–24px | 20px |

- **Contrast, not steps.** A heading at 1.3× the body looks timid. Jump: 3× and more between the hero element and its context.
- **Nothing below 20px.** `check-deck` reports `small-text` under 18px as a hard floor; aim higher. If it does not fit, split the slide.
- **Line length.** 45–75 characters for body text. Use the grid columns rather than a wide single column.
- **Leading.** Display 0.9–1.05, headings 1.05–1.15, body 1.35–1.5.
- **Tracking.** Tighten large display type (−0.01 to −0.03em). Add space to small caps labels (+0.06 to +0.12em). Leave body text alone.

## Detail

These separate a set deck from a typed one.

```css
h1, h2, .statement { text-wrap: balance; }      /* even line lengths in headings */
p, li { text-wrap: pretty; }                     /* no single-word last lines */
table, .value, .number { font-variant-numeric: tabular-nums lining-nums; }
.kicker, .label { text-transform: uppercase; letter-spacing: var(--track-label); }
blockquote { hanging-punctuation: first; }       /* Safari; also nudge with text-indent: -0.4em */
```

- Real quotation marks and apostrophes: “ ” ‘ ’, never " and '.
- En dash for ranges: 2019–2024, pages 4–9. Minus sign in figures: −3%.
- Non-breaking space between a number and its unit: `12&nbsp;km`, `£4.2&nbsp;m`.
- Italic from the font, never synthesised: load the `ital` axis if you use italics.
- Use real small caps (`font-variant-caps: all-small-caps`) only where the font has them; otherwise uppercase at a smaller size with tracking.
- Old-style figures (`onum`) suit serif text in literary or academic decks; lining figures suit tables and sans faces.
