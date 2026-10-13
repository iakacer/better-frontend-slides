/* ============================================================
   frontend-slides runtime: deck.js
   Zero-dependency controller for fixed-stage HTML decks.

   What it does
   - Scales the 1920×1080 stage to any window (letterboxed, no reflow)
   - Keyboard, clicker, wheel, swipe and tap navigation
   - Build steps (.step / data-step) and motion primitives (data-animate)
   - Deep links: #/7 opens slide 7, #/7/2 opens it with two steps shown
   - Overview grid (O), blackout (B or .), fullscreen (F), help (?)
   - Presenter view (S): current + next slide, notes, timer, synced
   - Inline editing (E) with Cmd/Ctrl+S to download the edited file
   - Print / PDF: one slide per page with everything revealed
   - Screen-reader announcements and inert hidden slides

   Public API: window.deck (see reference/runtime.md)
   Events: "deck:ready" and "deck:change" bubble from .deck
   ============================================================ */
(() => {
    'use strict';

    const VERSION = '1.0.0';
    const MSG = 'frontend-slides';
    const UI_ATTR = 'data-deck-ui';
    const EDITABLE = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,caption,td,th,dt,dd,label,small,[data-editable]';
    const params = new URLSearchParams(location.search);
    const MODE = params.has('presenter') ? 'presenter' : params.has('embed') ? 'embed' : 'audience';

    const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
    const el = (tag, attrs = {}, html = '') => {
        const node = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
        if (html) node.innerHTML = html;
        return node;
    };
    const isTyping = (target) =>
        target instanceof Element &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

    function urlFor(mode, index, step) {
        const u = new URL(location.href);
        u.search = mode ? '?' + mode : '';
        u.hash = hashFor(index, step);
        return u.href;
    }

    function hashFor(index, step) {
        return '#/' + (index + 1) + (step ? '/' + step : '');
    }

    function parseHash() {
        const m = location.hash.match(/^#\/?(\d+)(?:\/(\d+))?$/);
        return m ? { index: parseInt(m[1], 10) - 1, step: m[2] ? parseInt(m[2], 10) : 0 } : null;
    }

    class Deck {
        constructor(root) {
            this.root = root;
            this.stage = root.querySelector(':scope > .deck-stage') || this.wrapStage();
            this.slides = Array.from(this.stage.querySelectorAll(':scope > .slide'));
            this.width = parseInt(root.dataset.width, 10) || 1920;
            this.height = parseInt(root.dataset.height, 10) || 1080;
            this.index = 0;
            this.step = 0;
            this.peers = new Set();
            this.listeners = {};
            this.dirty = false;
            this.overviewFocus = 0;
            this.typedNumber = '';
            this.steps = this.slides.map((s) => this.collectSteps(s));
            this.labels = this.slides.map((s, i) => this.labelFor(s, i));
        }

        /* ---------- setup ---------- */

        wrapStage() {
            const stage = el('div', { class: 'deck-stage' });
            while (this.root.firstChild) stage.appendChild(this.root.firstChild);
            this.root.appendChild(stage);
            return stage;
        }

        collectSteps(slide) {
            // Plain .step elements appear one per press in DOM order (1, 2, 3…).
            // data-step="N" puts an element on press N, so equal numbers appear together.
            const groups = new Map();
            let auto = 0;
            for (const node of slide.querySelectorAll('.step')) {
                const explicit = parseInt(node.dataset.step, 10);
                const key = Number.isFinite(explicit) ? explicit : ++auto;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(node);
            }
            return [...groups.keys()].sort((a, b) => a - b).map((k) => groups.get(k));
        }

        labelFor(slide, i) {
            const explicit = slide.dataset.label;
            if (explicit) return explicit;
            const h = slide.querySelector('h1,h2,h3');
            const text = h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
            return text ? text.slice(0, 80) : 'Slide ' + (i + 1);
        }

        init() {
            const { root } = this;
            root.style.setProperty('--deck-w', this.width + 'px');
            root.style.setProperty('--deck-h', this.height + 'px');
            if (this.width !== 1920 || this.height !== 1080) {
                const page = el('style', { [UI_ATTR]: '' });
                page.textContent = `@page { size: ${this.width}px ${this.height}px; margin: 0; }`;
                document.head.appendChild(page);
            }
            if (!root.hasAttribute('aria-label')) {
                root.setAttribute('aria-label', document.title || 'Slide deck');
                this.autoLabel = true;
            }
            root.setAttribute('aria-roledescription', 'slide deck');
            this.slides.forEach((s, i) => {
                s.setAttribute('role', 'group');
                s.setAttribute('aria-roledescription', 'slide');
                s.setAttribute('aria-label', `${i + 1} of ${this.slides.length}: ${this.labels[i]}`);
            });

            if (MODE === 'presenter') return this.initPresenter();

            this.buildChrome();
            this.bindInput();
            this.bindSync();
            this.fit();
            new ResizeObserver(() => this.fit()).observe(root);
            window.addEventListener('beforeprint', () => this.setPrintMode(true));
            window.addEventListener('afterprint', () => this.setPrintMode(false));
            window.addEventListener('hashchange', () => {
                const h = parseHash();
                if (h && (h.index !== this.index || h.step !== this.step)) this.goTo(h.index, h.step, 'hash');
            });

            const h = parseHash();
            this.goTo(h ? h.index : 0, h ? h.step : 0, 'init');
            root.classList.add('deck-ready');
            this.emit('deck:ready', { total: this.slides.length });
        }

        buildChrome() {
            const ui = [];
            if (MODE === 'embed') {
                this.root.classList.add('is-embedded');
            }
            this.live = el('div', { class: 'deck-sr', 'aria-live': 'polite', [UI_ATTR]: '' });
            ui.push(this.live);

            const chrome = this.root.dataset.ui !== 'none' && MODE !== 'embed';
            if (chrome) {
                this.ui = el('div', { class: 'deck-ui', role: 'toolbar', 'aria-label': 'Deck controls', [UI_ATTR]: '' },
                    '<button type="button" data-act="prev" aria-label="Previous">&#8592;</button>' +
                    '<span class="deck-counter"></span>' +
                    '<button type="button" data-act="next" aria-label="Next">&#8594;</button>' +
                    '<button type="button" data-act="help" aria-label="Keyboard shortcuts">?</button>');
                this.ui.addEventListener('click', (e) => {
                    const act = e.target.closest('button')?.dataset.act;
                    if (act === 'prev') this.prev();
                    if (act === 'next') this.next();
                    if (act === 'help') this.toggleHelp();
                });
                this.counter = this.ui.querySelector('.deck-counter');
                ui.push(this.ui);
                if (this.root.dataset.progress !== 'off') {
                    this.progress = el('div', { class: 'deck-progress', 'aria-hidden': 'true', [UI_ATTR]: '' }, '<span></span>');
                    ui.push(this.progress);
                }
            }

            this.help = el('div', { class: 'deck-panel deck-help', role: 'dialog', 'aria-label': 'Keyboard shortcuts', hidden: '', [UI_ATTR]: '' },
                '<h2>Keyboard</h2><dl>' +
                '<dt>&#8594; Space PgDn</dt><dd>Next step or slide</dd>' +
                '<dt>&#8592; PgUp</dt><dd>Previous</dd>' +
                '<dt>Home / End</dt><dd>First / last slide</dd>' +
                '<dt>12 Enter</dt><dd>Go to slide 12</dd>' +
                '<dt>O</dt><dd>Overview</dd>' +
                '<dt>S</dt><dd>Presenter view</dd>' +
                '<dt>F</dt><dd>Fullscreen</dd>' +
                '<dt>B or .</dt><dd>Black screen</dd>' +
                '<dt>E</dt><dd>Edit text, then Cmd/Ctrl+S to save</dd>' +
                '<dt>Esc</dt><dd>Close</dd></dl>');
            this.editbar = el('div', { class: 'deck-panel deck-editbar', hidden: '', [UI_ATTR]: '' },
                'Editing &middot; Cmd/Ctrl+S saves a copy &middot; Esc to finish');
            ui.push(this.help, this.editbar);

            const anchor = this.root.nextSibling;
            for (const node of ui) this.root.parentNode.insertBefore(node, anchor);
        }

        /* ---------- scaling ---------- */

        fit() {
            if (this.root.classList.contains('is-print')) return;
            const vw = this.root.clientWidth;
            const vh = this.root.clientHeight;
            if (!vw || !vh) return;
            const s = Math.min(vw / this.width, vh / this.height);
            const x = (vw - this.width * s) / 2;
            const y = (vh - this.height * s) / 2;
            this.scale = s;
            this.stage.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
            this.root.style.setProperty('--deck-scale', String(s));
            if (this.root.classList.contains('is-overview')) this.layoutOverview();
        }

        /* ---------- navigation ---------- */

        get total() {
            return this.slides.length;
        }

        next() {
            if (this.step < this.steps[this.index].length) return this.goTo(this.index, this.step + 1, 'next');
            if (this.index < this.total - 1) this.goTo(this.index + 1, 0, 'next');
        }

        prev() {
            if (this.step > 0) return this.goTo(this.index, this.step - 1, 'prev');
            if (this.index > 0) this.goTo(this.index - 1, this.steps[this.index - 1].length, 'prev');
        }

        goTo(index, step = 0, reason = 'api') {
            if (!this.total) return;
            const previous = this.index;
            const first = reason === 'init';
            this.index = clamp(Number(index) || 0, 0, this.total - 1);
            this.step = clamp(Number(step) || 0, 0, this.steps[this.index].length);
            this.render(first || previous !== this.index);
            if (reason !== 'sync') this.broadcast();
            this.emit('deck:change', {
                index: this.index,
                previousIndex: first ? -1 : previous,
                step: this.step,
                total: this.total,
                slide: this.slides[this.index],
                reason,
            });
        }

        render(slideChanged) {
            this.slides.forEach((s, i) => {
                const on = i === this.index;
                s.classList.toggle('active', on);
                s.toggleAttribute('inert', !on);
                s.setAttribute('aria-hidden', on ? 'false' : 'true');
            });
            this.steps[this.index].forEach((group, g) =>
                group.forEach((n) => n.classList.toggle('step-visible', g < this.step)));
            if (slideChanged) {
                // Steps on other slides reset so they replay next time.
                this.steps.forEach((groups, i) => {
                    if (i !== this.index) groups.flat().forEach((n) => n.classList.remove('step-visible'));
                });
                this.replayAnimations(this.slides[this.index]);
                if (this.live) this.live.textContent = this.slides[this.index].getAttribute('aria-label');
            }
            const hash = hashFor(this.index, this.step);
            if (location.hash !== hash) {
                try { history.replaceState(null, '', hash); } catch (_) { /* file:// in some browsers */ }
            }
            if (this.counter) this.counter.textContent = `${this.index + 1} / ${this.total}`;
            if (this.progress) {
                const p = this.total > 1 ? this.index / (this.total - 1) : 1;
                this.progress.firstChild.style.transform = `scaleX(${p})`;
            }
        }

        replayAnimations(slide) {
            for (const node of slide.querySelectorAll('[data-animate]')) {
                if (!node.getAnimations) continue;
                for (const a of node.getAnimations()) {
                    try { a.currentTime = 0; } catch (_) { /* ignore */ }
                }
            }
        }

        /* ---------- input ---------- */

        bindInput() {
            if (MODE === 'embed') return;
            document.addEventListener('keydown', (e) => this.onKey(e));

            let idle;
            const wake = () => {
                if (!this.ui) return;
                this.ui.classList.add('is-visible');
                clearTimeout(idle);
                idle = setTimeout(() => this.ui.classList.remove('is-visible'), 1800);
            };
            document.addEventListener('mousemove', wake, { passive: true });
            this.wake = wake;

            if (this.root.dataset.wheel !== 'off') {
                let acc = 0;
                let lock = 0;
                this.root.addEventListener('wheel', (e) => {
                    if (e.ctrlKey || this.root.classList.contains('is-overview') || this.editing) return;
                    const now = Date.now();
                    if (now < lock) return;
                    acc += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
                    if (Math.abs(acc) < 60) return;
                    acc > 0 ? this.next() : this.prev();
                    acc = 0;
                    lock = now + 650;
                }, { passive: true });
            }

            let sx = 0;
            let sy = 0;
            this.root.addEventListener('touchstart', (e) => {
                sx = e.touches[0].clientX;
                sy = e.touches[0].clientY;
            }, { passive: true });
            this.root.addEventListener('touchend', (e) => {
                if (this.editing) return;
                const dx = e.changedTouches[0].clientX - sx;
                const dy = e.changedTouches[0].clientY - sy;
                if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) dx < 0 ? this.next() : this.prev();
            }, { passive: true });

            // Touch screens: tap the left third to go back, anywhere else to go on.
            // Taps on links, buttons, media and form fields keep working normally.
            const coarse = matchMedia('(hover: none) and (pointer: coarse)');
            const interactive = 'a,button,input,select,textarea,label,video,audio,iframe,summary,[contenteditable],[data-no-tap]';
            this.root.addEventListener('click', (e) => {
                if (this.root.classList.contains('is-overview')) {
                    const slide = e.target.closest('.slide');
                    if (slide) this.toggleOverview(this.slides.indexOf(slide));
                    return;
                }
                if (!coarse.matches || this.editing || e.target.closest(interactive)) return;
                e.clientX < this.root.clientWidth / 3 ? this.prev() : this.next();
            });

            window.addEventListener('beforeunload', (e) => {
                if (this.dirty) {
                    e.preventDefault();
                    e.returnValue = '';
                }
            });
        }

        onKey(e) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && (this.editing || this.dirty)) {
                e.preventDefault();
                return this.save();
            }
            if (e.key === 'Escape') {
                if (this.editing) return this.toggleEdit(false);
                if (!this.help.hidden) return this.toggleHelp(false);
                if (this.root.classList.contains('is-overview')) return this.toggleOverview();
                return;
            }
            if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
            if (this.editing) return;
            if (this.wake) this.wake();

            const overview = this.root.classList.contains('is-overview');
            const k = e.key;

            if (overview) {
                const cols = this.overviewCols || 1;
                const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
                if (k in moves) {
                    e.preventDefault();
                    this.overviewFocus = clamp(this.overviewFocus + moves[k], 0, this.total - 1);
                    return this.markOverviewFocus();
                }
                if (k === 'Enter' || k === ' ') {
                    e.preventDefault();
                    return this.toggleOverview(this.overviewFocus);
                }
                if (k === 'o' || k === 'O') return this.toggleOverview();
                return;
            }

            if (/^\d$/.test(k)) {
                this.typedNumber = (this.typedNumber + k).slice(-4);
                clearTimeout(this.typedTimer);
                this.typedTimer = setTimeout(() => (this.typedNumber = ''), 1500);
                return;
            }

            switch (k) {
                case 'ArrowRight':
                case 'ArrowDown':
                case 'PageDown':
                case ' ':
                case 'n':
                case 'N':
                    if (k === ' ' && e.shiftKey) this.prev();
                    else this.next();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                case 'PageUp':
                case 'Backspace':
                    this.prev();
                    break;
                case 'Enter':
                    if (this.typedNumber) {
                        this.goTo(parseInt(this.typedNumber, 10) - 1, 0, 'keyboard');
                        this.typedNumber = '';
                    } else {
                        this.next();
                    }
                    break;
                case 'Home':
                    this.goTo(0, 0, 'keyboard');
                    break;
                case 'End':
                    this.goTo(this.total - 1, 0, 'keyboard');
                    break;
                case 'o':
                case 'O':
                    this.toggleOverview();
                    break;
                case 's':
                case 'S':
                    this.openPresenter();
                    break;
                case 'e':
                case 'E':
                    this.toggleEdit(true);
                    break;
                case 'f':
                case 'F':
                    this.toggleFullscreen();
                    break;
                case 'b':
                case 'B':
                case '.':
                    this.root.classList.toggle('is-blackout');
                    break;
                case '?':
                    this.toggleHelp();
                    break;
                default:
                    return;
            }
            e.preventDefault();
        }

        /* ---------- overview ---------- */

        toggleOverview(selectIndex) {
            const on = !this.root.classList.contains('is-overview');
            this.root.classList.toggle('is-overview', on);
            if (on) {
                this.overviewFocus = this.index;
                this.layoutOverview();
                this.markOverviewFocus();
                this.slides.forEach((s) => s.removeAttribute('inert'));
            } else {
                this.slides.forEach((s) => {
                    s.style.transform = '';
                    s.classList.remove('is-focused');
                });
                if (typeof selectIndex === 'number') this.goTo(selectIndex, 0, 'overview');
                else this.render(false);
            }
        }

        layoutOverview() {
            const W = this.width;
            const H = this.height;
            const n = this.total;
            const gap = 32;
            let best = { s: 0, cols: 1, rows: 1 };
            for (let cols = 1; cols <= n; cols++) {
                const rows = Math.ceil(n / cols);
                const s = Math.min((W - gap * (cols + 1)) / (cols * W), (H - gap * (rows + 1)) / (rows * H));
                if (s > best.s) best = { s, cols, rows };
            }
            const { s, cols, rows } = best;
            const offX = (W - (cols * W * s + gap * (cols - 1))) / 2;
            const offY = (H - (rows * H * s + gap * (rows - 1))) / 2;
            this.overviewCols = cols;
            this.slides.forEach((slide, i) => {
                const x = offX + (i % cols) * (W * s + gap);
                const y = offY + Math.floor(i / cols) * (H * s + gap);
                slide.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
            });
        }

        markOverviewFocus() {
            this.slides.forEach((s, i) => s.classList.toggle('is-focused', i === this.overviewFocus));
        }

        /* ---------- editing ---------- */

        toggleEdit(force) {
            const on = typeof force === 'boolean' ? force : !this.editing;
            if (on === !!this.editing) return;
            this.editing = on;
            this.root.classList.toggle('is-editing', on);
            this.editbar.hidden = !on;
            const nodes = this.stage.querySelectorAll(EDITABLE);
            for (const node of nodes) {
                if (node.closest('.notes')) continue;
                if (on) {
                    node.setAttribute('contenteditable', 'true');
                    node.setAttribute('spellcheck', 'false');
                } else {
                    node.removeAttribute('contenteditable');
                    node.removeAttribute('spellcheck');
                }
            }
            if (on) {
                this.onInput = () => (this.dirty = true);
                this.stage.addEventListener('input', this.onInput);
            } else {
                this.stage.removeEventListener('input', this.onInput);
                if (document.activeElement && this.stage.contains(document.activeElement)) document.activeElement.blur();
            }
        }

        /** The document as authored: runtime state and chrome stripped. */
        serialize() {
            const doc = document.documentElement.cloneNode(true);
            doc.querySelectorAll(`[${UI_ATTR}]`).forEach((n) => n.remove());
            const root = doc.querySelector('.deck');
            root.classList.remove('deck-ready', 'is-editing', 'is-overview', 'is-blackout', 'is-print', 'is-embedded');
            root.removeAttribute('aria-roledescription');
            if (this.autoLabel) root.removeAttribute('aria-label');
            root.style.removeProperty('--deck-w');
            root.style.removeProperty('--deck-h');
            root.style.removeProperty('--deck-scale');
            if (!root.getAttribute('style')) root.removeAttribute('style');
            const stage = root.querySelector('.deck-stage');
            stage.removeAttribute('style');
            for (const s of stage.querySelectorAll(':scope > .slide')) {
                s.classList.remove('active', 'is-focused');
                ['inert', 'aria-hidden', 'role', 'aria-roledescription', 'aria-label'].forEach((a) => s.removeAttribute(a));
                s.style.removeProperty('transform');
                if (!s.getAttribute('style')) s.removeAttribute('style');
            }
            doc.querySelectorAll('[contenteditable]').forEach((n) => {
                n.removeAttribute('contenteditable');
                n.removeAttribute('spellcheck');
            });
            doc.querySelectorAll('.step-visible').forEach((n) => n.classList.remove('step-visible'));
            doc.querySelectorAll('[class=""]').forEach((n) => n.removeAttribute('class'));
            return '<!DOCTYPE html>\n' + doc.outerHTML + '\n';
        }

        save() {
            const html = this.serialize();
            const name = decodeURIComponent(location.pathname.split('/').pop() || 'deck.html') || 'deck.html';
            const a = el('a', { href: URL.createObjectURL(new Blob([html], { type: 'text/html' })), download: name });
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 5000);
            this.dirty = false;
            this.editbar.textContent = `Saved a copy as ${name}. Replace the original with it to keep your edits.`;
        }

        /* ---------- misc ---------- */

        toggleHelp(force) {
            this.help.hidden = typeof force === 'boolean' ? !force : !this.help.hidden;
        }

        toggleFullscreen() {
            if (document.fullscreenElement) document.exitFullscreen?.();
            else document.documentElement.requestFullscreen?.().catch(() => {});
        }

        /** Lay every slide out for print/PDF capture with all builds shown. */
        setPrintMode(on) {
            this.root.classList.toggle('is-print', on);
            if (on) {
                this.slides.forEach((s) => {
                    s.classList.add('active');
                    s.removeAttribute('inert');
                    s.setAttribute('aria-hidden', 'false');
                });
                this.steps.flat(2).forEach((n) => n.classList.add('step-visible'));
            } else {
                this.steps.flat(2).forEach((n) => n.classList.remove('step-visible'));
                this.render(true);
                this.fit();
            }
        }

        emit(type, detail) {
            this.root.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
            (this.listeners[type] || []).forEach((fn) => fn(detail));
        }

        /* ---------- presenter sync ---------- */

        openPresenter() {
            const win = window.open(urlFor('presenter', this.index, this.step), 'deck-presenter', 'width=1280,height=800');
            if (win) this.peers.add(win);
        }

        bindSync() {
            window.addEventListener('message', (e) => {
                const d = e.data;
                if (!d || d.source !== MSG || d.type !== 'sync') return;
                if (e.source && e.source !== window) this.peers.add(e.source);
                if (d.index !== this.index || d.step !== this.step) this.goTo(d.index, d.step, 'sync');
            });
        }

        broadcast() {
            const msg = { source: MSG, type: 'sync', index: this.index, step: this.step };
            for (const peer of this.peers) {
                try {
                    if (peer.closed) this.peers.delete(peer);
                    else peer.postMessage(msg, '*');
                } catch (_) {
                    this.peers.delete(peer);
                }
            }
        }

        initPresenter() {
            document.body.classList.add('deck-presenter');
            document.title = 'Presenter: ' + document.title;
            const view = el('div', { class: 'deck-presenter-view', [UI_ATTR]: '' },
                '<header><span class="pv-count"></span><span class="pv-timer">00:00</span>' +
                '<span class="pv-clock"></span><button type="button" class="pv-reset">reset timer</button></header>' +
                '<div class="pv-frame pv-current"><iframe title="Current slide"></iframe></div>' +
                '<div class="pv-frame pv-next"><span class="pv-label">Next</span><iframe title="Next slide"></iframe></div>' +
                '<div class="pv-notes" aria-live="polite"></div>');
            document.body.appendChild(view);
            const [cur, nxt] = view.querySelectorAll('iframe');
            cur.src = urlFor('embed', 0, 0);
            nxt.src = urlFor('embed', 0, 0);
            if (window.opener) this.peers.add(window.opener);
            this.frames = { cur, nxt, ready: 0 };
            const onLoad = () => {
                this.frames.ready++;
                this.presenterRender();
            };
            cur.addEventListener('load', onLoad);
            nxt.addEventListener('load', onLoad);

            let start = Date.now();
            const pad = (n) => String(n).padStart(2, '0');
            const tick = () => {
                const t = Math.floor((Date.now() - start) / 1000);
                view.querySelector('.pv-timer').textContent = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
                view.querySelector('.pv-clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            };
            setInterval(tick, 1000);
            tick();
            view.querySelector('.pv-reset').addEventListener('click', () => {
                start = Date.now();
                tick();
            });

            this.pv = view;
            this.render = () => this.presenterRender();
            this.fit = () => {};
            this.help = { hidden: true };
            document.addEventListener('keydown', (e) => {
                if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
                const fwd = ['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'n', 'Enter'];
                const back = ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'];
                if (fwd.includes(e.key) && !(e.key === ' ' && e.shiftKey)) this.next();
                else if (back.includes(e.key) || (e.key === ' ' && e.shiftKey)) this.prev();
                else if (e.key === 'Home') this.goTo(0, 0, 'keyboard');
                else if (e.key === 'End') this.goTo(this.total - 1, 0, 'keyboard');
                else return;
                e.preventDefault();
            });
            this.bindSync();
            const h = parseHash();
            this.goTo(h ? h.index : 0, h ? h.step : 0, 'init');
            this.emit('deck:ready', { total: this.slides.length, presenter: true });
        }

        presenterRender() {
            const { cur, nxt } = this.frames;
            const post = (frame, index, step) => {
                try { frame.contentWindow.postMessage({ source: MSG, type: 'sync', index, step }, '*'); } catch (_) { /* not loaded */ }
            };
            post(cur, this.index, this.step);
            // "Next" shows the next build step if there is one, otherwise the next slide.
            const more = this.step < this.steps[this.index].length;
            const last = this.index >= this.total - 1 && !more;
            nxt.style.visibility = last ? 'hidden' : 'visible';
            post(nxt, more ? this.index : this.index + 1, more ? this.step + 1 : 0);
            this.pv.querySelector('.pv-count').textContent =
                `${this.index + 1} / ${this.total}` + (this.steps[this.index].length ? `  step ${this.step}/${this.steps[this.index].length}` : '');
            const notes = this.slides[this.index].querySelector('.notes');
            const box = this.pv.querySelector('.pv-notes');
            box.replaceChildren(...(notes ? Array.from(notes.cloneNode(true).childNodes) : []));
            try { history.replaceState(null, '', urlFor('presenter', this.index, this.step)); } catch (_) { /* ignore */ }
        }
    }

    function boot() {
        const root = document.querySelector('.deck');
        if (!root) {
            console.warn('[deck] No .deck element found.');
            return;
        }
        if (root.__deck) return;
        const deck = new Deck(root);
        root.__deck = deck;
        window.deck = {
            version: VERSION,
            mode: MODE,
            get index() { return deck.index; },
            get step() { return deck.step; },
            get total() { return deck.total; },
            get slides() { return deck.slides.slice(); },
            stepsOf: (i) => deck.steps[i].length,
            next: () => deck.next(),
            prev: () => deck.prev(),
            goTo: (i, step) => deck.goTo(i, step, 'api'),
            toggleOverview: () => deck.toggleOverview(),
            toggleEdit: (on) => deck.toggleEdit(on),
            openPresenter: () => deck.openPresenter(),
            setPrintMode: (on) => deck.setPrintMode(on),
            serialize: () => deck.serialize(),
            fit: () => deck.fit(),
            on(type, fn) {
                (deck.listeners[type] ||= []).push(fn);
                return () => (deck.listeners[type] = deck.listeners[type].filter((f) => f !== fn));
            },
        };
        deck.init();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
