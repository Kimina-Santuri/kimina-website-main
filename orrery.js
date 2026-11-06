/* The landing page's animation: charts of imagined solar systems, as the civilisations living
   in them might draw them, in the site's white with green and red. A new system on each visit,
   and another about every minute. Adapted from ~/Documents/alien-orrery (see AGENTS.md).
   Test with ?seed=42, ?still=1, ?t=30, ?z=2 (-1 to 4). */
(() => {
'use strict';

/* Each civilisation gets one set of pigments. */
const PALETTES = [
  { name: 'site', paper: '#ffffff', ink: '#17463f', ink2: '#7a9272', accent: '#b81f24' },
];

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join('');
}
function alpha(hex, a) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/* Kepler's equation: position along an ellipse for a given point in time.
   Sampling in time, not angle, is what piles dust up where orbits run slowest. */
function solveE(M, e) {
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 3; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}
function orbitXY(a, e, w, M, out) {
  const E = solveE(M, e);
  const x = a * (Math.cos(E) - e);
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const c = Math.cos(w), s = Math.sin(w);
  out[0] = x * c - y * s;
  out[1] = x * s + y * c;
}

const canvas = document.querySelector('.orrery-canvas');
if (!canvas) return;
const ctx = canvas.getContext('2d', { alpha: false });
const params = new URLSearchParams(location.search);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = !!(navigator.connection && navigator.connection.saveData);
const frozen = params.has('still') || reduceMotion || saveData;
const startAt = parseFloat(params.get('t')) || 0;
const testZ = params.has('z') ? parseFloat(params.get('z')) : null;

let sys = null;

function makeGlyph(r) {
  const pts = [];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) pts.push([x / 2, y / 3]);
  const strokes = [];
  const n = 3 + Math.floor(r() * 3);
  let at = Math.floor(r() * pts.length);
  for (let i = 0; i < n; i++) {
    let to = Math.floor(r() * pts.length);
    if (to === at) to = (to + 4) % pts.length;
    strokes.push([pts[at], pts[to]]);
    at = r() < 0.7 ? to : Math.floor(r() * pts.length);
  }
  return { strokes, dot: pts[Math.floor(r() * pts.length)] };
}

function digits(value, base) {
  const out = [];
  let v = value;
  do { out.unshift(v % base); v = Math.floor(v / base); } while (v > 0);
  return out;
}

function build(seed, W, H) {
  const r = mulberry(seed * 2654435761);
  const R = (a, b) => a + (b - a) * r();
  const pal = PALETTES[Math.floor(r() * PALETTES.length)];
  const base = 5 + Math.floor(r() * 5);
  const pick = list => list[Math.floor(r() * list.length)];
  const sunRoll = r();
  const sunCount = sunRoll < 0.35 ? 1 : sunRoll < 0.8 ? 2 : 3;
  const n = 3 + Math.floor(r() * 8);
  const wild = r() < 0.25;    /* some systems have long, crossing orbits */
  const dustRoll = r();
  const dustK = dustRoll < 0.2 ? R(0.35, 0.55) : dustRoll < 0.45 ? R(1.2, 1.5) : R(0.75, 1.1);

  /* Worlds locked in whole-number resonance, with spacing from Kepler's third law. */
  const ratios = [[3, 2], [3, 2], [4, 3], [5, 3], [2, 1], [2, 1], [5, 2], [3, 1]];
  const periods = [60];
  while (periods.length < n) {
    const p = periods[periods.length - 1];
    let next = p * 2;
    for (let t = 0; t < 20; t++) {
      const [a, b] = ratios[Math.floor(r() * ratios.length)];
      if ((p * a) % b === 0) { next = (p * a) / b; break; }
    }
    periods.push(next);
  }
  const homeIdx = clamp(Math.round(lerp(1, n - 1, (r() + r()) / 2)), 1, n - 1);
  const relA = periods.map(p => Math.pow(p / periods[0], 2 / 3));

  /* One, two or three worlds can hold life, always neighbours in the same warm band. */
  const livingRoll = r();
  const livingWanted = livingRoll < 0.55 ? 1 : livingRoll < 0.85 ? 2 : 3;
  let livingLo = homeIdx, livingHi = homeIdx;
  while (livingHi - livingLo + 1 < livingWanted) {
    const canIn = livingLo > 0, canOut = livingHi < n - 1;
    if (!canIn && !canOut) break;
    if (canIn && (!canOut || r() < 0.5)) livingLo--; else livingHi++;
  }

  /* Where the suns sit in the frame. */
  const landscape = W >= H;
  const nearStart = !landscape;
  const shotRoll = r();
  const shot = shotRoll < 0.6 ? 'edge' : shotRoll < 0.8 ? 'corner' : 'beyond';
  const alongNear = shot === 'inset' ? R(0.2, 0.34) : shot === 'beyond' ? R(-0.24, -0.06) : R(-0.02, 0.13);
  const along = nearStart ? alongNear : 1 - alongNear;
  const across = shot === 'corner' ? R(0.06, 0.16) : R(0.28, 0.72);
  const cx = W * (landscape ? along : across);
  const cy = H * (landscape ? across : along);
  const baseW = R(0, TAU);
  const homeE = wild ? R(0.08, 0.18) : R(0.05, 0.09);
  const homeA = Math.min(Math.max(W, H) * 0.62, Math.sqrt(W * H) * 0.66) * (shot === 'inset' ? R(0.62, 0.8) : R(0.82, 1.12));
  const S = homeA / relA[homeIdx];
  const reach = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.05;
  const homeT = R(120, 190);
  const unit = homeT / periods[homeIdx];
  const px = clamp(Math.min(W, H) / 500, 0.7, 1.5);
  const toCentre = Math.atan2(H / 2 - cy, W / 2 - cx);
  const giant = n - 1 > homeIdx ? homeIdx + 1 + Math.floor(r() * (n - 1 - homeIdx)) : -1;

  const worlds = periods.map((p, i) => {
    const living = i >= livingLo && i <= livingHi;
    const home = i === homeIdx;
    return {
      i, p, home, living,
      T: p * unit,
      a: relA[i] * S,
      e: home ? homeE : living ? homeE * R(0.7, 1.2) : wild ? R(0.06, 0.24) : R(0.015, 0.1),
      w: home ? baseW : living ? baseW + R(-0.08, 0.08) : baseW + (wild ? R(-1.2, 1.2) : R(-0.5, 0.5)),
      phase: home ? toCentre - baseW : R(0, TAU),
      glyph: makeGlyph(r),
    };
  });

  /* The home world itself is different every time. */
  const clsRoll = r();
  const homeClass = clsRoll < 0.2 ? 0 : clsRoll < 0.62 ? 1 : clsRoll < 0.88 ? 2 : 3;
  const homeSize = [R(7, 10), R(13, 18), R(22, 32), R(36, 52)][homeClass];
  const surface = pick(['continents', 'continents', 'archipelago', 'ocean', 'desert', 'ice', 'banded']);

  worlds.forEach((o, i) => {
    const prev = i > 0 ? worlds[i - 1].a : o.a * 0.5;
    const next = i < n - 1 ? worlds[i + 1].a : o.a * 1.5;
    const room = Math.min(o.a - prev, next - o.a) * 0.3;
    const want = (o.home ? homeSize : o.living ? R(7, 15) : i === giant ? R(22, 40) : R(3, 11)) * px;
    o.r = clamp(want, 2.4, Math.max(2.6, room));
    const tints = [pal.ink, pal.accent, pal.ink2, mix(pal.ink, pal.accent, 0.5)];
    o.tint = o.home ? pick([pal.ink, pal.ink, mix(pal.ink, pal.accent, 0.3)]) : o.living ? pal.ink : pick(tints);
    o.moons = [];
    const big = o.r > 5 * px;
    const moonCount = o.home ? pick([0, 1, 1, 2, 2, 3, 4, 5, 7]) : i === giant ? Math.floor(r() * 5) : big ? Math.floor(r() * 3) : 0;
    for (let m = 0; m < moonCount; m++) {
      o.moons.push({
        d: o.r + (R(6, 9) + m * R(4.2, 6)) * px,
        s: R(0.8, 1.6) * px,
        T: R(3, 9) * (1 + m * 0.5),
        ph: R(0, TAU),
        size: Math.pow(r(), 2) * 0.24 + 0.05, /* relative to the world, for the close-up */
      });
    }
    const ringChance = o.home ? 0.18 : i === giant ? 0.45 : big ? 0.1 : 0;
    if (r() < ringChance) {
      o.ring = { tilt: R(0.22, 0.6), rot: R(0, Math.PI), a1: R(1.3, 1.5), a2: R(1.6, 2.2) };
    }
  });

  /* Suns */
  const a0 = worlds[0].a;
  const sunFit = Math.min(1, (Math.min(W, H) * 0.34) / (a0 * 0.52));
  const u0 = a0 * sunFit;
  const third = mix(pal.ink, pal.accent, 0.5);
  const suns = sunCount === 1
    ? [{ r: u0 * 0.52, tint: pal.accent, off: 0, rate: 1, ph: 0 }]
    : sunCount === 2
      ? [
          { r: u0 * 0.36, tint: pal.accent, off: u0 * 0.12, rate: 1, ph: 0 },
          { r: u0 * 0.2, tint: pal.ink, off: u0 * 0.5, rate: 1, ph: Math.PI },
        ]
      : [
          { r: u0 * 0.32, tint: pal.accent, off: u0 * 0.1, rate: 1, ph: 0 },
          { r: u0 * 0.16, tint: pal.ink, off: u0 * 0.42, rate: 1, ph: Math.PI },
          { r: u0 * 0.08, tint: third, off: u0 * 0.72, rate: 0.31, ph: R(0, TAU) },
        ];
  const sunReach = Math.max(...suns.map(o => o.off + o.r));
  const sunT = R(12, 22);

  const sysObj = {
    seed, W, H, pal, base, cx, cy, S, reach, px, worlds, suns, sunT, homeIdx, a0,
    homeClass, surface, livingCount: livingHi - livingLo + 1,
    spineA: toCentre + R(-0.3, 0.3),
    live: [], belts: [],
  };

  /* Dust belts: everything between one world's lane and the next. */
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  sysObj.dpr = dpr;
  const hab = { lo: worlds[livingLo].a * 0.84, hi: worlds[livingHi].a * 1.15 };
  sysObj.hab = hab;

  const edges = [{ a: sunReach * 1.15, e: 0.01, w: baseW, r: 0 }, ...worlds,
                 { a: reach, e: 0.05, w: baseW, r: 0 }];
  for (let i = 0; i < edges.length - 1; i++) {
    const A = edges[i], B = edges[i + 1];
    const gap = B.a - A.a;
    if (gap <= 0) continue;
    const start = A.a + Math.max(A.r + 3, gap * 0.07, 4);
    const end = B.a - Math.max(B.r + 3, gap * 0.07, 4);
    if (end <= start) continue;
    const parts = 1 + Math.floor(r() * 3);
    let cursor = start;
    for (let k = 0; k < parts; k++) {
      const span = (end - start) / parts;
      const lo = cursor + span * R(0, 0.12);
      const hi = cursor + span * R(0.82, 1);
      cursor += span;
      const eL = A.e, eH = B.e, wL = A.w, wH = B.w;
      sysObj.belts.push({
        lo, hi, eL, eH, wL, wH,
        flip: r() < 0.5,
        k: R(1.5, 3.6),
        weight: (r() < 0.22 ? 0.05 : Math.pow(r(), 1.5) * 1.5 + 0.08) * dustK,
        phases: [R(0, TAU), R(0, TAU), R(0, TAU)],
        freqs: [R(9, 20), R(24, 44), R(60, 95)],
      });
    }
  }

  drawStatic(sysObj, r, R);

  /* A few grains stay loose and keep drifting through the printed dust. */
  const liteDevice = (navigator.hardwareConcurrency || 4) <= 4;
  const liveCount = Math.round(clamp(W * H / 900, 250, 1400) * (liteDevice ? 0.5 : 1));
  const usable = sysObj.belts.filter(b => b.weight > 0.3 && b.lo < reach);
  for (let i = 0; i < liveCount && usable.length; i++) {
    const b = usable[Math.floor(r() * usable.length)];
    const u = r();
    const a = lerp(b.lo, Math.min(b.hi, reach), u);
    sysObj.live.push({
      a,
      e: lerp(b.eL, b.eH, u),
      w: lerp(b.wL, b.wH, u),
      T: worlds[0].T * Math.pow(a / a0, 1.5),
      ph: R(0, TAU),
      s: R(0.9, 1.7) * px,
      hot: r() < 0.06,
    });
  }

  /* Comets on long dashed paths: the omens every chart has to mention. */
  sysObj.comets = [];
  const cometCount = pick([0, 1, 1, 1, 2, 3]);
  for (let i = 0; i < cometCount; i++) {
    const q = a0 * R(0.9, 2.2), Q = reach * R(0.8, 1.5);
    sysObj.comets.push({
      a: (q + Q) / 2,
      e: (Q - q) / (Q + q),
      w: R(0, TAU),
      T: worlds[0].T * Math.pow(((q + Q) / 2) / a0, 1.5),
      ph: i === 0 ? -0.05 - r() * 0.1 : R(0, TAU),
    });
  }
  drawCometPaths(sysObj, sysObj.g);

  /* Gates sit in the gaps between orbits, somewhere the chart can actually show them. */
  const tq = mulberry(seed * 2654435761 + 401);
  const TR = (a, b) => a + (b - a) * tq();
  sysObj.gates = [];
  const gateCount = 1 + Math.floor(tq() * 3);
  for (let i = 0; i < gateCount; i++) {
    let spot = null;
    for (let t = 0; t < 60 && !spot; t++) {
      const k = Math.floor(tq() * (n - 1));
      const rad = lerp(worlds[k].a, worlds[k + 1].a, TR(0.3, 0.7));
      const ang = tq() * TAU;
      const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
      if (x < 50 || y < 50 || x > W - 50 || y > H - 130) continue;
      if (sysObj.gates.some(g => Math.hypot(g.gx - (x - cx), g.gy - (y - cy)) < 90 * px)) continue;
      spot = [x - cx, y - cy];
    }
    if (!spot) continue;
    sysObj.gates.push({
      gx: spot[0], gy: spot[1], x: 0, y: 0,
      r: TR(10, 20) * px, kind: tq() < 0.6 ? 'gate' : 'wormhole',
      spin: TR(0.12, 0.4) * (tq() < 0.5 ? -1 : 1), glyph: makeGlyph(tq),
    });
  }
  /* Lanes: every gate and living world trades with home, and a few others join in. */
  sysObj.lanes = [];
  const hub = worlds[homeIdx];
  for (const g of sysObj.gates) sysObj.lanes.push(makeLane(tq, g, hub, 2 + Math.floor(tq() * 4), 26, true));
  for (const o of worlds) {
    if (o === hub) continue;
    if (o.living) sysObj.lanes.push(makeLane(tq, o, hub, 2 + Math.floor(tq() * 3), 22, true));
    else if (tq() < 0.42) {
      const to = sysObj.gates.length && tq() < 0.5 ? sysObj.gates[Math.floor(tq() * sysObj.gates.length)] : hub;
      sysObj.lanes.push(makeLane(tq, o, to, 1 + Math.floor(tq() * 3), 30, false));
    }
  }
  /* Comms: living worlds broadcast, and gates pass word to home instantly. */
  const cq = mulberry(seed * 2654435761 + 613);
  const links = [];
  sysObj.gates.forEach((g, i) => links.push([g, i === 0 ? hub : sysObj.gates[i - 1]]));
  for (const o of worlds) if (o.living && o !== hub) links.push([o, hub]);
  sysObj.comms = makeComms(cq, links, worlds.filter(o => o.living), 12, 13, Math.min(W, H) * 0.32);

  /* A lane tied to a quick inner world would sweep around with it. Those worlds get a fixed
     port on their orbit instead, and ships are timed to meet the world as it passes. */
  sysObj.ports = [];
  const portOf = new Map();
  const fixedPort = o => {
    if (portOf.has(o)) return portOf.get(o);
    const pt = [0, 0];
    let bestM = 0, best = Infinity;
    for (let i = 0; i < 48; i++) {
      const M = (i / 48) * TAU;
      orbitXY(o.a, o.e, o.w, M, pt);
      const x = cx + pt[0], y = cy + pt[1];
      const margin = x < 40 || y < 40 || x > W - 40 || y > H - 120 ? 1e5 : 0;
      const d = Math.hypot(x - W / 2, y - H / 2) + margin;
      if (d < best) { best = d; bestM = M; }
    }
    orbitXY(o.a, o.e, o.w, bestM, pt);
    const port = {
      gx: pt[0], gy: pt[1], x: 0, y: 0, r: 3.4 * px, kind: 'port', living: o.living,
      world: o, meetAt: ((((bestM - o.phase) % TAU) + TAU) % TAU) / TAU * o.T,
    };
    portOf.set(o, port);
    sysObj.ports.push(port);
    return port;
  };
  const FAST_WORLD = 90; /* seconds per orbit */
  for (const l of sysObj.lanes) {
    const fast = o => o.T !== undefined && o.T < FAST_WORLD;
    let meet = null;
    if (fast(l.from)) { l.from = fixedPort(l.from); meet = l.from; }
    if (fast(l.to)) { l.to = fixedPort(l.to); if (!meet || l.to.world.T < meet.world.T) meet = l.to; }
    if (meet) syncShips(l, meet.world.T, meet.meetAt);
  }

  return sysObj;
}

