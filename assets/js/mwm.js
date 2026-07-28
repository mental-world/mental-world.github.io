/* Section 02 — Figure 1 of the paper, redrawn in the page and set moving.

   The figure is a strip of alternating panels: a two-column Mental World Model
   box (state | observation, with Ω in the gutter between them) and a
   one-column Target box. The printed figure has to show t and t+1 side by side
   to say "this repeats"; here the strip simply scrolls, so only two parties are
   ever on screen — the world model and the target it is simulating.

   Geometry is measured off fig1-teaser.jpg (4935 px wide): the MWM box is
   2159 px, the gap 213, the Target box 1061. Those add to one viewport, and so
   do Target + gap + MWM — which is what lets both halves of the choreography
   frame exactly. Everything else derives from --tg.

   Three units in the DOM are enough: once a unit has scrolled off the left it
   is dropped and a fresh one is grown on the right, and because the transform
   is re-derived from the new anchor's offsetLeft the swap costs zero pixels.
   That is also the moment the tick labels fall back to t. */

import { mx } from './mathx.js';

const IMG = 'assets/img/f1/';
const VID = 'assets/media/';

/* proportions, in units of one Target column */
const R_GAP = 213 / 1061;
const R_WM = 2159 / 1061;
const R_OM = 255 / 1061;          /* the Ω gutter inside the MWM box */

/* A beat holds for as long as its clip runs; DWELL is only the fallback for the
   cells that are still stills, and STALL the backstop for a clip that never
   loads at all — without it one failed request would freeze the strip. */
const DWELL = 7200;
const STALL = 26000;
const SLIDE = 900;                /* must match the transform transition */

/* Figure 1's own wording, plus one continuation tick so the loop has somewhere
   to go. Cells whose file ends in .mp4 hold a scene clip; the rest are still
   placeholders waiting for one. The figure prints two stills per physical cell
   (A and B); one clip now carries both, so those captions are merged. */
const TICKS = [
  {
    ment: [
      ['Alice', 'The gift is hidden in the closet. Keep the surprise.'],
      ['Bob', 'Where is the gift? I still can’t find it.']
    ],
    phy: ['S_t_phy.mp4', 'Alice hides the gift in the closet while Bob searches the next room.'],
    obsMent: ['Bob still doesn’t know where the gift is.', 'He is searching unsuccessfully.'],
    obsPhy: ['O_t_phy.mp4', 'All Alice can see: the gift still on its shelf, and Bob searching at a distance.'],
    actMent: ['A_t_ment.mp4', 'Alice decides to redirect Bob’s search toward the kitchen.'],
    actPhy: ['A_t_phy.mp4', 'Alice speaks and points toward the kitchen.']
  },
  {
    ment: [
      ['Alice', 'Bob is heading the wrong way. The surprise is still safe.'],
      ['Bob', 'Maybe the gift is in the kitchen.']
    ],
    phy: ['S_t+1_phy.mp4', 'Bob searches the kitchen he was sent to; the gift stays in the closet.'],
    obsMent: ['Bob now believes the gift may be in the kitchen.', 'He is running out of patience.'],
    obsPhy: ['s1phy-b.jpg', 'Bob is opening cupboards in the kitchen.'],
    actMent: ['ament.jpg', 'Alice lets the kitchen search fail, then steers Bob back.'],
    actPhy: ['aphy.jpg', 'Alice says she thought she saw it near the living room.']
  }
];

const LABELS = ['t', 't+1', 't+2'];
const NEXT = { t: 't+1', 't+1': 't+2', 't+2': 't+3' };
const sub = (L) => (L.length > 1 ? `{${L}}` : L);

/* ── pieces ──────────────────────────────────────────────────── */

