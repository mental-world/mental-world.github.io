/* Page orchestration: math typesetting, the sticky bar and scrollspy, the
   reveal pass, the living dot-grid behind the content sections, and the small
   interactions that do not belong to any one stage. */

import { CONFIG } from './config.js';
import { renderMath } from './mathx.js';
import { initHero } from './hero.js';
import { initMWM } from './mwm.js';
import { initTaxonomy } from './taxonomy.js';
import { initPipeline } from './pipeline.js';
import { initCharts } from './charts.js';
import { registerAudio, claimAudio } from './audio.js';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── links that depend on config ──────────────────────────── */
function initLinks() {
  document.querySelectorAll('a[data-link=paper]').forEach((a) => {
    if (CONFIG.PAPER_URL) {
      a.href = CONFIG.PAPER_URL;
      a.target = '_blank';
      a.rel = 'noopener';
    } else {
      a.classList.add('is-soon');
      a.addEventListener('click', (e) => {
        e.preventDefault();
        a.classList.add('shake');
        setTimeout(() => a.classList.remove('shake'), 500);
      });
    }
  });
  document.querySelectorAll('a[href^="https://github.com/mental-world"]').forEach((a) => {
    if (CONFIG.CODE_URL) a.href = CONFIG.CODE_URL;
  });
}

/* ── topbar: stick, and follow the reader ─────────────────── */
function initBar() {
  const bar = document.getElementById('topbar');
  const links = [...document.querySelectorAll('.tnav a[data-nav]')];
  const secs = links.map((a) => document.getElementById(a.dataset.nav)).filter(Boolean);

  const onScroll = () => bar.classList.toggle('is-stuck', window.scrollY > window.innerHeight * 0.72);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (!secs.length) return;
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('is-cur', a.dataset.nav === e.target.id));
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );
  secs.forEach((s) => spy.observe(s));
}