function drawStatic(s, r, R) {
  const { W, H, pal, dpr, cx, cy, px, worlds, hab } = s;
  const layer = document.createElement('canvas');
  layer.width = Math.round(W * dpr);
  layer.height = Math.round(H * dpr);
  const g = layer.getContext('2d', { alpha: false });
  g.scale(dpr, dpr);
  s.layer = layer;
  s.g = g;

  g.fillStyle = pal.paper;
  g.fillRect(0, 0, W, H);

  /* Fibres in whatever material they engrave on. */
  const fibreAngle = R(0, Math.PI);
  g.strokeStyle = alpha(pal.ink, 0.03);
  g.lineWidth = 0.6;
  g.beginPath();
  const fibres = Math.round(W * H / 700);
  for (let i = 0; i < fibres; i++) {
    const x = r() * W, y = r() * H, len = R(10, 70), a = fibreAngle + R(-0.12, 0.12);
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
  }
  g.stroke();

  /* Tonal underpainting, then grain */
  const sizeK = clamp(Math.min(W, H) / 520, 0.72, 1.35);
  const textK = Math.max(sizeK, 1);
  const gutter = 32 * textK;
  const blocked = a => a > hab.lo && a < hab.hi + gutter;
  const P = [0, 0];
  g.lineWidth = 1.6;
  for (const b of s.belts) {
    const hi = Math.min(b.hi, s.reach);
    if (hi <= b.lo) continue;
    const steps = Math.min(70, Math.ceil((hi - b.lo) / 2.2));
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const a = lerp(b.lo, hi, u);
      if (blocked(a)) continue;
      const near = b.flip ? u : 1 - u;
      const e = lerp(b.eL, b.eH, u), w = lerp(b.wL, b.wH, u);
      const groove = 0.6 + 0.4 * Math.sin(u * b.freqs[1] + b.phases[1]);
      g.strokeStyle = alpha(pal.ink2, Math.min(0.5, Math.pow(near, b.k) * 0.55 * groove * Math.min(1, b.weight + 0.2)));
      g.beginPath();
      g.ellipse(cx - a * e * Math.cos(w), cy - a * e * Math.sin(w), a, a * Math.sqrt(1 - e * e), w, 0, TAU);
      g.stroke();
    }
  }

  const density = 0.62 / (sizeK * sizeK);
  const colours = [pal.ink, pal.ink2, pal.accent];
  const buckets = colours.map(() => ({ small: [], big: [] }));
  let budget = Math.round(W * H * 2.4);
  for (const b of s.belts) {
    const hi = Math.min(b.hi, s.reach);
    if (hi <= b.lo) continue;
    const area = Math.PI * (hi * hi - b.lo * b.lo);
    const attempts = Math.min(budget, Math.round(area * density * b.weight));
    budget -= attempts;
    for (let i = 0; i < attempts; i++) {
      let u = Math.pow(r(), b.k);
      if (b.flip) u = 1 - u;
      /* Grooves: some radii are simply emptier. */
      const groove = 0.5
        + 0.22 * Math.sin(u * b.freqs[0] + b.phases[0])
        + 0.18 * Math.sin(u * b.freqs[1] + b.phases[1])
        + 0.10 * Math.sin(u * b.freqs[2] + b.phases[2]);
      if (r() > 0.25 + 0.75 * groove) continue;
      const a = lerp(b.lo, hi, u);
      if (blocked(a)) continue;
      orbitXY(a, lerp(b.eL, b.eH, u), lerp(b.wL, b.wH, u), r() * TAU, P);
      const x = cx + P[0], y = cy + P[1];
      if (x < -3 || y < -3 || x > W + 3 || y > H + 3) continue;
      const near = b.flip ? u : 1 - u;
      const rad = (0.5 + r() * r() * 1.05 * near) * sizeK;
      const pick = r();
      const c = pick < 0.012 ? 2 : pick < 0.08 + 0.87 * near ? 0 : 1;
      (rad < 0.72 ? buckets[c].small : buckets[c].big).push(x, y, rad);
    }
  }
  colours.forEach((col, c) => {
    g.fillStyle = col;
    g.beginPath();
    const sm = buckets[c].small;
    for (let i = 0; i < sm.length; i += 3) g.rect(sm[i] - sm[i + 2], sm[i + 1] - sm[i + 2], sm[i + 2] * 2, sm[i + 2] * 2);
    g.fill();
    g.beginPath();
    const bg = buckets[c].big;
    for (let i = 0; i < bg.length; i += 3) {
      g.moveTo(bg[i] + bg[i + 2], bg[i + 1]);
      g.arc(bg[i], bg[i + 1], bg[i + 2], 0, TAU);
    }
    g.fill();
  });

  /* The band where their world can hold water is engraved, not dusted. */
  const home = worlds[s.homeIdx];
  const spacing = Math.max(2.6, 3.4 * sizeK);
  const lines = Math.max(6, Math.round((hab.hi - hab.lo) / spacing));
  g.lineWidth = 0.7;
  for (let i = 0; i <= lines; i++) {
    const t = i / lines;
    const a = lerp(hab.lo, hab.hi, t);
    const e = home.e;
    const fade = 0.2 + 0.7 * Math.abs(t * 2 - 1);
    g.strokeStyle = alpha(pal.ink, fade);
    g.beginPath();
    g.ellipse(cx - a * e * Math.cos(home.w), cy - a * e * Math.sin(home.w),
              a, a * Math.sqrt(1 - e * e), home.w, 0, TAU);
    g.stroke();
  }

  /* Knock out each living world's lane so it has somewhere to travel. */
  for (const o of worlds) {
    if (!o.living) continue;
    g.strokeStyle = pal.paper;
    g.lineWidth = Math.max(o.r * 2 + 8, 16);
    g.beginPath();
    g.ellipse(cx - o.a * o.e * Math.cos(o.w), cy - o.a * o.e * Math.sin(o.w),
              o.a, o.a * Math.sqrt(1 - o.e * o.e), o.w, 0, TAU);
    g.stroke();
  }

  /* Every world's orbit */
  for (const o of worlds) {
    g.strokeStyle = alpha(pal.ink, o.living ? 0.95 : 0.55);
    g.lineWidth = o.living ? 1 : 0.7;
    g.beginPath();
    g.ellipse(cx - o.a * o.e * Math.cos(o.w), cy - o.a * o.e * Math.sin(o.w),
              o.a, o.a * Math.sqrt(1 - o.e * o.e), o.w, 0, TAU);
    g.stroke();
  }

  paintChartMarks(s, g, false);

  /* Sun sprites */
  s.suns.forEach(sun => {
    const size = Math.ceil((sun.r * 2 + 4) * dpr);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const q = c.getContext('2d');
    q.scale(dpr, dpr);
    const mid = sun.r + 2;
    q.beginPath();
    q.arc(mid, mid, sun.r, 0, TAU);
    q.fillStyle = sun.tint;
    q.fill();
    q.save();
    q.clip();
    q.strokeStyle = alpha(pal.paper, 0.26);
    q.lineWidth = 0.6;
    const rings = Math.floor(sun.r / 2.2);
    for (let i = 1; i <= rings; i++) {
      q.beginPath();
      q.arc(mid, mid, (i / rings) * sun.r, 0, TAU);
      q.stroke();
    }
    q.fillStyle = alpha(pal.paper, 0.32);
    const specks = Math.round(sun.r * sun.r * 1.1);
    for (let i = 0; i < specks; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * sun.r;
      q.fillRect(mid + Math.cos(a) * d, mid + Math.sin(a) * d, 0.7, 0.7);
    }
    q.restore();
    sun.sprite = c;
    sun.mid = mid;
  });
}

/* Calendar, inscription, spine and names: the same marks on the print and the zoom sprite. */
function paintChartMarks(s, g, full) {
  const { W, H, pal, cx, cy, worlds, hab, base } = s;
  const r = mulberry(s.seed * 2654435761 + 311);
  const home = worlds[s.homeIdx];
  const sizeK = clamp(Math.min(W, H) / 520, 0.72, 1.35);
  const textK = Math.max(sizeK, 1);
  const P = [0, 0];
  const visible = (x, y, m) => full || !(x < -m || y < -m || x > W + m || y > H + m);

  /* Their calendar: ticks at equal TIME around the year, so they bunch up at the far end
     of the orbit. Every base-th tick is longer. */
  const ticks = base * base * 2;
  const rimA = hab.hi + 2;
  g.strokeStyle = pal.ink;
  for (let i = 0; i < ticks; i++) {
    const M = (i / ticks) * TAU;
    orbitXY(rimA, home.e, home.w, M, P);
    const x = cx + P[0], y = cy + P[1];
    if (!visible(x, y, 20)) continue;
    const d = Math.hypot(P[0], P[1]) || 1;
    const major = i % base === 0;
    const len = (major ? 9 : 4) * sizeK;
    g.lineWidth = major ? 1.1 : 0.7;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (P[0] / d) * len, y + (P[1] / d) * len);
    g.stroke();
  }

  /* An inscription runs round the year, just outside the calendar. */
  const vocab = [];
  for (let i = 0; i < 26; i++) vocab.push(makeGlyph(r));
  const lineA = rimA + 16 * textK;
  const gh = 13 * textK, gw = 8 * textK;
  const stepM = (gw + 5 * textK) / lineA;
  let word = 2 + Math.floor(r() * 5);
  g.strokeStyle = pal.ink;
  g.fillStyle = pal.ink;
  g.lineWidth = 1 * textK;
  g.lineCap = 'round';
  for (let M = 0; M < TAU - stepM; M += stepM) {
    const gl = vocab[Math.floor(r() * vocab.length)];
    if (word-- <= 0) { word = 2 + Math.floor(r() * 5); continue; }
    orbitXY(lineA, home.e, home.w, M, P);
    const x = cx + P[0], y = cy + P[1];
    if (!visible(x, y, 20)) continue;
    g.save();
    g.translate(x, y);
    g.rotate(Math.atan2(P[1], P[0]) + Math.PI / 2);
    drawGlyph(g, gl, -gw / 2, -gh, gw, gh, 1.1 * textK);
    g.restore();
  }
  g.lineCap = 'butt';

  /* Spine: a measured line from the suns, carrying each world's name and year. */
  const spine = s.spineA;
  g.strokeStyle = alpha(pal.ink, 0.85);
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(cx + Math.cos(spine) * s.reach * 1.2, cy + Math.sin(spine) * s.reach * 1.2);
  g.stroke();
  for (const o of worlds) {
    const rr = (o.a * (1 - o.e * o.e)) / (1 + o.e * Math.cos(spine - o.w));
    const x = cx + Math.cos(spine) * rr, y = cy + Math.sin(spine) * rr;
    if (!full && (x < 24 || y < 24 || x > W - 24 || y > H - 24)) continue;
    if (full && rr > s.reach * 0.96) continue;
    g.fillStyle = o.living ? pal.accent : pal.ink;
    g.beginPath();
    g.arc(x, y, (o.home ? 3.2 : 2) * sizeK, 0, TAU);
    g.fill();
    g.save();
    g.translate(x, y);
    const flip = Math.cos(spine) < 0;
    g.rotate(spine + (flip ? Math.PI : 0));
    drawLabel(g, o, s, (o.home ? 1.55 : 1.05) * textK);
    g.restore();
  }
}

function drawGlyph(g, gl, left, top, w, h, dot) {
  g.beginPath();
  for (const [a, b] of gl.strokes) {
    g.moveTo(left + a[0] * w, top + a[1] * h);
    g.lineTo(left + b[0] * w, top + b[1] * h);
  }
  g.stroke();
  g.beginPath();
  g.arc(left + gl.dot[0] * w, top + gl.dot[1] * h, dot, 0, TAU);
  g.fill();
}

/* A world's name, and its year written in the civilisation's own base.
   Drawn just to one side of the spine, in the spine's own rotated frame. */
function drawLabel(g, o, s, k) {
  const { pal, base } = s;
  const gw = 10 * k, gh = 15 * k;
  const ds = digits(o.p, base);
  const dot = 1.05 * k, step = 3.4 * k, rowH = 4.2 * k;
  const widest = Math.max(...ds.map(d => Math.max(1, d))) * step;
  const totalW = gw + 5 * k + widest;
  const totalH = Math.max(gh, ds.length * rowH);
  const left = -totalW / 2, top = -totalH - 8 * k;
  const pad = 4 * k;

  g.fillStyle = pal.paper;
  g.fillRect(left - pad, top - pad, totalW + pad * 2, totalH + pad * 2);

  const col = o.living ? pal.accent : pal.ink;
  g.strokeStyle = col;
  g.fillStyle = col;
  g.lineWidth = 1.2 * k;
  g.lineCap = 'round';
  drawGlyph(g, o.glyph, left, top, gw, gh, 1.4 * k);
  g.lineCap = 'butt';

  g.fillStyle = pal.ink;
  g.strokeStyle = pal.ink;
  g.lineWidth = 0.7;
  ds.forEach((d, row) => {
    const dy = top + dot + row * rowH;
    const dx = left + gw + 5 * k;
    if (d === 0) {
      g.beginPath();
      g.arc(dx + dot, dy, dot, 0, TAU);
      g.stroke();
      return;
    }
    for (let i = 0; i < d; i++) {
      g.beginPath();
      g.arc(dx + dot + i * step, dy, dot, 0, TAU);
      g.fill();
    }
  });
}