/* A thought bubble drawn to the box it actually occupies. A single fixed path
   scaled with preserveAspectRatio="none" cannot work here: the same outline has
   to serve a 190x50 speech line and a 190x175 merged thought, and squashing one
   arc 1.6x across while stretching it 1.7x down turns the bumps into ripples.
   So the crests are walked around a rounded rectangle inset into the measured
   box, at a pitch that stays put — a bigger cloud gets more bumps, not bigger
   ones, which is what keeps every cloud on the page the same creature.

   A rounded rectangle rather than an ellipse for two reasons. An ellipse fits a
   line of text badly: it pinches exactly where the first and last line end, so a
   wide flat bubble either loses its text or has to be padded absurdly. And a
   near-square cell drawn on an ellipse comes out a circle, which reads as a
   balloon, not a cloud. The rounded rect keeps a straight run down each side. */
const PITCH = 1.85;                          /* bump crests per em of bubble text:
                                                the whole strip is one drawing
                                                scaled from --tg, so a pitch in
                                                fixed px would fatten the scallops
                                                on a narrow screen */
const ROUND = 0.44;                          /* corner radius, as a share of the
                                                short side — 0.5 would be a pill */

/* Two sines on incommensurate frequencies. Deterministic, so the outline is the
   same on every render and does not shimmer while resizing, but it never repeats
   around the loop, which is what keeps the scallops from reading as machined. */
const wave = (k, ph) =>
  Math.sin(k * 2.39996 + ph) * 0.62 + Math.sin(k * 5.083 + ph * 1.7) * 0.38;

function cloudPath(w, h, em, room) {
  /* the crest may sit `wob` inside the spine and the arc bulges `bulge` outside
     it, so the spine has to be inset by the one and the text cleared by the
     other. When the caller reports a tight margin the bumps shrink to fit rather
     than eat the text — a small cloud with fine scallops still reads as a cloud,
     a cloud with text spilling out of it does not. */
  let p = Math.min(PITCH * em, Math.min(w, h) * 0.8);
  if (room > 0) p = Math.min(p, (room - 2) / 0.98);
  p = Math.max(p, 3);

  const bulge = p * 0.42;
  const wob = bulge * 0.5;
  /* worst case a crest sits `wob` outside the spine and its arc adds a bulge a
     third over nominal, so that is what the inset has to buy — an SVG clips at
     its own viewport, and a clipped scallop shows up as a dead straight edge */
  const ins = wob + bulge * 1.35 + 1;
  const W = Math.max(w - 2 * ins, 2), H = Math.max(h - 2 * ins, 2);
  const r = Math.min(W, H) * ROUND;
  const x0 = ins, y0 = ins, Lh = W - 2 * r, Lv = H - 2 * r, q = (Math.PI / 2) * r;
  const per = 2 * Lh + 2 * Lv + 4 * q;

  /* walk the spine clockwise from the top-left corner's end, returning the point
     and its outward normal */
  const at = (s) => {
    s = ((s % per) + per) % per;
    const arc = (cx, cy, a0) => {
      const t = a0 + (s / r);
      return [cx + r * Math.cos(t), cy + r * Math.sin(t), Math.cos(t), Math.sin(t)];
    };
    if (s < Lh) return [x0 + r + s, y0, 0, -1];
    s -= Lh;
    if (s < q) return arc(x0 + W - r, y0 + r, -Math.PI / 2);
    s -= q;
    if (s < Lv) return [x0 + W, y0 + r + s, 1, 0];
    s -= Lv;
    if (s < q) return arc(x0 + W - r, y0 + H - r, 0);
    s -= q;
    if (s < Lh) return [x0 + W - r - s, y0 + H, 0, 1];
    s -= Lh;
    if (s < q) return arc(x0 + r, y0 + H - r, Math.PI / 2);
    s -= q;
    if (s < Lv) return [x0, y0 + H - r - s, -1, 0];
    return arc(x0 + r, y0 + r, Math.PI);
  };

  let n = Math.round(per / p);
  n = Math.max(10, n + (n % 2));             /* even, so the two ends match */

  const P = [];
  for (let k = 0; k < n; k++) {
    const [x, y, nx, ny] = at((k * per) / n);
    const o = wave(k, 0) * wob;
    P.push([x + nx * o, y + ny * o]);
  }

  const f = (v) => v.toFixed(1);
  let d = `M${f(P[0][0])} ${f(P[0][1])}`;
  for (let k = 0; k < n; k++) {
    const [ax, ay] = P[k], [bx, by] = P[(k + 1) % n];
    const c = Math.hypot(bx - ax, by - ay);
    const bg = bulge * (1 + wave(k, 1.1) * 0.34);
    /* the radius that makes this chord bulge out by exactly bg */
    const R = (bg * bg + (c / 2) * (c / 2)) / (2 * bg);
    d += `A${f(R)} ${f(R)} 0 0 1 ${f(bx)} ${f(by)}`;
  }
  return d + 'Z';
}

