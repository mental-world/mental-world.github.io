/* Hero stage. A looping miniature city played as scenery rather than as media,
   with three things laid over it: the events the system is watching, the
   observer that watches them, and — once an event is opened — the feed from
   that event and the state the model reads out of it.

   Two pieces of real work here. Keeping the flashpoints welded to the city:
   the film is an object-fit:cover background, so the browser crops it
   differently at every window size; each anchor is stored as a normalised
   point in the film's own 3840x2160 frame and re-projected through that crop
   on resize. And placing the terminal: it has to land near the point it came
   from, near the middle of the view, and clear of both the observer and the
   readout, which is a small constraint problem rather than a fixed position. */

import { SCENES } from './scenes.js';
import { registerAudio, claimAudio } from './audio.js';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrowQ = window.matchMedia('(max-width:1080px),(max-aspect-ratio:1/1)');

/* which way the observer leans for each event, so its gaze follows the city
   rather than staring straight ahead: -1 west, +1 east */
const GAZE = { roadwork: -1, park: 1, office: 1 };

/* frame geometry, in px */
const GAP = 74;    /* clearance between the frame's lower edge and the point   */
const CLEAR = 148; /* clearance when the frame has to sit beside the point.
                      generous on purpose: park the frame any closer and the
                      tether has no room to be seen, and the whole point of the
                      tether is that this is a feed off *that* point           */
const M = 18;      /* keep-off margin at the stage edges                       */
const EDGE = 34;   /* how close the frame may come to the window's own edges   */
/* Where the painted city ends as a fraction of the film's height. Sampled off
   the rendered frame: scanning rows upward from the foot, this is the first one
   where more than 6% of pixels leave the cream backdrop. The last 6.7% of the
   film is empty ground. Re-measure if city.mp4 is ever re-framed.             */
const CITY_V = 0.9333;
/* the event card's drop shadow (0 34px 70px -34px) reaches this far past its
   own border box, and it is the shadow that shows when the card overhangs      */
const SHADOW = 36;

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

export function initHero() {
  const video = document.getElementById('heroVideo');
  const stage = document.getElementById('heroStage');
  if (!video || !stage) return;

  keepPlaying(video, stage);
  initCity(video, stage);
}

/* ── the film ─────────────────────────────────────────────── */
function keepPlaying(video, stage) {
  video.muted = true;
  video.volume = 0;
  video.defaultMuted = true;

  /* some browsers refuse the first autoplay attempt; retry on the next
     user gesture instead of silently showing a frozen frame */
  const play = () => video.play().catch(() => {});
  play();
  video.addEventListener('canplay', play, { once: true });
  ['pointerdown', 'keydown', 'touchstart'].forEach((e) =>
    window.addEventListener(e, play, { once: true, passive: true })
  );

  /* a 4K frame is expensive to keep decoding off-screen */
  let visible = true;
  new IntersectionObserver(
    (es) => {
      visible = es[0].isIntersecting;
      if (visible) play(); else video.pause();
    },
    { threshold: 0 }
  ).observe(stage);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
    else if (visible) play();
  });
}

