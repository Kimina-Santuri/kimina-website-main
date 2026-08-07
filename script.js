const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let w, h;
let phase = 0;

let targetX = window.innerWidth / 2;
let targetY = window.innerHeight / 2;

let mouseX = targetX;
let mouseY = targetY;

window.addEventListener("mousemove", (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
});

window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
}

window.addEventListener("resize", resize);
resize();

function drawLissajous(offset) {

    const cx = w / 2;
    const cy = h / 2;

    // Fill almost the whole screen
    const rx = w * 0.48;
    const ry = h * 0.48;

    // Frequency ratio
    const a = 3 + Math.sin(mouseX * 0.003) * 0.4;
    const b = 4 + Math.cos(mouseY * 0.003) * 0.4;

    ctx.beginPath();

    for (let t = 0; t <= Math.PI * 2 + 0.02; t += 0.0015) {

        const x =
            cx +
            Math.sin(a * t + phase + offset) * rx;

        const y =
            cy +
            Math.sin(b * t) * ry;

        if (t === 0)
            ctx.moveTo(x, y);
        else
            ctx.lineTo(x, y);
    }

    ctx.stroke();
}

function animate() {

    mouseX += (targetX - mouseX) * 0.05;
    mouseY += (targetY - mouseY) * 0.05;

    ctx.clearRect(0, 0, w, h);

    ctx.lineWidth = 0.9;
    ctx.strokeStyle = "rgba(0,0,0,0.08)";

    // Draw lots of faint curves
    for (let i = 0; i < 35; i++) {

        drawLissajous(i * 0.02);

    }

    phase += 0.001;

    requestAnimationFrame(animate);
}

animate();