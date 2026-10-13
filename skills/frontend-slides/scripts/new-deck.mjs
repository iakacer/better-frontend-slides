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
  node new-deck.mjs <out.html> [--title "Title"] [--slides N] [--theme name|file.css] [--lang en] [--no-layouts] [--force]
  node new-deck.mjs --upgrade <deck.html>`;

function parseArgs(argv) {
    const opts = { slides: 6, title: 'Untitled deck', lang: 'en', force: false, upgrade: false, layouts: true, _: [] };
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
        else if (a === '--no-layouts') opts.layouts = false;
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
    const layouts = readFileSync(join(RUNTIME, 'layouts.css'), 'utf8').trim();
    const js = readFileSync(join(RUNTIME, 'deck.js'), 'utf8').trim();
    if (/<\/script/i.test(js) || /<\/style/i.test(css + layouts)) throw new Error('runtime must not contain closing tags');
    const version = (js.match(/VERSION = '([^']+)'/) || [])[1] || 'dev';
    const banner = `frontend-slides runtime ${version}. Generated; refresh with: node scripts/new-deck.mjs --upgrade <deck.html>`;
    return {
        style: `<style data-deck-runtime>\n/* ${banner} */\n${css}\n</style>`,
        layouts: `<style data-deck-layouts>\n/* ${banner} */\n${layouts}\n</style>`,
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
   Replace this block with the deck's design system. Start from the visual
   brief (reference/design-principles.md): one tradition, one grid, one type
   pairing, one palette, one signature device. The layout library reads the
   tokens below; restyle anything else with ordinary rules. Everything is
   authored at the fixed 1920×1080 stage, so use px, not vw/vh/clamp(). */
:root {
    --deck-backdrop: #111;
    --bg: #f4f1ea;
    --ink: #171614;
    --muted: #5f5b53;
    --accent: #b8431c;
    --font-display: Georgia, serif;   /* replace with the deck's display face */
    --font-text: Georgia, serif;      /* replace with the deck's text face */
}`;

function skeleton({ title, slides, lang, theme, layouts: withLayouts }) {
    const { style, layouts, script } = runtime();
    const t = escapeHtml(title);
    const sections = [];
    for (let i = 0; i < slides; i++) {
        if (i === 0) {
            sections.push(`        <section class="slide l-title" data-label="Title">
            <div class="body">
                <h1>${t}</h1>
            </div>
            <aside class="notes">Speaker notes for this slide.</aside>
        </section>`);
        } else {
            sections.push(`        <section class="slide" data-label="Slide ${i + 1}">
            <div class="body">
                <!-- slide ${i + 1}: pick a layout class from reference/layouts.md -->
            </div>
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
    ${style}${withLayouts ? '\n    ' + layouts : ''}
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
    const { style, layouts, script } = runtime();
    const styleRe = /<style data-deck-runtime>[\s\S]*?<\/style>/;
    const layoutsRe = /<style data-deck-layouts>[\s\S]*?<\/style>/;
    const scriptRe = /<script data-deck-runtime>[\s\S]*?<\/script>/;
    if (!styleRe.test(html) || !scriptRe.test(html)) {
        fail(`${file} has no data-deck-runtime blocks. Only decks created with new-deck can be upgraded automatically.`);
    }
    let out = html.replace(styleRe, () => style).replace(scriptRe, () => script);
    if (layoutsRe.test(out)) out = out.replace(layoutsRe, () => layouts);
    writeFileSync(file, out);
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
