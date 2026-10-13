# Writing

Generated copy is easy to spot: abstract nouns, borrowed enthusiasm, three adjectives where one fact would do. Good slide copy is short, specific and in the speaker's own voice. The user's words come first; when you write or edit, follow these rules.

## Headings are assertions

A heading states the slide's point, so that reading only the headings tells the story.

| Topic label | Assertion |
| --- | --- |
| Overview | Riverside rode more bikes than buses this year |
| Key results | Sign-ups tripled after the share scheme opened in May |
| Challenges | Two junctions cause half of the reported near misses |
| Our solution | Separated lanes on the eastern route, funded over two years |
| Next steps | We need a decision on the eastern route by March |

Title, section and closing slides can be shorter, but they still say something.

## Be specific

- **Numbers over adjectives.** "Trips rose 45%" beats "significant growth".
- **Names over categories.** "Night nurses at Riverside General" beats "key workers".
- **Concrete verbs.** Say what happens: "cuts the commute to 18 minutes", not "transforms the commute experience".
- **Context for every number.** Compared to what, since when, according to whom. Put the source in `.source`.

## Short

- Slide headings: one or two lines, roughly 4–12 words.
- Body text on speaker-led slides: phrases, not paragraphs. The detail goes in `<aside class="notes">`.
- Lists: as many items as there really are. Three is not a rule.
- One idea per slide. If you need "and" in the heading, consider two slides.

## Voice

- Sentence case for headings and labels, unless the tradition uses capitals.
- Active voice, first person where the speaker is the subject: "We tested three routes".
- No exclamation marks, no rhetorical questions as headings, no "X: The Y of Z" titles.
- Match the audience. A board deck and a community meeting about the same project use different words.

## Words that mark copy as generated

`check-deck` flags these (`ai-copy`): unlock, unleash, revolutionise, seamless, game-changing, cutting-edge, next-level, elevate, empower, supercharge, harness the power, in today's (fast-paced) world, delve, transformative, synergy, tapestry, testament to, ever-evolving, the landscape of, dive deep, best-in-class, world-class, robust, navigate the.

Also avoid, though the lint does not catch them: journey, ecosystem, leverage, holistic, innovative, solutions, at scale, reimagine, "not just X, but Y", "it's not about X, it's about Y", and sentences that end on a list of three abstract nouns.

## Punctuation

- Em dashes: at most one in a deck (`em-dashes` lint). Use a full stop, comma or colon.
- Curly quotes and apostrophes, en dashes in ranges, minus signs in negative numbers. See [typography.md](typography.md).
- No full stop at the end of a heading. Use them in body sentences consistently.

## Never put on a slide

- Internal labels: "Option A", "Preview", "Template", "Wildcard", style or file names.
- Placeholder text left from the scaffold.
- Invented facts, quotes or statistics. If the user did not give a number, ask, or write the slide without it and say so.

## Speaker notes

Notes are for the speaker, so write them as things to say, in full sentences, with the detail the slide leaves out. Include any number the speaker must not get wrong.
