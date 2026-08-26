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

  const renderers = { lissajous, dots, orbits, threads, grid, pulse, signal };
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
