// Every example deck must carry the current runtime and pass check-deck.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runNode } from './helpers.mjs';

const examples = readdirSync('examples').filter((f) => f.endsWith('.html'));

for (const name of examples) {
    const file = join('examples', name);

    test(`${name} uses the current runtime`, () => {
        const copy = join(mkdtempSync(join(tmpdir(), 'fs-ex-')), name);
        copyFileSync(file, copy);
        const r = runNode('new-deck.mjs', ['--upgrade', copy]);
        assert.equal(r.code, 0, r.err);
        assert.equal(readFileSync(copy, 'utf8'), readFileSync(file, 'utf8'),
            `Runtime in ${file} is stale. Run: node skills/frontend-slides/scripts/new-deck.mjs --upgrade ${file}`);
    });

    test(`${name} passes check-deck`, () => {
        const r = runNode('check-deck.mjs', [file, '--json', '--no-screenshots']);
        const report = JSON.parse(r.out);
        const errors = [...report.global, ...report.slides.flatMap((s) => s.issues.map((i) => ({ slide: s.index + 1, ...i })))]
            .filter((i) => i.severity === 'error' && i.type !== 'font-failed');
        assert.deepEqual(errors, []);
    });
}
