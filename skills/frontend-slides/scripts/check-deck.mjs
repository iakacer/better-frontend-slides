#!/usr/bin/env node
// check-deck: render every slide of a deck and report layout problems.
//
//   node scripts/check-deck.mjs talk.html            human-readable report
//   node scripts/check-deck.mjs talk.html --json     machine-readable report
//   node scripts/check-deck.mjs talk.html --out dir  screenshots go to dir
//   node scripts/check-deck.mjs talk.html --no-screenshots
//
// Each slide is rendered at 1920×1080 with every build step revealed and
// animations finished. Checks: text outside the slide, text escaping its
// panel, clipped content, overlapping text, tiny text, low contrast,
// broken images, empty slides, console errors, phone-size scaling.
// Screenshots (slide-NN.png + overview.png) are written so the agent can
// look at the result before showing it to anyone.
//
// Exit code: 0 when there are no errors (warnings are allowed), 1 otherwise.
// Silence a deliberate exception by putting data-check="off" on the element
// (or data-check="overlap-ok" / "clip-ok" for just that check).

import { mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { loadPlaywright, launchChromium, openDeck, serveDeck } from './lib/browser.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const outIdx = args.indexOf('--out');
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
if (!file) {
    console.error('Usage: node check-deck.mjs <deck.html> [--json] [--out dir] [--no-screenshots]');
    process.exit(2);
}
const outDir = resolve(outIdx >= 0 ? args[outIdx + 1] : join(dirname(resolve(file)), '.deck-check', basename(file, '.html')));
const shots = !flags.has('--no-screenshots');

/* ---------- checks that run inside the page, per slide ---------- */
function checkSlide(index) {
    const slides = document.querySelectorAll(document.querySelector('.deck-stage') ? '.deck-stage > .slide' : '.slide');
    const slide = slides[index];
    const sr = slide.getBoundingClientRect();
    const issues = [];
    const TOL = 2;

    const off = (node, kind) => {
        const c = node.closest('[data-check]');
        if (!c) return false;
        const v = c.getAttribute('data-check');
        return v === 'off' || v === kind;
    };
    const describe = (node) => {
        let s = node.tagName.toLowerCase();
        if (node.id) s += '#' + node.id;
        const cls = [...node.classList].filter((c) => !/^(active|step-visible)$/.test(c)).slice(0, 3);
        if (cls.length) s += '.' + cls.join('.');
        return s;
    };
    const snippet = (node) => node.textContent.replace(/\s+/g, ' ').trim().slice(0, 60);
    const shown = (node) => {
        if (node.closest('.notes, [aria-hidden="true"]')) return false;
        for (let n = node; n && n !== slide.parentElement; n = n.parentElement) {
            const cs = getComputedStyle(n);
            if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
        }
        return true;
    };
    const ownTextRect = (node) => {
        let box = null;
        for (const child of node.childNodes) {
            if (child.nodeType !== 3 || !child.textContent.trim()) continue;
            const r = document.createRange();
            r.selectNodeContents(child);
            for (const rect of r.getClientRects()) {
                if (rect.width < 1 || rect.height < 1) continue;
                box = box
                    ? { left: Math.min(box.left, rect.left), top: Math.min(box.top, rect.top), right: Math.max(box.right, rect.right), bottom: Math.max(box.bottom, rect.bottom) }
                    : { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
            }
        }
        return box;
    };
    const drawsBox = (cs) =>
        (parseColor(cs.backgroundColor)[3] > 0.05) || cs.backgroundImage !== 'none' ||
        parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth) > 0 ||
        (cs.boxShadow && cs.boxShadow !== 'none');

    function parseColor(str) {
        const m = str.match(/rgba?\(([^)]+)\)/);
        if (!m) return [0, 0, 0, 0];
        const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
        return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    }
    const lum = ([r, g, b]) => {
        const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const blend = (top, bottom) => {
        const a = top[3];
        return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1];
    };
    // Effective background behind a node, or null when an image/gradient makes it unknowable.
    const backgroundOf = (node) => {
        const layers = [];
        for (let n = node; n; n = n.parentElement) {
            const cs = getComputedStyle(n);
            if (cs.backgroundImage !== 'none') return null;
            const c = parseColor(cs.backgroundColor);
            if (c[3] > 0) layers.push(c);
            if (c[3] >= 0.99) break;
            if (n === slide) break;
        }
        let out = [255, 255, 255, 1];
        for (let i = layers.length - 1; i >= 0; i--) out = blend(layers[i], out);
        return out;
    };

    const all = [...slide.querySelectorAll('*')];
    const texts = [];
    for (const node of all) {
        if (off(node, 'off') || !shown(node)) continue;
        const rect = ownTextRect(node);
        if (rect) texts.push({ node, rect });
    }

    // 1. Text outside the slide.
    for (const { node, rect } of texts) {
        if (rect.left < sr.left - TOL || rect.top < sr.top - TOL || rect.right > sr.right + TOL || rect.bottom > sr.bottom + TOL) {
            issues.push({ type: 'text-outside-slide', severity: 'error', element: describe(node), text: snippet(node),
                message: 'Text runs past the edge of the slide.' });
        }
    }

    // 2. Text escaping the nearest panel/card that draws a visible box.
    for (const { node, rect } of texts) {
        for (let p = node.parentElement; p && p !== slide; p = p.parentElement) {
            const cs = getComputedStyle(p);
            if (!drawsBox(cs)) continue;
            const pr = p.getBoundingClientRect();
            if (rect.left < pr.left - TOL || rect.top < pr.top - TOL || rect.right > pr.right + TOL || rect.bottom > pr.bottom + TOL) {
                issues.push({ type: 'text-escapes-box', severity: 'error', element: describe(node), container: describe(p), text: snippet(node),
                    message: 'Text spills out of the panel that contains it.' });
            }
            break;
        }
    }

    // 3. Clipped content inside scroll/hidden containers.
    for (const node of all) {
        if (off(node, 'clip-ok') || !shown(node)) continue;
        const cs = getComputedStyle(node);
        if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
        if (!node.textContent.trim()) continue;
        const h = node.scrollHeight - node.clientHeight;
        const w = node.scrollWidth - node.clientWidth;
        if (h > TOL || w > TOL) {
            issues.push({ type: 'clipped-content', severity: 'error', element: describe(node), text: snippet(node),
                message: `Content is cut off (${Math.max(h, w)}px hidden).` });
        }
    }

    // 4. Overlapping text.
    for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
            const a = texts[i];
            const b = texts[j];
            if (a.node.contains(b.node) || b.node.contains(a.node)) continue;
            if (off(a.node, 'overlap-ok') || off(b.node, 'overlap-ok')) continue;
            const w = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
            const h = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
            if (w > 3 && h > 3) {
                issues.push({ type: 'text-overlap', severity: 'error', element: describe(a.node), other: describe(b.node),
                    text: snippet(a.node) + ' / ' + snippet(b.node), message: 'Two pieces of text overlap.' });
            }
        }
    }

    // 5. Tiny text and 6. contrast.
    for (const { node } of texts) {
        const cs = getComputedStyle(node);
        const size = parseFloat(cs.fontSize);
        if (size < 18) {
            issues.push({ type: 'small-text', severity: 'warning', element: describe(node), text: snippet(node),
                message: `${size}px text is hard to read from a distance (aim for 18px or more at 1920×1080).` });
        }
        const bg = backgroundOf(node);
        if (!bg) continue;
        const fg = blend(parseColor(cs.color), bg);
        const l1 = lum(fg);
        const l2 = lum(bg);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        const large = size >= 36 || (size >= 28 && parseInt(cs.fontWeight, 10) >= 700);
        const need = large ? 3 : 4.5;
        if (ratio < need) {
            issues.push({ type: 'low-contrast', severity: ratio < 3 ? 'error' : 'warning', element: describe(node), text: snippet(node),
                message: `Contrast ${ratio.toFixed(2)}:1, needs ${need}:1.` });
        }
    }

    // 7. Broken images.
    for (const img of slide.querySelectorAll('img')) {
        if (img.complete && img.naturalWidth === 0) {
            issues.push({ type: 'broken-image', severity: 'error', element: describe(img), text: img.getAttribute('src') || '',
                message: 'Image failed to load.' });
        }
    }

    // 8. Empty slide.
    if (!texts.length && !slide.querySelector('img, svg, canvas, video, iframe, picture')) {
        issues.push({ type: 'empty-slide', severity: 'warning', message: 'Slide has no visible content.' });
    }

    const label = slide.getAttribute('data-label') ||
        (slide.querySelector('h1,h2,h3')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) || `Slide ${index + 1}`;
    return { index, label, issues };
}

