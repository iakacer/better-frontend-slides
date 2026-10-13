import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { browser, closeBrowser, makeDeck, open, runNode } from './helpers.mjs';

const SLIDES = `
        <section class="slide" data-label="Opening"><h1>One</h1><aside class="notes">Notes for one</aside></section>
        <section class="slide"><h2>Two</h2>
            <ul><li class="step">a</li><li class="step">b</li><li class="step" data-step="5">c</li><li class="step" data-step="5">d</li></ul>
            <aside class="notes"><p>Notes for <b>two</b></p></aside></section>
        <section class="slide"><h2>Three</h2><p data-animate="rise">Moving</p></section>
        <section class="slide"><h2>Four</h2></section>`;
const deckFile = makeDeck(SLIDES, '.slide{padding:100px;font:32px/1.4 serif}');

const state = (page) => page.evaluate(() => ({
    index: deck.index,
    step: deck.step,
    hash: location.hash,
    active: [...document.querySelectorAll('.slide')].map((s) => s.classList.contains('active')),
    inert: [...document.querySelectorAll('.slide')].map((s) => s.hasAttribute('inert')),
    visibleSteps: document.querySelectorAll('.slide:nth-child(2) .step-visible').length,
}));

after(closeBrowser);

describe('stage scaling', () => {
    test('scales 1920×1080 to fit and letterboxes', async () => {
        const d = await open(deckFile, { width: 1280, height: 720 });
        let r = await d.page.evaluate(() => document.querySelector('.deck-stage').getBoundingClientRect().toJSON());
        assert.ok(Math.abs(r.width - 1280) < 0.5 && Math.abs(r.height - 720) < 0.5, JSON.stringify(r));
        await d.page.setViewportSize({ width: 800, height: 800 });
        await d.page.waitForFunction(() => Math.abs(document.querySelector('.deck-stage').getBoundingClientRect().width - 800) < 1);
        r = await d.page.evaluate(() => document.querySelector('.deck-stage').getBoundingClientRect().toJSON());
        assert.ok(Math.abs(r.height - 450) < 0.5, 'keeps 16:9');
        assert.ok(Math.abs(r.top - 175) < 0.5, 'centred vertically');
        assert.deepEqual(d.errors, []);
        await d.close();
    });
});

describe('navigation', () => {
    test('steps, slides, hash and inert state', async () => {
        const d = await open(deckFile);
        const { page } = d;
        assert.deepEqual((await state(page)).active, [true, false, false, false]);
        assert.deepEqual((await state(page)).inert, [false, true, true, true]);

        await page.keyboard.press('ArrowRight');
        let s = await state(page);
        assert.equal(s.index, 1);
        assert.equal(s.step, 0);
        assert.equal(s.hash, '#/2');

        await page.keyboard.press('Space');
        await page.keyboard.press('PageDown');
        s = await state(page);
        assert.equal(s.step, 2);
        assert.equal(s.visibleSteps, 2);
        assert.equal(s.hash, '#/2/2');

        await page.keyboard.press('ArrowRight'); // grouped data-step="5" reveals c and d together
        s = await state(page);
        assert.equal(s.step, 3);
        assert.equal(s.visibleSteps, 4);

        await page.keyboard.press('ArrowRight');
        assert.equal((await state(page)).index, 2);

        await page.keyboard.press('ArrowLeft'); // back lands on slide 2 with all steps shown
        s = await state(page);
        assert.deepEqual([s.index, s.step, s.visibleSteps], [1, 3, 4]);

        await page.keyboard.press('End');
        assert.equal((await state(page)).index, 3);
        await page.keyboard.press('Home');
        assert.equal((await state(page)).index, 0);

        await page.keyboard.type('3');
        await page.keyboard.press('Enter');
        assert.equal((await state(page)).index, 2);
        await d.close();
    });

    test('deep link opens the right slide and step', async () => {
        const d = await open(deckFile, { hash: '#/2/1' });
        const s = await state(d.page);
        assert.deepEqual([s.index, s.step, s.visibleSteps], [1, 1, 1]);
        await d.page.evaluate(() => (location.hash = '#/4'));
        await d.page.waitForFunction(() => deck.index === 3);
        await d.close();
    });

    test('emits deck:change with details', async () => {
        const d = await open(deckFile);
        const detail = await d.page.evaluate(() => new Promise((ok) => {
            document.addEventListener('deck:change', (e) => ok({ index: e.detail.index, prev: e.detail.previousIndex, reason: e.detail.reason }), { once: true });
            deck.goTo(2);
        }));
        assert.deepEqual(detail, { index: 2, prev: 0, reason: 'api' });
        await d.close();
    });

    test('announces slides to screen readers', async () => {
        const d = await open(deckFile);
        await d.page.keyboard.press('End');
        const live = await d.page.textContent('.deck-sr');
        assert.equal(live, '4 of 4: Four');
        assert.equal(await d.page.getAttribute('.slide:first-child', 'aria-label'), '1 of 4: Opening');
        await d.close();
    });
});