function drawCometPaths(s, g) {
  const { cx, cy, pal } = s;
  g.save();
  g.setLineDash([1.5, 6]);
  g.strokeStyle = alpha(pal.accent, 0.85);
  g.lineWidth = 0.9;
  for (const c of s.comets) {
    g.beginPath();
    g.ellipse(cx - c.a * c.e * Math.cos(c.w), cy - c.a * c.e * Math.sin(c.w),
              c.a, c.a * Math.sqrt(1 - c.e * c.e), c.w, 0, TAU);
    g.stroke();
  }
  g.restore();
}

const P = [0, 0];

function drawWorld(s, o, t) {
  const { pal, px } = s;
  const k = cam.k;
  orbitXY(o.a, o.e, o.w, (t / o.T) * TAU + o.phase, P);
  const px0 = P[0], py0 = P[1];
  place(s, px0, py0);
  const x = VX, y = VY;
  const homeBoost = o.home ? Math.max(o.r, 26 * px) / o.r : 0.8;
  const r = o.r * lerp(1, homeBoost, k);
  o.x = x; o.y = y;
  if (k > 0.5) {
    o.ang = Math.atan2(py0 - s.hy, px0 - s.hx);
    o.dist = Math.hypot(py0 - s.hy, px0 - s.hx);
  } else {
    o.ang = Math.atan2(py0, px0);
    o.dist = Math.hypot(py0, px0);
  }
  const m = Math.max(40, r + 10);
  if (x < -m || y < -m || x > s.W + m || y > s.H + m) return;

  if (o.ring) drawRing(o.ring, x, y, r, o.tint, Math.PI, TAU);
  ctx.fillStyle = pal.paper;
  ctx.beginPath();
  ctx.arc(x, y, r + 2.2, 0, TAU);
  ctx.fill();

  /* Lit from the suns: a hard crescent, printed rather than airbrushed. */
  const d = Math.hypot(px0, py0) || 1;
  const lx = -px0 / d, ly = -py0 / d;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();
  ctx.fillStyle = o.tint;
  ctx.fillRect(x - r - 1, y - r - 1, r * 2 + 2, r * 2 + 2);
  ctx.fillStyle = mix(pal.paper, o.tint, 0.2);
  ctx.beginPath();
  ctx.arc(x - lx * r * 0.62, y - ly * r * 0.62, r * 1.02, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = o.tint;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();

  if (o.ring) drawRing(o.ring, x, y, r, o.tint, 0, Math.PI);
  if (o.living) {
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = o.home ? 1.1 : 0.8;
    ctx.beginPath();
    ctx.arc(x, y, r + (o.home ? 5 : 3.5) * px, 0, TAU);
    ctx.stroke();
  }

  const reachK = lerp(1, Math.max(1, homeBoost), o.home ? k : 0);
  for (const m of o.moons) {
    const a = (t / m.T) * TAU + m.ph;
    ctx.fillStyle = pal.ink;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * m.d * reachK, y + Math.sin(a) * m.d * reachK, m.s, 0, TAU);
    ctx.fill();
  }
}

/* Half a ring: drawn in two passes, so a world sits inside its own rings. */
function drawRing(ring, x, y, r, tint, from, to) {
  ctx.strokeStyle = tint;
  const rows = 4;
  for (let i = 0; i < rows; i++) {
    const a = r * lerp(ring.a1, ring.a2, i / (rows - 1));
    ctx.lineWidth = i === 1 ? 1.4 : 0.7;
    ctx.beginPath();
    ctx.ellipse(x, y, a, a * ring.tilt, ring.rot, from, to);
    ctx.stroke();
  }
}

/* ---- Traffic: gates, wormholes, lanes and ships. All live, so sharp at any zoom. ---- */
const arcPts = (r, from, to, n) => Array.from({ length: n + 1 }, (_, i) => {
  const a = lerp(from, to, i / n);
  return [Math.cos(a) * r, Math.sin(a) * r];
});
const HULLS = [
  /* crescent, horns forward */
  [[...arcPts(1.5, -1.25, 1.25, 8).map(([x, y]) => [x - 0.5, y]), ...arcPts(0.95, 1.05, -1.05, 8).map(([x, y]) => [x - 0.55, y])]],
  /* trident */
  [[[-1.4, -0.28], [-0.2, -0.28], [0.1, -1.1], [1.5, -1.0], [0.45, -0.55], [0.45, -0.2], [1.9, 0], [0.45, 0.2], [0.45, 0.55], [1.5, 1.0], [0.1, 1.1], [-0.2, 0.28], [-1.4, 0.28]]],
  /* ring-ship: a hoop on a spine */
  [arcPts(1.25, 0, TAU, 14), arcPts(0.72, TAU, 0, 14), [[1.1, -0.17], [2.0, 0], [1.1, 0.17]], [[-1.1, 0.17], [-1.9, 0.3], [-1.9, -0.3], [-1.1, -0.17]]],
  /* manta */
  [[[1.7, 0], [0.5, 0.42], [-0.15, 1.5], [-0.55, 0.65], [-1.9, 0.14], [-1.9, -0.14], [-0.55, -0.65], [-0.15, -1.5], [0.5, -0.42]]],
  /* spindle with a crossbar */
  [[[2.1, 0], [0.4, 0.28], [0.25, 1.15], [-0.15, 1.15], [-0.15, 0.3], [-2.0, 0], [-0.15, -0.3], [-0.15, -1.15], [0.25, -1.15], [0.4, -0.28]]],
  /* seed with a wake notch */
  [[[1.8, 0], [0.9, 0.82], [-0.5, 1.0], [-1.6, 0.55], [-0.85, 0], [-1.6, -0.55], [-0.5, -1.0], [0.9, -0.82]]],
];

/* A civilisation builds in its own style: three hull types and its own number base. */
function fleetOf(s) {
  if (s.fleet) return s.fleet;
  const q = mulberry(s.seed * 2654435761 + 601);
  const order = HULLS.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(q() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  s.fleet = { hulls: order.slice(0, 3), base: s.base };
  return s.fleet;
}

function makeShips(q, count, baseT) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const ph = q(), T = baseT * (0.7 + q() * 0.8), rev = q() < 0.5, hot = q() < 0.14;
    /* Its registry comes from its own small stream, so naming never changes the chart. */
    const nr = mulberry(Math.floor(ph * 4294967296));
    out.push({ ph, T, rev, hot, hull: Math.floor(nr() * 3), name: [makeGlyph(nr), makeGlyph(nr)], serialU: nr() });
  }
  return out;
}
/* Each trip starts and ends just as the world passes, so a ship never waits at an empty port.
   A trip's wrap touches both ends of the lane, so this holds for ships going either way. */
function syncShips(lane, worldT, meetAt) {
  const base = lane.ships.length ? lane.ships[0].T : 30;
  const orbits = Math.max(1, Math.round(base / worldT));
  const count = Math.min(lane.ships.length, orbits);
  lane.ships.length = count;
  const T = orbits * worldT;
  lane.ships.forEach((sh, i) => {
    sh.T = T;
    sh.ph = (((Math.floor((i * orbits) / count) / orbits - meetAt / T) % 1) + 1) % 1;
  });
}
function makeLane(q, from, to, ships, baseT, hot) {
  return {
    from, to, bow: (q() < 0.5 ? -1 : 1) * (0.08 + q() * 0.22), hot: !!hot,
    flow: 130 / baseT, /* dashes crawl at the speed of the traffic */
    ships: makeShips(q, ships, baseT),
  };
}