const bubble = (txt) => `
  <div class="cb">
    <svg class="cb-bg" preserveAspectRatio="none" aria-hidden="true"><path d=""/></svg>
    <p class="cb-in">${txt}</p>
    <i class="cb-d1"></i><i class="cb-d2"></i>
  </div>`;

const chip = (seed) => `<span class="mp-chip"><span class="mx" data-seed="${seed}"></span></span>`;

/* Picture above, caption under it, in every physical cell — the four of them are
   the same kind of evidence and reading one should not be a different motion
   from reading the next. Clips are muted by design: four of these can be on
   screen at once and the strip is a diagram, not a film. preload is left off
   until the beat that needs it asks for the bytes. */
const isVid = (f) => /\.mp4$/i.test(f);

const shot = ([file, txt]) => `
  <div class="sh">
    <figure class="sh-pic">${isVid(file)
      ? `<video src="${VID}${file}" poster="${IMG}pos-${file.replace(/\.mp4$/i, '.jpg')}"
                muted playsinline preload="none" disablepictureinpicture
                controlslist="nodownload noplaybackrate noremoteplayback" aria-hidden="true"></video>`
      : `<img src="${IMG}${file}" alt="" loading="lazy">`}</figure>
    <p class="sh-cap">${txt}</p>
  </div>`;

const face = (who, cls) => `
  <span class="fc ${cls}"><img src="${IMG}av-${who.toLowerCase()}.png" alt=""><b>${who}</b></span>`;

const cell = (kind, key, title, small, seed) => `
  <div class="cell c-${kind}" data-cell="${key}">
    <h4 class="cl-t">${title}${small ? `<small>${small}</small>` : ''} ${chip(seed)}</h4>
    <div class="cl-b" data-slot="${key}"></div>
  </div>`;

function wmPanel() {
  return `
<section class="mp mp-wm" data-panel="wm">
  <div class="mp-box">
    <header class="mp-hd">
      <span class="mp-hex"><img src="${IMG}hex-wm.png" alt=""></span>
      <span class="mp-ban">Mental World Model<i class="mp-dots" aria-hidden="true"></i></span>
      <span class="mp-tick mx" data-tick></span>
    </header>
    <p class="mp-sub">(omniscient simulator)</p>
    <div class="mp-grid">
      ${cell('st', 'ms', 'Current Mental State', '', 's_t^ment')}
      ${cell('ob', 'mo', 'Inferred Mental Observation', '(Target’s inference)', 'o_t^ment')}
      ${cell('st', 'ps', 'Current Physical State', '', 's_t^phy')}
      ${cell('ob', 'po', 'Physical Observation', '(Target’s view)', 'o_t^phy')}
      <div class="conn conn-om" data-conn="om">
        <b class="cn-step">Step 1</b><i class="cn-arw"></i>
        <span class="cn-sym mx">${mx('\\Omega')}</span>
      </div>
    </div>
  </div>
</section>`;
}