describe('overview, blackout, help', () => {
    test('O shows the grid and Enter jumps to the focused slide', async () => {
        const d = await open(deckFile);
        const { page } = d;
        await page.keyboard.press('o');
        assert.ok(await page.evaluate(() => document.querySelector('.deck').classList.contains('is-overview')));
        const visible = await page.evaluate(() => [...document.querySelectorAll('.slide')].every((s) => getComputedStyle(s).visibility === 'visible'));
        assert.ok(visible, 'all slides visible in overview');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Enter');
        const s = await state(page);
        assert.equal(s.index, 2);
        assert.ok(!(await page.evaluate(() => document.querySelector('.deck').classList.contains('is-overview'))));
        await d.close();
    });

    test('B blacks out and ? toggles help', async () => {
        const d = await open(deckFile);
        await d.page.keyboard.press('b');
        assert.ok(await d.page.evaluate(() => document.querySelector('.deck').classList.contains('is-blackout')));
        await d.page.keyboard.press('Shift+Slash');
        assert.ok(await d.page.isVisible('.deck-help'));
        await d.page.keyboard.press('Escape');
        assert.ok(!(await d.page.isVisible('.deck-help')));
        await d.close();
    });
});

describe('editing', () => {
    test('E makes text editable and serialize() returns a clean document', async () => {
        const d = await open(deckFile);
        const { page } = d;
        await page.keyboard.press('e');
        assert.equal(await page.getAttribute('.slide:first-child h1', 'contenteditable'), 'true');
        await page.click('.slide:first-child h1');
        await page.keyboard.press('End');
        await page.keyboard.type(' edited');
        // Navigation keys must not move slides while typing.
        await page.keyboard.press('ArrowRight');
        assert.equal((await state(page)).index, 0);
        await page.keyboard.press('Escape');
        const html = await page.evaluate(() => deck.serialize());
        const body = html.slice(html.indexOf('<body'), html.indexOf('<script data-deck-runtime'));
        assert.match(body, /<h1>One edited<\/h1>/);
        assert.doesNotMatch(body, /contenteditable|deck-ready|step-visible|data-deck-ui|aria-|inert|style=/);
        assert.match(body, /<section class="slide" data-label="Opening">/);
        assert.match(html, /^<!DOCTYPE html>/);
        await d.close();
    });

    test('Cmd/Ctrl+S downloads the edited file', async () => {
        const d = await open(deckFile);
        const { page } = d;
        await page.keyboard.press('e');
        await page.click('.slide:first-child h1');
        await page.keyboard.type('X');
        const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
        assert.equal(download.suggestedFilename(), 'deck.html');
        await d.close();
    });
});

describe('print', () => {
    test('print mode shows every slide and every step', async () => {
        const d = await open(deckFile);
        await d.page.evaluate(() => deck.setPrintMode(true));
        await d.page.emulateMedia({ media: 'print' });
        const r = await d.page.evaluate(() => ({
            slides: [...document.querySelectorAll('.slide')].map((s) => [getComputedStyle(s).visibility, s.getBoundingClientRect().height]),
            hiddenSteps: [...document.querySelectorAll('.step')].filter((s) => getComputedStyle(s).visibility === 'hidden').length,
            height: document.documentElement.scrollHeight,
        }));
        assert.deepEqual(r.slides.map((s) => s[0]), ['visible', 'visible', 'visible', 'visible']);
        assert.ok(r.slides.every((s) => s[1] === 1080));
        assert.equal(r.hiddenSteps, 0);
        assert.equal(r.height, 4 * 1080, 'no stray content adds a blank page');
        await d.close();
    });
});