function drawLanes(lanes, t, scale, pal, k, fleet, realScale) {
  const thin = Math.pow(scale, -0.6);
  ctx.save();
  ctx.setLineDash([5 * thin * k, 4 * thin * k]);
  ctx.lineWidth = 0.9 * thin * k;
  for (const l of lanes) {
    const a = l.from, b = l.to, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    l.cx = mx - (b.y - a.y) * l.bow;
    l.cy = my + (b.x - a.x) * l.bow;
    ctx.lineDashOffset = -t * l.flow;
    ctx.strokeStyle = l.hot ? alpha(pal.accent, 0.85) : alpha(pal.ink, 0.6);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(l.cx, l.cy, b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();

  /* Ships shrink as they reach either end: docking, or gone through a gate. */
  const size = 3.3 * thin * k;
  const showNames = realScale > 0.6;
  const gw = 4.4 * thin * k, gh = 6.6 * thin * k, gap = 1.4 * thin * k;
  const dot = 0.62 * thin * k, step = 1.9 * thin * k, rowH = 2.2 * thin * k;
  const named = [];
  for (const hot of [false, true]) {
    ctx.fillStyle = hot ? pal.accent : pal.ink;
    ctx.beginPath();
    for (const l of lanes) {
      const a = l.from, b = l.to;
      for (const sh of l.ships) {
        if (sh.hot !== hot) continue;
        let u = ((t / sh.T) + sh.ph) % 1;
        if (sh.rev) u = 1 - u;
        const v = 1 - u;
        const x = v * v * a.x + 2 * v * u * l.cx + u * u * b.x;
        const y = v * v * a.y + 2 * v * u * l.cy + u * u * b.y;
        let tx = 2 * v * (l.cx - a.x) + 2 * u * (b.x - l.cx);
        let ty = 2 * v * (l.cy - a.y) + 2 * u * (b.y - l.cy);
        const d = Math.hypot(tx, ty) || 1;
        tx /= d; ty /= d;
        if (sh.rev) { tx = -tx; ty = -ty; }
        const r = size * Math.min(1, Math.min(u, v) * 12);
        if (r < 0.15) continue;
        for (const contour of HULLS[fleet.hulls[sh.hull]]) {
          contour.forEach(([px, py], i) => {
            const X = x + (px * tx - py * ty) * r, Y = y + (px * ty + py * tx) * r;
            if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
          });
          ctx.closePath();
        }
        if (showNames && Math.min(u, v) > 0.13) named.push({ sh, x, y, hot });
      }
    }
    ctx.fill();
  }
  if (!named.length) return;

  /* Registries: two glyphs and a serial in their own base, always the right way up.
     Where lanes crowd together, only the ones with room are written. */
  const shown = [];
  for (const n of named) {
    const sh = n.sh;
    if (!sh.ds) sh.ds = digits(1 + Math.floor(sh.serialU * (Math.pow(fleet.base, 3) - 1)), fleet.base);
    n.left = n.x + size * 2.5;
    n.top = n.y - gh / 2;
    n.w = gw * 2 + gap * 2 + Math.max(...sh.ds.map(v => Math.max(1, v))) * step;
    const clear = !shown.some(o => n.left < o.left + o.w + gap * 2 && o.left < n.left + n.w + gap * 2
      && n.top < o.top + gh + gap * 2 && o.top < n.top + gh + gap * 2);
    if (clear) shown.push(n);
  }
  ctx.fillStyle = alpha(pal.paper, 0.72);
  for (const n of shown) ctx.fillRect(n.left - gap, n.top - gap, n.w + gap, gh + gap * 2);
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.75 * thin * k;
  for (const hot of [false, true]) {
    const col = hot ? pal.accent : pal.ink;
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.beginPath();
    for (const n of shown) {
      if (n.hot !== hot) continue;
      n.sh.name.forEach((gl, i) => {
        const ox = n.left + i * (gw + gap);
        for (const [a, b] of gl.strokes) {
          ctx.moveTo(ox + a[0] * gw, n.top + a[1] * gh);
          ctx.lineTo(ox + b[0] * gw, n.top + b[1] * gh);
        }
      });
    }
    ctx.stroke();
    ctx.beginPath();
    for (const n of shown) {
      if (n.hot !== hot) continue;
      const ox = n.left + (gw + gap) * 2;
      n.sh.ds.forEach((v, row) => {
        const dy = n.top + dot + row * rowH;
        for (let i = 0; i < v; i++) {
          const dx = ox + dot + i * step;
          ctx.moveTo(dx + dot, dy);
          ctx.arc(dx, dy, dot, 0, TAU);
        }
      });
    }
    ctx.fill();
  }
  ctx.lineCap = 'butt';
}

/* ---- Comms. Radio spreads slowly from living worlds; FTL flashes between gates at once. ---- */
function makeComms(q, links, radios, ftlT, radioT, reach) {
  return {
    ftl: links.map(([a, b]) => ({ a, b, T: ftlT * (0.7 + q() * 0.8), ph: q() })),
    radio: radios.map(src => ({ src, T: radioT * (0.7 + q() * 0.6), ph: q(), reach: reach * (0.8 + q() * 0.4) })),
  };
}

function drawComms(c, t, scale, pal, k) {
  const thin = Math.pow(scale, -0.6);
  if (c.radio.length) {
    ctx.save();
    ctx.lineWidth = 0.8 * thin * k;
    ctx.setLineDash([2 * thin * k, 3 * thin * k]);
    for (const w of c.radio) {
      for (let front = 0; front < 3; front++) {
        const u = ((t / w.T) + w.ph + front / 3) % 1;
        ctx.strokeStyle = alpha(pal.ink, (1 - u) * (1 - u) * 0.6);
        ctx.beginPath();
        ctx.arc(w.src.x, w.src.y, 4 + u * w.reach, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  for (const f of c.ftl) {
    const u = ((t / f.T) + f.ph) % 1;
    if (u > 0.09) continue;
    const left = 1 - u / 0.09;
    ctx.strokeStyle = alpha(pal.accent, left * 0.95);
    ctx.lineWidth = (0.7 + left * 1.1) * thin * k;
    ctx.beginPath();
    ctx.moveTo(f.a.x, f.a.y);
    ctx.lineTo(f.b.x, f.b.y);
    ctx.stroke();
    /* A small ring opens at both ends in the same instant. */
    const rad = (1 - left) * 12 * thin * k + 2 * thin * k;
    ctx.lineWidth = 0.9 * thin * k;
    ctx.beginPath();
    ctx.moveTo(f.a.x + rad, f.a.y);
    ctx.arc(f.a.x, f.a.y, rad, 0, TAU);
    ctx.moveTo(f.b.x + rad, f.b.y);
    ctx.arc(f.b.x, f.b.y, rad, 0, TAU);
    ctx.stroke();
  }
}

function drawGate(g, t, scale, pal, k) {
  const thin = Math.pow(scale, -0.6);
  const { x, y, r } = g;
  ctx.fillStyle = pal.paper;
  ctx.beginPath();
  ctx.arc(x, y, r + 2 * thin, 0, TAU);
  ctx.fill();
  if (g.kind === 'port') {
    /* A small fixed mooring on the orbit. */
    ctx.strokeStyle = g.living ? pal.accent : pal.ink;
    ctx.lineWidth = 1.1 * thin * k;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.32, 0, TAU);
    ctx.fill();
  } else if (g.kind === 'gate') {
    /* A built thing: a ring, turning segments, and anchor struts. */
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 1.6 * thin * k;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 2 * thin * k;
    const turn = t * g.spin;
    for (let i = 0; i < 6; i++) {
      const a = turn + (i / 6) * TAU;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.72, a, a + 0.62);
      ctx.stroke();
    }
    ctx.lineWidth = 0.9 * thin * k;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4;
      ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.lineTo(x + Math.cos(a) * (r + 6 * thin * k), y + Math.sin(a) * (r + 6 * thin * k));
    }
    ctx.stroke();
  } else {
    /* A natural throat: grain falling inwards on a tightening spiral. */
    const turn = -t * g.spin;
    for (const accent of [false, true]) {
      ctx.fillStyle = accent ? pal.accent : pal.ink;
      ctx.beginPath();
      for (let arm = 0; arm < 3; arm++) {
        for (let i = 0; i < 18; i++) {
          if ((i % 7 === 0) !== accent) continue;
          const f = (i + ((t * Math.abs(g.spin) * 1.2) % 1)) / 18;
          const rad = r * (1 - f * 0.86);
          const a = turn + (arm / 3) * TAU + f * 5.4;
          const d = (0.5 + (1 - f) * 0.9) * thin * k;
          const dx = x + Math.cos(a) * rad, dy = y + Math.sin(a) * rad;
          ctx.moveTo(dx + d, dy);
          ctx.arc(dx, dy, d, 0, TAU);
        }
      }
      ctx.fill();
    }
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.14, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = alpha(pal.ink, 0.8);
    ctx.lineWidth = 0.8 * thin * k;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
  }
}

function drawComets(s, t) { for (const c of s.comets) drawComet(s, c, t); }

function drawComet(s, c, t) {
  const { pal, px } = s;
  orbitXY(c.a, c.e, c.w, (t / c.T) * TAU + c.ph, P);
  place(s, P[0], P[1]);
  const x = VX, y = VY;
  if (x < -120 || y < -120 || x > s.W + 120 || y > s.H + 120) return;
  const d = Math.hypot(P[0], P[1]) || 1;
  const ox = P[0] / d, oy = P[1] / d;
  const tail = clamp((s.a0 * 26) / d, 6, 70) * px;
  ctx.strokeStyle = alpha(pal.accent, 0.8);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + ox * tail, y + oy * tail);
  ctx.stroke();
  ctx.fillStyle = pal.accent;
  ctx.beginPath();
  ctx.arc(x, y, 2.1 * px, 0, TAU);
  ctx.fill();
}

function drawSuns(s, t) {
  const a = (t / s.sunT) * TAU;
  const size = lerp(1, s.vs, cam.k);
  s.suns.forEach((sun, i) => {
    const dir = a * sun.rate + sun.ph;
    place(s, Math.cos(dir) * sun.off, Math.sin(dir) * sun.off);
    if (liveScale > 1.2) {
      ctx.fillStyle = sun.tint;
      ctx.beginPath();
      ctx.arc(VX, VY, sun.r * size, 0, TAU);
      ctx.fill();
      return;
    }
    const m = sun.mid * size;
    ctx.drawImage(sun.sprite, VX - m, VY - m, m * 2, m * 2);
  });
}

/* ------------------------------------------------------------------------------------
   The two ways of seeing the home system.
   Star view: the printed chart. Home view: the same system from where they stand, so the
   suns circle home and every other world traces a looping rosette.
   ------------------------------------------------------------------------------------ */
const cam = { z: 0, k: 0, viewTo: 0, auto: !frozen, from: 0, to: 0, u: 1, dur: 1, hold: 12 };
let VX = 0, VY = 0, liveScale = 1;
function place(s, x, y) {
  VX = s.cx + x; VY = s.cy + y;
  const k = cam.k;
  if (k > 0) {
    VX = lerp(VX, s.W / 2 + (x - s.hx) * s.vs, k);
    VY = lerp(VY, s.H / 2 + (y - s.hy) * s.vs, k);
  }
}

const smooth = (a, b, v) => { const u = clamp((v - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const gauss = r => (r() + r() + r() + r() - 2) / 2;

const LITE = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 8) <= 4;
const CAP_DISC = LITE ? 1200 : 4096;   /* the whole system, as it shrinks away */
const CAP_PLATE = LITE ? 1024 : 2048;  /* a far scale, as it shrinks away */
const SAMPLE = LITE ? 60000 : 160000;  /* grains kept per plate for sharp redrawing */
const LIVE_DOTS = LITE ? 5000 : 14000; /* the most grains redrawn in one frame */

function dotBuckets(cols) {
  const b = cols.map(() => []);
  return {
    add(c, x, y, rad) { b[c].push(x, y, rad); },
    flush(g, minArc) {
      const raw = g.__raw || g;
      cols.forEach((col, c) => {
        const a = b[c];
        raw.fillStyle = col;
        raw.beginPath();
        for (let i = 0; i < a.length; i += 3) {
          if (a[i + 2] < minArc) raw.rect(a[i] - a[i + 2], a[i + 1] - a[i + 2], a[i + 2] * 2, a[i + 2] * 2);
          else { raw.moveTo(a[i] + a[i + 2], a[i + 1]); raw.arc(a[i], a[i + 1], a[i + 2], 0, TAU); }
        }
        raw.fill();
      });
      if (!g.__ops) return;
      /* Keep an even sample so the grain can be redrawn crisply while zooming in. */
      let total = 0;
      for (const a of b) total += a.length / 3;
      const every = Math.max(1, Math.ceil(total / SAMPLE));
      g.__ops.push(['__dots', cols.map((col, c) => {
        const a = b[c], n = Math.floor(a.length / 3 / every), out = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          out[i * 3] = a[i * every * 3];
          out[i * 3 + 1] = a[i * every * 3 + 1];
          out[i * 3 + 2] = a[i * every * 3 + 2];
        }
        return { col, pts: out };
      })]);
    },
  };
}

/* Draws to a canvas as normal, and remembers every call so it can be repeated at any scale. */
function recording(raw) {
  const ops = [];
  return new Proxy(raw, {
    get(t, k) {
      if (k === '__raw') return t;
      if (k === '__ops') return ops;
      const v = t[k];
      if (typeof v !== 'function') return v;
      return (...a) => { ops.push([k, a]); return v.apply(t, a); };
    },
    set(t, k, v) { ops.push([k, null, v]); t[k] = v; return true; },
  });
}

/* If a device starts to struggle, the page quietly draws fewer loose grains. */
let quality = 1;

function drawDots(groups, scale) {
  const m = ctx.getTransform().inverse();
  const cw = canvas.width, ch = canvas.height;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [X, Y] of [[0, 0], [cw, 0], [0, ch], [cw, ch]]) {
    const x = m.a * X + m.c * Y + m.e, y = m.b * X + m.d * Y + m.f;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  let total = 0;
  for (const g of groups) total += g.pts.length / 3;
  const stride = Math.max(1, Math.ceil((total / (scale * scale)) / (LIVE_DOTS * quality)));
  const grow = Math.pow(scale, -0.5);
  for (const g of groups) {
    /* Tested on a real graphics card: one big path of circles beats stamping images by far. */
    const a = g.pts;
    ctx.fillStyle = g.col;
    ctx.beginPath();
    for (let i = 0; i < a.length; i += 3 * stride) {
      const x = a[i], y = a[i + 1];
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      const r = a[i + 2] * grow;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    }
    ctx.fill();
  }
}

/* A pyramid of smaller copies: shrinking uses the closest one rather than resampling a
   huge image every frame. The smallest doubles as the soft tone under sharp grain. */
function mipsOf(c) {
  const out = [c];
  let last = c;
  while (last.width > 400) {
    const m = document.createElement('canvas');
    m.width = m.height = Math.ceil(last.width / 2);
    const g = m.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(last, 0, 0, m.width, m.height);
    out.push(m);
    last = m;
  }
  return out;
}
function mipFor(mips, devicePx) {
  for (let i = mips.length - 1; i >= 0; i--) if (mips[i].width >= devicePx * 0.85) return mips[i];
  return mips[0];
}

function replay(ops, scale) {
  const thin = Math.pow(scale, -0.55);
  ctx.save();
  for (const op of ops) {
    const k = op[0];
    if (k === '__dots') { drawDots(op[1], scale); continue; }
    if (op[1] === null) { ctx[k] = k === 'lineWidth' ? op[2] * thin : op[2]; continue; }
    ctx[k](...op[1]);
  }
  ctx.restore();
}

/* How a scale is shown at each size: a true-resolution print near rest, the round sprite
   as it shrinks, and sharp redrawn grain and line as it grows. */
function layerMix(scale) {
  if (scale === 1) return { rest: 1, disc: 0, live: 0, tone: 0 };
  if (scale < 1) { const rest = smooth(0.72, 1, scale); return { rest, disc: 1 - rest, live: 0, tone: 0 }; }
  return { rest: 1 - smooth(1.9, 3.0, scale), disc: 0, live: smooth(1.15, 1.8, scale), tone: smooth(1.15, 1.8, scale) * 0.72 };
}

function square(size, s, cap) {
  const px = Math.min(cap, Math.ceil(size * s.dpr));
  const c = document.createElement('canvas');
  c.width = c.height = px;
  return { c, g: c.getContext('2d'), q: px / size };
}

function ellipsePath(g, x, y, a, e, w) {
  g.beginPath();
  g.ellipse(x - a * e * Math.cos(w), y - a * e * Math.sin(w), a, a * Math.sqrt(1 - e * e), w, 0, TAU);
}

/* Whole star-view system as a soft round sprite: what shrinks away as you zoom out. */
function starDisc(s) {
  if (s.starDisc) return s.starDisc;
  const { cx, cy, pal, reach: R, belts, worlds, hab, homeIdx } = s;
  const r = mulberry(s.seed * 2654435761 + 77);
  const { c, g: rawDisc, q } = square(R * 2, s, CAP_DISC);
  rawDisc.setTransform(q, 0, 0, q, q * (R - cx), q * (R - cy));
  const g = recording(rawDisc);
  const fade = a => 1 - smooth(0.7, 1, a / R);
  const unit = 1 / q;

  rawDisc.lineWidth = Math.max(1.8, 1.6 * unit);
  for (const b of belts) {
    const hi = Math.min(b.hi, R);
    if (hi <= b.lo) continue;
    const steps = Math.min(36, Math.ceil((hi - b.lo) / (2.4 * unit)));
    for (let i = 0; i <= steps; i++) {
      const u = i / steps, a = lerp(b.lo, hi, u);
      if (a > hab.lo && a < hab.hi) continue;
      const near = b.flip ? u : 1 - u;
      rawDisc.strokeStyle = alpha(pal.ink2, Math.min(0.45, Math.pow(near, b.k) * 0.5 * Math.min(1, b.weight + 0.2)) * fade(a));
      ellipsePath(rawDisc, cx, cy, a, lerp(b.eL, b.eH, u), lerp(b.wL, b.wH, u));
      rawDisc.stroke();
    }
  }

  const dots = dotBuckets([pal.ink, pal.ink2, pal.accent]);
  let area = 0;
  for (const b of belts) { const hi = Math.min(b.hi, R); if (hi > b.lo) area += (hi * hi - b.lo * b.lo) * b.weight; }
  const total = Math.min(c.width * c.width * 0.13, LITE ? 150000 : 700000);
  const pt = [0, 0];
  for (const b of belts) {
    const hi = Math.min(b.hi, R);
    if (hi <= b.lo) continue;
    const n = Math.round(total * ((hi * hi - b.lo * b.lo) * b.weight) / area);
    for (let i = 0; i < n; i++) {
      let u = Math.pow(r(), b.k);
      if (b.flip) u = 1 - u;
      const a = lerp(b.lo, hi, u);
      if ((a > hab.lo && a < hab.hi) || r() > fade(a)) continue;
      orbitXY(a, lerp(b.eL, b.eH, u), lerp(b.wL, b.wH, u), r() * TAU, pt);
      const near = b.flip ? u : 1 - u;
      const pick = r();
      dots.add(pick < 0.012 ? 2 : pick < 0.08 + 0.87 * near ? 0 : 1, cx + pt[0], cy + pt[1], (0.55 + r() * r() * near) * unit);
    }
  }
  dots.flush(g, 0.8 * unit);

  const home = worlds[homeIdx];
  g.lineWidth = Math.max(0.7, 0.7 * unit);
  for (let i = 0; i <= 12; i++) {
    g.strokeStyle = alpha(pal.ink, 0.2 + 0.6 * Math.abs(i / 6 - 1));
    ellipsePath(g, cx, cy, lerp(hab.lo, hab.hi, i / 12), home.e, home.w);
    g.stroke();
  }
  for (const o of worlds) {
    if (o.a > R) continue;
    g.strokeStyle = alpha(pal.ink, o.living ? 0.95 : 0.55);
    ellipsePath(g, cx, cy, o.a, o.e, o.w);
    g.stroke();
  }
  drawCometPaths(s, g);
  paintChartMarks(s, g, true);
  s.starDisc = { mips: mipsOf(c), x: cx - R, y: cy - R, size: R * 2, ops: g.__ops };
  return s.starDisc;
}

/* Shared painter for the home-centred sky. Each grain is a body at a random moment,
   minus where home was at that same moment, so paths pile up where they appear to linger:
   at the turning points of their retrograde loops. */
function paintHomeSky(s, g, o) {
  const { W, H, pal, belts, worlds, homeIdx, vs, base } = s;
  const { r, u, grain, limit, maxSteps } = o;
  const R = (a, b) => a + (b - a) * r();
  const home = worlds[homeIdx];
  const cxv = W / 2, cyv = H / 2;
  const a = [0, 0], h = [0, 0];
  const onScreen = limit
    ? (x, y) => { const d = Math.hypot(x - cxv, y - cyv); return d < limit && r() < 1 - smooth(0.7, 1, d / limit); }
    : (x, y) => !(x < -3 || y < -3 || x > W + 3 || y > H + 3);
  const homeAt = t => orbitXY(home.a, home.e, home.w, (t / home.T) * TAU + home.phase, h);

  const dots = dotBuckets([pal.ink, pal.ink2, pal.accent]);

  /* Haze: the belts, smeared by home's own motion. */
  const usable = belts.filter(b => b.weight > 0.25);
  const haze = Math.round(grain * 0.34);
  for (let i = 0; i < haze && usable.length; i++) {
    const b = usable[Math.floor(r() * usable.length)];
    let t = Math.pow(r(), b.k);
    if (b.flip) t = 1 - t;
    orbitXY(lerp(b.lo, b.hi, t), lerp(b.eL, b.eH, t), lerp(b.wL, b.wH, t), r() * TAU, a);
    homeAt(r() * home.T);
    const x = cxv + (a[0] - h[0]) * vs, y = cyv + (a[1] - h[1]) * vs;
    if (!onScreen(x, y)) continue;
    const near = b.flip ? t : 1 - t;
    dots.add(r() < 0.5 + 0.3 * near ? 1 : 0, x, y, (0.5 + r() * r() * 0.5) * u);
  }

  /* Rosettes */
  const others = worlds.filter(w => !w.home);
  const ribbon = (grain - haze) / Math.max(1, others.length);
  const paths = [];
  for (const w of others) {
    const span = (w.p * home.p / gcd(w.p, home.p)) * (home.T / home.p);
    const width = R(5, 20) * u * (s.textK || 1);
    const k = R(1.6, 3.2);
    for (let i = 0; i < ribbon; i++) {
      const t = r() * span;
      orbitXY(w.a, w.e, w.w, (t / w.T) * TAU + w.phase, a);
      homeAt(t);
      let dx = (a[0] - h[0]) * vs, dy = (a[1] - h[1]) * vs;
      const d = Math.hypot(dx, dy) || 1;
      const near = Math.pow(r(), k);
      const off = near * width;
      const x = cxv + dx + (dx / d) * off, y = cyv + dy + (dy / d) * off;
      if (!onScreen(x, y)) continue;
      const pick = r(), fine = 1 - near;
      dots.add(pick < 0.014 ? 2 : pick < 0.1 + 0.85 * fine ? 0 : 1, x, y, (0.5 + r() * r() * 1.05 * fine) * u);
    }
    paths.push({ w, span });
  }
  dots.flush(g, 0.72 * u);

  g.lineWidth = Math.max(0.7, 0.7 * u);
  g.strokeStyle = alpha(pal.ink, 0.5);
  for (const { w, span } of paths) {
    const steps = clamp(Math.ceil((span / Math.min(w.T, home.T)) * 90), 240, maxSteps || 3200);
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * span;
      orbitXY(w.a, w.e, w.w, (t / w.T) * TAU + w.phase, a);
      homeAt(t);
      const x = cxv + (a[0] - h[0]) * vs, y = cyv + (a[1] - h[1]) * vs;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.stroke();
  }

  /* The suns' road: from home, their year is the suns going round. */
  const sizeK = clamp(Math.min(W, H) / 520, 0.72, 1.35), textK = Math.max(sizeK, 1);
  g.strokeStyle = alpha(pal.accent, 0.95);
  g.lineWidth = Math.max(1.1, u);
  g.beginPath();
  for (let i = 0; i <= 240; i++) {
    orbitXY(home.a, home.e, home.w, (i / 240) * TAU, h);
    const x = cxv - h[0] * vs, y = cyv - h[1] * vs;
    if (i) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.stroke();

  const marks = mulberry(s.seed * 2654435761 + 353);
  const ticks = base * base * 2;
  g.strokeStyle = pal.accent;
  for (let i = 0; i < ticks; i++) {
    orbitXY(home.a, home.e, home.w, (i / ticks) * TAU, h);
    const dx = -h[0] * vs, dy = -h[1] * vs, d = Math.hypot(dx, dy) || 1;
    const major = i % base === 0, len = (major ? 9 : 4) * sizeK;
    g.lineWidth = major ? 1.1 : 0.7;
    g.beginPath();
    g.moveTo(cxv + dx, cyv + dy);
    g.lineTo(cxv + dx + (dx / d) * len, cyv + dy + (dy / d) * len);
    g.stroke();
  }

  /* Their ring of script, on a cleared band around home. */
  const ringR = home.a * vs * 0.56;
  const gh = 13 * textK, gw = 8 * textK;
  g.strokeStyle = pal.paper;
  g.lineWidth = gh + 14 * textK;
  g.beginPath();
  g.arc(cxv, cyv, ringR, 0, TAU);
  g.stroke();
  g.strokeStyle = alpha(pal.ink, 0.8);
  g.lineWidth = 0.8;
  for (const edge of [-1, 1]) {
    g.beginPath();
    g.arc(cxv, cyv, ringR + edge * (gh / 2 + 7 * textK), 0, TAU);
    g.stroke();
  }
  const vocab = [];
  for (let i = 0; i < 26; i++) vocab.push(makeGlyph(marks));
  const step = (gw + 5 * textK) / ringR;
  let word = 2 + Math.floor(marks() * 5);
  g.strokeStyle = pal.ink;
  g.fillStyle = pal.ink;
  g.lineWidth = textK;
  g.lineCap = 'round';
  for (let m = 0; m < TAU - step; m += step) {
    const gl = vocab[Math.floor(marks() * vocab.length)];
    if (word-- <= 0) { word = 2 + Math.floor(marks() * 5); continue; }
    g.save();
    g.translate(cxv + Math.cos(m) * ringR, cyv + Math.sin(m) * ringR);
    g.rotate(m + Math.PI / 2);
    drawGlyph(g, gl, -gw / 2, -gh / 2, gw, gh, 1.1 * textK);
    g.restore();
  }
  g.lineCap = 'butt';

  /* Names on a spine out from home, each at the point its path crosses it furthest out. */
  const spine = marks() * TAU;
  g.strokeStyle = alpha(pal.ink, 0.85);
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(cxv + Math.cos(spine) * (ringR + gh), cyv + Math.sin(spine) * (ringR + gh));
  g.lineTo(cxv + Math.cos(spine) * Math.hypot(W, H), cyv + Math.sin(spine) * Math.hypot(W, H));
  g.stroke();
  const placed = [];
  for (const { w, span } of paths) {
    let best = null;
    for (let i = 0; i < 900; i++) {
      const t = (i / 900) * span;
      orbitXY(w.a, w.e, w.w, (t / w.T) * TAU + w.phase, a);
      homeAt(t);
      const dx = (a[0] - h[0]) * vs, dy = (a[1] - h[1]) * vs;
      let diff = Math.abs(Math.atan2(dy, dx) - spine) % TAU;
      if (diff > Math.PI) diff = TAU - diff;
      if (diff > 0.05) continue;
      const x = cxv + Math.cos(spine) * Math.hypot(dx, dy), y = cyv + Math.sin(spine) * Math.hypot(dx, dy);
      if (limit ? Math.hypot(x - cxv, y - cyv) > limit * 0.92 : (x < 24 || y < 24 || x > W - 24 || y > H - 24)) continue;
      const d = Math.hypot(dx, dy);
      if (!best || d > best.d) best = { d, x, y };
    }
    if (!best || placed.some(d => Math.abs(d - best.d) < 96 * textK)) continue;
    placed.push(best.d);
    g.fillStyle = pal.ink;
    g.beginPath();
    g.arc(best.x, best.y, 2 * sizeK, 0, TAU);
    g.fill();
    g.save();
    g.translate(best.x, best.y);
    g.rotate(spine + (Math.cos(spine) < 0 ? Math.PI : 0));
    drawLabel(g, w, s, 1.05 * textK);
    g.restore();
  }
}

function homeLayer(s) {
  if (s.homeLayer) return s.homeLayer;
  const { W, H, dpr, pal } = s;
  const c = document.createElement('canvas');
  c.width = Math.round(W * dpr);
  c.height = Math.round(H * dpr);
  const g = c.getContext('2d', { alpha: false });
  g.scale(dpr, dpr);
  g.fillStyle = pal.paper;
  g.fillRect(0, 0, W, H);
  const r = mulberry(s.seed * 2654435761 + 131);
  g.strokeStyle = alpha(pal.ink, 0.03);
  g.lineWidth = 0.6;
  g.beginPath();
  const fa = r() * Math.PI;
  for (let i = 0, n = Math.round(W * H / 700); i < n; i++) {
    const x = r() * W, y = r() * H, len = 10 + r() * 60, a = fa + (r() - 0.5) * 0.24;
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
  }
  g.stroke();
  const sizeK = clamp(Math.min(W, H) / 520, 0.72, 1.35);
  paintHomeSky(s, g, { r, u: sizeK, grain: W * H * 0.55 / (sizeK * sizeK) });
  s.homeLayer = c;
  return c;
}

function homeDisc(s) {
  if (s.homeDisc) return s.homeDisc;
  const { W, H, worlds, homeIdx, vs } = s;
  const last = worlds[worlds.length - 1];
  const R = Math.max(Math.hypot(W, H) * 0.55, (last.a + worlds[homeIdx].a) * vs * 1.04);
  const { c, g: rawDisc, q } = square(R * 2, s, CAP_DISC);
  rawDisc.setTransform(q, 0, 0, q, q * (R - W / 2), q * (R - H / 2));
  const g = recording(rawDisc);
  paintHomeSky(s, g, {
    r: mulberry(s.seed * 2654435761 + 197), u: 1 / q, grain: Math.min(c.width * c.width * 0.13, LITE ? 150000 : 450000), limit: R, maxSteps: 700,
  });
  s.homeDisc = { mips: mipsOf(c), x: W / 2 - R, y: H / 2 - R, size: R * 2, ops: g.__ops };
  return s.homeDisc;
}

/* ------------------------------------------------------------------------------------
   The ladder of scales. Each plate is a round, transparent sprite in the same grain and
   script, with one accent marker for "home". Zooming shrinks a plate into the marker of
   the plate above it, so home is never lost.
   ------------------------------------------------------------------------------------ */
const STEP = 14;
const LEVEL_MIN = -1, LEVEL_MAX = 4;

let plateG = null;
function plateBase(s, salt) {
  const { W, H } = s;
  const R = Math.hypot(W, H) * 0.55;
  const r = mulberry(s.seed * 2654435761 + salt);
  /* The grain unit is fixed, so both prints of a plate come out the same. */
  return { g: plateG, R, r, u: 0.8, min: Math.min(W, H), max: Math.max(W, H), k: Math.max(1, clamp(Math.min(W, H) / 520, 0.72, 1.35)) };
}

function glyphWord(g, s, r, x, y, n, k, col) {
  g.strokeStyle = col;
  g.fillStyle = col;
  g.lineWidth = k;
  g.lineCap = 'round';
  const gw = 7 * k, gh = 11 * k;
  for (let i = 0; i < n; i++) drawGlyph(g, makeGlyph(r), x + i * (gw + 4 * k), y - gh / 2, gw, gh, k);
  g.lineCap = 'butt';
}

function marker(g, s, x, y, rad, k, r) {
  const { pal } = s;
  g.strokeStyle = pal.accent;
  g.lineWidth = 1.3 * k;
  g.beginPath();
  g.arc(x, y, rad, 0, TAU);
  g.stroke();
  g.lineWidth = 0.8 * k;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    g.beginPath();
    g.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    g.lineTo(x + Math.cos(a) * (rad + 7 * k), y + Math.sin(a) * (rad + 7 * k));
    g.stroke();
  }
  glyphWord(g, s, r, x + rad + 12 * k, y, 4, k, pal.accent);
}

function rangeRings(g, s, x, y, radii, k) {
  const { pal, base } = s;
  for (const rad of radii) {
    g.strokeStyle = alpha(pal.ink, 0.42);
    g.lineWidth = 0.7 * k;
    g.beginPath();
    g.arc(x, y, rad, 0, TAU);
    g.stroke();
    const n = base * 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, len = (i % base === 0 ? 7 : 3) * k;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      g.lineTo(x + Math.cos(a) * (rad + len), y + Math.sin(a) * (rad + len));
      g.stroke();
    }
  }
}

function twinkles(r, n, pick) {
  const out = [];
  for (let i = 0; i < n; i++) { const p = pick(); if (p) out.push({ x: p[0], y: p[1], c: p[2] || 0, ph: r() * TAU, sp: 0.6 + r() * 1.6, s: 1 + r() }); }
  return out;
}

function buildWorld(s) {
  const b = plateBase(s, 211);
  const { g, r, u, k, min, max } = b, { pal, surface } = s;
  const home = s.worlds[s.homeIdx];
  const Rw = min * [0.2, 0.29, 0.37, 0.46][s.homeClass];
  const la = r() * TAU, lx = Math.cos(la), ly = Math.sin(la);
  const ph = [r() * TAU, r() * TAU, r() * TAU, r() * TAU];
  const wx = (x, y) => x + 0.22 * Math.sin(4.3 * y + ph[2]);
  const wy = (x, y) => y + 0.22 * Math.sin(3.7 * x + ph[3]);
  const noise = (x, y, f) => {
    const X = wx(x, y) * f, Y = wy(x, y) * f;
    return Math.sin(3.7 * X + ph[0]) + Math.sin(4.1 * Y + ph[1]) + 0.7 * Math.sin(8.3 * (X + Y) + ph[2])
      + 0.5 * Math.sin(13 * X - 9 * Y + ph[3]) + 0.3 * Math.sin(23 * X + 19 * Y + ph[0]);
  };
  /* Above zero is land, or whatever passes for it here. */
  const bandF = 7 + r() * 8;
  const height = {
    continents: (x, y) => noise(x, y, 1) - 0.55,
    archipelago: (x, y) => noise(x, y, 2.3) - 1.1,
    ocean: (x, y) => noise(x, y, 1.2) - 1.75,
    desert: (x, y) => noise(x, y, 1) + 1.3,
    ice: (x, y) => (Math.abs(y) - 0.5) * 4 + noise(x, y, 1.7) * 0.55,
    banded: (x, y) => Math.sin(y * bandF + 0.5 * Math.sin(x * 3 + ph[0])) * 1.3 + noise(x, y, 1.4) * 0.22,
  }[surface];

  const ring = home.ring;
  const ringInner = ring ? Rw * ring.a1 : 0, ringOuter = ring ? Rw * ring.a2 : 0;
  const ringDots = front => {
    const d = dotBuckets([pal.ink, pal.ink2]);
    const n = ((ringOuter + ringInner) / u) * ((ringOuter - ringInner) / u) * 2.4;
    const c = Math.cos(ring.rot), sn = Math.sin(ring.rot);
    const gaps = [r() * 0.8 + 0.1, r() * 0.8 + 0.1];
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, t = r();
      if (Math.abs(t - gaps[0]) < 0.035 || Math.abs(t - gaps[1]) < 0.02) continue;
      const isFront = Math.sin(a) > 0;
      if (isFront !== front) continue;
      const rho = lerp(ringInner, ringOuter, t);
      const x = Math.cos(a) * rho, y = Math.sin(a) * rho * ring.tilt;
      d.add(r() < 0.6 ? 0 : 1, x * c - y * sn, x * sn + y * c, (0.55 + r() * r() * 0.6) * u);
    }
    d.flush(g, 0.8 * u);
  };
  if (ring) ringDots(false);

  g.save();
  g.beginPath();
  g.arc(0, 0, Rw, 0, TAU);
  g.clip();
  g.fillStyle = mix(pal.paper, pal.ink2, 0.28);
  g.fillRect(-Rw, -Rw, Rw * 2, Rw * 2);
  const dots = dotBuckets([pal.ink, pal.ink2, pal.accent]);
  const n = Math.PI * (Rw / u) * (Rw / u) * 0.5;
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * Rw;
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    /* Coasts are dithered: land thins out towards the sea instead of stopping dead. */
    const h = height(x / Rw, y / Rw) + gauss(r) * 0.22;
    const onLand = h > 0;
    const inland = clamp(h / 1.1, 0, 1);
    if (r() > (onLand ? 0.42 + 0.58 * inland : 0.09)) continue;
    dots.add(onLand ? (r() < 0.5 + 0.5 * inland ? 0 : 1) : 1, x, y, (0.55 + r() * r() * (onLand ? 0.55 + inland : 0.4)) * u);
  }
  dots.flush(g, 0.8 * u);
  const sx = -lx * Rw * 0.62, sy = -ly * Rw * 0.62;
  g.fillStyle = alpha(mix(pal.paper, pal.ink, 0.14), 0.93);
  g.beginPath();
  g.arc(sx, sy, Rw * 1.02, 0, TAU);
  g.fill();
  g.restore();

  /* City lights only show where it is night and there is land. */
  const inNight = (x, y) => Math.hypot(x - sx, y - sy) < Rw * 0.98 && Math.hypot(x, y) < Rw * 0.98;
  const cities = dotBuckets([pal.accent]);
  const lights = [];
  const lightTries = 2600 * Math.pow(Rw / (min * 0.29), 2);
  for (let i = 0; i < lightTries; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * Rw;
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    if (!inNight(x, y) || height(x / Rw, y / Rw) <= 0 || r() > 0.45) continue;
    cities.add(0, x, y, (0.5 + r() * 0.7) * u);
    if (lights.length < 90 && r() < 0.15) lights.push([x, y, 1]);
  }
  cities.flush(g, 0.8 * u);

  g.strokeStyle = pal.ink;
  g.lineWidth = 1;
  g.beginPath();
  g.arc(0, 0, Rw, 0, TAU);
  g.stroke();
  for (let i = 1; i <= 3; i++) {
    g.strokeStyle = alpha(pal.ink, 0.5 / i);
    g.lineWidth = 0.7;
    g.beginPath();
    g.arc(0, 0, Rw * (1 + i * 0.022), 0, TAU);
    g.stroke();
  }
  if (ring) ringDots(true);

  /* The calendar and script sit outside the rings, if it has any. */
  const ticks = s.base * s.base;
  const inner = Math.max(Rw * 1.1, ringOuter * 1.05);
  g.strokeStyle = pal.ink;
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * TAU, major = i % s.base === 0, len = (major ? 9 : 4) * k;
    g.lineWidth = major ? 1.1 : 0.7;
    g.beginPath();
    g.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    g.lineTo(Math.cos(a) * (inner + len), Math.sin(a) * (inner + len));
    g.stroke();
  }
  const lr = inner + 22 * k, gw = 8 * k, gh = 13 * k, step = (gw + 5 * k) / lr;
  const vocab = [];
  for (let i = 0; i < 26; i++) vocab.push(makeGlyph(r));
  let word = 3;
  g.strokeStyle = pal.ink;
  g.fillStyle = pal.ink;
  g.lineWidth = k;
  g.lineCap = 'round';
  for (let m = 0; m < TAU - step; m += step) {
    const gl = vocab[Math.floor(r() * vocab.length)];
    if (word-- <= 0) { word = 2 + Math.floor(r() * 5); continue; }
    g.save();
    g.translate(Math.cos(m) * lr, Math.sin(m) * lr);
    g.rotate(m + Math.PI / 2);
    drawGlyph(g, gl, -gw / 2, -gh / 2, gw, gh, 1.1 * k);
    g.restore();
  }
  g.lineCap = 'butt';

  /* Every moon has its own marked orbit. */
  const moons = [];
  let orbit = lr + 22 * k;
  for (const m of home.moons) {
    const size = clamp(m.size * Rw, 2.5 * k, Rw * 0.3);
    orbit += size + 6 * k;
    g.strokeStyle = alpha(pal.ink, 0.5);
    g.lineWidth = 0.7;
    g.beginPath();
    g.arc(0, 0, orbit, 0, TAU);
    g.stroke();
    moons.push({ d: orbit, r: size, T: 40 + r() * 30 + moons.length * 18, ph: r() * TAU, lx, ly });
    orbit += size + 8 * k;
  }

  /* Sister worlds hang in the sky, each with the mark of the living. */
  const sisters = s.worlds.filter(o => o.living && !o.home);
  let sa = r() * TAU;
  const sr = Math.max(Rw * 1.5, Math.min(max * 0.42, min * 0.46));
  for (const o of sisters) {
    const x = Math.cos(sa) * sr, y = Math.sin(sa) * sr * (min / max + 0.5);
    const rad = 7 * k + r() * 8 * k;
    sa += 1.2 + r() * 1.6;
    g.fillStyle = pal.paper;
    g.beginPath();
    g.arc(x, y, rad + 2, 0, TAU);
    g.fill();
    g.fillStyle = o.tint;
    g.beginPath();
    g.arc(x, y, rad, 0, TAU);
    g.fill();
    g.fillStyle = mix(pal.paper, o.tint, 0.2);
    g.save();
    g.beginPath();
    g.arc(x, y, rad, 0, TAU);
    g.clip();
    g.beginPath();
    g.arc(x - lx * rad * 0.62, y - ly * rad * 0.62, rad * 1.02, 0, TAU);
    g.fill();
    g.restore();
    g.strokeStyle = pal.accent;
    g.lineWidth = 0.9 * k;
    g.beginPath();
    g.arc(x, y, rad + 4 * k, 0, TAU);
    g.stroke();
    glyphWord(g, s, r, x + rad + 10 * k, y, 3, k * 0.9, pal.accent);
  }
  const tq = mulberry(s.seed * 2654435761 + 503);
  const port = { x: lx * Rw, y: ly * Rw };
  const ga = tq() * TAU, gd = Math.min(lr + 34 * k, min * 0.46);
  const orbital = { x: Math.cos(ga) * gd, y: Math.sin(ga) * gd, r: 13 * k, kind: tq() < 0.75 ? 'gate' : 'wormhole', spin: 0.2 };
  const lanes = [makeLane(tq, port, orbital, 4, 18, true)];
  const gatesHere = [orbital];
  moons.forEach((m, i) => {
    const ang = Math.atan2(ly, lx) + (i % 2 ? 1 : -1) * (0.5 + i * 0.28);
    const dock = { x: Math.cos(ang) * m.d, y: Math.sin(ang) * m.d, r: 3.2 * k, kind: 'port' };
    gatesHere.push(dock);
    const lane = makeLane(tq, port, dock, 2, 15, false);
    syncShips(lane, m.T, ((((ang - m.ph) % TAU) + TAU) % TAU) / TAU * m.T);
    lanes.push(lane);
  });
  let li = 0;
  return { R: b.R, mx: 0, my: 0, spin: 0, tw: twinkles(r, lights.length, () => lights[li++]), moons, lanes, gates: gatesHere, k, comms: makeComms(mulberry(s.seed * 2654435761 + 617), [[port, orbital]], [port], 10, 9, Rw * 0.7) };
}

