const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

const canvas = document.querySelector(".ambient-canvas");
const context = canvas?.getContext("2d");
const mode = document.body.dataset.animation || "lissajous";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll('a[href]').forEach((link) => {
  link.addEventListener("click", (event) => {
    if (reduceMotion || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || url.hash || link.target === "_blank" || url.protocol === "mailto:") return;
    event.preventDefault();
    document.body.classList.add("is-leaving");
    window.setTimeout(() => { window.location.href = url.href; }, 180);
  });
});

if (canvas && context) {
  let width = 0;
  let height = 0;
  let time = 0;
  let frameId;
  const pointer = { x: .5, y: .5, targetX: .5, targetY: .5 };

  const resize = () => {
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * scale;
    canvas.height = height * scale;
    context.setTransform(scale, 0, 0, scale, 0, 0);
  };

  const lissajous = () => {
    [0, Math.PI / 8].forEach((offset, index) => {
      const xFrequency = index ? 5 : 3;
      const yFrequency = index ? 4 : 2;
      const radiusX = Math.min(width * (.36 + pointer.x * .06), 600);
      const radiusY = Math.min(height * (.38 + pointer.y * .07), 470);
      context.beginPath();
      for (let step = 0; step <= 800; step += 1) {
        const angle = step / 800 * Math.PI * 2;
        const x = width / 2 + Math.sin(xFrequency * angle + time + offset + pointer.x * .35) * radiusX;
        const y = height / 2 + Math.sin(yFrequency * angle + offset + pointer.y * .35) * radiusY;
        if (!step) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.strokeStyle = `rgba(5,5,5,${index ? .17 : .4})`;
      context.stroke();
    });
  };

  const dots = () => {
    const spacing = Math.max(32, Math.min(width, height) / 17);
    const mouseX = pointer.x * width;
    const mouseY = pointer.y * height;
    for (let y = spacing / 2; y < height; y += spacing) {
      for (let x = spacing / 2; x < width; x += spacing) {
        const distance = Math.hypot(x - mouseX, y - mouseY);
        const influence = Math.max(0, 1 - distance / 240);
        const angle = Math.atan2(y - mouseY, x - mouseX);
        const drift = Math.sin(time * 2 + x * .018 + y * .012) * 2;
        const px = x + Math.cos(angle) * influence * 22 + drift;
        const py = y + Math.sin(angle) * influence * 22 + drift;
        context.beginPath();
        context.arc(px, py, 1 + influence * 2.4, 0, Math.PI * 2);
        context.fillStyle = `rgba(5,5,5,${.18 + influence * .42})`;
        context.fill();
      }
    }
  };

  const orbits = () => {
    const centerX = width * (.5 + (pointer.x - .5) * .12);
    const centerY = height * (.5 + (pointer.y - .5) * .12);
    for (let ring = 0; ring < 7; ring += 1) {
      const radiusX = Math.min(width, height) * (.09 + ring * .055);
      const radiusY = radiusX * (.38 + ring * .05);
      context.save();
      context.translate(centerX, centerY);
      context.rotate((ring - 3) * .18 + time * (ring % 2 ? .08 : -.06));
      context.beginPath();
      context.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
      context.strokeStyle = `rgba(5,5,5,${.09 + ring * .035})`;
      context.stroke();
      const angle = time * (.35 + ring * .04) + ring;
      context.beginPath();
      context.arc(Math.cos(angle) * radiusX, Math.sin(angle) * radiusY, 2, 0, Math.PI * 2);
      context.fillStyle = "rgba(5,5,5,.55)";
      context.fill();
      context.restore();
    }
  };

  const threads = () => {
    const mouseX = pointer.x * width;
    const mouseY = pointer.y * height;
    for (let line = 0; line < 18; line += 1) {
      const y = height * line / 17;
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(width * .32, y + Math.sin(time + line) * 35, mouseX, mouseY + (line - 8.5) * 12, width, height - y);
      context.strokeStyle = `rgba(5,5,5,${.055 + line % 3 * .025})`;
      context.stroke();
    }
  };

  const grid = () => {
    const spacing = 42;
    const mouseX = pointer.x * width;
    const mouseY = pointer.y * height;
    context.strokeStyle = "rgba(5,5,5,.16)";
    for (let y = 0; y <= height + spacing; y += spacing) {
      context.beginPath();
      for (let x = 0; x <= width + spacing; x += 8) {
        const distance = Math.hypot(x - mouseX, y - mouseY);
        const ripple = Math.sin(distance * .035 - time * 2) * Math.max(0, 1 - distance / 360) * 18;
        if (!x) context.moveTo(x, y + ripple); else context.lineTo(x, y + ripple);
      }
      context.stroke();
    }
  };

  const pulse = () => {
    const centerX = pointer.x * width;
    const centerY = pointer.y * height;
    const limit = Math.hypot(width, height) * .65;
    for (let ring = 0; ring < 12; ring += 1) {
      const radius = (ring * 72 + time * 38) % limit;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.strokeStyle = `rgba(5,5,5,${Math.max(.025, .18 - radius / limit * .16)})`;
      context.stroke();
    }
  };

  const signal = () => {
    const centerY = height / 2;
    context.beginPath();
    for (let x = 0; x <= width; x += 5) {
      const distance = Math.abs(x - pointer.x * width);
      const response = Math.max(0, 1 - distance / 320);
      const noise = Math.sin(x * .08 + time * 3) * response * 70 + Math.sin(x * .018 - time) * 10;
      const y = centerY + noise * (.4 + pointer.y);
      if (!x) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.strokeStyle = "rgba(5,5,5,.42)";
    context.stroke();
  };

  const constellation = () => {
    const nodes = [
      [.12,.22],[.28,.12],[.42,.31],[.61,.16],[.82,.28],
      [.18,.58],[.36,.72],[.53,.52],[.72,.68],[.9,.55],
      [.25,.9],[.6,.88]
    ];
    const mouseX = pointer.x * width;
    const mouseY = pointer.y * height;
    const points = nodes.map(([x,y], index) => {
      const px = x * width + Math.sin(time * .35 + index) * 7;
      const py = y * height + Math.cos(time * .28 + index * .8) * 7;
      const influence = Math.max(0, 1 - Math.hypot(px - mouseX, py - mouseY) / 260);
      return [px + (mouseX - px) * influence * .08, py + (mouseY - py) * influence * .08, influence];
    });
    const links = [[0,1],[1,2],[2,3],[3,4],[0,5],[2,5],[2,7],[5,6],[6,7],[7,8],[8,9],[6,10],[8,11],[10,11]];
    links.forEach(([a,b]) => {
      context.beginPath();
      context.moveTo(points[a][0], points[a][1]);
      context.lineTo(points[b][0], points[b][1]);
      context.strokeStyle = `rgba(5,5,5,${.08 + Math.max(points[a][2],points[b][2]) * .2})`;
      context.stroke();
    });
    points.forEach(([x,y,influence], index) => {
      context.beginPath();
      context.arc(x, y, 1.4 + influence * 2.2 + (index % 3 === 0 ? .8 : 0), 0, Math.PI * 2);
      context.fillStyle = `rgba(5,5,5,${.28 + influence * .42})`;
      context.fill();
    });
  };

  const renderers = { lissajous, dots, orbits, threads, grid, pulse, signal, constellation };
  const draw = () => {
    pointer.x += (pointer.targetX - pointer.x) * .06;
    pointer.y += (pointer.targetY - pointer.y) * .06;
    context.clearRect(0, 0, width, height);
    context.lineWidth = .7;
    renderers[mode]?.();
    if (!reduceMotion) {
      time += .012;
      frameId = requestAnimationFrame(draw);
    }
  };

  window.addEventListener("pointermove", (event) => {
    pointer.targetX = event.clientX / width;
    pointer.targetY = event.clientY / height;
  }, { passive: true });
  window.addEventListener("resize", () => { resize(); if (reduceMotion) draw(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && frameId) cancelAnimationFrame(frameId);
    if (!document.hidden && !reduceMotion) draw();
  });
  resize();
  draw();
}

const soundControl = document.querySelector(".sound-control");
if (soundControl) {
  const label = soundControl.querySelector(".sound-control__label");
  let audioContext;
  let master;
  let filter;
  let panner;
  let isPlaying = false;
  let suspendTimer;

  const buildDrone = () => {
    audioContext = new AudioContext();
    master = audioContext.createGain();
    filter = audioContext.createBiquadFilter();
    panner = audioContext.createStereoPanner();
    const delay = audioContext.createDelay(2);
    const feedback = audioContext.createGain();
    const dry = audioContext.createGain();
    const wet = audioContext.createGain();

    master.gain.value = .0001;
    filter.type = "lowpass";
    filter.frequency.value = 480;
    filter.Q.value = 2.2;
    delay.delayTime.value = .72;
    feedback.gain.value = .34;
    dry.gain.value = .72;
    wet.gain.value = .28;

    filter.connect(dry).connect(panner);
    filter.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(panner);
    panner.connect(master).connect(audioContext.destination);

    const stars = [
      { name:"Proxima Centauri", frequency:55, luminosity:.00155, distance:4.23 },
      { name:"Sirius", frequency:82.5, luminosity:25.4, distance:8.6 },
      { name:"Vega", frequency:110, luminosity:40, distance:25 },
      { name:"Betelgeuse", frequency:165, luminosity:10000, distance:700 }
    ];

    stars.forEach((star, index) => {
      const oscillator = audioContext.createOscillator();
      const voiceGain = audioContext.createGain();
      const voiceFilter = audioContext.createBiquadFilter();
      const pitchLfo = audioContext.createOscillator();
      const pitchDepth = audioContext.createGain();
      const fadeLfo = audioContext.createOscillator();
      const fadeDepth = audioContext.createGain();
      const luminosity = (Math.log10(star.luminosity) + 3) / 7;
      const distance = Math.log10(star.distance + 1) / Math.log10(701);
      const baseGain = .028 + Math.max(0, Math.min(1, luminosity)) * .055;
      const fadeSeconds = 18 + distance * 34 + index * 3;

      oscillator.type = index % 2 ? "triangle" : "sine";
      oscillator.frequency.value = star.frequency;
      oscillator.detune.value = index * 3 - 4;
      voiceFilter.type = "lowpass";
      voiceFilter.frequency.value = 1500 - distance * 1050 + luminosity * 260;
      voiceFilter.Q.value = 1.2 + luminosity * 2.4;
      voiceGain.gain.value = baseGain;
      pitchLfo.frequency.value = .012 + index * .007;
      pitchDepth.gain.value = 2 + distance * 5;
      fadeLfo.frequency.value = 1 / fadeSeconds;
      fadeDepth.gain.value = baseGain * .96;

      pitchLfo.connect(pitchDepth).connect(oscillator.detune);
      fadeLfo.connect(fadeDepth).connect(voiceGain.gain);
      oscillator.connect(voiceFilter).connect(voiceGain).connect(filter);
      oscillator.start();
      pitchLfo.start();
      fadeLfo.start(audioContext.currentTime + index * 2.7);
    });
  };

  const setPlaying = async (nextState) => {
    if (!audioContext) buildDrone();
    window.clearTimeout(suspendTimer);
    if (nextState) {
      await audioContext.resume();
      const now = audioContext.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, .0001), now);
      master.gain.exponentialRampToValueAtTime(.038, now + 1.8);
    } else {
      const now = audioContext.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, .0001), now);
      master.gain.exponentialRampToValueAtTime(.0001, now + .8);
      suspendTimer = window.setTimeout(() => audioContext.suspend(), 850);
    }
    isPlaying = nextState;
    soundControl.setAttribute("aria-pressed", String(isPlaying));
    label.textContent = isPlaying ? "Sound on" : "Sound off";
  };

  soundControl.addEventListener("click", () => setPlaying(!isPlaying));
  window.addEventListener("pointermove", (event) => {
    if (!audioContext || !isPlaying) return;
    const now = audioContext.currentTime;
    const x = event.clientX / window.innerWidth;
    const y = event.clientY / window.innerHeight;
    filter.frequency.setTargetAtTime(240 + (1 - y) * 900, now, .35);
    panner.pan.setTargetAtTime((x - .5) * .9, now, .4);
  }, { passive:true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && audioContext?.state === "running") audioContext.suspend();
    if (!document.hidden && isPlaying) audioContext?.resume();
  });
}
