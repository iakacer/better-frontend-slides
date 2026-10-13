// Test helpers: build throwaway decks with the current runtime and open them.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadPlaywright, launchChromium, serveDeck } from '../skills/frontend-slides/scripts/lib/browser.mjs';

export const SCRIPTS = resolve('skills/frontend-slides/scripts');

/** Write a deck made by new-deck, with the given slide markup and theme CSS. */
export function makeDeck(slides, css = '', { name = 'deck.html' } = {}) {
    const dir = mkdtempSync(join(tmpdir(), 'fs-test-'));
    const file = join(dir, name);
    execFileSync(process.execPath, [join(SCRIPTS, 'new-deck.mjs'), file, '--title', 'Test deck', '--slides', '1']);
    let html = readFileSync(file, 'utf8');
    const body = html.indexOf('<body>');
    const head = html.slice(0, body).replace(/(<style data-deck-theme>\n)[\s\S]*?(\n    <\/style>)/, (_, a, b) => a + css + b);
    const rest = html.slice(body).replace(/(<div class="deck-stage">\n)[\s\S]*?(\n      <\/div>\n    <\/main>)/, (_, a, b) => a + slides + b);
    html = head + rest;
    writeFileSync(file, html);
    return file;
}

export function runNode(script, args) {
    try {
        return { code: 0, out: execFileSync(process.execPath, [join(SCRIPTS, script), ...args], { encoding: 'utf8' }) };
    } catch (e) {
        return { code: e.status, out: String(e.stdout || ''), err: String(e.stderr || '') };
    }
}

let browserPromise;
export async function browser() {
    browserPromise ||= loadPlaywright().then(launchChromium);
    return browserPromise;
}

const servers = new Set();

export async function closeBrowser() {
    for (const s of servers) s.close();
    if (browserPromise) await (await browserPromise).close();
}

/** Serve a deck file and open it; returns { page, context, url, close }. */
export async function open(file, { width = 1280, height = 720, hash = '', search = '' } = {}) {
    const b = await browser();
    const server = await serveDeck(file);
    servers.add(server);
    const context = await b.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const url = server.url + search + hash;
    await page.goto(url);
    await page.waitForFunction(() => document.querySelector('.deck.deck-ready') || document.body.classList.contains('deck-presenter'));
    return {
        page,
        context,
        url: server.url,
        errors,
        close: async () => {
            await context.close();
            server.close();
            servers.delete(server);
        },
    };
}
