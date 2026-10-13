// Design lint: flags the visual and verbal habits that make a deck read as
// machine-made. Runs inside the page (it is passed to page.evaluate), so it
// must stay self-contained: no imports, no closures over module scope.
//
// Every finding is a warning with a concrete fix. The list mirrors
// reference/anti-ai-tells.md; keep the two in step.
//
// Opt out for a deliberate choice with data-check="design-ok" on the element
// or slide (or data-check="off").

export function lintDeck() {
    const stage = document.querySelector('.deck-stage') || document.body;
    const slides = [...stage.querySelectorAll(document.querySelector('.deck-stage') ? ':scope > .slide' : '.slide')];
    const findings = [];
    const add = (type, slideNums, message, fix) => {
        const uniq = [...new Set(slideNums)].sort((a, b) => a - b);
        findings.push({ type, severity: 'warning', category: 'design', slides: uniq, message, fix });
    };
    const optedOut = (el) => {
        const c = el.closest('[data-check]');
        return !!c && /^(off|design-ok)$/.test(c.getAttribute('data-check'));
    };
    const slideNum = (el) => slides.indexOf(el.closest('.slide')) + 1;
    const visibleText = (el) => !el.closest('.notes') && !optedOut(el);

    /* ---------- colour helpers ---------- */
    const parseColor = (str) => {
        const m = String(str).match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const hsl = ({ r, g, b }) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        if (max === min) return { h: 0, s: 0, l };
        const d = max - min;
        const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        let h;
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        return { h: h * 60, s, l };
    };
    const isAiViolet = (c) => {
        if (!c || c.a < 0.2) return false;
        const { h, s, l } = hsl(c);
        return h >= 228 && h <= 290 && s >= 0.45 && l >= 0.35 && l <= 0.75;
    };
    const colorsIn = (str) => (String(str).match(/rgba?\([^)]+\)/g) || []).map(parseColor);

    /* ---------- collect elements once ---------- */
    const els = slides.flatMap((s) => [s, ...s.querySelectorAll('*')]).filter((el) => !el.closest('.notes'));
    const styles = new Map(els.map((el) => [el, getComputedStyle(el)]));
    const hasOwnText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const textEls = els.filter((el) => hasOwnText(el) && visibleText(el));

    /* ---------- 1. fonts ---------- */
    const OVERUSED = ['inter', 'roboto', 'open sans', 'poppins', 'montserrat', 'lato', 'space grotesk', 'space mono',
        'syne', 'clash display', 'satoshi', 'outfit', 'plus jakarta sans', 'manrope', 'dm sans', 'sora', 'urbanist',
        'lexend', 'general sans', 'cabinet grotesk', 'raleway', 'nunito', 'quicksand'];
    const SYSTEM = ['arial', 'helvetica', 'helvetica neue', 'system-ui', '-apple-system', 'blinkmacsystemfont', 'segoe ui',
        'sans-serif', 'serif', 'georgia', 'times new roman', 'times', 'verdana', 'tahoma', 'trebuchet ms', 'courier new', 'monospace'];
    const firstFamily = (cs) => cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
    const byFamily = new Map();
    let totalChars = 0;
    for (const el of textEls) {
        const fam = firstFamily(styles.get(el));
        const n = el.textContent.trim().length;
        totalChars += n;
        const entry = byFamily.get(fam) || { chars: 0, slides: [] };
        entry.chars += n;
        entry.slides.push(slideNum(el));
        byFamily.set(fam, entry);
    }
    for (const [fam, { chars, slides: on }] of byFamily) {
        if (OVERUSED.includes(fam)) {
            add('overused-font', on, `"${fam}" is one of the most common typefaces in generated designs.`,
                'Pick a pairing from reference/typography.md that fits the deck\'s tradition.');
        } else if (SYSTEM.includes(fam) && chars / Math.max(totalChars, 1) > 0.2) {
            add('system-font', on, `Most text is set in the system font "${fam}".`,
                'Load a real web font for display and text (reference/typography.md).');
        }
    }

    /* ---------- 2. gradient text, violet gradients, glass, glow ---------- */
    const gradText = [];
    const violet = [];
    const glass = [];
    const glow = [];
    for (const el of els) {
        if (optedOut(el)) continue;
        const cs = styles.get(el);
        const bgImg = cs.backgroundImage;
        const clip = cs.backgroundClip || cs.webkitBackgroundClip;
        if (/gradient/.test(bgImg) && /text/.test(clip + ' ' + cs.webkitBackgroundClip)) gradText.push(slideNum(el));
        if (/gradient/.test(bgImg) && colorsIn(bgImg).filter(isAiViolet).length >= 1 && colorsIn(bgImg).length >= 2) violet.push(slideNum(el));
        if (/blur\(/.test(cs.backdropFilter || cs.webkitBackdropFilter || '')) glass.push(slideNum(el));
        for (const shadow of [cs.boxShadow, cs.textShadow]) {
            if (!shadow || shadow === 'none') continue;
            for (const part of shadow.split(/,(?![^(]*\))/)) {
                const c = colorsIn(part)[0];
                const px = (part.replace(/rgba?\([^)]+\)/, '').match(/-?[\d.]+px/g) || []).map(parseFloat);
                const blur = px[2] || 0;
                if (c && blur >= 18 && hsl(c).s > 0.5 && c.a > 0.25) glow.push(slideNum(el));
            }
        }
    }
    const accentViolet = textEls.filter((el) => isAiViolet(parseColor(styles.get(el).color))).map(slideNum);
    if (gradText.length) add('gradient-text', gradText, 'Gradient-filled text.', 'Set headlines in one solid ink; let type size and weight carry emphasis.');
    if (violet.length || accentViolet.length >= 3) {
        add('ai-palette', [...violet, ...accentViolet], 'Indigo/violet gradients or accents, the default palette of generated UIs.',
            'Build the palette from the deck\'s tradition (reference/color.md): one ground, one ink, one accent.');
    }
    if (glass.length) add('glassmorphism', glass, 'Frosted-glass panels (backdrop-filter: blur).', 'Use flat panels, rules or whitespace to separate content.');
    if (glow.length) add('glow', glow, 'Coloured glow shadows.', 'Remove the glow; use contrast and scale for emphasis.');

    /* ---------- 3. emoji used as icons ---------- */
    const EMOJI = /\p{Extended_Pictographic}/u;
    const emoji = textEls.filter((el) => EMOJI.test([...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(''))).map(slideNum);
    if (emoji.length) add('emoji', emoji, 'Emoji used as icons or decoration.', 'Drop them, or use a typographic device: numbers, rules, a single accent mark.');

    /* ---------- 4. pill eyebrows above titles ---------- */
    const pills = [];
    for (const h of slides.flatMap((s) => [...s.querySelectorAll('h1, h2')])) {
        const prev = h.previousElementSibling;
        if (!prev || optedOut(prev)) continue;
        const cs = styles.get(prev);
        if (!cs) continue;
        const r = prev.getBoundingClientRect();
        const radius = parseFloat(cs.borderTopLeftRadius) || 0;
        const boxed = (parseColor(cs.backgroundColor)?.a || 0) > 0.05 || parseFloat(cs.borderTopWidth) > 0;
        if (boxed && r.height > 0 && r.height < 70 && radius >= r.height / 2 - 1 && prev.textContent.trim().length < 40) pills.push(slideNum(h));
    }
    if (pills.length >= 2) add('pill-eyebrow', pills, 'Rounded pill badges above headings.', 'Use a plain kicker (small caps or a rule), or nothing: the heading should stand alone.');

    /* ---------- 5. soft rounded cards with shadows ---------- */
    const soft = els.filter((el) => {
        const cs = styles.get(el);
        const r = el.getBoundingClientRect();
        return !optedOut(el) && parseFloat(cs.borderTopLeftRadius) >= 12 && cs.boxShadow !== 'none' && r.width * r.height > 40000;
    });
    if (soft.length >= 4) add('soft-cards', soft.map(slideNum), `${soft.length} rounded cards with drop shadows.`,
        'Separate content with the grid, rules and whitespace instead of floating cards.');

    /* ---------- 6. icon card grids ---------- */
    const iconGrids = [];
    for (const el of els) {
        const kids = [...el.children].filter((k) => !k.classList.contains('notes'));
        if (kids.length < 3 || optedOut(el)) continue;
        const sig = (k) => k.tagName + '.' + [...k.classList].filter((c) => !/^(step|step-visible|is-)/.test(c)).sort().join('.');
        if (new Set(kids.map(sig)).size !== 1) continue;
        const iconFirst = kids.every((k) => {
            const first = k.firstElementChild;
            if (!first) return false;
            const isIcon = /^(svg|img|i)$/i.test(first.tagName) || /icon/i.test(first.className) || EMOJI.test(first.textContent.trim().slice(0, 2));
            return isIcon && !!k.querySelector('h3, h4, strong, b');
        });
        if (iconFirst) iconGrids.push(slideNum(el));
    }
    if (iconGrids.length) add('icon-card-grid', iconGrids, 'A row of equal cards, each an icon over a heading over a sentence.',
        'Say it as a list, a comparison or a single statement; if items differ in weight, show that.');

    /* ---------- 7. centred everything ---------- */
    let withHeading = 0;
    const centred = [];
    for (const s of slides) {
        const h = s.querySelector('h1, h2');
        if (!h || optedOut(h)) continue;
        withHeading++;
        if (styles.get(h)?.textAlign === 'center') centred.push(slides.indexOf(s) + 1);
    }
    if (withHeading >= 3 && centred.length / withHeading > 0.5) {
        add('centered-layouts', centred, `${centred.length} of ${withHeading} slides centre their heading.`,
            'Align to a grid edge and vary composition; keep centring for one or two moments.');
    }

    /* ---------- 8. same layout over and over ---------- */
    const shape = (s) => {
        const cls = [...s.classList].filter((c) => !/^(slide|active|is-|step)/.test(c)).sort().join('.');
        const walk = (el, depth) => [...el.children].filter((k) => !k.classList.contains('notes'))
            .map((k) => k.tagName + (depth ? '(' + walk(k, depth - 1) + ')' : '')).join(',');
        return cls + '|' + walk(s, 2);
    };
    let run = [1];
    const runs = [];
    for (let i = 1; i < slides.length; i++) {
        if (shape(slides[i]) === shape(slides[i - 1])) run.push(i + 1);
        else {
            if (run.length >= 4) runs.push(...run);
            run = [i + 1];
        }
    }
    if (run.length >= 4) runs.push(...run);
    if (runs.length) add('repetitive-layout', runs, 'Four or more slides in a row share the same layout.',
        'Vary the layout to fit each slide\'s job: statement, figure, comparison, quote (reference/layouts.md).');

    /* ---------- 9. motion everywhere ---------- */
    const animated = slides.filter((s) => s.querySelector('[data-animate]') ||
        [...s.querySelectorAll('*')].some((el) => styles.get(el) && styles.get(el).animationName !== 'none'));
    if (slides.length >= 5 && animated.length / slides.length > 0.7) {
        add('motion-everywhere', animated.map((s) => slides.indexOf(s) + 1), `Entrance animation on ${animated.length} of ${slides.length} slides.`,
            'Save motion for the few moments that need it; most slides should simply appear.');
    }

    /* ---------- 10. copy ---------- */
    const PHRASES = [
        /\bunlock(s|ing)?\b/i, /\bunleash/i, /\brevolutioni[sz]/i, /\bseamless(ly)?\b/i, /\bgame[- ]chang/i,
        /\bcutting[- ]edge\b/i, /\bnext[- ]level\b/i, /\belevate\b/i, /\bempower/i, /\bsupercharg/i,
        /\bharness(ing)? the power\b/i, /\bin today'?s\b/i, /\bfast[- ]paced\b/i, /\bdelve/i, /\btransformative\b/i,
        /\bsynerg/i, /\btapestry\b/i, /\btestament to\b/i, /\bever[- ]evolving\b/i, /\blandscape of\b/i,
        /\bdive (deep|into)\b/i, /\bbest[- ]in[- ]class\b/i, /\bworld[- ]class\b/i, /\brobust\b/i, /\bnavigat(e|ing) the\b/i,
    ];
    const hits = new Map();
    let dashes = 0;
    const dashSlides = [];
    for (const s of slides) {
        const clone = s.cloneNode(true);
        clone.querySelectorAll('.notes, [data-check="off"], [data-check="design-ok"]').forEach((n) => n.remove());
        const text = clone.textContent.replace(/\s+/g, ' ');
        for (const re of PHRASES) {
            const m = text.match(re);
            if (m) {
                const key = m[0].toLowerCase();
                hits.set(key, [...(hits.get(key) || []), slides.indexOf(s) + 1]);
            }
        }
        const d = (text.match(/—/g) || []).length;
        if (d) {
            dashes += d;
            dashSlides.push(slides.indexOf(s) + 1);
        }
    }
    for (const [phrase, on] of hits) {
        add('ai-copy', on, `"${phrase}" reads as generated copy.`, 'Say what actually happens, with a number or a name (reference/writing.md).');
    }
    if (dashes >= 3) add('em-dashes', dashSlides, `${dashes} em dashes in slide text.`, 'Use full stops, commas or colons; keep at most one em dash in a deck.');

    return findings;
}