function buildNeighbourhood(s) {
  const b = plateBase(s, 223);
  const { g, r, R, u, k, min } = b, { pal } = s;
  const mx = (r() - 0.5) * min * 0.3, my = (r() - 0.5) * min * 0.3;
  const dots = dotBuckets([pal.ink, pal.ink2, pal.accent]);
  const fade = (x, y) => 1 - smooth(0.68, 0.98, Math.hypot(x, y) / R);

  /* Gas clouds as stipple */
  for (let c = 0; c < 6; c++) {
    const a = r() * TAU, d = Math.sqrt(r()) * R * 0.8;
    const ox = Math.cos(a) * d, oy = Math.sin(a) * d;
    const w = R * (0.12 + r() * 0.22), h = w * (0.35 + r() * 0.5), rot = r() * TAU;
    const n = (w / u) * (h / u) * 0.3;
    for (let i = 0; i < n; i++) {
      const spread = 1 + 2.2 * Math.pow(r(), 5);
      const gx = gauss(r) * w * spread, gy = gauss(r) * h * spread;
      const x = ox + gx * Math.cos(rot) - gy * Math.sin(rot), y = oy + gx * Math.sin(rot) + gy * Math.cos(rot);
      if (r() > fade(x, y)) continue;
      dots.add(r() < 0.85 ? 1 : 0, x, y, (0.55 + r() * r() * 0.5) * u);
    }
  }
  /* Faint field stars */
  const field = (R / u) * (R / u) * 0.12;
  for (let i = 0; i < field; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * R;
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    if (r() > fade(x, y)) continue;
    dots.add(r() < 0.6 ? 1 : 0, x, y, (0.55 + r() * 0.35) * u);
  }
  dots.flush(g, 0.8 * u);

  const stars = [];
  const count = 44 + Math.floor(r() * 26);
  for (let t = 0; t < count * 30 && stars.length < count; t++) {
    const a = r() * TAU, d = Math.sqrt(r()) * R * 0.92;
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    if (Math.hypot(x - mx, y - my) < 34 * k) continue;
    if (stars.some(o => Math.hypot(o.x - x, o.y - y) < min * 0.05)) continue;
    stars.push({ x, y, rad: (1.6 + Math.pow(r(), 3) * 9) * k, c: r() < 0.14 ? pal.accent : r() < 0.3 ? pal.ink2 : pal.ink, twin: r() < 0.3 });
  }
  /* Their routes: each star joined to its closest neighbours within reach of home. */
  g.strokeStyle = alpha(pal.ink, 0.38);
  g.lineWidth = 0.7 * k;
  const nodes = stars.concat({ x: mx, y: my });
  g.beginPath();
  for (const a of nodes) {
    const near = nodes.filter(b2 => b2 !== a).sort((p, q2) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q2.x - a.x, q2.y - a.y)).slice(0, 2);
    for (const b2 of near) { g.moveTo(a.x, a.y); g.lineTo(b2.x, b2.y); }
  }
  g.stroke();
  rangeRings(g, s, mx, my, [min * 0.2, min * 0.4, min * 0.62], k);
  for (const o of stars) {
    g.fillStyle = pal.paper;
    g.beginPath();
    g.arc(o.x, o.y, o.rad + 2, 0, TAU);
    g.fill();
    g.fillStyle = o.c;
    g.beginPath();
    g.arc(o.x, o.y, o.rad, 0, TAU);
    g.fill();
    if (o.twin) {
      const a = r() * TAU;
      g.beginPath();
      g.arc(o.x + Math.cos(a) * (o.rad + 4 * k), o.y + Math.sin(a) * (o.rad + 4 * k), Math.max(1, o.rad * 0.45), 0, TAU);
      g.fill();
    }
    if (o.rad > 4 * k && r() < 0.6) glyphWord(g, s, r, o.x + o.rad + 6 * k, o.y, 2 + Math.floor(r() * 3), k * 0.85, pal.ink);
  }
  g.fillStyle = pal.accent;
  g.beginPath();
  g.arc(mx, my, 4.5 * k, 0, TAU);
  g.fill();
  marker(g, s, mx, my, 15 * k, k, r);
  const tq = mulberry(s.seed * 2654435761 + 509);
  const here = { x: mx, y: my };
  const byDist = stars.slice().sort((a, c) => Math.hypot(a.x - mx, a.y - my) - Math.hypot(c.x - mx, c.y - my));
  const lanes = [], gates = [];
  byDist.slice(0, 5 + Math.floor(tq() * 4)).forEach((o, j) => {
    lanes.push(makeLane(tq, here, o, 2 + Math.floor(tq() * 3), 70, j < 3));
    if (tq() < 0.5) gates.push({ x: o.x + o.rad + 11 * k, y: o.y - o.rad - 11 * k, r: 7 * k, kind: tq() < 0.6 ? 'gate' : 'wormhole', spin: 0.25 });
  });
  for (let j = 0; j < 6 && stars.length > 2; j++) {
    const a = stars[Math.floor(tq() * stars.length)], c = stars[Math.floor(tq() * stars.length)];
    if (a !== c) lanes.push(makeLane(tq, a, c, 1 + Math.floor(tq() * 2), 90, false));
  }
  let i = 0;
  const nbrLinks = gates.map((g, j) => [g, j === 0 ? here : gates[j - 1]]);
  const comms = makeComms(mulberry(s.seed * 2654435761 + 619), nbrLinks, [here], 16, 45, min * 0.42);
  return { R, mx, my, spin: 0, k, lanes, gates, comms, tw: twinkles(r, Math.min(stars.length, 40), () => { const o = stars[i++]; return [o.x, o.y, 0]; }) };
}