function tgPanel() {
  return `
<section class="mp mp-tg" data-panel="tg">
  <div class="mp-box">
    <header class="mp-hd">
      <span class="mp-hex"><img src="${IMG}hex-tg.png" alt=""></span>
      <span class="mp-ban">Target<i class="mp-dots" aria-hidden="true"></i></span>
      <span class="mp-tick mx" data-tick></span>
    </header>
    <p class="mp-sub mp-who">
      <img src="${IMG}av-alice.png" alt=""><b>Alice</b><span class="mx">${mx('( \\Ec )')}</span>
    </p>
    <div class="mp-stack">
      ${cell('ac', 'am', 'Mental Action', '', 'a_t^ment')}
      ${cell('ac', 'ap', 'Physical Action', '', 'a_t^phy')}
    </div>
  </div>
</section>`;
}

const connOut = (kind, step, sym) => `
<div class="conn conn-${kind}" data-conn="${kind}">
  <b class="cn-step">Step ${step}</b><i class="cn-arw"></i>
  <span class="cn-sym mx">${mx(sym)}</span>
</div>`;

const unit = () =>
  wmPanel() + connOut('pi', 2, '\\pi') + tgPanel() + connOut('ga', 3, '\\Gamma');

/* ── the formula strip ───────────────────────────────────────── */

const FX = [
  { op: 'om', sym: '\\Omega', step: 1,
    name: 'Observation Generation <small>(Simulation)</small>',
    gloss: 'The full world state is rendered into what the target can perceive and infer — partial, never a copy.',
    rows: (T) => [`P( o_${T}^phy \\mid s_${T}^phy, \\Ec )`,
                  `P( o_${T}^ment \\mid s_${T}^phy, s_${T}^ment, \\Ec )`] },
  { op: 'pi', sym: '\\pi', step: 2,
    name: 'Action Proposal',
    gloss: 'The target acts from that rendering alone, never from the true state: a physical carrier and the mental content it carries.',
    rows: (T) => [`P( a_${T} \\mid o_${T} )`] },
  { op: 'ga', sym: '\\Gamma', step: 3,
    name: 'World State Transition',
    gloss: 'Physical dynamics first; the mental update follows from what became perceptible, and from what the act meant.',
    rows: (T, N) => [`P( s_${N}^phy \\mid s_${T}^phy, s_${T}^ment, a_${T}^phy )`,
                     `P( s_${N}^ment \\mid s_${T}^phy, s_${T}^ment, a_${T}^phy, a_${T}^ment )`] }
];

const fxStrip = () => FX.map((f) => `
  <div class="fxg" data-op="${f.op}">
    <span class="fxg-sym mx">${mx(f.sym)}</span>
    <div class="fxg-t"><b class="fxg-step">Step ${f.step}</b><p class="fxg-n">${f.name}</p></div>
    <div class="fxg-r"></div>
    <p class="fxg-d">${f.gloss}</p>
  </div>`).join('');

/* ── controller ──────────────────────────────────────────────── */

