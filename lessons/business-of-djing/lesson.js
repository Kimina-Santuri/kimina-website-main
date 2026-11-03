(function () {
  var ctx = null;
  function beep() {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.35, 0.7].forEach(function (o) {
        var t = ctx.currentTime + o, osc = ctx.createOscillator(), g = ctx.createGain();
        osc.frequency.value = 880; g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t + 0.22);
      });
    } catch (e) {}
  }

  // progress + per-viewer tick memory
  var KEY = "business-of-djing-tasks", saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
  var boxes = document.querySelectorAll(".check input");
  function update() {
    var k = 0;
    boxes.forEach(function (b) { b.closest(".mission").classList.toggle("complete", b.checked); if (b.checked) k++; });
    document.getElementById("barFill").style.width = (k / boxes.length * 100) + "%";
    document.getElementById("progressText").textContent = k + " / " + boxes.length + " tasks";
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

  // task timers
  function fmt(s) { var m = Math.floor(s / 60), r = s % 60; return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r; }
  document.querySelectorAll(".mission").forEach(function (m) {
    var btn = m.querySelector(".timer"), total = +m.dataset.min * 60, left = total, id = null;
    btn.addEventListener("click", function () {
      if (btn.classList.contains("done")) { left = total; btn.classList.remove("done"); btn.textContent = "▶ " + fmt(left); return; }
      if (id) { clearInterval(id); id = null; btn.classList.remove("running"); btn.textContent = "▶ " + fmt(left); return; }
      btn.classList.add("running"); btn.textContent = "❚❚ " + fmt(left);
      id = setInterval(function () {
        left--; btn.textContent = "❚❚ " + fmt(left);
        if (left <= 0) { clearInterval(id); id = null; btn.classList.remove("running"); btn.classList.add("done"); btn.textContent = "Time! ↺"; beep(); }
      }, 1000);
    });
  });

  // fee and break-even calculators
  function kes(n) { return "KES " + Math.round(n).toLocaleString("en-KE"); }
  function calc(id, fn) {
    var box = document.getElementById(id); if (!box) return;
    var ins = box.querySelectorAll("input");
    function run() {
      var v = {}; ins.forEach(function (i) { v[i.dataset.k] = Math.max(0, parseFloat(i.value) || 0); });
      var o = fn(v); Object.keys(o).forEach(function (k) { box.querySelector('[data-o="' + k + '"]').textContent = o[k]; });
    }
    ins.forEach(function (i) { i.addEventListener("input", run); }); run();
  }
  calc("feeCalc", function (v) {
    var base = (v.prep + v.set + v.admin) * v.rate + v.transport + v.gear;
    var min = Math.ceil(base * 1.1 * (1 + v.tax / 100) / 100 - 1e-9) * 100;
    return { min: kes(min), target: kes(Math.ceil(min * 1.5 / 100) * 100), premium: kes(min * 2) };
  });
  calc("evenCalc", function (v) {
    var total = v.costs * 1.1;
    return { total: kes(total), tickets: v.ticket ? Math.ceil(total / v.ticket) : "–" };
  });
})();