function buildGalaxy(s) {
  const b = plateBase(s, 227);
  const { g, r, R, u, k, min, max } = b, { pal } = s;
  const Rg = galaxyRadius(s);
  const arms = 3 + Math.floor(r() * 3);
  const twist = 3.2 + r() * 2.2;
  const off = r() * TAU;
  const dots = dotBuckets([pal.ink, pal.ink2, pal.accent]);
  const n = (Rg / u) * (Rg / u) * 1.6;
  const tw = [];
  const armWeights = [];
  for (let i = 0; i < arms; i++) armWeights.push({ fall: 1.7 + r() * 2.2, width: 0.32 + r() * 0.5, ph: r() * TAU, f: 14 + r() * 22 });
  for (let i = 0; i < n; i++) {
    const t = Math.pow(r(), 0.72);
    const rad = 0.05 + t * 0.97;
    const arm = Math.floor(r() * arms);
    const w = armWeights[arm];
    /* Star lanes: some radii along an arm are simply emptier. */
    if (r() > 0.55 + 0.45 * Math.sin(rad * w.f + w.ph)) continue;
    const behind = Math.pow(r(), w.fall);
    const a = off + (arm / arms) * TAU + Math.log(rad / 0.05) * twist * 0.55 - behind * w.width * (0.35 + 1.1 * (1 - t)) * 2;
    const x = Math.cos(a) * rad * Rg, y = Math.sin(a) * rad * Rg;
    const near = 1 - behind;
    const pick = r();
    dots.add(pick < 0.015 ? 2 : pick < 0.1 + 0.85 * near ? 0 : 1, x, y, (0.55 + r() * r() * 0.95 * near) * u);
    if (tw.length < 200 && r() < 0.0012) tw.push([x, y, pick < 0.2 ? 1 : 0]);
  }
  /* A diffuse halo */
  for (let i = 0; i < n * 0.16; i++) {
    const a = r() * TAU, d = Math.pow(r(), 0.7) * Rg * 1.08;
    if (r() > 1 - smooth(0.7, 1.08, d / Rg)) continue;
    dots.add(1, Math.cos(a) * d, Math.sin(a) * d, (0.55 + r() * 0.4) * u);
  }
  dots.flush(g, 0.8 * u);

  /* The core is a flat disc, like their suns. */
  const core = Rg * 0.075;
  g.fillStyle = pal.accent;
  g.beginPath();
  g.arc(0, 0, core, 0, TAU);
  g.fill();
  g.strokeStyle = alpha(pal.paper, 0.3);
  g.lineWidth = 0.7;
  for (let i = 1; i < 10; i++) {
    g.beginPath();
    g.arc(0, 0, (core * i) / 10, 0, TAU);
    g.stroke();
  }

  /* Home sits on an arm, about six tenths of the way out. */
  const t = 0.6, rad = 0.05 + t * 0.97;
  const a = off + Math.log(rad / 0.05) * twist * 0.55 - 0.03;
  const mx = Math.cos(a) * rad * Rg, my = Math.sin(a) * rad * Rg;
  g.strokeStyle = alpha(pal.ink, 0.8);
  g.lineWidth = 0.8 * k;
  g.beginPath();
  g.moveTo(Math.cos(a) * core, Math.sin(a) * core);
  g.lineTo(mx, my);
  g.stroke();
  marker(g, s, mx, my, 13 * k, k, r);
  g.fillStyle = pal.accent;
  g.beginPath();
  g.arc(mx, my, 2.6 * k, 0, TAU);
  g.fill();
  rangeRings(g, s, 0, 0, [Rg * 1.1], k);
  const tq = mulberry(s.seed * 2654435761 + 521);
  const armPoint = (arm, t2) => {
    const rd = 0.05 + t2 * 0.97;
    const ang = off + (arm / arms) * TAU + Math.log(rd / 0.05) * twist * 0.55;
    return { x: Math.cos(ang) * rd * Rg, y: Math.sin(ang) * rd * Rg };
  };
  const here = { x: mx, y: my };
  const lanes = [], gates = [];
  const pairs = 3 + Math.floor(tq() * 3);
  for (let j = 0; j < pairs; j++) {
    const mouth = Object.assign(armPoint(Math.floor(tq() * arms), 0.25 + tq() * 0.7), { r: 7 * k, kind: tq() < 0.7 ? 'wormhole' : 'gate', spin: 0.08 });
    gates.push(mouth);
    lanes.push(makeLane(tq, j < 3 ? here : gates[Math.floor(tq() * gates.length)], mouth, 2 + Math.floor(tq() * 2), 200, j < 2));
  }
  let i = 0;
  const comms = makeComms(mulberry(s.seed * 2654435761 + 631), gates.map((g, j) => [g, j % 2 ? gates[j - 1] : here]), [], 20, 1, 0);
  return { R, mx, my, spin: 0.005, k, lanes, gates, comms, tw: twinkles(r, tw.length, () => tw[i++]) };
}