export function initMWM() {
  const root = document.getElementById('mwm');
  if (!root) return;

  const view = root.querySelector('.mwm-view');
  const track = root.querySelector('.mwm-track');
  const strip = root.querySelector('.mwm-fx');
  const btnPlay = root.querySelector('#mwmPlay');
  const btnNext = root.querySelector('#mwmNext');

  strip.innerHTML = fxStrip();
  track.innerHTML = unit() + unit() + unit();

  const wms = () => [...track.querySelectorAll('.mp-wm')];
  const tgs = () => [...track.querySelectorAll('.mp-tg')];

  let base = 0;                             /* which TICK unit 0 currently is */
  const tickOf = (i) => TICKS[(base + i) % TICKS.length];

  /* content -------------------------------------------------- */

  function fillWm(el, i) {
    const d = tickOf(i);
    const put = (k, html) => (el.querySelector(`[data-slot=${k}]`).innerHTML = html);
    put('ms', d.ment.map(([who, txt]) => `<div class="cr">${face(who, 'f-st')}${bubble(txt)}</div>`).join(''));
    put('mo', `<div class="cr cr-obs">
        <span class="cr-lb mx">Target ${mx('( \\Ec )')}</span>
        ${face('Alice', 'f-ob')}
        <div class="cr-bs">${bubble(d.obsMent.join(' '))}</div>
      </div>`);
    put('ps', shot(d.phy));
    put('po', shot(d.obsPhy));
  }

  function fillTg(el, i) {
    const d = tickOf(i);
    el.querySelector('[data-slot=am]').innerHTML = shot(d.actMent);
    el.querySelector('[data-slot=ap]').innerHTML = shot(d.actPhy);
  }

  /* the subscripts are the only text in a panel that changes when the strip
     recycles and the labels slide back to t */
  function stamp(el, L) {
    el.querySelectorAll('.mp-chip .mx').forEach((n) => {
      n.innerHTML = mx(n.dataset.seed.replace('_t', '_' + sub(L)));
    });
    const tk = el.querySelector('[data-tick]');
    if (tk) tk.innerHTML = mx(L);
  }
  const relabel = () => {
    wms().forEach((el, i) => stamp(el, LABELS[i]));
    tgs().forEach((el, i) => stamp(el, LABELS[i]));
  };

  /* layout ---------------------------------------------------- */

  /* Every bubble carries its own outline, cut to the size it ended up at. Called
     from place(), which is the one thing that runs after a resize, after a beat
     and after recycle() has built a fresh unit. */
  function drawClouds() {
    track.querySelectorAll('.cb').forEach((cb) => {
      const w = Math.round(cb.clientWidth), h = Math.round(cb.clientHeight);
      if (!w || !h) return;
      const tx = cb.querySelector('.cb-in');
      /* how much clear margin the text leaves on the tightest side; the scallops
         are sized to live inside it */
      const room = Math.min((w - tx.offsetWidth) / 2, (h - tx.offsetHeight) / 2);
      const key = `${w}x${h}x${Math.round(room)}`;
      if (cb.dataset.wh === key) return;
      cb.dataset.wh = key;
      const em = parseFloat(getComputedStyle(cb).fontSize) || 11;
      const svg = cb.querySelector('.cb-bg');
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.querySelector('path').setAttribute('d', cloudPath(w, h, em, room));
    });
  }

  const fit = () => {
    if (!view.clientWidth) return;          /* narrow screens show the flat figure */
    const tg = view.clientWidth / (R_WM + R_GAP + 1);
    root.style.setProperty('--tg', tg + 'px');
    root.style.setProperty('--gap', tg * R_GAP + 'px');
    root.style.setProperty('--wm', tg * R_WM + 'px');
    root.style.setProperty('--omg', tg * R_OM + 'px');
    place(false);
  };

  /* choreography ---------------------------------------------- */

  let u = 0;            /* which unit the current beat belongs to */
  /* -1 = the opening state, before any operator has fired. It happens once: from
     then on Γ is what puts a state on screen, so a beat of its own would be a
     repeat. It exists because s_t^phy now has a clip, and that clip should not
     have to share its first seconds with o_t^phy. */
  let ph = -1;          /* -1 = s_t, 0 = Ω, 1 = π, 2 = Γ */
  let omAt = -1, piAt = -1, gaAt = -1;

  /* Ω and Γ share the "target on the left, world model on the right" framing;
     π is the only beat that shows a matched pair. */
  const anchor = () =>
    ph === 1 ? wms()[u]
      : ph === 2 ? tgs()[u]
        : (u > 0 ? tgs()[u - 1] : wms()[0]);

  function place(animate = true) {
    drawClouds();
    const a = anchor();
    if (!a) return;
    if (!animate) track.style.transition = 'none';
    track.style.transform = `translate3d(${-a.offsetLeft}px,0,0)`;
    if (!animate) { void track.offsetWidth; track.style.transition = ''; }
  }

  function lit() {
    wms().forEach((el, i) => {
      const st = i <= gaAt + 1;
      const ob = i <= omAt;
      el.querySelectorAll('[data-cell=ms],[data-cell=ps]').forEach((c) => c.classList.toggle('is-on', st));
      el.querySelectorAll('[data-cell=mo],[data-cell=po]').forEach((c) => c.classList.toggle('is-on', ob));
    });
    tgs().forEach((el, i) => {
      el.querySelectorAll('.cell').forEach((c) => c.classList.toggle('is-on', i <= piAt));
    });
  }

  function mark() {
    const op = ['om', 'pi', 'ga'][ph] || '';
    track.querySelectorAll('.conn').forEach((c) => c.classList.remove('is-hot'));
    const node = !op ? null
      : op === 'om'
        ? wms()[u] && wms()[u].querySelector('[data-conn=om]')
        : track.querySelectorAll(`[data-conn=${op}]`)[u];
    if (node) node.classList.add('is-hot');

    const L = LABELS[u];
    root.dataset.op = op;
    strip.querySelectorAll('.fxg').forEach((g, k) => {
      g.classList.toggle('is-hot', !!op && FX[k].op === op);
      g.querySelector('.fxg-r').innerHTML =
        FX[k].rows(sub(L), sub(NEXT[L])).map((s) => `<p class="fx">${mx(s)}</p>`).join('');
    });
  }

  /* The cells this beat has just turned on — the ones whose clips are the beat.
     Γ is the odd one: it lights the *next* unit's state, which is the whole
     point of it. */
  function fresh() {
    const w = wms(), t = tgs();
    const pick = (el, sel) => (el ? [...el.querySelectorAll(sel)] : []);
    if (ph === -1) return pick(w[u], '[data-cell=ps]');
    if (ph === 0) return pick(w[u], '[data-cell=po]');
    if (ph === 1) return pick(t[u], '.cell');
    return pick(w[u + 1], '[data-cell=ps]');
  }

  function beat() {
    if (ph === 0) omAt = Math.max(omAt, u);
    if (ph === 1) piAt = Math.max(piAt, u);
    if (ph === 2) gaAt = Math.max(gaAt, u);
    place();
    mark();
    lit();
    roll();
  }

  /* Drop the unit that has left on the left, grow a fresh one on the right.
     Anchors are re-derived from offsetLeft afterwards, so the strip does not
     move a pixel — only the tick labels fall back to t, which is the point of
     doing it here. It has to wait for the slide to land, because until then
     the outgoing unit is still the thing the transform is measured against. */
  let pending = 0;
  function recycle() {
    pending = 0;
    [...track.children].slice(0, 4).forEach((n) => n.remove());
    track.insertAdjacentHTML('beforeend', unit());
    base = (base + 1) % TICKS.length;
    u -= 1; omAt -= 1; piAt -= 1; gaAt -= 1;
    const W = wms(), T = tgs();
    fillWm(W[W.length - 1], W.length - 1);
    fillTg(T[T.length - 1], T.length - 1);
    relabel();
    place(false);
    lit();
    mark();
  }

  function advance() {
    if (pending) { clearTimeout(pending); recycle(); }
    ph += 1;
    if (ph > 2) { ph = 0; u += 1; }
    beat();
    if (ph === 1 && u === 1) pending = setTimeout(recycle, SLIDE + 80);
  }

  /* the clips ------------------------------------------------- */
  /* A step is over when its clip is over, not when a stopwatch says so — that
     is the only timing that keeps the diagram and the footage saying the same
     thing at the same moment. A cell that is still a still falls back to DWELL,
     and STALL catches a clip that never arrives. Tapping the picture holds the
     step: the strip has nowhere to go until that clip finishes. */

  let timer = 0, playing = false, held = false, seen = false;
  let bound = [];

  const allVids = () => [...track.querySelectorAll('.sh-pic video')];

  function unbind() {
    bound.forEach(([v, f]) => { v.removeEventListener('ended', f); v.removeEventListener('error', f); });
    bound = [];
  }

  function idle(except) {
    allVids().forEach((v) => {
      if (except.includes(v)) return;
      if (!v.paused) v.pause();
      /* left on its last frame, not rewound: frame 0 of some clips is black, and
         a step that is over should read as a still, not as a hole */
      v.closest('.sh-pic').classList.remove('is-held');
    });
  }

  function roll(restart = true) {
    clearTimeout(timer);
    unbind();
    held = false;

    const vids = fresh().flatMap((c) => [...c.querySelectorAll('video')]);
    idle(vids);
    if (restart) vids.forEach((v) => { v.currentTime = 0; });
    if (!seen) return;                       /* nothing fetched until it is read */
    vids.forEach((v) => v.play().catch(() => {}));
    warm();
    if (!playing) return;

    if (!vids.length) { timer = setTimeout(advance, DWELL); return; }

    let left = vids.length;
    const done = () => { if (--left <= 0) advance(); };
    vids.forEach((v) => {
      v.addEventListener('ended', done, { once: true });
      v.addEventListener('error', done, { once: true });
      bound.push([v, done]);
    });
    timer = setTimeout(() => { if (!held) advance(); }, STALL);
  }

  /* the bytes for the steps after this one, fetched while this one plays */
  function warm() {
    [wms()[u], tgs()[u], wms()[u + 1]].forEach((el) => {
      if (!el) return;
      el.querySelectorAll('.sh-pic video').forEach((v) => {
        if (v.preload === 'none') { v.preload = 'auto'; v.load(); }
      });
    });
  }

  /* tap the picture to hold or release the step it belongs to */
  track.addEventListener('click', (e) => {
    const pic = e.target.closest('.sh-pic');
    const v = pic && pic.querySelector('video');
    if (!v || !bound.some(([b]) => b === v)) return;
    /* π runs two clips at once; they are one step, so one tap holds both */
    held = !v.paused;
    bound.forEach(([b]) => {
      if (held) b.pause(); else b.play().catch(() => {});
      b.closest('.sh-pic').classList.toggle('is-held', held);
    });
  });

  /* transport -------------------------------------------------- */

  const play = () => {
    playing = true;
    root.classList.add('is-playing');
    btnPlay.setAttribute('aria-label', 'Pause');
    btnPlay.classList.remove('is-paused');
    roll(false);                             /* resume, do not rewind */
  };
  const pause = () => {
    playing = false;
    root.classList.remove('is-playing');
    btnPlay.setAttribute('aria-label', 'Play');
    btnPlay.classList.add('is-paused');
    clearTimeout(timer);
    unbind();
    allVids().forEach((v) => v.pause());
  };

  /* a pause the reader asked for outranks the observer, which would otherwise
     undo it on the next threshold crossing; leaving the section clears it */
  let byUser = false;
  btnPlay.addEventListener('click', () => {
    byUser = playing;
    playing ? pause() : play();
  });
  btnNext.addEventListener('click', () => { byUser = true; pause(); advance(); });
  addEventListener('resize', fit, { passive: true });

  wms().forEach(fillWm);
  tgs().forEach(fillTg);
  relabel();
  fit();
  beat();
  /* the webfont swap re-flows the bubble text, so the box measured at boot is not
     the box the reader gets */
  if (document.fonts) document.fonts.ready.then(() => { drawClouds(); });

  /* run only while the reader is actually looking at it */
  new IntersectionObserver((es) => {
    es.forEach((e) => {
      const live = view.clientWidth > 0;
      if (e.isIntersecting && live) seen = true;
      if (e.isIntersecting && live && !playing) { if (!byUser) play(); }
      else if (!e.isIntersecting || !live) { byUser = false; if (playing) pause(); }
    });
  }, { threshold: 0.2 }).observe(root);
}