/* ---------- driver ---------- */
const pw = await loadPlaywright();
const browser = await launchChromium(pw);
const server = await serveDeck(file);
const report = { file: resolve(file), runtime: null, slides: [], global: [], screenshots: shots ? outDir : null };

try {
    const { page, consoleErrors } = await openDeck(browser, server.url);
    const info = await page.evaluate(() => ({
        runtime: window.deck ? window.deck.version : null,
        total: window.deck ? window.deck.total : document.querySelectorAll('.slide').length,
        fontErrors: document.fonts ? [...document.fonts].filter((f) => f.status === 'error').map((f) => f.family) : [],
    }));
    report.runtime = info.runtime;
    if (!info.runtime) {
        report.global.push({ type: 'no-runtime', severity: 'warning',
            message: 'Deck does not use the shared runtime (window.deck missing). Scaffold with scripts/new-deck.mjs.' });
    }
    for (const fam of new Set(info.fontErrors)) {
        report.global.push({ type: 'font-failed', severity: 'warning', message: `Web font "${fam}" failed to load; a fallback is showing.` });
    }
    if (shots) mkdirSync(outDir, { recursive: true });

    for (let i = 0; i < info.total; i++) {
        await page.evaluate((i) => {
            if (window.deck) {
                window.deck.goTo(i, window.deck.stepsOf(i));
            } else {
                document.querySelectorAll('.slide').forEach((s, j) => s.classList.toggle('active', j === i));
            }
        }, i);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const result = await page.evaluate(checkSlide, i);
        if (shots) {
            const name = `slide-${String(i + 1).padStart(2, '0')}.png`;
            await page.screenshot({ path: join(outDir, name) });
            result.screenshot = join(outDir, name);
        }
        report.slides.push(result);
    }

    if (shots && info.runtime) {
        await page.evaluate(() => window.deck.toggleOverview());
        await page.screenshot({ path: join(outDir, 'overview.png') });
        await page.evaluate(() => window.deck.toggleOverview());
    }

    for (const msg of consoleErrors) {
        report.global.push({ type: 'console-error', severity: 'error', message: msg.slice(0, 300) });
    }

    // Phone-size check: the stage must stay 16:9 and fit inside the screen.
    const phone = await openDeck(browser, server.url, { width: 390, height: 844 });
    const box = await phone.page.evaluate(() => {
        const stage = document.querySelector('.deck-stage') || document.querySelector('.slide');
        const r = stage.getBoundingClientRect();
        return { w: r.width, h: r.height, left: r.left, top: r.top, vw: innerWidth, vh: innerHeight };
    });
    const ratio = box.w / box.h;
    if (Math.abs(ratio - 16 / 9) > 0.02 || box.w > box.vw + 1 || box.left < -1) {
        report.global.push({ type: 'phone-scaling', severity: 'error',
            message: `On a 390×844 phone the stage is ${Math.round(box.w)}×${Math.round(box.h)}; it should scale down as one 16:9 frame.` });
    }
    await phone.context.close();
} finally {
    server.close();
    await browser.close();
}

const allIssues = [...report.global, ...report.slides.flatMap((s) => s.issues)];
report.summary = {
    slides: report.slides.length,
    errors: allIssues.filter((i) => i.severity === 'error').length,
    warnings: allIssues.filter((i) => i.severity === 'warning').length,
};

if (flags.has('--json')) {
    console.log(JSON.stringify(report, null, 2));
} else {
    const line = (i) => `  ${i.severity === 'error' ? '✗' : '!'} ${i.type}: ${i.message}${i.element ? ` [${i.element}]` : ''}${i.text ? ` "${i.text}"` : ''}`;
    console.log(`${basename(file)}: ${report.summary.slides} slides, runtime ${report.runtime || 'missing'}`);
    report.global.forEach((i) => console.log(line(i)));
    for (const s of report.slides) {
        if (!s.issues.length) continue;
        console.log(`\nSlide ${s.index + 1} (${s.label})`);
        s.issues.forEach((i) => console.log(line(i)));
    }
    console.log(`\n${report.summary.errors} error(s), ${report.summary.warnings} warning(s).`);
    if (shots) console.log(`Screenshots: ${outDir} (look at overview.png, then any slide with issues)`);
}
process.exit(report.summary.errors ? 1 : 0);