function stampGalaxy(dots, r, x, y, size, u, spiral) {
  const n = Math.min(12000, (size / u) * (size / u) * 1.3);
  const rot = r() * TAU, squash = 0.35 + r() * 0.65, arms = 2 + Math.floor(r() * 2), tw = 2.4 + r() * 2.2;
  const c = Math.cos(rot), sn = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    let dx, dy, near = 0.5;
    if (spiral) {
      const t = Math.pow(r(), 0.75), behind = Math.pow(r(), 2.6);
      const a = Math.floor(r() * arms) * (TAU / arms) + Math.log(0.06 + t) * tw - behind * (0.3 + 0.7 * (1 - t));
      dx = Math.cos(a) * t * size; dy = Math.sin(a) * t * size * squash;
      near = 1 - behind;
    } else {
      const a = r() * TAU, t = Math.pow(r(), 2.1);
      dx = Math.cos(a) * t * size; dy = Math.sin(a) * t * size * squash;
      near = 1 - t;
    }
    dots.add(r() < 0.2 + 0.75 * near ? 0 : 1, x + dx * c - dy * sn, y + dx * sn + dy * c, (0.55 + r() * r() * 0.75 * near) * u);
  }
}

function buildGroup(s) {
  const b = plateBase(s, 229);
  const { g, r, R, u, k, min } = b, { pal } = s;
  const a0 = r() * TAU, d0 = min * (0.08 + r() * 0.14);
  const mx = Math.cos(a0) * d0, my = Math.sin(a0) * d0;
  const dots = dotBuckets([pal.ink, pal.ink2, pal.accent]);
  const members = [{ x: mx, y: my, size: min * 0.085, spiral: true, home: true }];
  const big = { x: mx - Math.cos(a0) * min * 0.3, y: my - Math.sin(a0) * min * 0.3, size: min * 0.11, spiral: true };
  members.push(big);
  const count = 26 + Math.floor(r() * 14);
  for (let t = 0; t < count * 40 && members.length < count; t++) {
    const a = r() * TAU, d = Math.pow(r(), 0.65) * R * 0.92;
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    const size = min * (0.012 + Math.pow(r(), 3) * 0.07);
    if (members.some(o => Math.hypot(o.x - x, o.y - y) < o.size + size + 12 * k)) continue;
    members.push({ x, y, size, spiral: r() < 0.45 });
  }
  for (let i = 0; i < (R / u) * (R / u) * 0.1; i++) {
    const a = r() * TAU, d = Math.pow(r(), 0.7) * R * 0.98;
    if (r() > 1 - smooth(0.6, 0.98, d / R)) continue;
    dots.add(1, Math.cos(a) * d, Math.sin(a) * d, (0.55 + r() * 0.3) * u);
  }
  for (const o of members) stampGalaxy(dots, r, o.x, o.y, o.size, u, o.spiral);
  dots.flush(g, 0.8 * u);
  g.strokeStyle = alpha(pal.ink, 0.3);
  g.lineWidth = 0.7 * k;
  g.beginPath();
  for (const o of members.slice(1)) if (o.size > min * 0.022) { g.moveTo(mx, my); g.lineTo(o.x, o.y); }
  g.stroke();
  rangeRings(g, s, mx, my, [min * 0.3, min * 0.55], k);
  for (const o of members.slice(1)) if (o.size > min * 0.03) glyphWord(g, s, r, o.x + o.size + 6 * k, o.y, 2 + Math.floor(r() * 3), k * 0.85, pal.ink);
  marker(g, s, mx, my, members[0].size + 6 * k, k, r);
  const tq = mulberry(s.seed * 2654435761 + 523);
  const here = { x: mx, y: my };
  const large = members.slice(1).sort((a, c) => c.size - a.size).slice(0, 4 + Math.floor(tq() * 4));
  const lanes = [], gates = [];
  large.forEach((o, j) => {
    const mouth = { x: o.x + o.size * 0.8, y: o.y - o.size * 0.8, r: 6 * k, kind: tq() < 0.5 ? 'wormhole' : 'gate', spin: 0.04 };
    gates.push(mouth);
    lanes.push(makeLane(tq, here, mouth, 2, 420, j < 2));
  });
  let i = 0;
  const comms = makeComms(mulberry(s.seed * 2654435761 + 641), gates.map(g => [g, here]), [], 24, 1, 0);
  return { R, mx, my, spin: 0, k, lanes, gates, comms, tw: twinkles(r, Math.min(members.length, 40), () => { const o = members[i++]; return [o.x, o.y, 0]; }) };
}

function buildSupercluster(s) {
  const b = plateBase(s, 233);
  const { g, r, R, u, k, min } = b, { pal, W, H } = s;
  const hw = W / 2 + 40, hh = H / 2 + 40;
  const nodes = [];
  const count = Math.round(clamp(W * H / 11000, 34, 110));
  for (let t = 0; t < count * 60 && nodes.length < count; t++) {
    const x = (r() * 2 - 1) * hw, y = (r() * 2 - 1) * hh;
    if (nodes.some(o => Math.hypot(o.x - x, o.y - y) < min * 0.07)) continue;
    nodes.push({ x, y, mass: 0.25 + Math.pow(r(), 3) * 2.2 });
  }
  /* Filaments: every node strung to its nearest neighbours, leaving great voids between. */
  const dots = dotBuckets([pal.ink, pal.ink2, pal.accent]);
  const seen = new Set();
  const edges = [];
  nodes.forEach((a, ia) => {
    const near = nodes.map((o, i) => [Math.hypot(o.x - a.x, o.y - a.y), i]).filter(e => e[1] !== ia).sort((p, q) => p[0] - q[0]).slice(0, r() < 0.3 ? 3 : 2);
    for (const [, ib] of near) {
      const key = Math.min(ia, ib) + ':' + Math.max(ia, ib);
      if (!seen.has(key)) { seen.add(key); edges.push([a, nodes[ib]]); }
    }
  });
  g.strokeStyle = alpha(pal.ink, 0.12);
  g.lineWidth = 0.6 * k;
  const total = W * H * 0.3 / (u * u);
  let len = 0;
  for (const [a, c] of edges) len += Math.hypot(a.x - c.x, a.y - c.y);
  for (const [a, c] of edges) {
    const dx = c.x - a.x, dy = c.y - a.y, l = Math.hypot(dx, dy);
    const bow = gauss(r) * l * 0.7;
    const ctrlx = (a.x + c.x) / 2 - (dy / l) * bow, ctrly = (a.y + c.y) / 2 + (dx / l) * bow;
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.quadraticCurveTo(ctrlx, ctrly, c.x, c.y);
    g.stroke();
    const n = total * 0.62 * (l / len);
    const width = min * (0.003 + r() * r() * 0.016);
    const ph0 = r() * TAU, f0 = 5 + r() * 12;
    for (let i = 0; i < n; i++) {
      const t = r();
      const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * ctrlx + t * t * c.x;
      const y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * ctrly + t * t * c.y;
      /* Threads bead up along their length, and shed a thin halo of strays. */
      if (r() > 0.45 + 0.55 * Math.sin(t * f0 + ph0)) continue;
      const stray = 1 + 7 * Math.pow(r(), 7);
      dots.add(stray > 1.6 ? 1 : r() < 0.85 ? 0 : 1, x + gauss(r) * width * stray, y + gauss(r) * width * stray, (0.55 + r() * r() * (stray > 1.6 ? 0.2 : 0.8)) * u);
    }
  }
  let massTotal = 0;
  for (const o of nodes) massTotal += o.mass;
  for (const o of nodes) {
    const n = total * 0.3 * (o.mass / massTotal);
    const w = min * 0.022 * o.mass;
    for (let i = 0; i < n; i++) {
      const pick = r();
      const stray = 1 + 2.5 * Math.pow(r(), 4);
      dots.add(pick < 0.018 ? 2 : pick < 0.86 ? 0 : 1, o.x + gauss(r) * w * stray, o.y + gauss(r) * w * stray, (0.55 + r() * r() * 1.2) * u);
    }
  }
  /* The voids are not perfectly empty. */
  for (let i = 0; i < total * 0.05; i++) dots.add(1, (r() * 2 - 1) * hw, (r() * 2 - 1) * hh, 0.55 * u);
  dots.flush(g, 0.8 * u);

  const centre = nodes.slice().sort((a, c) => Math.hypot(a.x, a.y) - Math.hypot(c.x, c.y));
  const home = centre[Math.floor(r() * Math.min(4, centre.length))];
  rangeRings(g, s, home.x, home.y, [min * 0.26, min * 0.5], k);
  for (const o of nodes) {
    if (o === home || o.mass < 1) continue;
    glyphWord(g, s, r, o.x + 12 * k, o.y, 2 + Math.floor(r() * 3), k * 0.85, pal.ink);
  }
  marker(g, s, home.x, home.y, 12 * k, k, r);
  g.fillStyle = pal.accent;
  g.beginPath();
  g.arc(home.x, home.y, 2.4 * k, 0, TAU);
  g.fill();
  const tq = mulberry(s.seed * 2654435761 + 541);
  const heavy = nodes.filter(o => o !== home).sort((a, c) => c.mass - a.mass).slice(0, 6);
  const lanes = [], gates = [];
  heavy.slice(0, 3 + Math.floor(tq() * 4)).forEach((o, j) => {
    gates.push({ x: o.x, y: o.y, r: 6 * k, kind: 'wormhole', spin: 0.02 });
    lanes.push(makeLane(tq, home, o, 1 + Math.floor(tq() * 2), 900, j < 3));
  });
  let i = 0;
  const comms = makeComms(mulberry(s.seed * 2654435761 + 643), gates.map(g => [g, home]), [], 32, 1, 0);
  return { R, mx: home.x, my: home.y, spin: 0, k, lanes, gates, comms, tw: twinkles(r, Math.min(nodes.length, 60), () => { const o = nodes[i++]; return [o.x, o.y, 0]; }) };
}

const BUILDERS = { '-1': buildWorld, 1: buildNeighbourhood, 2: buildGalaxy, 3: buildGroup, 4: buildSupercluster };
function galaxyRadius(s) {
  const min = Math.min(s.W, s.H), max = Math.max(s.W, s.H), R = Math.hypot(s.W, s.H) * 0.55;
  return Math.min(R * 0.92, Math.max(min * 0.47, max * 0.34));
}
function plateDisc(s, level) {
  s.plates = s.plates || {};
  if (s.plates[level]) return s.plates[level];
  const R = Math.hypot(s.W, s.H) * 0.55;
  const { c, g: raw, q } = square(R * 2, s, CAP_PLATE);
  raw.setTransform(q, 0, 0, q, q * R, q * R);
  const g = recording(raw);
  plateG = g;
  const meta = BUILDERS[level](s);
  meta.mips = mipsOf(c);
  meta.ops = g.__ops;
  s.plates[level] = meta;
  return meta;
}
function plate(s, level) {
  const p = plateDisc(s, level);
  if (p.rest) return p;
  /* The galaxy turns, so its print is a square big enough to turn inside the frame. */
  const hw = level === 2 ? galaxyRadius(s) * 1.18 : s.W / 2;
  const hh = level === 2 ? galaxyRadius(s) * 1.18 : s.H / 2;
  const c = document.createElement('canvas');
  c.width = Math.round(hw * 2 * s.dpr);
  c.height = Math.round(hh * 2 * s.dpr);
  const raw = c.getContext('2d');
  raw.setTransform(s.dpr, 0, 0, s.dpr, s.dpr * hw, s.dpr * hh);
  plateG = raw;
  BUILDERS[level](s);
  p.rest = c;
  p.hw = hw;
  p.hh = hh;
  return p;
}

/* Where "home" is on a plate right now, in screen coordinates. */
function anchorOf(s, level, t, going) {
  if (level === 0) {
    if (going === 'out') { place(s, 0, 0); return [lerp(s.cx, s.W / 2, cam.k), lerp(s.cy, s.H / 2, cam.k)]; }
    place(s, s.hx, s.hy);
    return [VX, VY];
  }
  const p = plateDisc(s, level);
  const a = p.spin * t, c = Math.cos(a), sn = Math.sin(a);
  return [s.W / 2 + p.mx * c - p.my * sn, s.H / 2 + p.mx * sn + p.my * c];
}

