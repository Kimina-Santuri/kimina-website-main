/* The Music page: a grid of sleeves, each drawn from that piece's own sound. Turn one over for its links and player.
   Without JavaScript the same content is a plain list. */
(() => {
  const root = document.querySelector("[data-crate]");
  if (!root) return;
  const TAU = Math.PI * 2;
  const sleeves = [...root.querySelectorAll(".sleeve")];

  const hash = text => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const mulberry = seed => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  /* What a sleeve is drawn from: how loud and how bright each moment is. `tools/music_sound.py` measures it from
     the audio. A piece that's only a link has no audio here, so its title stands in. */
  function soundOf(el, q) {
    const raw = el.dataset.sound;
    if (raw && raw.includes("|")) {
      const [a, b] = raw.split("|");
      const read = s => [...s].map(c => parseInt(c, 36) / 35);
      return { loud: read(a), bright: read(b) };
    }
    const N = 96, loud = [], bright = [];
    let l = q(), b = q();
    for (let i = 0; i < N; i++) {
      l = Math.min(1, Math.max(0.08, l + (q() - 0.5) * 0.28));
      b = Math.min(1, Math.max(0, b + (q() - 0.5) * 0.2));
      loud.push(l); bright.push(b);
    }
    return { loud, bright };
  }

  const STYLES = {
    /* Time runs round a record's grooves, and the groove thickens where it's loud. */
    grooves({ dot, q, loud, bright, W }) {
      const cx = W * 0.5, cy = W * 0.5, R = W * 0.47, hole = R * 0.2, rings = 44, N = loud.length;
      for (let k = 0; k < rings; k++) {
        const rad = hole + (R - hole) * (k / rings), steps = Math.round(rad * 1.1), twist = q() * TAU;
        for (let i = 0; i < steps; i++) {
          const f = i / steps, s = Math.floor(f * N), a = f * TAU + twist * 0.04;
          if (q() > Math.pow(loud[s], 1.5) * 0.92 + 0.03) continue;
          const j = rad + (q() - 0.5) * W * 0.014;
          dot(cx + Math.cos(a) * j, cy + Math.sin(a) * j, bright[s] > 0.55 ? 1 : 0, 0.7 + bright[s] * 0.9);
        }
      }
      for (let i = 0; i < 170; i++) { const a = (i / 170) * TAU; dot(cx + Math.cos(a) * hole * 0.42, cy + Math.sin(a) * hole * 0.42, 0, 0.8); }
    },
    /* Time runs up a spiral. */
    spiral({ dot, q, loud, bright, W }) {
      const cx = W * 0.5, cy = W * 0.5, R = W * 0.46, turns = 6 + q() * 5, N = loud.length, count = W * 14;
      for (let i = 0; i < count; i++) {
        const t = Math.sqrt(q()), s = Math.min(N - 1, Math.floor(t * N)), a = t * turns * TAU;
        const spread = (q() + q() + q() - 1.5) * W * 0.045 * loud[s], rad = t * R + spread;
        if (q() > loud[s] * 1.1) continue;
        dot(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, q() < bright[s] ? 1 : 0, 0.65 + q() * q() * 1.3);
      }
    },
    /* Time runs left to right through layers of ground. */
    strata({ dot, q, loud, bright, W }) {
      const layers = 3 + Math.floor(q() * 3), N = loud.length;
      for (let L = 0; L < layers; L++) {
        const base = W * (0.2 + (L + 0.5) * (0.6 / layers)), shift = Math.floor(q() * N), height = W * (0.05 + 0.1 / layers);
        for (let i = 0; i < W * 11 / layers; i++) {
          const x = q() * W, s = (Math.floor((x / W) * N) + shift) % N;
          const g = (q() + q() + q() + q() - 2) * 0.9, y = base + g * height * (0.15 + loud[s] * 1.4);
          dot(x, y, q() < bright[s] * 0.8 ? 1 : 0, 0.6 + q() * q() * 1.1);
        }
      }
    },
    /* Each section of the piece is a world, as big as it is loud. */
    worlds({ dot, q, loud, bright, W }) {
      const count = 4 + Math.floor(q() * 4), N = loud.length, tilt = q() * TAU, cx = W * 0.5, cy = W * 0.5;
      for (let i = 0; i < 1200; i++) {
        const a = q() * TAU, ex = Math.cos(a) * W * 0.44, ey = Math.sin(a) * W * 0.27;
        dot(cx + ex * Math.cos(tilt) - ey * Math.sin(tilt), cy + ex * Math.sin(tilt) + ey * Math.cos(tilt), 1, 0.55);
      }
      for (let c = 0; c < count; c++) {
        const from = Math.floor((c / count) * N), to = Math.floor(((c + 1) / count) * N);
        let sum = 0, tone = 0;
        for (let s = from; s < to; s++) { sum += loud[s]; tone += bright[s]; }
        sum /= to - from; tone /= to - from;
        const a = (c / count) * TAU + q(), ex = Math.cos(a) * W * 0.44, ey = Math.sin(a) * W * 0.27;
        const x = cx + ex * Math.cos(tilt) - ey * Math.sin(tilt), y = cy + ex * Math.sin(tilt) + ey * Math.cos(tilt), R = W * (0.03 + sum * 0.11);
        const lx = Math.cos(tilt + 2), ly = Math.sin(tilt + 2);
        for (let i = 0, n = R * R * 1.4; i < n; i++) {
          const b = q() * TAU, t = Math.sqrt(q()), dx = Math.cos(b) * t, dy = Math.sin(b) * t;
          if (q() > 0.12 + 0.88 * Math.max(0, 0.5 + (dx * lx + dy * ly) * 0.8)) continue;
          dot(x + dx * R, y + dy * R, q() < tone ? 1 : 0, 0.6 + q() * 0.6);
        }
      }
    },
    /* Grown like a seed head from the middle out; quiet moments leave gaps. */
    seedhead({ dot, q, loud, bright, W }) {
      const cx = W * 0.5, cy = W * 0.5, R = W * 0.62, n = W * 8, N = loud.length;
      for (let i = 0; i < n; i++) {
        const f = i / n, s = Math.min(N - 1, Math.floor(f * N));
        if (q() > Math.pow(loud[s], 1.3) + 0.04) continue;
        const a = i * 2.399963, rad = Math.sqrt(f) * R;
        dot(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, q() < bright[s] * 0.7 ? 1 : 0, 0.55 + bright[s] * 1.1 + q() * 0.3);
      }
    },
  };
  const FOR_KIND = { engineering: ["grooves", "strata", "spiral", "seedhead"], project: ["worlds", "seedhead", "spiral", "strata"], other: ["worlds", "strata", "grooves"] };

  function paint(el) {
    if (el.dataset.painted) return;
    el.dataset.painted = "1";
    const canvas = el.querySelector("canvas");
    const q = mulberry(hash(el.dataset.slug));
    const size = Math.min(1000, Math.round((canvas.clientWidth || 360) * Math.min(window.devicePixelRatio || 1, 2)));
    canvas.width = canvas.height = size;
    const { loud, bright } = soundOf(el, q);
    const list = FOR_KIND[el.dataset.kind] || FOR_KIND.other;
    const style = list[Math.floor(q() * list.length)];
    const dark = q() < 0.42;
    el.classList.toggle("sleeve--dark", dark);
    const paper = dark ? "#050505" : "#ffffff", cols = dark ? ["#f4f4f4", "#7c7c7c"] : ["#050505", "#8e8e8e"];
    const g = canvas.getContext("2d");
    g.fillStyle = paper;
    g.fillRect(0, 0, size, size);
    const buckets = [[], []], u = size / 720;
    STYLES[style]({ q, loud, bright, W: size, dot(x, y, c, r) { buckets[c].push(x, y, Math.max(0.6, r * u)); } });
    /* In batches: Apple's WebKit drops a single path with too many dots in it. */
    buckets.forEach((b, c) => {
      g.fillStyle = cols[c];
      for (let start = 0; start < b.length; start += 24000) {
        g.beginPath();
        for (let i = start, end = Math.min(b.length, start + 24000); i < end; i += 3) {
          if (b[i + 2] < 0.75) g.rect(b[i] - b[i + 2], b[i + 1] - b[i + 2], b[i + 2] * 2, b[i + 2] * 2);
          else { g.moveTo(b[i] + b[i + 2], b[i + 1]); g.arc(b[i], b[i + 1], b[i + 2], 0, TAU); }
        }
        g.fill();
      }
    });
  }

  /* ---- The player: one for the whole page, so it carries on while you turn other sleeves. ---- */
  const audio = root.querySelector("audio");
  const deck = root.querySelector(".crate__deck");
  const toggle = deck.querySelector("[data-deck-toggle]");
  const seek = deck.querySelector("input");
  const nowEl = deck.querySelector("[data-deck-now]");
  const timeEl = deck.querySelector("[data-deck-time]");
  let playing = null, scrubbing = false;
  const clock = s => (Number.isFinite(s) && s >= 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "--:--");

  /* The player sits just above whatever is fixed along the bottom of the screen: the drone's bar, and the phone's menu. */
  function clearBars() {
    const mine = root.getBoundingClientRect();
    let clear = 12;
    document.querySelectorAll(".side-nav,.stellar-player").forEach(bar => {
      const r = bar.getBoundingClientRect();
      if (r.top > innerHeight / 2 && r.left < mine.right && r.right > mine.left) clear = Math.max(clear, innerHeight - r.top + 8);
    });
    root.style.setProperty("--bars-clear", `${Math.round(clear)}px`);
  }
  function currentRow(t) {
    if (!playing) return null;
    let found = null;
    playing.el.querySelectorAll("[data-at]").forEach(b => { if (parseFloat(b.dataset.at) <= t + 0.2) found = b; });
    return found;
  }
  function refresh() {
    const on = !!playing && !audio.paused && !audio.ended;
    toggle.textContent = on ? "Pause" : "Play";
    toggle.setAttribute("aria-label", `${on ? "Pause" : "Play"}${playing ? ` ${playing.title}` : ""}`);
    sleeves.forEach(el => { el.dataset.playing = String(on && playing.el === el); });
    if (!playing) return;
    const t = audio.currentTime || 0, d = audio.duration;
    timeEl.textContent = `${clock(t)} / ${clock(d)}`;
    if (!scrubbing && Number.isFinite(d) && d > 0) seek.value = String(Math.round((t / d) * 1000));
    const bar = playing.el.querySelector(".sleeve__progress");
    if (bar && Number.isFinite(d) && d > 0) bar.style.transform = `scaleX(${t / d})`;
    const row = currentRow(t);
    playing.el.querySelectorAll("[data-at]").forEach(b => b.classList.toggle("is-current", b === row));
    const name = row ? row.dataset.name : playing.title;
    nowEl.textContent = row ? `${playing.title} / ${name}` : playing.title;
  }
  function play(el, src, at, title) {
    const sameFile = playing && audio.getAttribute("src") === src;
    playing = { el, title: el.dataset.title };
    if (!sameFile) { audio.src = src; audio.load(); }
    clearBars();
    deck.hidden = false;
    seek.disabled = false;
    const go = () => {
      if (at) { try { audio.currentTime = at; } catch (e) { /* set once metadata arrives */ } }
      document.dispatchEvent(new CustomEvent("kimina:audio-start", { detail: { source: "music" } }));
      audio.play().catch(() => { nowEl.textContent = "Press Play to listen."; });
    };
    if (at && !sameFile) audio.addEventListener("loadedmetadata", go, { once: true }); else go();
    if (at && !sameFile) audio.play().catch(() => {});
    if ("mediaSession" in navigator && window.MediaMetadata) navigator.mediaSession.metadata = new MediaMetadata({ title: title || el.dataset.title, artist: "Kimina", album: el.dataset.title });
    refresh();
  }
  toggle.addEventListener("click", () => {
    if (!playing) return;
    if (audio.paused) { document.dispatchEvent(new CustomEvent("kimina:audio-start", { detail: { source: "music" } })); audio.play().catch(() => {}); } else audio.pause();
  });
  seek.addEventListener("input", () => { scrubbing = true; if (Number.isFinite(audio.duration)) timeEl.textContent = `${clock((seek.value / 1000) * audio.duration)} / ${clock(audio.duration)}`; });
  seek.addEventListener("change", () => { scrubbing = false; if (Number.isFinite(audio.duration)) audio.currentTime = (seek.value / 1000) * audio.duration; });
  ["play", "pause", "timeupdate", "durationchange", "ended", "loadedmetadata"].forEach(n => audio.addEventListener(n, refresh));
  audio.addEventListener("error", () => { if (playing) nowEl.textContent = `${playing.title} couldn't be loaded.`; });
  /* Only one thing plays at a time: the stellar drone or the release player will stop this, and this stops them. */
  document.addEventListener("kimina:audio-start", e => { if (!e.detail || e.detail.source !== "music") audio.pause(); });

  root.addEventListener("click", e => {
    const button = e.target.closest("[data-play]");
    if (button) {
      const el = button.closest(".sleeve"), on = playing && playing.el === el && !audio.paused && button.dataset.play === "main";
      if (on) { audio.pause(); return; }
      if (button.dataset.play === "main" && playing && playing.el === el && audio.getAttribute("src") === button.dataset.src) { toggle.click(); return; }
      play(el, button.dataset.src, parseFloat(button.dataset.at) || 0, button.dataset.name);
      return;
    }
    const embed = e.target.closest("[data-embed]");
    if (embed) {
      /* The other site's player only loads when asked for, which saves data and tells them nothing until then. */
      const frame = document.createElement("iframe");
      frame.src = embed.dataset.embed;
      frame.title = `${embed.closest(".sleeve").dataset.title} player`;
      frame.loading = "lazy";
      frame.allow = "autoplay";
      embed.replaceWith(frame);
      audio.pause();
    }
  });

  /* ---- The cards ---- */
  root.classList.add("crate--live");
  const counter = root.querySelector("[data-crate-count]");
  let turned = null;

  /* Drawn as they come near the screen, so a long list costs a phone nothing until it's scrolled to. */
  const near = "IntersectionObserver" in window && new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { near.unobserve(entry.target); paint(entry.target); } });
  }, { rootMargin: "400px 0px" });
  sleeves.forEach(el => { if (near) near.observe(el); else paint(el); });

  function sides() {
    sleeves.forEach(el => {
      el.querySelector(".sleeve__back").inert = el !== turned;
      el.querySelector(".sleeve__front").inert = el === turned;
    });
  }
  function turn(el, keepFocus) {
    const was = turned;
    if (was) was.classList.remove("sleeve--turned");
    turned = el;
    if (el) el.classList.add("sleeve--turned");
    sides();
    if (history.replaceState) history.replaceState(null, "", el ? `#${el.dataset.slug}` : location.pathname + location.search);
    if (keepFocus) return;
    const focus = el ? el.querySelector("[data-turn-back]") : was && was.querySelector(".sleeve__front");
    if (focus) focus.focus({ preventScroll: true });
  }
  sleeves.forEach(el => {
    el.querySelector(".sleeve__front").addEventListener("click", () => turn(el));
    el.querySelector("[data-turn-back]").addEventListener("click", () => turn(null));
  });
  root.addEventListener("keydown", e => { if (e.key === "Escape" && turned) turn(null); });

  function count(n) { counter.textContent = `${n} ${n === 1 ? "piece" : "pieces"}`; }
  root.querySelectorAll("[data-crate-filter]").forEach(button => button.addEventListener("click", () => {
    const kind = button.dataset.crateFilter;
    root.querySelectorAll("[data-crate-filter]").forEach(b => b.setAttribute("aria-pressed", String(b === button)));
    if (turned && kind !== "all" && turned.dataset.kind !== kind) turn(null, true);
    let n = 0;
    sleeves.forEach(el => { el.hidden = kind !== "all" && el.dataset.kind !== kind; if (!el.hidden) n++; });
    count(n);
  }));

  window.addEventListener("resize", clearBars);

  count(sleeves.length);
  sides();
  /* A link to one piece opens with that sleeve turned over. */
  const opening = sleeves.find(el => `#${el.dataset.slug}` === location.hash);
  if (opening) turn(opening);
})();
