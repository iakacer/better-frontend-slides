// Shared helpers for the Playwright-based scripts (check-deck, export-pdf).
// Zero install for the user: Playwright is resolved from the project,
// then a global install, then a one-time cache in ~/.cache/frontend-slides.

import { createServer } from 'node:http';
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
};

async function importFrom(dir) {
    const entry = join(dir, 'playwright', 'index.mjs');
    if (!existsSync(entry)) return null;
    return import(pathToFileURL(entry).href);
}

export async function loadPlaywright() {
    try {
        return await import('playwright');
    } catch { /* not installed locally */ }

    try {
        const globalRoot = execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        const pw = await importFrom(globalRoot);
        if (pw) return pw;
    } catch { /* no global npm */ }

    const cache = join(homedir(), '.cache', 'frontend-slides');
    let pw = await importFrom(join(cache, 'node_modules'));
    if (pw) return pw;
    process.stderr.write('Installing Playwright into ~/.cache/frontend-slides (one time)…\n');
    execSync(`npm install --prefix "${cache}" playwright@1 --no-audit --no-fund --loglevel=error`, { stdio: 'inherit' });
    pw = await importFrom(join(cache, 'node_modules'));
    if (!pw) throw new Error('Could not load Playwright. Install it with: npm install -g playwright');
    return pw;
}

export async function launchChromium(pw) {
    try {
        return await pw.chromium.launch();
    } catch (err) {
        if (!/Executable doesn't exist|install/i.test(String(err && err.message))) throw err;
        process.stderr.write('Downloading Chromium for Playwright (one time)…\n');
        try {
            execFileSync(process.execPath, [resolvePlaywrightCli(), 'install', 'chromium'], { stdio: 'inherit' });
        } catch {
            execSync('npx -y playwright install chromium', { stdio: 'inherit' });
        }
        return pw.chromium.launch();
    }
}

function resolvePlaywrightCli() {
    const candidates = [];
    try {
        candidates.push(join(execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright', 'cli.js'));
    } catch { /* ignore */ }
    candidates.push(join(homedir(), '.cache', 'frontend-slides', 'node_modules', 'playwright', 'cli.js'));
    candidates.push(resolve('node_modules', 'playwright', 'cli.js'));
    const found = candidates.find((c) => existsSync(c));
    if (!found) throw new Error('playwright cli not found');
    return found;
}

/** Serve the deck's folder over HTTP so fonts and relative assets load. */
export function serveDeck(htmlPath) {
    const file = resolve(htmlPath);
    if (!existsSync(file) || !statSync(file).isFile()) throw new Error(`File not found: ${htmlPath}`);
    const root = dirname(file);
    const server = createServer((req, res) => {
        const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        const target = normalize(join(root, urlPath === '/' ? basename(file) : urlPath));
        if (target !== root && !target.startsWith(root + sep)) {
            res.writeHead(403).end();
            return;
        }
        try {
            const body = readFileSync(target);
            res.writeHead(200, { 'Content-Type': MIME[extname(target).toLowerCase()] || 'application/octet-stream' });
            res.end(body);
        } catch {
            res.writeHead(404).end();
        }
    });
    return new Promise((ok) => {
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            ok({ url: `http://127.0.0.1:${port}/${encodeURIComponent(basename(file))}`, close: () => server.close() });
        });
    });
}

/** Open a deck and wait until fonts and the runtime are ready. */
export async function openDeck(browser, url, { width = 1920, height = 1080, reducedMotion = true } = {}) {
    const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 1,
        reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
    });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
    page.on('pageerror', (e) => consoleErrors.push(String(e.message || e)));
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    } catch {
        // Fonts from a CDN can time out offline; carry on with what loaded.
        await page.waitForLoadState('load').catch(() => {});
    }
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    if (reducedMotion) {
        await page.addStyleTag({
            content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;' +
                'animation-iteration-count:1!important;transition:none!important;caret-color:transparent!important}' +
                '.deck-ui,.deck-progress{display:none!important}',
        });
    }
    return { page, context, consoleErrors };
}