function drawLive(s, t, alpha01, scale) {
  const { pal, worlds } = s;
  ctx.globalAlpha = alpha01;
  if (scale > 0.35) {
    /* Loose grains grow less than everything else, so they stay grains when enlarged. */
    const shrink = scale > 1 ? Math.pow(scale, -0.8) : 1;
    const lim = Math.floor(s.live.length * quality);
    ctx.fillStyle = pal.ink;
    for (let i = 0; i < lim; i++) {
      const g = s.live[i];
      if (g.hot) continue;
      orbitXY(g.a, g.e, g.w, (t / g.T) * TAU + g.ph, P);
      place(s, P[0], P[1]);
      ctx.fillRect(VX, VY, g.s * shrink, g.s * shrink);
    }
    ctx.fillStyle = pal.accent;
    for (let i = 0; i < lim; i++) {
      const g = s.live[i];
      if (!g.hot) continue;
      orbitXY(g.a, g.e, g.w, (t / g.T) * TAU + g.ph, P);
      place(s, P[0], P[1]);
      ctx.fillRect(VX, VY, g.s * shrink, g.s * shrink);
    }
    drawComets(s, t);
  }
  for (const o of worlds) drawWorld(s, o, t);

  /* Alignments. In star view they are measured from the suns; in home view, from home,
     because that is the sky they actually see. */
  const k = cam.k, fromHome = k > 0.5, strength = Math.abs(2 * k - 1);
  if (fromHome) place(s, s.hx, s.hy); else place(s, 0, 0);
  const ox = VX, oy = VY;
  for (let i = 0; i < worlds.length; i++) {
    for (let j = i + 1; j < worlds.length; j++) {
      if (fromHome && (worlds[i].home || worlds[j].home)) continue;
      let diff = Math.abs(worlds[i].ang - worlds[j].ang) % TAU;
      if (diff > Math.PI) diff = TAU - diff;
      if (diff > 0.05) continue;
      const q = 1 - diff / 0.05;
      const far = fromHome && worlds[i].dist > worlds[j].dist ? worlds[i] : worlds[j];
      ctx.strokeStyle = alpha(pal.accent, 0.85 * q * strength);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(far.x, far.y);
      ctx.stroke();
    }
  }
  if (scale > 0.2) {
    const tk = Math.max(1, clamp(Math.min(s.W, s.H) / 520, 0.72, 1.35));
    for (const g of s.gates) { place(s, g.gx, g.gy); g.x = VX; g.y = VY; }
    for (const g of s.ports) { place(s, g.gx, g.gy); g.x = VX; g.y = VY; }
    drawComms(s.comms, t, Math.max(scale, 1), s.pal, tk);
    drawLanes(s.lanes, t, Math.max(scale, 1), s.pal, tk, fleetOf(s), scale);
    const thin = Math.pow(Math.max(scale, 1), -0.6);
    for (const g of s.ports) drawGate(g, t, Math.max(scale, 1), s.pal, tk);
    for (const g of s.gates) {
      drawGate(g, t, Math.max(scale, 1), s.pal, tk);
      ctx.strokeStyle = s.pal.accent;
      ctx.fillStyle = s.pal.accent;
      ctx.lineWidth = tk * thin;
      ctx.lineCap = 'round';
      const gw = 8 * tk * thin, gh = 12 * tk * thin;
      drawGlyph(ctx, g.glyph, g.x + g.r + 8 * tk * thin, g.y - gh / 2, gw, gh, tk * thin);
      ctx.lineCap = 'butt';
    }
  }
  drawSuns(s, t);
  ctx.globalAlpha = 1;
}

function drawSystem(s, t, px, py, mx, my, scale, a01) {
  const { dpr } = s;
  const k = cam.k;
  const exact = scale === 1;
  const mixes = layerMix(scale);
  const frame = () => ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (px - mx * scale), dpr * (py - my * scale));
  frame();
  const devicePx = d => d.size * scale * dpr;
  if (mixes.disc > 0) {
    if (k < 1) {
      const d = starDisc(s);
      ctx.globalAlpha = a01 * mixes.disc * (1 - k);
      ctx.drawImage(mipFor(d.mips, devicePx(d)), d.x, d.y, d.size, d.size);
    }
    if (k > 0) {
      const d = homeDisc(s);
      ctx.globalAlpha = a01 * mixes.disc * k;
      ctx.drawImage(mipFor(d.mips, devicePx(d)), d.x, d.y, d.size, d.size);
    }
  }
  if (mixes.tone > 0) {
    if (k < 1) {
      const d = starDisc(s);
      ctx.globalAlpha = a01 * mixes.tone * (1 - k);
      ctx.drawImage(d.mips[d.mips.length - 1], d.x, d.y, d.size, d.size);
    }
    if (k > 0) {
      const d = homeDisc(s);
      ctx.globalAlpha = a01 * mixes.tone * k;
      ctx.drawImage(d.mips[d.mips.length - 1], d.x, d.y, d.size, d.size);
    }
  }
  if (mixes.rest > 0) {
    if (k < 1) {
      ctx.globalAlpha = a01 * mixes.rest;
      if (exact) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(s.layer, 0, 0); }
      else ctx.drawImage(s.layer, 0, 0, s.W, s.H);
    }
    if (k > 0) {
      ctx.globalAlpha = a01 * mixes.rest * k;
      const c = homeLayer(s);
      if (exact) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(c, 0, 0); }
      else ctx.drawImage(c, 0, 0, s.W, s.H);
    }
  }
  frame();
  if (mixes.live > 0) {
    if (k < 1) { ctx.globalAlpha = a01 * mixes.live * (1 - k); replay(starDisc(s).ops, scale); }
    if (k > 0) { ctx.globalAlpha = a01 * mixes.live * k; replay(homeDisc(s).ops, scale); }
  }
  liveScale = scale;
  drawLive(s, t, a01, scale);
  liveScale = 1;
}

function drawPlate(s, level, t, px, py, mx, my, scale, a01) {
  const { dpr, W, H, pal } = s;
  const p = plate(s, level);
  const mixes = layerMix(scale);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (px - mx * scale), dpr * (py - my * scale));
  ctx.translate(W / 2, H / 2);
  ctx.rotate(p.spin * t);
  if (mixes.disc > 0) {
    ctx.globalAlpha = a01 * mixes.disc;
    ctx.drawImage(mipFor(p.mips, p.R * 2 * scale * dpr), -p.R, -p.R, p.R * 2, p.R * 2);
  }
  if (mixes.tone > 0) {
    ctx.globalAlpha = a01 * mixes.tone;
    ctx.drawImage(p.mips[p.mips.length - 1], -p.R, -p.R, p.R * 2, p.R * 2);
  }
  if (mixes.rest > 0) {
    ctx.globalAlpha = a01 * mixes.rest;
    ctx.drawImage(p.rest, -p.hw, -p.hh, p.hw * 2, p.hh * 2);
  }
  if (mixes.live > 0) {
    ctx.globalAlpha = a01 * mixes.live;
    replay(p.ops, scale);
  }
  ctx.globalAlpha = a01;
  /* Twinkles: stars, galaxies and city lights breathing very slightly. */
  for (const d of p.tw) {
    const b = 0.5 + 0.5 * Math.sin(t * d.sp + d.ph);
    ctx.fillStyle = d.c === 1 ? pal.accent : pal.ink;
    const size = d.s * (0.6 + b * 1.1) * Math.pow(scale, -0.5);
    ctx.fillRect(d.x - size / 2, d.y - size / 2, size, size);
  }
  for (const m of p.moons || []) {
    const a = (t / m.T) * TAU + m.ph;
    const x = Math.cos(a) * m.d, y = Math.sin(a) * m.d;
    ctx.fillStyle = pal.paper;
    ctx.beginPath();
    ctx.arc(x, y, m.r + 2.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = pal.ink;
    ctx.beginPath();
    ctx.arc(x, y, m.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = mix(pal.paper, pal.ink, 0.2);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, m.r, 0, TAU);
    ctx.clip();
    ctx.beginPath();
    ctx.arc(x - m.lx * m.r * 0.62, y - m.ly * m.r * 0.62, m.r * 1.02, 0, TAU);
    ctx.fill();
    ctx.restore();
    m.x = x; m.y = y;
  }
  ctx.globalAlpha = a01;
  if (p.comms) drawComms(p.comms, t, Math.max(scale, 1), pal, p.k);
  if (p.lanes) drawLanes(p.lanes, t, Math.max(scale, 1), pal, p.k, fleetOf(s), scale);
  if (p.gates) for (const g of p.gates) drawGate(g, t, Math.max(scale, 1), pal, p.k);
  ctx.globalAlpha = 1;
}

function drawLevel(s, level, t, px, py, m, scale, a01) {
  if (level === 0) drawSystem(s, t, px, py, m[0], m[1], scale, a01);
  else drawPlate(s, level, t, px, py, m[0], m[1], scale, a01);
}

function render(t) {
  const s = sys;
  const home = s.worlds[s.homeIdx];
  orbitXY(home.a, home.e, home.w, (t / home.T) * TAU + home.phase, P);
  s.hx = P[0]; s.hy = P[1];

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = s.pal.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let L = Math.floor(cam.z), f = cam.z - L;
  if (L >= LEVEL_MAX) { L = LEVEL_MAX - 1; f = 1; }
  if (f === 0) {
    drawLevel(s, L, t, 0, 0, [0, 0], 1, 1);
    return;
  }
  if (f === 1) {
    drawLevel(s, L + 1, t, 0, 0, [0, 0], 1, 1);
    return;
  }
  const mi = anchorOf(s, L, t, 'out');
  const mo = anchorOf(s, L + 1, t, 'in');
  const e = smooth(0, 1, f);
  const px = lerp(mi[0], mo[0], e), py = lerp(mi[1], mo[1], e);
  const aO = smooth(0.35, 0.7, f), aI = 1 - smooth(0.45, 0.8, f);
  if (aO > 0) drawLevel(s, L + 1, t, px, py, mo, Math.pow(STEP, 1 - f), aO);
  if (aI > 0) drawLevel(s, L, t, px, py, mi, Math.pow(STEP, -f), aI);
}

/* The camera wanders on its own: a random scale, a slow journey, a random pause. */
function stepCam(dt) {
  if (cam.k !== cam.viewTo) {
    const d = dt / 1.8;
    cam.k = cam.viewTo > cam.k ? Math.min(cam.viewTo, cam.k + d) : Math.max(cam.viewTo, cam.k - d);
  }
  if (!cam.auto) return;
  if (cam.u < 1) {
    cam.u = Math.min(1, cam.u + dt / cam.dur);
    cam.z = lerp(cam.from, cam.to, smooth(0, 1, cam.u));
    if (cam.u === 1) {
      cam.z = cam.to;
      cam.hold = 20 + Math.random() * 10;
    }
    return;
  }
  cam.hold -= dt;
  if (cam.hold > 0 || !sys.ready) return;
  const here = Math.round(cam.z);
  const choices = [];
  for (let l = LEVEL_MIN; l <= LEVEL_MAX; l++) if (l !== here) choices.push(l);
  /* Come home a little more often than chance, so the chart itself stays the main event. */
  const target = here !== 0 && (swapDue() || Math.random() < 0.3) ? 0 : choices[Math.floor(Math.random() * choices.length)];
  cam.from = cam.z;
  cam.to = target;
  cam.u = 0;
  cam.dur = 20 + Math.random() * 10; /* every journey takes 20 to 30 seconds, however far */
}

/* Build the other scales in the background, one at a time, so zooming never stalls. */
let preloadToken = 0;
function preload(s) {
  const token = ++preloadToken;
  const jobs = [() => starDisc(s)];
  for (const l of [1, -1, 2, 3, 4]) jobs.push(() => plateDisc(s, l), () => plate(s, l));
  jobs.push(() => { s.ready = true; });
  const next = () => {
    if (token !== preloadToken || !jobs.length) return;
    jobs.shift()();
    setTimeout(next, 250);
  };
  setTimeout(next, 800);
}

let startedAt = 0, lastDraw = 0, raf = 0, slowFrames = 0;
let inView = true, clock = 0, nextSwap = 0, fade = null;

const SWAP_MIN = 120, SWAP_MAX = 180, FADE = 6;
/* The landing page runs slower than the full orrery: orbits, ships and suns at this speed. */
const PACE = 0.43;
const swapDue = () => clock >= nextSwap;
const newSeed = () => 1 + Math.floor(Math.random() * 99998);

function loop(now) {
  raf = 0;
  if (!inView || document.hidden) return;
  raf = requestAnimationFrame(loop);
  /* Up to 60 frames a second while the camera moves on capable devices; otherwise 30. */
  const moving = cam.u < 1;
  if (now - lastDraw < (moving && !LITE && quality > 0.7 ? 15 : 32)) return;
  const gap = now - lastDraw;
  slowFrames = gap > 48 ? slowFrames + 1 : Math.max(0, slowFrames - 0.25);
  if (slowFrames > 6) { quality = Math.max(0.3, quality * 0.8); slowFrames = 0; }
  else if (gap < 36 && quality < 1) quality = Math.min(1, quality + 0.0008);
  const dt = clamp(gap / 1000, 0, 0.1);
  lastDraw = now;
  clock += dt;
  stepCam(dt);
  /* Change system only while resting on the chart, so a journey is never cut short. */
  if (swapDue() && cam.z === 0 && cam.u >= 1) swapSystem(now);
  render(startAt + ((now - startedAt) / 1000) * PACE);
  if (fade) {
    const left = 1 - (now - fade.at) / (FADE * 1000);
    if (left <= 0) fade = null;
    else {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = left * left * (3 - 2 * left);
      ctx.drawImage(fade.c, 0, 0);
      ctx.globalAlpha = 1;
    }
  }
}

function resume() {
  if (frozen || raf || !inView || document.hidden) return;
  lastDraw = performance.now();
  raf = requestAnimationFrame(loop);
}

function begin(seed) {
  const W = canvas.clientWidth || window.innerWidth, H = canvas.clientHeight || window.innerHeight;
  sys = build(seed, W, H);
  sys.vs = (Math.min(W, H) * 0.34) / sys.worlds[sys.homeIdx].a;
  sys.hx = 0; sys.hy = 0;
  canvas.width = Math.round(W * sys.dpr);
  canvas.height = Math.round(H * sys.dpr);
  cam.z = testZ !== null ? clamp(testZ, LEVEL_MIN, LEVEL_MAX) : 0;
  cam.k = 0;
  cam.u = 1;
  cam.hold = 20;
  nextSwap = clock + SWAP_MIN + Math.random() * (SWAP_MAX - SWAP_MIN);
}

function swapSystem(now) {
  /* Hold on to the old picture and dissolve it over the new one. */
  const c = document.createElement('canvas');
  c.width = canvas.width;
  c.height = canvas.height;
  c.getContext('2d').drawImage(canvas, 0, 0);
  begin(newSeed());
  fade = { c, at: now };
  if (!LITE) preload(sys);
}

function start(seed) {
  begin(seed);
  render(startAt);
  if (frozen) return;
  startedAt = performance.now();
  if (!LITE) preload(sys);
  resume();
}

/* Lighter phones get the charts alone: no zoom, so far less memory. */
cam.auto = !frozen && !LITE;

/* Nothing is drawn while the first screen is scrolled away or the tab is hidden. */
const intro = document.querySelector('.intro');
if (intro && 'IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    inView = entries[entries.length - 1].isIntersecting;
    resume();
  }).observe(intro);
}
document.addEventListener('visibilitychange', resume);

/* Only a real size change rebuilds: a phone's address bar sliding away must not. */
let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (canvas.clientWidth === sys.W && canvas.clientHeight === sys.H) return;
    const seed = sys.seed;
    fade = null;
    begin(seed);
    if (!LITE && !frozen) preload(sys);
    render(startAt);
  }, 200);
});

start(parseInt(params.get('seed'), 10) || newSeed());
})();