/* ── reveals ──────────────────────────────────────────────── */
function initReveal() {
  const targets = document.querySelectorAll(
    '.sec-head, .pfilm, .tax-grid, .prop-box, ' +
    '.pipe, .fig-fold, .chart-block, .table-block, .cond-row, .cite-top, .authors, .fnd, .app'
  );
  if (reduce) {
    targets.forEach((t) => t.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries, o) => {
      entries.forEach((e, i) => {
        if (!e.isIntersecting) return;
        setTimeout(() => e.target.classList.add('in'), i * 70);
        o.unobserve(e.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.06 }
  );
  targets.forEach((t) => {
    t.classList.add('rv');
    io.observe(t);
  });
}

/* ── the dot field behind the content sections ────────────────
   A quiet lattice that falls toward the cursor and lights up around it, the
   page's ambient reminder that the state is a field of coupled points.

   The canvases are viewport-fixed rather than section-sized, so every section
   costs the same ~1500x950 no matter how tall it is, and the lattice is laid
   out in page coordinates so it still looks nailed to the document. One cursor
   in viewport space serves all of them, and each canvas is clipped to the band
   its own section currently occupies. */
const DOT = {
  GAP: 19,          /* lattice pitch, px */
  R: 340,           /* how far the well reaches */
  PULL: 52,         /* px a dot falls at the centre of the well */
  EASE: 0.16,       /* approach rate — the lag is what makes it read as mass */
  BASE: 1.0,        /* dot radius at rest */
  GROW: 2.3         /* extra radius at the centre of the well */
};

function initDots() {
  const canvases = [...document.querySelectorAll('canvas[data-bg=dots]')];
  if (!canvases.length) return;

  /* viewport-space cursor, shared: the canvases are fixed, so this needs no
     per-canvas rect and no listener per section */
  const P = { x: -9e3, y: -9e3, on: false };
  addEventListener('pointermove', (e) => { P.x = e.clientX; P.y = e.clientY; P.on = true; }, { passive: true });
  addEventListener('pointerdown', (e) => { P.x = e.clientX; P.y = e.clientY; P.on = true; }, { passive: true });
  addEventListener('pointerleave', () => { P.on = false; }, { passive: true });
  addEventListener('blur', () => { P.on = false; });

  const R2 = DOT.R * DOT.R;

  const fields = canvases.map((cv) => {
    const ctx = cv.getContext('2d');
    const host = cv.parentElement;
    let dots = [], w = 0, h = 0, live = false, t = 0, sized = false, clip = '';

    /* Every canvas is viewport-sized, so holding all seven backing stores at once
       costs ~160MB for six fields nobody is looking at. The store is allocated on
       the way into view and dropped on the way out; the lattice itself is cheap
       and stays, so coming back is a resize, not a rebuild. */
    function size() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sized = true;
    }

    /* Columns and rows cover the viewport with one lattice step of slack all
       round, so a dot dragged in from off screen has somewhere to come from. */
    function build() {
      w = innerWidth;
      h = innerHeight;
      sized = false;
      cv.width = cv.height = 0;
      dots = [];
      const cols = Math.ceil(w / DOT.GAP) + 2;
      const rows = Math.ceil(h / DOT.GAP) + 2;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          dots.push({
            i, j,
            ox: 0, oy: 0,                       /* current offset from the lattice */
            ph: (i * 7 + j * 13) % 100,
            c: (i + j) % 17 === 0 ? 1 : ((i * 3 + j) % 23 === 0 ? 2 : 0)
          });
        }
      }
    }

    /* three flat batches for the dots the cursor is nowhere near — one fill each
       instead of one per dot, which is what buys the density */
    const far = [new Path2D(), new Path2D(), new Path2D()];

    function draw() {
      if (!live) return;
      const r = host.getBoundingClientRect();
      const top = Math.max(r.top, 0), bot = Math.min(r.bottom, h);
      if (bot <= top) return;
      if (!sized) size();
      /* only the band this section owns; the canvas spans the whole viewport.
         Written only on change — assigning it every frame invalidates the whole
         fixed layer and forces a full-viewport repaint. */
      const want = `inset(${Math.round(top)}px 0 ${Math.round(h - bot)}px 0)`;
      if (want !== clip) { clip = want; cv.style.clipPath = want; }

      t += 0.006;
      /* phase so the lattice sits still on the page while the canvas does not */
      const px = -(scrollX % DOT.GAP), py = -(scrollY % DOT.GAP);

      ctx.clearRect(0, 0, w, h);
      far[0] = new Path2D(); far[1] = new Path2D(); far[2] = new Path2D();

      for (let k = 0; k < dots.length; k++) {
        const d = dots[k];
        const ax = px + d.i * DOT.GAP, ay = py + d.j * DOT.GAP;
        const dx = P.x - ax, dy = P.y - ay;
        const q = dx * dx + dy * dy;

        let near = 0, tx = 0, ty = 0;
        if (P.on && q < R2) {
          const dist = Math.sqrt(q) || 0.001;
          near = 1 - dist / DOT.R;
          /* t^1.5: steeper than linear so the well has a throat, shallower than
             the square so the outer half of the radius still visibly leans in */
          let fall = near * Math.sqrt(near) * DOT.PULL;
          if (fall > dist * 0.86) fall = dist * 0.86;   /* never past the centre */
          tx = (dx / dist) * fall;
          ty = (dy / dist) * fall;
        }
        d.ox += (tx - d.ox) * DOT.EASE;
        d.oy += (ty - d.oy) * DOT.EASE;

        const bob = reduce ? 0 : Math.sin(t * 2.2 + d.ph) * 0.9;
        const x = ax + d.ox, y = ay + d.oy + bob;

        if (near > 0.012) {
          const e = near * near;
          ctx.beginPath();
          ctx.arc(x, y, DOT.BASE + e * DOT.GROW, 0, 6.2832);
          const a = 0.17 + e * 0.7;
          ctx.fillStyle = d.c === 1 ? `rgba(47,109,174,${a * 1.05})`
            : d.c === 2 ? `rgba(122,85,196,${a})`
              : `rgba(160,140,96,${a * 0.92})`;
          ctx.fill();
        } else {
          const p = far[d.c];
          p.moveTo(x + DOT.BASE, y);
          p.arc(x, y, DOT.BASE, 0, 6.2832);
        }
      }

      ctx.fillStyle = 'rgba(47,109,174,.18)'; ctx.fill(far[1]);
      ctx.fillStyle = 'rgba(122,85,196,.17)'; ctx.fill(far[2]);
      ctx.fillStyle = 'rgba(160,140,96,.157)'; ctx.fill(far[0]);

      /* the well's own light — without it the dots read as merely displaced
         rather than as falling into something */
      if (P.on && P.y > top - DOT.R && P.y < bot + DOT.R) {
        const g = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, DOT.R * 0.62);
        g.addColorStop(0, 'rgba(160,140,96,.085)');
        g.addColorStop(0.45, 'rgba(122,85,196,.038)');
        g.addColorStop(1, 'rgba(122,85,196,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    }

    new IntersectionObserver((es) => {
      live = es[0].isIntersecting;
      if (!live) { cv.width = cv.height = 0; sized = false; clip = ''; }
    }, { threshold: 0 }).observe(host);

    return { build, draw };
  });

  fields.forEach((f) => f.build());
  addEventListener('resize', () => fields.forEach((f) => f.build()), { passive: true });

  /* one loop for the page, not one per section */
  (function frame() {
    requestAnimationFrame(frame);
    for (let i = 0; i < fields.length; i++) fields[i].draw();
  })();
}

/* ── the premise film ─────────────────────────────────────── */
/* The film's narration, transcribed off its own audio and cut at the clause the
   voice cuts at, so a caption never spans two beats of the edit. Times are in
   seconds against motivation.mp4 (15.09s); re-cutting the film means re-timing
   these. The last one runs past the end on purpose — the closing claim should
   still be on screen when the picture stops. */
const FILM_CUES = [
  { from: 0.00, to: 2.05, text: 'She last knew her mug was on the table.' },
  { from: 2.05, to: 4.32, text: 'While she looks away, it is moved into the cabinet.' },
  { from: 4.32, to: 6.57, text: 'Now the task is to predict her next action.' },
  { from: 6.57, to: 9.55, text: 'Tracking objects alone predicts “go straight to the cabinet.”' },
  { from: 9.55, to: 10.25, text: 'Wrong.' },
  { from: 10.25, to: 11.75, text: 'To predict the next action,' },
  { from: 11.75, to: 99, text: 'model not only the world, but also the mind.' }
];

function initPremise() {
  const v = document.getElementById('pfVideo');
  if (!v) return;
  const fig = document.getElementById('pfilm');
  const frame = document.getElementById('pfFrame');
  const tap = document.getElementById('pfTap');
  const sound = document.getElementById('pfSound');
  const loop = document.getElementById('pfLoop');
  const fill = document.getElementById('pfFill');
  const sub = document.getElementById('pfSub');
  const subLine = sub.firstElementChild;

  /* once the reader has stopped it by hand, scrolling stops deciding for them:
     a film they deliberately paused must not restart on the next scroll */
  let touched = false;

  let cue = -1;
  const say = () => {
    const t = v.currentTime;
    let i = -1;
    for (let k = 0; k < FILM_CUES.length; k++) {
      if (t >= FILM_CUES[k].from && t < FILM_CUES[k].to) { i = k; break; }
    }
    if (i === cue) return;
    cue = i;
    /* the old line is left in place on the way out, so a gap between cues fades
       the plate away instead of blanking it a beat before it goes */
    if (i >= 0) subLine.textContent = FILM_CUES[i].text;
    sub.classList.toggle('is-on', i >= 0);
  };

  const tick = () => {
    if (v.duration) fill.style.width = (v.currentTime / v.duration) * 100 + '%';
    say();
  };

  /* timeupdate fires about four times a second, which shows as a quarter-second
     of the wrong line at every cut. The clock is read per frame while the film
     runs, and once more on each event that can move it while it does not. */
  let raf = 0;
  const run = () => { tick(); raf = requestAnimationFrame(run); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; tick(); };

  const sync = () => {
    const on = !v.paused && !v.ended;
    frame.classList.toggle('is-paused', !on);
    tap.setAttribute('aria-label', on ? 'Pause' : 'Play');
    if (on && !raf) run();
    if (!on && raf) stop();
  };
  ['play', 'pause', 'ended'].forEach((e) => v.addEventListener(e, sync));
  v.addEventListener('seeked', tick);

  tap.addEventListener('click', () => {
    touched = true;
    /* at the end the frame is a replay button in all but name */
    if (v.ended) v.currentTime = 0;
    v.paused ? v.play() : v.pause();
  });

  const setSound = (on) => {
    v.muted = !on;
    if (on && v.volume === 0) v.volume = 1;
    sound.classList.toggle('is-muted', !on);
    sound.setAttribute('aria-label', on ? 'Mute' : 'Turn sound on');
    /* the hero's clips are the other things on this page that can speak */
    if (on) claimAudio(v);
  };
  registerAudio(v, () => setSound(false));

  sound.addEventListener('click', () => {
    setSound(v.muted);
    /* turning the sound on is a gesture, so it is also the moment audio may
       start — a film someone has just unmuted should not be sitting paused */
    if (!v.muted && v.paused) { touched = true; v.play().catch(() => {}); }
  });

  loop.addEventListener('click', () => {
    v.loop = !v.loop;
    loop.classList.toggle('is-on', v.loop);
    loop.setAttribute('aria-pressed', String(v.loop));
    /* asking for it again while it is sitting on the last frame means now */
    if (v.loop && v.ended) { v.currentTime = 0; v.play().catch(() => {}); }
  });

  /* Starts on scroll and stops when it leaves, so it is running when it is
     looked at and not otherwise. Muted, because nothing else will autoplay. */
  new IntersectionObserver((es) => {
    if (reduce || touched) return;
    if (es[0].isIntersecting) v.play().catch(() => {});
    else v.pause();
  }, { threshold: 0.35 }).observe(fig);

  sync();
  tick();
}

/* ── section titles, one line each ────────────────────────── */
/* CSS cannot size type to fit a box, and these titles differ enough in length
   that one clamp() cannot serve them all: whatever suits "Mentis: a mental world
   model you can open up." leaves "What the experiments settle." far smaller than
   it could be. So the stylesheet sets the ceiling and this steps down from it.
   Measured off a Range rather than the element, which reports the column width,
   and only after the display face has loaded — fallback metrics are not close
   enough for a fit this tight. */
function initTitles() {
  const titles = [...document.querySelectorAll('.sec-title')];
  if (!titles.length) return;

  /* below this a title has shrunk past being a title; let it wrap instead */
  const FLOOR = 21;

  const fit = () => {
    titles.forEach((t) => {
      t.style.whiteSpace = 'nowrap';
      t.style.fontSize = '';
      const ceil = parseFloat(getComputedStyle(t).fontSize);
      const box = t.parentElement.clientWidth;
      const r = document.createRange();
      r.selectNodeContents(t);
      const w = r.getBoundingClientRect().width;
      if (!w || !box) return;

      const want = w > box ? ceil * (box / w) * 0.995 : ceil;
      if (want < FLOOR) { t.style.whiteSpace = 'normal'; return; }
      if (want < ceil) t.style.fontSize = want + 'px';
    });
  };

  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  let t = 0;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fit, 120); }, { passive: true });
}

