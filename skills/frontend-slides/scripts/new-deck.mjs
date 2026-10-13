#!/usr/bin/env node
// new-deck: scaffold a single-file deck with the shared runtime inlined,
// or refresh the runtime inside an existing deck.
//
//   node scripts/new-deck.mjs talk.html --title "Quarterly review" --slides 8
//   node scripts/new-deck.mjs talk.html --theme path/to/theme.css
//   node scripts/new-deck.mjs --upgrade talk.html
//
// The agent then writes only the theme CSS and the <section class="slide">
// markup. Runtime blocks are marked with data-deck-runtime so --upgrade can
// swap them without touching anything the author wrote.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUNTIME = join(SKILL, 'runtime');

const usage = `Usage:
  node new-deck.mjs <out.html> [--title "Title"] [--slides N] [--theme name|file.css] [--lang en] [--force]
  node new-deck.mjs --upgrade <deck.html>`;

function parseArgs(argv) {
    const opts = { slides: 6, title: 'Untitled deck', lang: 'en', force: false, upgrade: false, _: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const next = () => {
            if (i + 1 >= argv.length) fail(`Missing value for ${a}`);
            return argv[++i];
        };
        if (a === '--title') opts.title = next();
        else if (a === '--slides') opts.slides = Math.max(1, parseInt(next(), 10) || 1);
        else if (a === '--theme') opts.theme = next();
        else if (a === '--lang') opts.lang = next();
        else if (a === '--force') opts.force = true;
        else if (a === '--upgrade') opts.upgrade = true;
        else if (a === '-h' || a === '--help') {
            console.log(usage);
            process.exit(0);
        } else if (a.startsWith('--')) fail(`Unknown option ${a}`);
        else opts._.push(a);
    }
    return opts;
}

function fail(msg) {
    console.error(msg + '\n\n' + usage);
    process.exit(1);
}

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function runtime() {
    const css = readFileSync(join(RUNTIME, 'deck.css'), 'utf8').trim();
    const js = readFileSync(join(RUNTIME, 'deck.js'), 'utf8').trim();
    if (/<\/script/i.test(js) || /<\/style/i.test(css)) throw new Error('runtime must not contain closing tags');
    const version = (js.match(/VERSION = '([^']+)'/) || [])[1] || 'dev';
    const banner = `frontend-slides runtime ${version}. Generated; refresh with: node scripts/new-deck.mjs --upgrade <deck.html>`;
    return {
        style: `<style data-deck-runtime>\n/* ${banner} */\n${css}\n</style>`,
        script: `<script data-deck-runtime>\n/* ${banner} */\n${js}\n</script>`,
    };
}

function themeCss(theme) {
    if (!theme) return STARTER_THEME;
    const asFile = resolve(theme);
    const named = join(SKILL, 'themes', theme, 'theme.css');
    const file = existsSync(asFile) ? asFile : existsSync(named) ? named : null;
    if (!file) fail(`Theme not found: ${theme} (looked for ${asFile} and ${named})`);
    return readFileSync(file, 'utf8').trim();
}

const STARTER_THEME = `/* ===== THEME =====
   Replace everything in this block with the deck's design system.
   Read reference/design-principles.md first. Everything is authored at
   the fixed 1920×1080 stage size, so use px, not vw/vh/clamp(). */
:root {
    --deck-backdrop: #111;
    --slide-bg: #f4f1ea;
    --ink: #161616;
    --muted: #5d5a54;
    --accent: #c2410c;
    --font-display: Georgia, serif;   /* replace with a real web font */
    --font-body: Georgia, serif;      /* replace with a real web font */
    --margin: 120px;
}

.slide {
    padding: var(--margin);
    color: var(--ink);
    font: 400 32px/1.4 var(--font-body);
}

.slide h1,
.slide h2 {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 400;
    line-height: 1.02;
    letter-spacing: -0.01em;
}

.slide h1 { font-size: 128px; }
.slide h2 { font-size: 72px; }`;

function skeleton({ title, slides, lang, theme }) {
    const { style, script } = runtime();
    const t = escapeHtml(title);
    const sections = [];
    for (let i = 0; i < slides; i++) {
        if (i === 0) {
            sections.push(`        <section class="slide" data-label="Title">
            <h1>${t}</h1>
            <aside class="notes">Speaker notes for this slide.</aside>
        </section>`);
        } else {
            sections.push(`        <section class="slide" data-label="Slide ${i + 1}">
            <!-- slide ${i + 1} -->
        </section>`);
        }
    }
    return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${t}</title>
    <!-- Fonts: add the Google Fonts / Fontshare <link> for this deck's typefaces here. -->
    ${style}
    <style data-deck-theme>
${themeCss(theme)}
    </style>
</head>
<body>
    <main class="deck">
      <div class="deck-stage">
${sections.join('\n\n')}
      </div>
    </main>
    ${script}
</body>
</html>
`;
}

function upgrade(file) {
    const html = readFileSync(file, 'utf8');
    const { style, script } = runtime();
    const styleRe = /<style data-deck-runtime>[\s\S]*?<\/style>/;
    const scriptRe = /<script data-deck-runtime>[\s\S]*?<\/script>/;
    if (!styleRe.test(html) || !scriptRe.test(html)) {
        fail(`${file} has no data-deck-runtime blocks. Only decks created with new-deck can be upgraded automatically.`);
    }
    writeFileSync(file, html.replace(styleRe, () => style).replace(scriptRe, () => script));
    console.log(`Upgraded runtime in ${file}`);
}

const opts = parseArgs(process.argv.slice(2));
const out = opts._[0];
if (!out) fail('Missing output file.');

if (opts.upgrade) {
    upgrade(out);
} else {
    if (existsSync(out) && !opts.force) fail(`${out} already exists. Use --force to overwrite or --upgrade to refresh its runtime.`);
    mkdirSync(dirname(resolve(out)), { recursive: true });
    writeFileSync(out, skeleton(opts));
    console.log(`Created ${out} with ${opts.slides} slide${opts.slides === 1 ? '' : 's'}.
Next: write the theme in <style data-deck-theme>, fill the <section class="slide"> elements,
then run: node ${join(SKILL, 'scripts', 'check-deck.mjs')} ${out}`);
}
