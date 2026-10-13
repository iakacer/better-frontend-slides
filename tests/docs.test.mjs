// Docs must not point at files that don't exist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p, out);
        else if (name.endsWith('.md')) out.push(p);
    }
    return out;
}

const docs = ['README.md', ...walk('skills/frontend-slides')];
const REMOVED = /viewport-base\.css|html-template\.md|SlidePresentation|animation-patterns\.md/;

for (const file of docs) {
    test(`links in ${file} resolve`, () => {
        const text = readFileSync(file, 'utf8');
        const missing = [];
        for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
            if (/^(https?:|mailto:|#)/.test(target)) continue;
            const path = decodeURIComponent(target.split('#')[0]);
            if (path.includes('*')) continue;
            if (!existsSync(join(dirname(file), path))) missing.push(target);
        }
        assert.deepEqual(missing, []);
        assert.doesNotMatch(text, REMOVED, 'mentions a file that was replaced by the runtime');
    });
}
