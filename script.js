document.querySelectorAll(".booking-link").forEach((bookingLink) => {
  bookingLink.addEventListener("click", (event) => {
    if (!window.Calendly) return;
    event.preventDefault();
    window.Calendly.initPopupWidget({ url: bookingLink.href });
  });
});

const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

const canvas = document.querySelector("#topography");
const context = canvas?.getContext("2d");
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
  const pointer = { x:.5, y:.5, targetX:.5, targetY:.5 };
  const resize = () => {
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * scale;
    canvas.height = height * scale;
    context.setTransform(scale, 0, 0, scale, 0, 0);
  };
  const draw = () => {
    pointer.x += (pointer.targetX - pointer.x) * .055;
    pointer.y += (pointer.targetY - pointer.y) * .055;
    context.clearRect(0, 0, width, height);
    for (let wave = 0; wave < 11; wave += 1) {
      const baseY = height * (wave + 1) / 12;
      context.beginPath();
      for (let x = 0; x <= width; x += 6) {
        const distance = Math.abs(x - pointer.x * width);
        const response = Math.max(0, 1 - distance / 380);
        const amplitude = 10 + wave * 2.2 + response * (28 + pointer.y * 34);
        const y = baseY + Math.sin(x * .012 + time + wave * .7) * amplitude + Math.sin(x * .004 - time * .55) * 9;
        if (!x) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.strokeStyle = `rgba(5,5,5,${.055 + wave * .009})`;
      context.lineWidth = .7;
      context.stroke();
    }
    if (!reduceMotion) { time += .014; frameId = requestAnimationFrame(draw); }
  };
  window.addEventListener("pointermove", (event) => {
    pointer.targetX = event.clientX / width;
    pointer.targetY = event.clientY / height;
  }, { passive:true });
  window.addEventListener("resize", () => { resize(); if (reduceMotion) draw(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && frameId) cancelAnimationFrame(frameId);
    if (!document.hidden && !reduceMotion) draw();
  });
  resize();
  draw();
}