describe('presenter view', () => {
    test('renders notes, frames and stays in sync with the audience window', async () => {
        const d = await open(deckFile);
        const { page, context } = d;
        const [presenter] = await Promise.all([context.waitForEvent('page'), page.keyboard.press('s')]);
        await presenter.waitForFunction(() => document.body.classList.contains('deck-presenter'));
        assert.equal(await presenter.locator('iframe').count(), 2);
        assert.match(await presenter.textContent('.pv-notes'), /Notes for one/);

        await presenter.keyboard.press('ArrowRight');
        await page.waitForFunction(() => deck.index === 1);
        assert.match(await presenter.innerHTML('.pv-notes'), /Notes for <b>two<\/b>/);
        assert.match(await presenter.textContent('.pv-count'), /2 \/ 4/);

        await page.keyboard.press('ArrowRight');
        await presenter.waitForFunction(() => deck.step === 1);
        const frame = presenter.frames().find((f) => f.url().includes('embed') && f !== presenter.mainFrame());
        await frame.waitForFunction(() => window.deck && window.deck.index === 1);
        await presenter.close();
        await d.close();
    });
});

describe('touch', () => {
    test('tapping navigates, tapping a link does not', async () => {
        const file = makeDeck('<section class="slide"><h1>One</h1><a href="#x" style="position:absolute;right:100px;top:100px;font-size:60px">link</a></section>' +
            '<section class="slide"><h1>Two</h1></section>');
        const b = await browser();
        const context = await b.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true, isMobile: true });
        const page = await context.newPage();
        await page.goto(pathToFileURL(file).href);
        await page.waitForSelector('.deck.deck-ready');
        await page.tap('a');
        assert.equal(await page.evaluate(() => deck.index), 0);
        await page.touchscreen.tap(600, 300);
        assert.equal(await page.evaluate(() => deck.index), 1);
        await page.touchscreen.tap(50, 300);
        assert.equal(await page.evaluate(() => deck.index), 0);
        await context.close();
    });
});

describe('file:// decks', () => {
    test('presenter view works when the deck is opened from disk', async () => {
        const b = await browser();
        const context = await b.newContext({ viewport: { width: 1280, height: 720 } });
        const page = await context.newPage();
        await page.goto(pathToFileURL(deckFile).href);
        await page.waitForSelector('.deck.deck-ready');
        const [presenter] = await Promise.all([context.waitForEvent('page'), page.keyboard.press('s')]);
        await presenter.waitForFunction(() => document.body.classList.contains('deck-presenter'));
        await presenter.keyboard.press('ArrowRight');
        await page.waitForFunction(() => deck.index === 1);
        const frame = presenter.frames().find((f) => f !== presenter.mainFrame() && f.url().includes('embed'));
        await frame.waitForFunction(() => window.deck && window.deck.index === 1);
        await context.close();
    });
});

describe('new-deck', () => {
    test('--upgrade swaps the runtime and keeps author content', async () => {
        const file = makeDeck('<section class="slide"><h1>Keep me</h1></section>', '.slide{color:red}');
        const before = readFileSync(file, 'utf8');
        const stale = before.replace(/(<script data-deck-runtime>)[\s\S]*?(<\/script>)/, '$1/* old */$2');
        (await import('node:fs')).writeFileSync(file, stale);
        const r = runNode('new-deck.mjs', ['--upgrade', file]);
        assert.equal(r.code, 0, r.err);
        const after = readFileSync(file, 'utf8');
        assert.equal(after, before);
    });

    test('refuses to overwrite without --force', () => {
        const file = makeDeck('<section class="slide"><h1>x</h1></section>');
        const r = runNode('new-deck.mjs', [file]);
        assert.equal(r.code, 1);
    });
});