/* ── flashpoints, terminal, readout ───────────────────────── */
function initCity(video, stage) {
  const hero = stage.closest('.hero');
  const layer = document.getElementById('fpLayer');
  const wm = document.getElementById('wmArea');
  if (!layer || !hero) return;

  const points = [...layer.querySelectorAll('.fp')];
  if (!points.length) return;

  /* which event is open, if any. declared up here because the first place()
     pass runs before the activation block and asks about it. */
  let current = null;

  /* How far down the film the diorama actually reaches, in stage px. The frame
     is cropped by `cover` and the city is painted well short of the frame's own
     foot, so the hero's bottom edge is not the city's — measuring an event card
     against it let the card hang over the edge of the world. Written by place(),
     read by layout(); null until the first pass. */
  let cityBot = null;

  const ev = document.getElementById('evFrame');
  const aw = document.getElementById('awPanel');
  const link = document.getElementById('evLink');
  const linkPath = document.getElementById('evLinkPath');
  const linkTip = document.getElementById('evLinkTip');
  const evVideo = document.getElementById('evVideo');
  const ray = document.getElementById('awRay');
  const god = wm && wm.querySelector('.wm-god');
  /* The two state channels, each on its own pass of the same event: `-phy` is
     the god physical view, one fixed frame with no cuts; `-ment` is the mental
     view, one agent at a time with the monologue inside the cloud. They only
     come up once the terminal clip has run out, so the sound is free by then
     and one of the two can take it. */
  const stateVids = [
    { v: document.getElementById('awPhyVid'), k: 'phy',
      eye: document.getElementById('awPhyEye'), sub: document.getElementById('awPhySub') },
    { v: document.getElementById('awMentVid'), k: 'ment',
      eye: document.getElementById('awMentEye'), sub: document.getElementById('awMentSub') }
  ].filter((c) => c.v);

  /* ── subtitles ──
     One plate per clip, driven off the clip's own playhead. The tracks are cut
     at the speaker, so a plate never carries two voices and never wraps past a
     line; the speaker's name is on it because all three scenes are three people
     disagreeing, and an unattributed line is the one thing that would not say
     so. Bound as a list rather than per-video listeners: `timeupdate` fires
     about four times a second, which is visibly late against a 0.7s line, and
     the panes loop forever so there is a frame to spend anyway. */
  const tracks = [];
  const bindSub = (video, plate) => {
    if (!video || !plate) return null;
    const line = plate.firstElementChild;
    const t = { video, plate, line, cues: [], at: -1 };
    tracks.push(t);
    return t;
  };
  const setCues = (t, cues) => {
    if (!t) return;
    t.cues = cues || [];
    t.at = -1;
    t.line.textContent = '';
    t.plate.classList.remove('is-on');
  };

  (function paint() {
    requestAnimationFrame(paint);
    for (const t of tracks) {
      const on = t.cues.length && !t.video.paused && !t.video.ended;
      const now = on ? t.video.currentTime : -1;
      let i = -1;
      for (let k = 0; k < t.cues.length; k++) {
        if (now >= t.cues[k][0] && now < t.cues[k][1]) { i = k; break; }
      }
      if (i === t.at) continue;
      t.at = i;
      /* the outgoing line is left in place: a gap between cues should fade the
         plate away, not blank the text a beat before the plate goes */
      if (i >= 0) {
        t.line.innerHTML = '';
        const who = document.createElement('i');
        who.textContent = t.cues[i][2];
        t.line.append(who, document.createTextNode(t.cues[i][3]));
      }
      t.plate.classList.toggle('is-on', i >= 0);
    }
  })();

  const evSub = bindSub(evVideo, document.getElementById('evSub'));
  for (const c of stateVids) c.track = bindSub(c.v, c.sub);

  /* ── the state channels' own switches ──
     Sound and repeat, per channel, sat in the picture rather than under it:
     they act on this pass and not on the panel, and the panel already has two
     of everything. The frame itself is the mute target — at this size a 22px
     button is a poor thing to have to hit — so the two buttons are the only
     part of it that does something else.

     Sound is exclusive across the whole page, through claimAudio: two clips
     talking at once is neither of them.

     And it is worth exactly one pass. These channels repeat forever, and a
     loop that keeps its audio turns the panel into a room someone left a radio
     on in; so the picture goes round again and the sound does not. The mute
     lands on the wrap, which is also why loop-off needs no special case — that
     clip simply stops. */
  let sndTouched = false;

  for (const c of stateVids) {
    const screen = c.v.closest('.aw-screen');
    c.snd = screen.querySelector('.aw-snd');
    c.lp = screen.querySelector('.aw-lp');

    c.setSound = (on, blocked) => {
      c.v.muted = !on;
      c.snd.setAttribute('aria-pressed', String(on));
      c.snd.classList.toggle('is-blocked', !!blocked);
      c.snd.title = on ? 'Mute this channel' : 'Play this channel through once with sound';
      if (on) claimAudio(c.v);
    };
    registerAudio(c.v, () => c.setSound(false));

    c.setLoop = (on) => {
      c.v.loop = on;
      c.lp.setAttribute('aria-pressed', String(on));
      c.lp.title = on ? 'Play once and stop' : 'Repeat this clip';
      /* asking for repeat on a clip that has already stopped means play it */
      if (on && (c.v.ended || c.v.paused)) c.v.play().catch(() => {});
    };

    /* the wrap. `seeking` is excluded so that scrubbing backwards, which the
       panes have no control for but the keyboard can still do, is not read as
       a completed pass. */
    let seen = 0;
    c.v.addEventListener('timeupdate', () => {
      const t = c.v.currentTime;
      if (t < seen - 0.4 && !c.v.seeking && !c.v.muted) c.setSound(false);
      seen = t;
    });
    c.v.addEventListener('play', () => { seen = c.v.currentTime; });

    screen.addEventListener('click', () => { sndTouched = true; c.setSound(c.v.muted); });
    c.snd.addEventListener('click', (e) => { e.stopPropagation(); sndTouched = true; c.setSound(c.v.muted); });
    c.lp.addEventListener('click', (e) => { e.stopPropagation(); c.setLoop(!c.v.loop); });
  }

  /* labels live in scenes.js so a re-cut clip and its caption never drift */
  for (const p of points) {
    const s = SCENES[p.dataset.scene];
    if (!s) continue;
    const tag = p.querySelector('.fp-tag');
    if (tag) tag.textContent = s.tag;
    p.setAttribute('aria-label', `${s.title} — open this event`);
  }

  /* ── joining the gap to the film ──
     The sky above the film is not a colour, it is the film's own top row
     continued upward. That row is close to flat but not flat: it sits near
     #EBDED1 across most of the width and lifts about six levels of blue over
     the last eighth. A single fill has to be wrong somewhere along that span,
     and a few levels of error meeting the film at a hard horizontal edge is
     precisely the condition the eye reads as a seam.

     So the row is sampled and replayed as a gradient. Sampling is done through
     the same crop `place()` projects the anchors through — `cover` slides the
     source sideways as the window's aspect changes, so which part of the row is
     actually against the gap is a function of the viewport, not a constant.

     Read repeatedly until it settles, rather than once. The film's top band is
     static once it is running — across the full loop it drifts by a level or
     two — but the *first* decoded frame does not match the rest of them, and
     that is precisely the frame a one-shot sample on `loadeddata` would get.
     Locking it in measured worse than the flat colour it replaced. So sampling
     repeats until two reads agree to within a level, then stops for good; a
     resize re-arms it, because `cover` slides the source sideways and a
     different part of the row comes to sit against the gap.

     "To within a level" and not "identically": the film's top row carries about
     three levels of grain, which no smooth gradient reproduces and none should
     try to. Demanding an exact repeat would keep the sampler awake chasing
     noise. What has to be right is the local mean, and that is what settles. */
  const SKY_N = 16;    /* stops. enough to carry the right-edge lift, few enough
                          that per-column sampling noise stays sub-perceptual  */
  const SKY_BAND = 6;  /* stage px of film to average, measured from the seam  */
  const SKY_EVERY = 400;    /* ms between reads; the band is not in a hurry    */
  const SKY_WINDOW = 20000; /* stop looking after this, settled or not         */
  let skyKey = '';
  let skyPrev = null;
  let skyCanvas = null;
  let skySettled = false;
  let skyStart = 0;
  let skyFrame = -1;

  /* the film's top row, averaged into SKY_N slices, as the browser paints it.
     Sampled through the element rather than the source file on purpose: colour
     management moves these numbers by two or three levels, and it is the
     painted value the gap has to match, not the decoded one. */
  function readSky(s, ox, oy, sw) {
    if (video.readyState < 2 || !video.videoWidth) return null;
    /* the source rect that lands on the top SKY_BAND px of the stage. cover can
       push the film's own top edge above the stage (oy < 0), in which case the
       row against the gap is somewhere inside the frame, not its first row. */
    const sx0 = Math.max(0, -ox / s);
    const sy0 = Math.max(0, -oy / s);
    const sw0 = Math.min(sw / s, video.videoWidth - sx0);
    const sh0 = Math.min(SKY_BAND / s, video.videoHeight - sy0);
    if (sw0 <= 0 || sh0 <= 0) return null;

    try {
      if (!skyCanvas) {
        skyCanvas = document.createElement('canvas');
        skyCanvas.width = SKY_N;
        skyCanvas.height = 1;
      }
      const g = skyCanvas.getContext('2d', { willReadFrequently: true });
      /* the downscale to SKY_N x 1 is the averaging: each stop is the mean of
         its own slice of the row, which is what a gradient stop has to be */
      g.drawImage(video, sx0, sy0, sw0, sh0, 0, 0, SKY_N, 1);
      const px = g.getImageData(0, 0, SKY_N, 1).data;
      if (!px[3]) return null;                 /* nothing decoded into it */
      const cols = [];
      for (let i = 0; i < SKY_N; i++) cols.push([px[i * 4], px[i * 4 + 1], px[i * 4 + 2]]);
      /* one 1-2-1 pass. Adjacent slices differ by a level or two of pure
         sampling noise, and a gradient that wobbles is a different artefact
         from the one being fixed; the real feature is broad and survives it. */
      return cols.map((c, i) => {
        const a = cols[Math.max(0, i - 1)];
        const b = cols[Math.min(SKY_N - 1, i + 1)];
        return c.map((_, k) => Math.round((a[k] + 2 * c[k] + b[k]) / 4));
      });
    } catch {
      return null;                             /* tainted canvas: keep the flat fallback */
    }
  }

  function paintSky(s, ox, oy, sw) {
    const key = `${Math.round(s * 1e4)}|${Math.round(ox)}|${Math.round(oy)}|${Math.round(sw)}`;
    if (key !== skyKey) {                      /* the crop moved: start over */
      skyKey = key;
      skySettled = false;
      skyPrev = null;
      skyFrame = -1;
      skyStart = performance.now();   /* the window restarts with the crop */
    }
    if (skySettled) return;

    const cols = readSky(s, ox, oy, sw);
    if (!cols) return;

    /* settled once the mean stops moving. the write is skipped too: repainting
       the hero for a one-level change buys nothing. */
    if (skyPrev && cols.every((c, i) => c.every((k, j) => Math.abs(k - skyPrev[i][j]) <= 1))) {
      skySettled = true;
      return;
    }
    skyPrev = cols;

    /* every stop sits at the centre of the slice it averages. No stop at 0% or
       100%: a gradient already holds its end colours flat past the outermost
       stop, which is the correct reading of a sampled slice — extrapolating
       into the corners would invent values the film never had. */
    hero.style.setProperty(
      '--hero-sky-band',
      'linear-gradient(90deg,' +
        cols
          .map((c, i) => `rgb(${c[0]} ${c[1]} ${c[2]}) ${(((i + 0.5) / SKY_N) * 100).toFixed(2)}%`)
          .join(',') +
        ')'
    );
  }

  /* Drive the settling. On its own timer rather than requestVideoFrameCallback:
     rVFC only fires for frames that are actually *presented*, and a film that is
     decoding but not presenting — throttled tab, backgrounded compositor — then
     never advances the loop at all. A read is skipped when currentTime has not
     moved, so a genuinely paused film costs nothing and, more importantly, does
     not burn the window settling on a frozen frame.

     It re-reads the crop rather than calling place(), which would drag a full
     relayout of every anchor and label behind a job that needs four numbers. */
  let skyRunning = false;

  function startSky() {
    if (skyRunning || skySettled) return;
    skyRunning = true;
    skyStart = performance.now();
    skyLoop();
  }

  function skyLoop() {
    if (skySettled || performance.now() - skyStart > SKY_WINDOW) {
      skyRunning = false;
      return;
    }
    if (video.currentTime !== skyFrame) {      /* no new frame: nothing to learn */
      skyFrame = video.currentTime;
      const c = crop();
      if (c) paintSky(c.s, c.ox, c.oy, c.w);
      if (skySettled) { skyRunning = false; return; }
    }
    setTimeout(skyLoop, SKY_EVERY);
  }

  /* The crop the browser is currently applying, as four numbers. cover takes the
     larger scale and overflows; object-position 50% 100% centres what is left
     horizontally and pins the bottom edge. contain (the portrait rule) takes the
     smaller scale, so the same two lines cover both. Both the anchors and the
     sky sampler project through this, and they have to agree. */
  function crop() {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const vw = video.videoWidth || 3840;
    const vh = video.videoHeight || 2160;
    const fit = getComputedStyle(video).objectFit;
    const s =
      fit === 'contain'
        ? Math.min(r.width / vw, r.height / vh)
        : Math.max(r.width / vw, r.height / vh);
    const iw = vw * s;
    const ih = vh * s;
    /* top-anchored, in step with object-position:50% 0% on .hero-video. The
       stage now carries the frame's aspect ratio, so `cover` only ever crops
       the sides and this is 0 in practice — but it has to say which edge it
       hangs from, or the flashpoints drift the day that stops being true. */
    return { s, iw, ih, ox: (r.width - iw) * 0.5, oy: 0, w: r.width, h: r.height };
  }

  /* Project each anchor through that crop. */
  /* How much sky the opening claim actually needs. Its three lines are set off
     the window's width, so no height-based gap can be trusted to contain them;
     this measures the block and hands the stylesheet a floor for the padding.
     Written only on change, so the ResizeObserver below cannot be re-armed by
     the write and settle into a loop. */
  const say = document.getElementById('heroSay');
  const SAY_CLEAR = 14;   /* the cue must clear the skyline, not just touch it */

  function clearSay() {
    if (!say) return;
    const need = Math.ceil(
      say.getBoundingClientRect().bottom - hero.getBoundingClientRect().top + SAY_CLEAR
    );
    const next = `${Math.max(0, need)}px`;
    if (hero.style.getPropertyValue('--say-floor') !== next) {
      hero.style.setProperty('--say-floor', next);
    }
  }

  function place() {
    clearSay();
    const c = crop();
    if (!c) return;
    const { s, iw: w, ih: h, ox, oy } = c;
    const r = { width: c.w, height: c.h };
    cityBot = oy + CITY_V * h;
    paintSky(s, ox, oy, r.width);
    startSky();   /* no-op unless the crop just moved and re-armed the sampler */

    for (const p of points) {
      const x = ox + parseFloat(p.dataset.u) * w;
      const y = oy + parseFloat(p.dataset.v) * h;
      p._x = x;
      p._y = y;
      p.style.setProperty('--x', `${Math.round(x)}px`);
      p.style.setProperty('--y', `${Math.round(y)}px`);
      /* on a very wide, very short window the crop can eat the anchor; a point
         floating off the city is worse than no point */
      const m = 26;
      p.classList.toggle(
        'is-out',
        x < m || x > r.width - m || y < m || y > r.height - 6
      );

      /* a centred label on a point near the edge hangs off the film. let it
         swing to the near side, or drop below the point, instead of being cut
         off; --tx and .is-tag-s in the stylesheet do the moves. */
      const tag = p.querySelector('.fp-tag');
      if (tag) {
        const half = tag.offsetWidth / 2 + 10;
        p.classList.toggle('is-tag-e', x - half < 0);
        p.classList.toggle('is-tag-w', x + half > r.width);
        p.classList.toggle('is-tag-s', y - tag.offsetHeight - 34 < 0);
      }
    }

    if (current) layout(current, true);
  }

  new ResizeObserver(place).observe(stage);
  /* the stage observer misses a height-only resize, and in the stacked layout
     the window's height is the only thing the sums depend on */
  window.addEventListener('resize', place);
  /* the claim is measured, so it has to be measured in the face it will be set
     in: the fallback's metrics are not Fraunces's, and the gap is derived from
     the difference */
  if (document.fonts) document.fonts.ready.then(place);
  video.addEventListener('loadedmetadata', place);
  /* metadata gives the dimensions but not a frame, and paintSky needs a frame.
     `loadeddata` is the first moment there is one to sample — and the first
     frame is the one that does not match the rest, so this only starts the
     settling, it does not finish it. */
  video.addEventListener('loadeddata', place);
  window.addEventListener('orientationchange', () => setTimeout(place, 220));
  place();

  /* ── where the terminal goes ──
     Wanted, in order: above the point it came from, pulled back toward the
     middle of the view, and clear of the observer and the readout. The office
     point sits high on a tower and there is no room above it, so the frame
     drops to the reserved line and steps sideways instead — a frame sitting
     on top of the point it claims to be showing explains nothing. */
  function spot(p, all, W, H, fw, fh, res, floorY) {
    /* lowest edge anything reserved reaches, for the "tuck underneath" pair */
    const resB = res.reduce((m, r) => Math.max(m, r.b), 0);
    /* the frame is allowed to be pushed around, but never up against the glass */
    const lo = fw / 2 + EDGE;
    const hi = W - fw / 2 - EDGE;
    const yLo = EDGE;
    /* The card stops at the edge of the *city*, not at the edge of the hero.
       Those used to be the same bound and they are not: the film's bottom sixth
       is empty ground, so a card sitting 46px off the hero's foot still had its
       lower border — and the whole of its shadow — hanging past the diorama.
       Whichever of the two is higher wins, so a short window still keeps the
       card off the glass. */
    const yHi = Math.max(EDGE, Math.min(H - fh - 46, floorY - fh - SHADOW));
    const fx = p._hx;
    const fy = p._hy;

    /* six places it could reasonably go. Ranking them beats a chain of ifs
       here: the constraints (clear of the readout, clear of all three markers,
       near the middle, near its own point) trade off differently at every
       window size, and a chain has to commit to an order in advance. */
    const cand = [];
    const put = (cx, ty) => cand.push({ cx: clamp(cx, lo, hi), ty: clamp(ty, yLo, yHi) });
    const mid = W / 2 + (fx - W / 2) * 0.34;
    put(mid, fy - GAP - fh);                    /* above it                     */
    put(fx - CLEAR - fw / 2, fy - fh * 0.62);   /* west, level                  */
    put(fx + CLEAR + fw / 2, fy - fh * 0.62);   /* east, level                  */
    put(fx - CLEAR - fw / 2, resB + 34);        /* west, tucked under the panel */
    put(fx + CLEAR + fw / 2, resB + 34);        /* east, tucked under the panel */
    put(mid, fy + GAP);                         /* below it                     */

    const area = fw * fh;
    const halo = 30;
    let best = null;

    for (const c of cand) {
      const x = c.cx - fw / 2;
      const y = c.ty;
      let s = 0;

      /* Sitting on the readout or the observer is the worst thing it can do, so
         touching either at all costs more than any amount of being off-centre:
         a flat charge on contact, and the area term only to break ties between
         bad options. Scored by area alone, a clipped corner came out cheaper
         than a step sideways and the frame parked on the readout's edge.

         Tested against the two boxes separately, not their bounding union: the
         readout hangs well below the observer and well to its right, so the
         union reserves a whole quadrant of empty sky and the frame gets exiled
         to the window edge for no reason. */
      const rpad = 14;
      let ovl = 0;
      for (const r of res) {
        const ow = Math.max(0, Math.min(x + fw, r.r + rpad) - Math.max(x, r.x - rpad));
        const oh = Math.max(0, Math.min(y + fh, r.b + rpad) - Math.max(y, r.y - rpad));
        ovl += (ow * oh) / area;
      }
      if (ovl > 0) s += 1.6 + 3 * ovl;

      /* covering a marker: much worse if it is the one this feed came from */
      for (const q of all) {
        if (q.classList.contains('is-out')) continue;
        if (q._hx > x - halo && q._hx < x + fw + halo &&
            q._hy > y - halo && q._hy < y + fh + halo) s += q === p ? 2.4 : 1.1;
      }

      /* crowding the window edges */
      const pad = 34;
      s += 0.9 * (Math.max(0, pad - x) + Math.max(0, x + fw - (W - pad)) +
                  Math.max(0, pad - y) + Math.max(0, y + fh - (H - pad))) / 100;

      s += 0.55 * Math.abs(c.cx - W / 2) / (W / 2);                       /* centred  */
      s += 0.45 * Math.hypot(c.cx - fx, y + fh / 2 - fy) / Math.hypot(W, H); /* nearby */

      if (!best || s < best.s) best = { x, y, s };
    }
    return best;
  }

  /* ── the beam ──
     Origin at the figure's shoulder, aimed at the middle of the readout's left
     edge; the fan in the markup is a unit shape, so all that is set here is
     where it starts, which way it points and how long and how wide it gets.

     Measured with offsets rather than rects on purpose. The bust carries a rise
     and a float animation and the panel carries an entry transform, and a beam
     that tracked either of those would swing about while they settled. Offsets
     ignore transforms, so this is the geometry both boxes come to rest at. */
  function aimRay() {
    if (!ray || !god || !god.offsetHeight) return;
    /* fractions of the img box, not of the figure: god-v2 sits differently inside
       its canvas than the asset these were first tuned against, so they were
       re-derived to land on the same point of the same bust — just right of the
       head, at halo height. */
    const ox = wm.offsetLeft + god.offsetLeft + god.offsetWidth * 0.56;
    const oy = wm.offsetTop + god.offsetTop + god.offsetHeight * 0.25;
    const dx = aw.offsetLeft - ox;
    if (dx <= 0) return;

    /* Aimed by its two edges, not by its centre. Pointing the axis at the middle
       of the panel and spreading symmetrically about it put the whole cone below
       horizontal — every ray raking downward, none of them level — which read as
       a spotlight dropped on the panel rather than as light arriving from off the
       top of the frame. So the upper edge is nailed to horizontal and only the
       lower edge is aimed: at 65% down the panel's left edge, far enough to wash
       the readout without spilling past its foot. The axis and the spread are
       then whatever those two edges imply. */
    const aBot = Math.atan2(aw.offsetTop + aw.offsetHeight * 0.65 - oy, dx);
    const axis = aBot / 2;                       /* upper edge lands at 0 rad */
    /* floored so a panel level with the bust still gets a fan and not a wire,
       capped so a panel far below it still tapers like a shaft and not a burst */
    const half = Math.min(Math.max(axis, 0.09), 0.32);

    const st = ray.style;
    st.setProperty('--ry-x', `${Math.round(ox)}px`);
    st.setProperty('--ry-y', `${Math.round(oy)}px`);
    st.setProperty('--ry-r', `${((axis * 180) / Math.PI).toFixed(2)}deg`);
    /* runs a little past the edge so the two never show a seam between them */
    const W = dx / Math.cos(axis) + 24;
    st.setProperty('--ry-w', `${Math.round(W)}px`);
    /* --ry-h is the box, and the box is wider than the fan: the outermost drawn
       ray tops out at y=7.2 of a 100-unit viewBox whose apex is at y=49.5, so it
       sits 0.423 of the height off the axis, not 0.5. Solving for the box height
       that puts THAT edge on the half-angle is what makes the horizontal ray
       actually horizontal instead of 12% short of it. */
    st.setProperty('--ry-h', `${Math.round((W * Math.tan(half)) / 0.423)}px`);
  }

  /* the tether docks on whichever edge faces the point, and is kept away from
     the corners so it never reads as pointing at nothing */
  function dock(fx, fy, r) {
    const cx = r.x + r.w / 2;
    if (fy > r.y + r.h) return { x: clamp(fx, r.x + 24, r.x + r.w - 24), y: r.y + r.h, nx: 0, ny: 1 };
    if (fy < r.y) return { x: clamp(fx, r.x + 24, r.x + r.w - 24), y: r.y, nx: 0, ny: -1 };
    if (fx < cx) return { x: r.x, y: clamp(fy, r.y + 24, r.y + r.h - 24), nx: -1, ny: 0 };
    return { x: r.x + r.w, y: clamp(fy, r.y + 24, r.y + r.h - 24), nx: 1, ny: 0 };
  }

  /* ── the tether, tweened ──
     Switching scenes swings the same line across instead of blinking one out
     and another in: the instrument turns, it does not restart. */
  let tether = null;   /* [x0,y0, c1x,c1y, c2x,c2y, x1,y1] in stage space */
  let raf = 0;

  function draw(pts) {
    linkPath.setAttribute(
      'd',
      `M${pts[0]},${pts[1]} C${pts[2]},${pts[3]} ${pts[4]},${pts[5]} ${pts[6]},${pts[7]}`
    );
    linkTip.setAttribute('cx', pts[6]);
    linkTip.setAttribute('cy', pts[7]);
  }

  function tetherTo(next, animate) {
    if (!tether || !animate || reduce) {
      tether = next;
      draw(tether);
      return;
    }
    const from = tether.slice();
    const t0 = performance.now();
    cancelAnimationFrame(raf);
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 430);
      const e = 1 - Math.pow(1 - k, 3);
      tether = from.map((v, i) => v + (next[i] - v) * e);
      draw(tether);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  /* ── layout pass: terminal, readout, tether ── */
  function layout(p, animate) {
    const hr = hero.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    const dy = sr.top - hr.top;
    const W = hr.width;
    const H = hr.height;

    const fw = ev.offsetWidth;
    const fh = ev.offsetHeight;
    if (!fw || !fh) return;

    let pos;

    if (narrowQ.matches) {
      /* no room for two columns: one centred stack over a dimmed city. Both
         boxes go position:fixed at this width, so the sums are against the
         window — the hero itself is shorter than the stack in portrait. */
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      /* hand the readout whatever the frame leaves, rather than a guessed svh
         fraction: the frame's height follows the window width (16:9 plus its
         caption), so the leftover is not something a media query can name.
         Set before ah is read, so the measurement below sees the final box. */
      aw.style.setProperty('--aw-cap', `${Math.max(210, vh - 98 - fh)}px`);
      const ah = aw.offsetHeight;
      const total = fh + 12 + ah;
      const y = clamp((vh - total) / 2, 70, Math.max(70, vh - total - 16));
      pos = { x: (vw - fw) / 2, y };
      aw.style.setProperty('--ax', `${Math.round((vw - aw.offsetWidth) / 2)}px`);
      aw.style.setProperty('--ay', `${Math.round(y + fh + 12)}px`);
    } else {
      const box = el => {
        const b = el.getBoundingClientRect();
        return b.height
          ? { x: b.left - hr.left, y: b.top - hr.top, r: b.right - hr.left, b: b.bottom - hr.top }
          : null;
      };
      const res = [box(wm), box(aw)].filter(Boolean);
      for (const q of points) { q._hx = q._x; q._hy = q._y + dy; }
      /* cityBot is in stage coords; spot() works in the hero's */
      pos = spot(p, points, W, H, fw, fh, res, cityBot == null ? H : cityBot + dy);
      aimRay();
    }

    ev.style.setProperty('--ex', `${Math.round(pos.x)}px`);
    ev.style.setProperty('--ey', `${Math.round(pos.y)}px`);

    if (narrowQ.matches || p.classList.contains('is-out')) {
      link.classList.remove('is-on');
      return;
    }

    /* tether lives in the stage's coordinate space, the frame in the hero's */
    const r = { x: pos.x, y: pos.y - dy, w: fw, h: fh };
    const fx = p._x;
    const fy = p._y;
    const d = dock(fx, fy, r);
    const len = Math.hypot(d.x - fx, d.y - fy);
    const pull = Math.max(38, len * 0.38);
    const next = [
      fx, fy,
      fx, fy - pull,                       /* leaves the city going up */
      d.x + d.nx * pull, d.y + d.ny * pull, /* enters the frame square on */
      d.x, d.y
    ];
    tetherTo(next, animate);

    const total = linkPath.getTotalLength() || 600;
    linkPath.style.setProperty('--len', total);
    linkPath.style.setProperty('--off', link.classList.contains('is-on') ? 0 : total);
  }

  /* ── the readout ──
     Two screens and two lines of type. The state itself is what the panes show,
     so the text is only there to name what is being shown: where the physical
     pass was settled, and whose minds the mental pass is running. Everything
     longer than that — the tags, the per-person beliefs, the claim the pair of
     them adds up to — belongs to §03 further down the page, which has the room
     for it and is where it is actually defined. */
  function fillPanel(s, scene) {
    document.getElementById('awScene').textContent = s.tag;
    document.getElementById('awWhere').textContent = s.phy.where;
    /* the mental pass is per-agent by definition, so the caption is the cast */
    document.getElementById('awMent').textContent = s.ment.map((m) => m.who).join(' · ');

    for (const c of stateVids) {
      const src = `assets/media/${scene}-${c.k}.mp4`;
      if (!c.v.src.endsWith(src)) c.v.src = src;
      if (c.eye) c.eye.textContent = c.k === 'phy' ? s.phy.eye : s.mentEye;
      setCues(c.track, s.cues[c.k]);
      c.setLoop(true);
      /* the mental pass carries the voice by default: it is the half of the
         state that cannot be seen, and its monologue is the only account of it.
         Once the reader has picked a channel by hand, that choice stands and
         opening another event stops deciding for them. */
      if (!sndTouched) c.setSound(c.k === 'ment');
      c.v.play().catch(() => {
        /* unmuted autoplay refused this far from the click that opened the
           event: fall back to muted and let the button carry the invitation */
        if (!c.v.muted) { c.setSound(false, true); c.v.play().catch(() => {}); }
      });
    }
  }

  /* ── activation ──
     First click parts the cloud and the observer rises. Later clicks only turn
     its gaze; making it climb out again on every switch would be a tic. */
  const timers = [];
  const after = (ms, fn) => timers.push(setTimeout(fn, reduce ? 0 : ms));
  const clearTimers = () => { timers.splice(0).forEach(clearTimeout); };

  /* When the observer is allowed to speak. Not a timer: the readout is his
     conclusion about the event, so it cannot arrive while the event is still
     running. He watches the clip out, and the beam fires on the last frame.
     A fixed delay used to do this, which made the two states look like metadata
     that had been sitting in a file — the claim of the section is that they are
     inferred, and inference has to be seen to take the whole of the evidence. */
  const CAST = 820;   /* keep in step with the clip-path transition on .aw-ray */
  /* floor, so a clip that fails to load does not flash the panel open */
  const MIN = 900;
  /* backstop: a clip that never plays at all must not strand the readout */
  const STALL = 26000;

  /* Sound is the point of these clips, and a click is the gesture that buys it,
     so play() has to be called inside the handler and not after a paint. If the
     browser refuses anyway, fall back to muted and turn the mute button into
     the invitation rather than leaving a silent frame with no explanation. */
  const mute = document.getElementById('evMute');
  const loopBtn = document.getElementById('evLoop');
  const replay = document.getElementById('evReplay');
  const seek = document.getElementById('evSeek');
  const muteT = mute.querySelector('.ev-mute-t');

  function setMuted(on, blocked) {
    evVideo.muted = on;
    mute.setAttribute('aria-pressed', String(on));
    mute.classList.toggle('is-blocked', !!blocked);
    muteT.textContent = blocked ? 'Unmute' : on ? 'Muted' : 'Sound';
    mute.title = on ? 'Play with sound' : 'Mute this clip';
    /* the terminal is the raw event, so when it speaks the readings go quiet */
    if (!on) claimAudio(evVideo);
  }
  registerAudio(evVideo, () => setMuted(true));

  function start(scene) {
    evVideo.pause();
    evVideo.src = `assets/media/${scene}.mp4`;
    evVideo.currentTime = 0;
    setCues(evSub, SCENES[scene] && SCENES[scene].cues.main);
    evVideo.loop = loopBtn.getAttribute('aria-pressed') === 'true';
    replay.hidden = true;
    seek.style.width = '0%';
    setMuted(false, false);
    evVideo.play().catch(() => {
      setMuted(true, true);
      evVideo.play().catch(() => { replay.hidden = false; });
    });
  }

  /* Waits out the clip, then casts. `ended` is the signal, but loop suppresses
     it, so the playhead jumping backwards counts as the end of a pass too and
     the first pass is the one that decides. Everything is torn down through
     `pending` so that switching or closing mid-clip cannot leave a listener
     alive to open the panel over a scene that is no longer showing. */
  let pending = null;

  function armCast(s, scene) {
    if (pending) pending.cancel();
    const t0 = performance.now();
    let seen = 0;
    let spent = false;

    const cast = () => {
      if (spent) return;
      spent = true;
      stop();
      const wait = reduce ? 0 : Math.max(0, MIN - (performance.now() - t0));
      after(wait, () => {
        fillPanel(s, scene);
        aimRay();                 /* the panel's height is final now */
        hero.classList.add('is-cast');
      });
      after(wait + CAST * 0.55, () => aw.classList.add('is-on'));
      after(wait + CAST * 0.55 + 140, () => aw.classList.add('is-lit'));
    };

    const tick = () => {
      const d = evVideo.duration;
      if (!d || !isFinite(d)) return;
      if (evVideo.currentTime < seen - 0.4) return cast();   /* looped round */
      seen = evVideo.currentTime;
      if (d - seen < 0.12) cast();
    };

    function stop() {
      evVideo.removeEventListener('ended', cast);
      evVideo.removeEventListener('timeupdate', tick);
      pending = null;
    }

    evVideo.addEventListener('ended', cast);
    evVideo.addEventListener('timeupdate', tick);
    /* raw, not `after`: reduced motion collapses that to zero and this is a
       failure guard, not an animation */
    timers.push(setTimeout(cast, STALL));
    pending = { cancel() { spent = true; stop(); } };
  }

  function open(p) {
    if (current === p) return close();
    const scene = p.dataset.scene;
    const s = SCENES[scene];
    if (!s) return;

    const first = !current;
    current = p;
    clearTimers();
    if (pending) pending.cancel();

    start(scene);   /* inside the gesture: do this before anything can yield */
    armCast(s, scene);

    points.forEach((q) => q.classList.toggle('is-on', q === p));
    if (wm) {
      wm.dataset.state = 'watching';
      wm.style.setProperty('--gaze', String(GAZE[scene] ?? 0));
    }
    hero.classList.add('is-open');

    /* whatever he had worked out about the last scene is void. the readout goes
       first and the beam with it, and both stay gone until he has looked at this
       one — switching events has to cost the same few seconds as opening one. */
    aw.classList.remove('is-on', 'is-lit');
    hero.classList.remove('is-cast');

    document.getElementById('evTitle').textContent = s.title;

    ev.hidden = false;
    aw.hidden = false;

    requestAnimationFrame(() => {
      /* the panel is measured and reserved from the start even though it will not
         be visible for another THINK ms, so the terminal is placed once and does
         not jump aside when the readout finally arrives */
      layout(p, !first);

      /* the feed is immediate: it is the raw event, not a reading of it */
      after(first ? 110 : 0, () => {
        link.classList.add('is-on');
        linkPath.style.setProperty('--off', 0);
      });
      after(first ? 250 : 0, () => ev.classList.add('is-on'));

      /* then nothing, for as long as the clip runs. the absence is the point: no
         spinner, no "analysing" — the observer is simply watching, and the empty
         sky beside him is what says so. armCast() ends it. */
    });
  }

  function close() {
    current = null;
    clearTimers();
    if (pending) pending.cancel();
    points.forEach((q) => q.classList.remove('is-on'));
    if (wm) {
      wm.dataset.state = 'idle';
      wm.style.setProperty('--gaze', '0');
    }
    hero.classList.remove('is-open', 'is-cast');

    link.classList.remove('is-on');
    linkPath.style.setProperty('--off', linkPath.style.getPropertyValue('--len') || 600);
    ev.classList.remove('is-on');
    aw.classList.remove('is-on', 'is-lit');

    evVideo.pause();
    for (const c of stateVids) c.v.pause();
    after(560, () => {
      ev.hidden = true;
      aw.hidden = true;
      evVideo.removeAttribute('src');
      evVideo.load();
      /* three decoders on a 4K background is more than the hero needs parked */
      for (const c of stateVids) { c.v.removeAttribute('src'); c.v.load(); setCues(c.track, null); }
      setCues(evSub, null);
      tether = null;
    });
  }

  points.forEach((p) => {
    p.addEventListener('click', () => open(p));
  });

  /* ── clip controls ── */
  loopBtn.addEventListener('click', () => {
    const on = loopBtn.getAttribute('aria-pressed') !== 'true';
    loopBtn.setAttribute('aria-pressed', String(on));
    evVideo.loop = on;
    if (on && evVideo.ended) { replay.hidden = true; evVideo.play().catch(() => {}); }
  });
  mute.addEventListener('click', () => {
    setMuted(!evVideo.muted, false);
    if (evVideo.paused && !evVideo.ended) evVideo.play().catch(() => {});
  });
  replay.addEventListener('click', () => {
    replay.hidden = true;
    evVideo.currentTime = 0;
    evVideo.play().catch(() => {});
  });
  /* no close button any more: clicking the flashpoint again, clicking off the
     two panels, and Esc all already did this, and the card is cleaner without a
     fourth way to do the same thing */

  evVideo.addEventListener('timeupdate', () => {
    if (!evVideo.duration) return;
    seek.style.width = `${(evVideo.currentTime / evVideo.duration) * 100}%`;
  });
  evVideo.addEventListener('ended', () => { if (!evVideo.loop) replay.hidden = false; });
  evVideo.addEventListener('play', () => { replay.hidden = true; });

  /* a way back out: the city on its own is a valid state */
  hero.addEventListener('pointerdown', (e) => {
    if (current && !e.target.closest('.fp,.ev,.aw')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && current) close();
  });

  /* the readout's own height changes what room the terminal has */
  new ResizeObserver(() => { if (current) layout(current, true); }).observe(aw);
  narrowQ.addEventListener('change', () => { if (current) layout(current, false); });

  /* the observer is decorative until it has something to observe */
  if (wm && !reduce) wm.style.setProperty('--gaze', '0');

  /* Anchor calibration. Load the page with #calibrate and clicking the city
     prints the normalised (u, v) under the cursor, in the same frame the
     data-u / data-v attributes use. Silent otherwise. */
  if (location.hash === '#calibrate') calibrate(video, stage);
}

function calibrate(video, stage) {
  stage.style.cursor = 'crosshair';
  stage.addEventListener('click', (e) => {
    const r = stage.getBoundingClientRect();
    const vw = video.videoWidth || 3840;
    const vh = video.videoHeight || 2160;
    const s = Math.max(r.width / vw, r.height / vh);
    const w = vw * s;
    const h = vh * s;
    const u = (e.clientX - r.left - (r.width - w) * 0.5) / w;
    const v = (e.clientY - r.top - (r.height - h)) / h;
    // eslint-disable-next-line no-console
    console.log(`data-u="${u.toFixed(4)}" data-v="${v.toFixed(4)}"   frame px: ${Math.round(u * vw)}, ${Math.round(v * vh)}`);
  });
}
