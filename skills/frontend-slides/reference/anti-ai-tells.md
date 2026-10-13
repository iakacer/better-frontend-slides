# Anti-AI tells

These are the habits that make a slide read as generated. Most come from defaults: the first font, colour and layout a model or UI kit reaches for. Each has a better move. Items marked **lint** are flagged by `check-deck`'s design section. The rest you have to catch yourself in the critique step.

## Type

| Tell | Instead | |
| --- | --- | --- |
| Inter, Roboto, Poppins, Montserrat, Space Grotesk, Syne, Clash Display, Satoshi, Outfit, Plus Jakarta Sans, Manrope, DM Sans, Sora, Lexend… | A pairing from [typography.md](typography.md) chosen for the deck's tradition | **lint** `overused-font` |
| System fonts (Arial, Helvetica, Segoe, Georgia) because nothing was loaded | Load the web fonts named in the visual brief | **lint** `system-font` |
| Gradient-filled headline text | Solid ink; emphasis through size, weight or the accent colour on one word | **lint** `gradient-text` |
| Everything bold, or every heading the same size | Clear scale contrast: one huge thing, everything else much smaller | |
| Title Case On Every Heading | Sentence case, unless the tradition calls for caps | |
| Monospace used to mean "technical" on non-technical decks | Monospace only for code, data or a technical-drawing tradition | |

## Colour and surface

| Tell | Instead | |
| --- | --- | --- |
| Indigo/violet/purple gradients, `#6366f1` and friends, purple-to-blue on dark | Palette from the tradition: one ground, one ink, one accent ([color.md](color.md)) | **lint** `ai-palette` |
| Neon on near-black "tech" look | A real ground colour, or black with one disciplined accent | |
| Glassmorphism: frosted panels with `backdrop-filter: blur` | Flat panels or no panels; separate with rules and space | **lint** `glassmorphism` |
| Coloured glow shadows | No glow; contrast does the work | **lint** `glow` |
| Rounded cards with soft drop shadows everywhere | Grid, rules and whitespace; square or slightly rounded flat panels if needed | **lint** `soft-cards` |
| Blurry gradient blobs or mesh gradients as background | A flat ground, a print texture from the tradition, or a real image | |
| Evenly spread pastel palette, five colours of equal weight | One dominant ground, one accent used sparingly | |

## Layout

| Tell | Instead | |
| --- | --- | --- |
| Everything centred | Flush-left on a grid; centre at most one or two moments | **lint** `centered-layouts` |
| Three equal cards: icon, heading, one line | A list, a comparison with real numbers, or one statement ([layouts.md](layouts.md)) | **lint** `icon-card-grid` |
| Rounded pill badge above every title ("✨ New", "Feature") | A plain kicker in small caps, or nothing | **lint** `pill-eyebrow` |
| Same layout on slide after slide | Pick the layout for each slide's job | **lint** `repetitive-layout` |
| Hero number with a tiny label and nothing else | The number plus context: compared to what, since when, source | |
| Content floating in the middle of empty space | Anchor to the top or bottom of the grid; make empty space deliberate | |
| Decorative abstract 3D shapes, orbs, isometric illustrations | Real images, data, diagrams, or pure typography | |

## Icons and imagery

| Tell | Instead | |
| --- | --- | --- |
| Emoji as bullets or icons (🚀 ✨ 💡 ✅) | Numbers, rules, a single accent mark, or nothing | **lint** `emoji` |
| Generic line-icon sets on every item | Only icons that carry information (a pictogram system in a transit deck, say) | |
| Stock photos of handshakes and laptops | The user's real images, or none | |

## Motion

| Tell | Instead | |
| --- | --- | --- |
| Every element fades up with the same stagger on every slide | Most slides simply appear; animate the few moments that need it ([motion.md](motion.md)) | **lint** `motion-everywhere` |
| Particles, custom cursors, magnetic buttons, parallax tilt | Nothing; this is a talk, not a landing page | |
| Typewriter or scramble text effects | Plain text, or one build step | |

## Words

| Tell | Instead | |
| --- | --- | --- |
| "Unlock", "unleash", "seamless", "revolutionise", "game-changing", "cutting-edge", "elevate", "empower", "supercharge", "harness the power", "in today's fast-paced world", "delve", "transformative", "synergy", "robust", "ever-evolving landscape", "testament to", "tapestry" | Say what actually happens, with a number or a name ([writing.md](writing.md)) | **lint** `ai-copy` |
| Em dashes everywhere | Full stops, commas and colons; one em dash per deck at most | **lint** `em-dashes` |
| Topic labels as headings ("Overview", "Key Benefits") | An assertion: "Support tickets fell by a third after the redesign" | |
| Rule-of-three lists by default | As many items as there really are | |
| "X: The Y of Z" titles, rhetorical questions, exclamation marks | A plain, specific title | |

## Process tells

- Showing internal labels on a slide: "Option A", "Preview", "Template", "Wildcard", style names, file names.
- A deck where the user's real content has been replaced by generic filler.
- Identical decks for different occasions. If two briefs produced the same look, the brief step was skipped.

When a lint warning is a deliberate choice (a pill shape that is the deck's signature device, say), mark the element or slide with `data-check="design-ok"` and keep going.
