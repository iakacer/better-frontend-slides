import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { makeDeck, runNode } from './helpers.mjs';

const BASE = '.slide{padding:100px;font:32px/1.4 serif;color:#111;background:#fff}';

function check(slides, css = '') {
    const file = makeDeck(slides, BASE + css);
    const r = runNode('check-deck.mjs', [file, '--json', '--no-screenshots']);
    const report = JSON.parse(r.out);
    return { code: r.code, report, types: report.slides.flatMap((s) => s.issues.map((i) => i.type)).concat(report.global.map((i) => i.type)) };
}

describe('check-deck', () => {
    test('a clean deck passes', () => {
        const { code, report, types } = check('<section class="slide"><h1>Clean</h1><p>Short line.</p></section>');
        assert.equal(code, 0, JSON.stringify(report, null, 2));
        assert.deepEqual(types, []);
        assert.equal(report.runtime, '1.0.0');
    });

    test('text past the slide edge', () => {
        const { code, types } = check('<section class="slide"><h1 style="position:absolute;left:1700px;top:200px;white-space:nowrap">Far too far right</h1></section>');
        assert.equal(code, 1);
        assert.ok(types.includes('text-outside-slide'), types.join());
    });

    test('text spilling out of a card', () => {
        const { types } = check(
            '<section class="slide"><div class="card"><p>This sentence is much too long for a tiny card and will spill out of it onto the slide.</p></div></section>',
            '.card{width:300px;height:80px;background:#eee}');
        assert.ok(types.includes('text-escapes-box'), types.join());
    });

    test('clipped content in an overflow:hidden box', () => {
        const { types } = check(
            '<section class="slide"><div class="clip"><p>One</p><p>Two</p><p>Three</p><p>Four</p></div></section>',
            '.clip{height:100px;overflow:hidden}');
        assert.ok(types.includes('clipped-content'), types.join());
    });

    test('data-check="clip-ok" silences a deliberate clip', () => {
        const { types } = check(
            '<section class="slide"><div class="clip" data-check="clip-ok"><p>One</p><p>Two</p><p>Three</p><p>Four</p></div></section>',
            '.clip{height:100px;overflow:hidden}');
        assert.ok(!types.includes('clipped-content'), types.join());
    });

    test('overlapping text', () => {
        const { types } = check(
            '<section class="slide"><h2 class="a">Overlapping one</h2><h2 class="b">Overlapping two</h2></section>',
            '.a,.b{position:absolute;left:200px;top:300px;margin:0}');
        assert.ok(types.includes('text-overlap'), types.join());
    });

    test('low contrast and tiny text', () => {
        const { types, report } = check('<section class="slide"><p style="color:#ccc">Pale</p><p style="font-size:12px">Tiny</p></section>');
        assert.ok(types.includes('low-contrast'), types.join());
        assert.ok(types.includes('small-text'), types.join());
        const pale = report.slides[0].issues.find((i) => i.type === 'low-contrast');
        assert.equal(pale.severity, 'error');
    });

    test('build steps are checked fully revealed', () => {
        const { types } = check(
            '<section class="slide"><div class="card"><p class="step">Hidden at first but far too long for this small card to hold.</p></div></section>',
            '.card{width:240px;height:60px;background:#eee}');
        assert.ok(types.includes('text-escapes-box'), types.join());
    });

    test('broken images, empty slides and script errors', () => {
        const { types } = check(
            '<section class="slide"><img src="missing.png" alt=""><h2>x</h2></section><section class="slide"></section>' +
            '<script>throw new Error("boom")</script>');
        assert.ok(types.includes('broken-image'), types.join());
        assert.ok(types.includes('empty-slide'), types.join());
        assert.ok(types.includes('console-error'), types.join());
    });

    test('phone scaling catches responsive reflow', () => {
        const { types } = check('<section class="slide"><h1>Reflow</h1></section>',
            '@media (max-width: 600px){.deck-stage{transform:none!important;width:100vw!important;height:100vh!important}}');
        assert.ok(types.includes('phone-scaling'), types.join());
    });
});
