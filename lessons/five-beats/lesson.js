(function () {
  // Step numbers are 1–16; "soft" steps play quieter and show grey.
  var PATTERNS = {
    house:  { bpm: 124, swing: 0, bass: [3,7,11,15], rows: [
      { name: "Kick", s: "kick", on: [1,5,9,13] },
      { name: "Clap", s: "clap", on: [5,13] },
      { name: "Closed hat", s: "hat", on: [3,7,11,15] } ] },
    hiphop: { bpm: 90, swing: 0.16, bass: [1,8,11], rows: [
      { name: "Kick", s: "kick", on: [1,8,11] },
      { name: "Snare", s: "snare", on: [5,13] },
      { name: "Closed hat", s: "hat", on: [1,3,5,7,9,11,13,15] } ] },
    afro:   { bpm: 104, swing: 0.06, bass: [1,4,9,12], rows: [
      { name: "Kick", s: "kick", on: [1,4,9,12] },
      { name: "Clap", s: "clap", on: [5,13] },
      { name: "Rim", s: "rim", on: [7,15] },
      { name: "Shaker", s: "shaker", on: [1,3,5,7,9,11,13,15], soft: [2,4,6,8,10,12,14,16] } ] },
    piano:  { bpm: 113, swing: 0.08, bass: [4,7,11,14], logBass: true, rows: [
      { name: "Kick", s: "kick", on: [1,5,9,13] },
      { name: "Clap", s: "clap", on: [5,13] },
      { name: "Shaker", s: "shaker", on: [3,7,11,15], soft: [1,2,4,5,6,8,9,10,12,13,14,16] },
      { name: "Log drum", s: "log", on: [4,7,11,14] } ] },
    genge:  { bpm: 100, swing: 0, bass: [1,7,9,15], rows: [
      { name: "Kick", s: "kick", on: [1,5,9,13] },
      { name: "Snare", s: "snare", on: [4,7,12,15] },
      { name: "Closed hat", s: "hat", on: [1,3,5,7,9,11,13,15] } ] }
  };
  var CHORDS = [[57,60,64],[53,57,60],[60,64,67],[55,59,62]]; // Am F C G
  var ROOTS = [45,41,48,43];                                  // A F C G, an octave up so laptop speakers can play it
  var COUNT = ["1","e","&","a","2","e","&","a","3","e","&","a","4","e","&","a"];
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  var countRow = document.getElementById("countRow");
  COUNT.forEach(function (t, i) {
    var sp = document.createElement("span"); sp.textContent = t; if (i % 4 === 0) sp.className = "b"; countRow.appendChild(sp);
  });

  // --- sound ---
  var ctx = null, noiseBuf = null;
  function audio() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function env(g, t, peak, dec) { g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.001, t + dec); }
  function noise(t, type, freq, peak, dec) {
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
    src.connect(f); f.connect(g); g.connect(ctx.destination); env(g, t, peak, dec); src.start(t); src.stop(t + dec + 0.05);
  }
  function tone(t, f0, f1, peak, dec, wave) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = wave || "sine"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dec * 0.6);
    o.connect(g); g.connect(ctx.destination); env(g, t, peak, dec); o.start(t); o.stop(t + dec + 0.05);
  }
  function pad(t, notes, dur) {
    var f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = "lowpass"; f.frequency.value = 1800; f.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.03);
    g.gain.setValueAtTime(0.09, t + dur - 0.08); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    notes.forEach(function (m) { var o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = hz(m); o.connect(f); o.start(t); o.stop(t + dur + 0.02); });
  }
  var SOUNDS = {
    kick:   function (t, v) { tone(t, 150, 45, 0.9 * v, 0.35); },
    snare:  function (t, v) { noise(t, "bandpass", 1800, 0.6 * v, 0.18); tone(t, 220, 180, 0.3 * v, 0.1, "triangle"); },
    clap:   function (t, v) { [0, 0.012, 0.024].forEach(function (o) { noise(t + o, "bandpass", 1200, 0.45 * v, 0.12); }); },
    hat:    function (t, v) { noise(t, "highpass", 7000, 0.25 * v, 0.05); },
    rim:    function (t, v) { tone(t, 1700, 1600, 0.3 * v, 0.04, "triangle"); },
    shaker: function (t, v) { noise(t, "bandpass", 6000, 0.22 * v, 0.06); },
    log:    function (t, v) { tone(t, 110, 70, 0.7 * v, 0.45); }
  };
  function drumsAt(p, idx, t, skipLog) {
    p.rows.forEach(function (r) {
      if (skipLog && r.s === "log") return;
      if (r.on.indexOf(idx + 1) >= 0) SOUNDS[r.s](t, 1);
      else if (r.soft && r.soft.indexOf(idx + 1) >= 0) SOUNDS[r.s](t, 0.4);
    });
  }

  // --- one shared transport: only one thing plays at a time ---
  var current = null;
  function stop() {
    if (!current) return;
    clearInterval(current.timer); current.timers.forEach(clearTimeout);
    current.onStop(); current = null;
  }
  function start(owner, bpm, swing, length, onStep, onVisual, onStop) {
    audio();
    var stepDur = 60 / bpm / 4, step = 0, next = ctx.currentTime + 0.08;
    current = { owner: owner, timers: [], onStop: onStop };
    var me = current;
    me.timer = setInterval(function () {
      while (next < ctx.currentTime + 0.12) {
        var idx = step % length, t = next + (idx % 2 === 1 ? swing * stepDur : 0);
        onStep(idx, t, stepDur);
        (function (i, at) { me.timers.push(setTimeout(function () { if (current === me) onVisual(i); }, Math.max(0, (at - ctx.currentTime) * 1000))); })(idx, t);
        if (me.timers.length > 200) me.timers.splice(0, 100);
        next += stepDur; step++;
      }
    }, 25);
  }

  function buildGrid(grid, rows, cols) {
    grid.textContent = "";
    for (var i = 0; i < 16; i++) cols[i] = [];
    grid.appendChild(document.createElement("span"));
    for (var n = 1; n <= 16; n++) { var num = document.createElement("span"); num.className = "n" + ((n - 1) % 4 === 0 ? " b" : ""); num.textContent = n; grid.appendChild(num); }
    rows.forEach(function (r) {
      var lab = document.createElement("span"); lab.className = "lab"; lab.textContent = r.name; grid.appendChild(lab);
      for (var s = 1; s <= 16; s++) {
        var c = document.createElement("span"); c.className = "c" + ((s - 1) % 4 === 0 ? " beat" : "");
        if (r.on.indexOf(s) >= 0) c.classList.add("on"); else if (r.soft && r.soft.indexOf(s) >= 0) c.classList.add("soft");
        grid.appendChild(c); cols[s - 1].push(c);
      }
    });
    grid.setAttribute("role", "img");
    grid.setAttribute("aria-label", rows.map(function (r) { return r.name + " on steps " + r.on.join(", "); }).join("; "));
  }
  function clearNow(cols) { cols.forEach(function (col) { col.forEach(function (c) { c.classList.remove("now"); }); }); }

  // drum grids
  document.querySelectorAll(".seq[data-pattern]").forEach(function (box) {
    var p = PATTERNS[box.dataset.pattern], cols = [];
    var wrap = document.createElement("div"); wrap.className = "seq-scroll";
    var grid = document.createElement("div"); grid.className = "grid";
    buildGrid(grid, p.rows, cols); wrap.appendChild(grid);
    var btn = document.createElement("button"); btn.type = "button"; btn.className = "play"; btn.textContent = "▶ Play this beat";
    box.appendChild(wrap); box.appendChild(btn);
    btn.addEventListener("click", function () {
      var mine = current && current.owner === btn; stop(); if (mine) return;
      var last = -1;
      try {
        start(btn, p.bpm, p.swing, 16,
          function (idx, t) { drumsAt(p, idx, t, false); },
          function (i) { if (last >= 0) cols[last].forEach(function (c) { c.classList.remove("now"); }); cols[i].forEach(function (c) { c.classList.add("now"); }); last = i; },
          function () { btn.classList.remove("on"); btn.textContent = "▶ Play this beat"; clearNow(cols); });
      } catch (e) { btn.textContent = "Sound not available here"; return; }
      btn.classList.add("on"); btn.textContent = "■ Stop";
    });
  });

  // song preview (drums + bass + chords, 4 bars)
  var genre = "piano", songBtn = document.getElementById("songPlay"), bassGrid = document.getElementById("bassGrid");
  var bars = document.querySelectorAll("#bars div"), bassCols = [];
  var lay = { d: document.getElementById("layDrums"), b: document.getElementById("layBass"), c: document.getElementById("layChords") };
  function drawBass() {
    var p = PATTERNS[genre];
    buildGrid(bassGrid, [{ name: "Kick", on: p.rows[0].on }, { name: "Bass", on: p.bass }], bassCols);
  }
  drawBass();
  document.querySelectorAll(".chip").forEach(function (ch) {
    ch.addEventListener("click", function () {
      document.querySelectorAll(".chip").forEach(function (o) { o.setAttribute("aria-pressed", o === ch ? "true" : "false"); });
      genre = ch.dataset.g; drawBass();
      if (current && current.owner === songBtn) { stop(); playSong(); }
    });
  });
  function playSong() {
    var p = PATTERNS[genre], last = -1;
    start(songBtn, p.bpm, p.swing, 64,
      function (idx, t, sd) {
        var bar = Math.floor(idx / 16), s = idx % 16;
        if (lay.d.checked) drumsAt(p, s, t, true);
        if (lay.c.checked && s === 0) pad(t, CHORDS[bar], sd * 16 * 0.97);
        if (lay.b.checked && p.bass.indexOf(s + 1) >= 0) {
          var f = hz(ROOTS[bar]);
          if (p.logBass) tone(t, f * 1.5, f, 0.7, 0.4); else tone(t, f, f, 0.55, sd * 1.8, "triangle");
        }
      },
      function (i) {
        var bar = Math.floor(i / 16), s = i % 16;
        bars.forEach(function (b, k) { b.classList.toggle("now", k === bar); });
        if (last >= 0) bassCols[last].forEach(function (c) { c.classList.remove("now"); });
        bassCols[s].forEach(function (c) { c.classList.add("now"); }); last = s;
      },
      function () { songBtn.classList.remove("on"); songBtn.textContent = "▶ Play 4 bars"; bars.forEach(function (b) { b.classList.remove("now"); }); clearNow(bassCols); });
    songBtn.classList.add("on"); songBtn.textContent = "■ Stop";
  }
  songBtn.addEventListener("click", function () {
    var mine = current && current.owner === songBtn; stop(); if (mine) return;
    try { playSong(); } catch (e) { songBtn.textContent = "Sound not available here"; }
  });

  // arrangement chart
  var ARR = { heads: [["Intro","bars 1–8"],["Build","9–16"],["Drop","17–24"],["Outro","25–32"]],
    rows: [["Hats / shaker",[1,1,1,1]],["Chords",[1,1,1,1]],["Clap / snare",[0,1,1,0]],["Bass",[0,1,1,1]],["Kick",[0,0,1,0]]] };
  var arr = document.getElementById("arr");
  arr.appendChild(document.createElement("span"));
  ARR.heads.forEach(function (h) { var d = document.createElement("span"); d.className = "h"; d.innerHTML = h[0] + "<small>" + h[1] + "</small>"; arr.appendChild(d); });
  ARR.rows.forEach(function (r) {
    var l = document.createElement("span"); l.className = "lab"; l.textContent = r[0]; arr.appendChild(l);
    r[1].forEach(function (v) { var x = document.createElement("span"); x.className = "x" + (v ? " on" : ""); arr.appendChild(x); });
  });

  // progress + per-viewer tick memory
  var KEY = "five-beats-missions", saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
  var boxes = document.querySelectorAll(".check input");
  function update() {
    var k = 0;
    boxes.forEach(function (b) { b.closest(".mission").classList.toggle("complete", b.checked); if (b.checked) k++; });
    document.getElementById("barFill").style.width = (k / boxes.length * 100) + "%";
    document.getElementById("progressText").textContent = k + " / " + boxes.length + " missions";
  }
  boxes.forEach(function (b) {
    b.checked = !!saved[b.id];
    b.addEventListener("change", function () {
      saved[b.id] = b.checked;
      try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
      update();
    });
  });
  update();

  // mission timers
  function fmt(s) { var m = Math.floor(s / 60), r = s % 60; return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r; }
  function beep() { try { audio(); [0, 0.35, 0.7].forEach(function (o) { tone(ctx.currentTime + o, 880, 880, 0.15, 0.2); }); } catch (e) {} }
  document.querySelectorAll(".mission").forEach(function (m) {
    var btn = m.querySelector(".timer"), total = +m.dataset.min * 60, left = total, id = null;
    btn.addEventListener("click", function () {
      try { audio(); } catch (e) {}
      if (btn.classList.contains("done")) { left = total; btn.classList.remove("done"); btn.textContent = "▶ " + fmt(left); return; }
      if (id) { clearInterval(id); id = null; btn.classList.remove("running"); btn.textContent = "▶ " + fmt(left); return; }
      btn.classList.add("running"); btn.textContent = "❚❚ " + fmt(left);
      id = setInterval(function () {
        left--; btn.textContent = "❚❚ " + fmt(left);
        if (left <= 0) { clearInterval(id); id = null; btn.classList.remove("running"); btn.classList.add("done"); btn.textContent = "Time! ↺"; beep(); }
      }, 1000);
    });
  });
})();
