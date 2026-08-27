const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(process.argv[2] || "_site");
const errors = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function localTarget(reference, htmlFile) {
  if (/^(?:[a-z]+:|\/\/|#)/i.test(reference)) return null;
  const clean = decodeURIComponent(reference.split(/[?#]/)[0]);
  if (!clean) return null;
  return clean.startsWith("/")
    ? path.join(root, clean.slice(1))
    : path.resolve(path.dirname(htmlFile), clean);
}

if (!fs.existsSync(root)) {
  console.error(`Generated site not found: ${root}`);
  process.exit(1);
}

const files = walk(root);
const htmlFiles = files.filter((file) => file.endsWith(".html"));

for (const htmlFile of htmlFiles) {
  const html = fs.readFileSync(htmlFile, "utf8");
  const references = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const reference of references) {
    const target = localTarget(reference, htmlFile);
    if (target && !fs.existsSync(target)) {
      errors.push(`${path.relative(root, htmlFile)}: missing ${reference}`);
    }
  }
}

const mainPages = [
  "index.html", "works.html", "performances.html", "bookings.html", "residencies.html",
  "downloads.html", "about.html", "contact.html", "404.html"
];

for (const page of mainPages) {
  const file = path.join(root, page);
  if (!fs.existsSync(file)) {
    errors.push(`missing main page ${page}`);
    continue;
  }
  const html = fs.readFileSync(file, "utf8");
  if (!html.includes("MUSIC.EDUCATION.SOUND")) errors.push(`${page}: incorrect masthead tagline`);
  if (!html.includes('href="images/favicon.svg"')) errors.push(`${page}: incorrect favicon`);
}

const bookings = fs.readFileSync(path.join(root, "bookings.html"), "utf8");
if ((bookings.match(/<article class="card">/g) || []).length !== 7) errors.push("bookings.html: expected seven service cards");
if ((bookings.match(/booking-link/g) || []).length !== 7) errors.push("bookings.html: expected seven booking links");

const downloads = fs.readFileSync(path.join(root, "downloads.html"), "utf8");
if (!downloads.includes("No releases yet.") && !downloads.includes("download-item")) {
  errors.push("downloads.html: missing honest empty state or documented downloads");
}

const kilele = fs.readFileSync(path.join(root, "kilele-performance.html"), "utf8");
if ((kilele.match(/<figure class="project-gallery__item/g) || []).length !== 7) {
  errors.push("kilele-performance.html: expected seven supplied gallery photographs");
}

const smem = fs.readFileSync(path.join(root, "smem-residency.html"), "utf8");
if ((smem.match(/<figure class="project-gallery__item/g) || []).length !== 10) {
  errors.push("smem-residency.html: expected ten supplied gallery photographs");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Validated ${htmlFiles.length} HTML pages and ${files.length} generated files.`);
