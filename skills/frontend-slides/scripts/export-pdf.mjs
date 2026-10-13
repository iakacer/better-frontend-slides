#!/usr/bin/env node
// export-pdf: one page per slide, every build step shown, animations finished.
//
//   node scripts/export-pdf.mjs talk.html [out.pdf]
//   node scripts/export-pdf.mjs talk.html --raster      screenshot each slide instead
//
// The default uses the browser's print engine through the runtime's print
// CSS, so text stays selectable and files stay small. Use --raster when a
// deck relies on effects that print engines render differently
// (backdrop-filter, blend modes, some filters).

import { statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { loadPlaywright, launchChromium, openDeck, serveDeck } from './lib/browser.mjs';

const args = process.argv.slice(2);
const raster = args.includes('--raster');
const positional = args.filter((a) => !a.startsWith('--'));
const input = positional[0];
if (!input) {
    console.error('Usage: node export-pdf.mjs <deck.html> [out.pdf] [--raster]');
    process.exit(2);
}
if (args.includes('--compact')) console.error('Note: --compact is no longer needed; vector PDFs are already small. Ignoring.');
const output = resolve(positional[1] || join(dirname(resolve(input)), basename(input, '.html') + '.pdf'));

const pw = await loadPlaywright();
const browser = await launchChromium(pw);
const server = await serveDeck(input);

try {
    const { page } = await openDeck(browser, server.url);
    const size = await page.evaluate(() => {
        const stage = document.querySelector('.deck-stage');
        const root = document.querySelector('.deck');
        const w = parseInt(root?.dataset.width, 10) || (stage ? stage.offsetWidth : 1920) || 1920;
        const h = parseInt(root?.dataset.height, 10) || (stage ? stage.offsetHeight : 1080) || 1080;
        return { w, h, total: window.deck ? window.deck.total : document.querySelectorAll('.slide').length };
    });

    if (!raster) {
        await page.evaluate(() => window.deck && window.deck.setPrintMode(true));
        await page.emulateMedia({ media: 'print' });
        await page.pdf({ path: output, width: `${size.w}px`, height: `${size.h}px`, printBackground: true, preferCSSPageSize: true });
    } else {
        await page.setViewportSize({ width: size.w, height: size.h });
        const images = [];
        for (let i = 0; i < size.total; i++) {
            await page.evaluate((i) => {
                if (window.deck) window.deck.goTo(i, window.deck.stepsOf(i));
                else document.querySelectorAll('.slide').forEach((s, j) => s.classList.toggle('active', j === i));
            }, i);
            await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
            images.push((await page.screenshot({ type: 'png' })).toString('base64'));
        }
        const sheet = await browser.newPage();
        await sheet.setContent(`<!DOCTYPE html><style>@page{size:${size.w}px ${size.h}px;margin:0}body{margin:0}
            img{display:block;width:${size.w}px;height:${size.h}px;break-after:page}</style>` +
            images.map((b) => `<img src="data:image/png;base64,${b}">`).join(''), { waitUntil: 'load' });
        await sheet.pdf({ path: output, width: `${size.w}px`, height: `${size.h}px`, printBackground: true });
    }
    const mb = (statSync(output).size / 1048576).toFixed(1);
    console.log(`Saved ${output} (${size.total} slides, ${mb} MB${raster ? ', raster' : ''})`);
} finally {
    server.close();
    await browser.close();
}