/* ── bibtex ───────────────────────────────────────────────── */
function initCite() {
  const btn = document.getElementById('copyBib');
  const pre = document.getElementById('bibtex');
  if (!btn || !pre) return;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pre.textContent.trim());
      btn.textContent = 'copied';
    } catch {
      btn.textContent = 'select & copy';
    }
    setTimeout(() => { btn.textContent = 'copy'; }, 1800);
  });
}

/* ── nothing plays off screen ─────────────────────────────── */
/* Each stage starts its own footage; this is the one rule that stops it. A clip
   that has scrolled away is a decoder and a download nobody is watching, and if
   it has sound it is also talking over whatever the reader moved on to. Muted
   clips were autoplaying, so they pick up again on the way back; a clip with
   sound was started by a click, and only another click should restart it.
   The hero's city loop is the backdrop of a stage that is always beneath the
   fold and runs its own observer, so it is left alone. */
function initVideoGuard() {
  const off = new IntersectionObserver((es) => {
    es.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) {
        if (v.dataset.parked && !reduce) { delete v.dataset.parked; v.play().catch(() => {}); }
        return;
      }
      if (v.paused) return;
      if (v.muted) v.dataset.parked = '1';
      v.pause();
    });
  }, { threshold: 0 });

  const watch = (v) => { if (v.id !== 'heroVideo') off.observe(v); };
  document.querySelectorAll('video').forEach(watch);

  /* §02 grows and drops its clips as the strip recycles, and §03 swaps sources
     in and out, so the set is not fixed at boot */
  new MutationObserver((ms) => {
    ms.forEach((m) => m.addedNodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      if (n.tagName === 'VIDEO') watch(n);
      else n.querySelectorAll && n.querySelectorAll('video').forEach(watch);
    }));
  }).observe(document.body, { childList: true, subtree: true });

  /* another tab, or a locked screen, counts as not looking */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    document.querySelectorAll('video').forEach((v) => {
      if (v.id === 'heroVideo' || v.paused) return;
      if (v.muted) v.dataset.parked = '1';
      v.pause();
    });
  });
}

/* ── go ───────────────────────────────────────────────────── */
function boot() {
  initLinks();
  initBar();
  initDots();
  initPremise();
  initTitles();
  initCite();

  initTaxonomy();
  initPipeline();
  initCharts();

  renderMath(document);
  initReveal();

  initHero();
  initMWM();
  initVideoGuard();

  document.documentElement.classList.add('is-ready');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
