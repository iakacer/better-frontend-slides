import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { makeDeck, runNode } from './helpers.mjs';

function lint(slides, css = '', args = []) {
    const file = makeDeck(slides, css);
    const r = runNode('check-deck.mjs', [file, '--json', '--no-screenshots', ...args]);
    const report = JSON.parse(r.out);
    return { code: r.code, report, types: report.design.map((d) => d.type) };
}

const SLOP_CSS = `
:root { --font-display: "Inter", sans-serif; --font-text: "Inter", sans-serif; }
.slide { text-align: center; background: #0b0b14; color: #fff; }
.slide h1, .slide h2 { text-align: center; }
.grad { background: linear-gradient(90deg, #6366f1, #a855f7); -webkit-background-clip: text; background-clip: text; color: transparent; }
.glass { backdrop-filter: blur(12px); background: rgba(255,255,255,0.08); border-radius: 24px; box-shadow: 0 0 40px rgba(99,102,241,0.6); padding: 40px; width: 420px; height: 300px; }
.pill { display: inline-block; padding: 8px 20px; border-radius: 999px; background: rgba(99,102,241,0.2); color: #c7d2fe; font-size: 20px; }
.cards { display: flex; gap: 32px; justify-content: center; }
`;
const card = (t) => `<div class="glass"><span class="icon">🚀</span><h3>${t}</h3><p>Seamless and robust.</p></div>`;
const slopSlide = (i) => `
        <section class="slide"><div class="body">
            <span class="pill">New</span>
            <h2 class="grad" data-animate="rise">Unlock the power of AI ${i}</h2>
            <div class="cards">${card('Fast')}${card('Secure')}${card('Smart')}</div>
            <p data-animate="fade">In today's fast-paced world — we elevate everything — truly — always.</p>
        </div></section>`;

describe('design lint', () => {
    test('flags the common tells in a generic generated deck', () => {
        const { types, report } = lint([1, 2, 3, 4, 5].map(slopSlide).join(''), SLOP_CSS);
        for (const t of ['overused-font', 'gradient-text', 'ai-palette', 'glassmorphism', 'glow', 'emoji', 'pill-eyebrow',
            'soft-cards', 'icon-card-grid', 'centered-layouts', 'repetitive-layout', 'motion-everywhere', 'ai-copy', 'em-dashes']) {
            assert.ok(types.includes(t), `missing ${t}; got ${types.join(', ')}`);
        }
        assert.ok(report.design.every((d) => d.fix && d.slides.length));
    });

    test('warnings only, unless --strict', () => {
        const slides = slopSlide(1);
        assert.equal(lint(slides, SLOP_CSS).code, 0);
        assert.equal(lint(slides, SLOP_CSS, ['--strict']).code, 1);
    });

    test('data-check="design-ok" opts an element out', () => {
        const { types } = lint('<section class="slide"><div class="body"><h1 data-check="design-ok">Unlock 🚀</h1></div></section>',
            ':root{--font-display:"Libre Franklin";--font-text:"Libre Franklin"}');
        assert.ok(!types.includes('ai-copy') && !types.includes('emoji'), types.join());
    });

    test('a restrained deck has no findings', () => {
        const slides = ['l-title', 'l-statement', 'l-split', 'l-quote', 'l-closing']
            .map((l, i) => `<section class="slide ${l}"><div class="body"><h2>Point ${i}</h2><p>Plain, specific copy with a number: ${i * 12}%.</p></div></section>`)
            .join('');
        const { types } = lint(slides, ':root{--font-display:"Libre Franklin",serif;--font-text:"Source Serif 4",serif}');
        assert.deepEqual(types, []);
    });

    test('system fonts are flagged', () => {
        const { types } = lint('<section class="slide"><div class="body"><h1>Title</h1><p>Body copy here.</p></div></section>',
            ':root{--font-display:Arial,sans-serif;--font-text:Arial,sans-serif}');
        assert.ok(types.includes('system-font'), types.join());
    });
});
