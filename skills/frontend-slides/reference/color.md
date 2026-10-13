# Colour

A designed deck usually has fewer colours than a generated one. Start with three: a ground, an ink and one accent. Add a muted ink for secondary text and a rule colour for lines. That is the whole palette for most decks.

## Rules

- **Ground dominates.** It covers most of every slide. Make it a real colour choice (warm paper, cool grey, newsprint, black), not automatically `#fff`.
- **Ink is not pure black on pure white.** Slightly warm or cool both: `#121212` on `#f2efe6` reads as print; `#000` on `#fff` reads as a browser default. The exception is a tradition that wants maximum contrast (transit, Swiss poster).
- **One accent, used for one thing per slide.** The key number, the bar that matters, the current item in the agenda, the device. If the accent is everywhere it marks nothing. Aim for well under a tenth of the slide area.
- **A second accent only when the tradition has one.** Transit line colours, riso spot inks and Bauhaus primaries are systems; a "secondary brand colour" is not.
- **Tint the neutrals toward the ground.** Muted text and rules should share the ground's warmth or coolness: `#5a564d` on warm paper, `#5b6670` on cool grey.
- **Contrast.** Body and caption text at least 4.5:1 against what is behind it, large display text at least 3:1. `check-deck` reports `low-contrast`, including text over images. Muted ink on the ground is where this usually fails.
- **Colour changes meaning, so keep it stable.** If red means "the recommendation" on slide 4, it means that on slide 14 too.

`check-deck` flags indigo and violet gradients or accents (`ai-palette`), glow shadows and frosted glass. See [anti-ai-tells.md](anti-ai-tells.md).

## Palettes by tradition

Starting points. Adjust to the content and the brand; keep the structure.

| Tradition | Ground | Ink | Muted | Accent |
| --- | --- | --- | --- | --- |
| Swiss / International | `#f3f1ec` | `#111111` | `#5c5a55` | `#e2231a` signal red |
| Broadsheet newspaper | `#f2efe6` | `#121212` | `#5a564d` | `#b3261e` |
| Magazine feature, light | `#f6f0e6` | `#1b1712` | `#6b6155` | `#8a3b12` rust |
| Magazine feature, dark | `#14110f` | `#efe7da` | `#a89e90` | `#d9a441` ochre |
| Annual report | `#fbfaf7` | `#1d2a33` | `#66727a` | `#0f6e5c` deep green |
| Museum wall text | `#f7f6f2` | `#222222` | `#77736b` | none, or `#9b2c1f` for one mark |
| Transit signage | `#ffffff` | `#1a1a1a` | `#5e5e5e` | line colours: `#e2231a` `#0072ce` `#00985f` `#f6a800` |
| Technical drawing, blueprint | `#12355b` | `#e8eef5` | `#9fb3c8` | `#f2c14e` |
| Technical drawing, drafting paper | `#eef0ea` | `#1e2a32` | `#5f6b72` | `#d0441c` |
| Academic paper | `#ffffff` | `#1a1a1a` | `#5f5f5f` | `#8c1515` |
| Risograph zine | `#f4efe4` paper | spot ink, e.g. `#0078bf` blue | | `#ff48b0` fluorescent pink, `#ffe800` yellow |
| Japanese editorial | `#f5f2eb` | `#262421` | `#8a857c` | `#c8452c` vermilion |
| Bauhaus / Constructivist | `#efe9dc` | `#151515` | `#5b574f` | `#d52b1e` red, `#1d4e9e` blue, `#f2b705` yellow |

As tokens:

```css
:root {
    --deck-backdrop: #0e0e0e;
    --bg: #f2efe6;
    --ink: #121212;
    --muted: #5a564d;
    --accent: #b3261e;
    --rule: #121212;
}
```

## Changing the ground between slides

Most decks keep one ground. Switching to the ink colour for a few slides (sections, a key statement, the close) gives rhythm. Override the tokens on that slide, not every colour by hand:

```css
.slide.is-dark { --bg: #121212; --ink: #f2efe6; --muted: #a39e93; --rule: #f2efe6; }
```

Then check contrast again: an accent that works on paper is often too dark on black.

## Charts and diagrams

- Draw everything in the ink or muted colour first, then put the accent on the one series, bar or point the heading talks about.
- Label lines and bars directly; a legend makes the reader match colours.
- Use the ground colour for gaps and knockouts, not white.
- Sequential data: shades of one hue from the ground toward the ink. Diverging data: two hues meeting at the ground colour. Do not use a rainbow.
- Never rely on colour alone: pair it with position, a label or a pattern so it survives greyscale printing and colour-blind readers.

## Images

- Choose images for the palette, or bring them into it: a duotone (`filter: grayscale(1)` plus a `mix-blend-mode: multiply` layer in the accent), or plain greyscale for documentary images.
- Text over a photo needs a calm area of the image or a solid band behind it. Never a gradient scrim that looks like a hero banner.
- For riso decks, `mix-blend-mode: multiply` on overlapping ink layers gives real overprint.

## What not to do

- Indigo, violet, purple-to-blue gradients, teal-to-violet "AI" palettes.
- Neon accents with glow on near-black.
- Mesh gradients and blurred blobs as backgrounds.
- Five equally weighted pastels.
- A different accent colour on every slide.
