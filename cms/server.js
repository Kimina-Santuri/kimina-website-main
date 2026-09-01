const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync, spawn } = require("node:child_process");
const YAML = require("yaml");
const schemas = require("./schema");

const root = path.resolve(__dirname, "..");
const publicDirectory = path.join(__dirname, "public");
const host = "127.0.0.1";
const port = Number(process.env.CMS_PORT || 3000);
const previewPort = Number(process.env.CMS_PREVIEW_PORT || 8080);
const publishBranch = process.env.CMS_PUBLISH_BRANCH || "main";
const csrfToken = crypto.randomBytes(24).toString("hex");
const maximumBodySize = 35 * 1024 * 1024;

function send(response, status, payload, headers = {}) {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": typeof payload === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    ...headers
  });
  response.end(body);
}

function safeFilename(value, extension = "") {
  const base = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  if (!base) throw new Error("A valid filename or slug is required.");
  return `${base}${extension}`;
}

function assertEntryFilename(value) {
  const filename = path.basename(String(value || ""));
  if (!/^[a-z0-9][a-z0-9-]*\.md$/.test(filename)) throw new Error("Invalid content filename.");
  return filename;
}

function entryPath(type, filename) {
  const schema = schemas[type];
  if (!schema) throw new Error("Unknown content type.");
  return path.join(root, schema.directory, assertEntryFilename(filename));
}

function normalize(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  return value;
}

function readEntry(type, filename) {
  const file = entryPath(type, filename);
  const source = fs.readFileSync(file, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`Invalid front matter in ${filename}.`);
  return { filename, data: normalize(YAML.parse(match[1]) || {}), body: match[2].trim() };
}

function listEntries(type) {
  const schema = schemas[type];
  if (!schema) throw new Error("Unknown content type.");
  const excluded = new Set(schema.exclude || []);
  return fs.readdirSync(path.join(root, schema.directory))
    .filter((name) => name.endsWith(".md") && !excluded.has(name))
    .map((name) => readEntry(type, name))
    .sort((a, b) => String(b.data.date || "").localeCompare(String(a.data.date || "")))
    .map(({ filename, data }) => ({ filename, title: data.title || filename, date: data.date || "", published: Boolean(data.published) }));
}

function publicSchema() {
  return Object.fromEntries(Object.entries(schemas).map(([name, schema]) => [name, {
    label: schema.label,
    fields: schema.fields.map(([field, label, type, required, options]) => ({ field, label, type, required, options }))
  }]));
}

function readRequest(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maximumBodySize) {
        reject(new Error("Upload is larger than 35 MB."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch { reject(new Error("Invalid request data.")); }
    });
    request.on("error", reject);
  });
}

function requireLocalMutation(request) {
  if (request.headers["x-cms-token"] !== csrfToken) throw new Error("Invalid local CMS session.");
}

function cleanField(type, field, value) {
  const definition = schemas[type].fields.find(([name]) => name === field);
  if (!definition) return undefined;
  const [, , kind] = definition;
  if (kind === "checkbox") return Boolean(value);
  if (kind === "lines" || kind === "multiselect") return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
  const cleaned = typeof value === "string" ? value.trim() : "";
  if (kind === "url" && cleaned) {
    let parsed;
    try { parsed = new URL(cleaned); }
    catch { throw new Error(`${field.replaceAll("_", " ")} must be a valid web address.`); }
    if (!new Set(["http:", "https:"]).has(parsed.protocol)) {
      throw new Error(`${field.replaceAll("_", " ")} must use http or https.`);
    }
  }
  return cleaned;
}

function saveEntry(type, payload) {
  const schema = schemas[type];
  if (!schema) throw new Error("Unknown content type.");
  const originalFilename = payload.originalFilename ? assertEntryFilename(payload.originalFilename) : null;
  const slug = safeFilename(payload.slug || payload.data?.title);
  const filename = `${slug}.md`;
  const destination = entryPath(type, filename);
  const original = originalFilename && fs.existsSync(entryPath(type, originalFilename)) ? readEntry(type, originalFilename) : null;
  const submitted = payload.data || {};
  const data = { ...(original?.data || {}), ...schema.defaults, tags: schema.tags };

  for (const [field, , , required] of schema.fields) {
    const value = cleanField(type, field, submitted[field]);
    if (value !== undefined) data[field] = value;
    if (required && (data[field] === "" || data[field] == null || (Array.isArray(data[field]) && !data[field].length))) {
      throw new Error(`${field.replaceAll("_", " ")} is required.`);
    }
  }

  for (const field of ["gallery_title", "gallery", "credits"]) {
    if (submitted[field] !== undefined) data[field] = submitted[field];
  }
  if (type === "residencies") {
    data.work_title = submitted.work_title || data.work_title || data.title;
    data.work_summary = submitted.work_summary || data.work_summary || data.summary;
  }

  const yaml = YAML.stringify(data, { lineWidth: 0 }).trimEnd();
  const body = String(payload.body || "").trim();
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `---\n${yaml}\n---\n${body}${body ? "\n" : ""}`, "utf8");

  if (originalFilename && originalFilename !== filename) {
    const previous = entryPath(type, originalFilename);
    if (fs.existsSync(previous)) fs.unlinkSync(previous);
  }
  return { filename };
}

function uploadFile(payload) {
  const kind = payload.kind === "download" ? "download" : "image";
  const match = String(payload.data || "").match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Invalid upload.");
  const originalExtension = path.extname(path.basename(String(payload.filename || ""))).toLowerCase();
  const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);
  const downloadExtensions = new Set([".pdf", ".zip", ".wav", ".mp3", ".aiff", ".aif", ".flac", ".txt"]);
  const allowed = kind === "image" ? imageExtensions : downloadExtensions;
  if (!allowed.has(originalExtension)) throw new Error(`Unsupported ${kind} file type.`);
  const slug = safeFilename(payload.slug || "general");
  const name = safeFilename(path.basename(payload.filename, originalExtension), originalExtension);
  const relativeDirectory = kind === "image" ? path.join("images", "uploads", slug) : path.join("downloads", slug);
  const directory = path.join(root, relativeDirectory);
  fs.mkdirSync(directory, { recursive: true });
  let destination = path.join(directory, name);
  if (fs.existsSync(destination)) {
    destination = path.join(directory, `${path.basename(name, originalExtension)}-${Date.now()}${originalExtension}`);
  }
  fs.writeFileSync(destination, Buffer.from(match[2], "base64"));
  return { path: path.relative(root, destination).split(path.sep).join("/") };
}

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    timeout: options.timeout || 30000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }
  }).trim();
}

function gitState(checkRemote = false) {
  const state = {
    branch: git(["branch", "--show-current"]),
    publishBranch,
    remote: git(["remote", "get-url", "origin"]),
    changes: git(["status", "--short"]).split("\n").filter(Boolean)
  };
  if (checkRemote) {
    try {
      git(["ls-remote", "--exit-code", "origin", `refs/heads/${publishBranch}`], { timeout: 15000 });
      state.connection = "ok";
    } catch (error) {
      state.connection = "failed";
      state.connectionError = String(error.stderr || error.message).trim();
    }
  }
  return state;
}

function publish(message) {
  const state = gitState(false);
  if (state.branch !== publishBranch) {
    throw new Error(`Publishing is locked to ${publishBranch}. You are currently on ${state.branch}.`);
  }
  const disallowed = state.changes.filter((line) => {
    const filename = line.slice(3).replace(/^"|"$/g, "");
    return !filename.startsWith("site/content/") && !filename.startsWith("images/uploads/") && !filename.startsWith("downloads/");
  });
  if (disallowed.length) throw new Error(`Commit or restore non-content changes first:\n${disallowed.join("\n")}`);

  git(["fetch", "origin", publishBranch], { timeout: 60000 });
  const [ahead, behind] = git(["rev-list", "--left-right", "--count", `HEAD...origin/${publishBranch}`]).split(/\s+/).map(Number);
  if (behind > 0) throw new Error(`GitHub is ${behind} commit(s) ahead. Pull the latest changes before publishing.`);

  execFileSync("npm", ["run", "build"], { cwd: root, stdio: "pipe", timeout: 120000 });
  execFileSync("npm", ["run", "check"], { cwd: root, stdio: "pipe", timeout: 120000 });
  const publishPaths = ["site/content", "images/uploads", "downloads"].filter((item) => fs.existsSync(path.join(root, item)));
  git(["add", "--", ...publishPaths]);
  const staged = git(["diff", "--cached", "--name-only"]);
  if (staged) {
    const label = String(message || "Portfolio content update").replace(/[\r\n]+/g, " ").trim().slice(0, 100);
    git(["commit", "-m", label || "Portfolio content update"]);
  }
  const aheadAfterCommit = Number(git(["rev-list", "--count", `origin/${publishBranch}..HEAD`]) || 0);
  if (!aheadAfterCommit) return { message: "Everything is already published." };
  git(["push", "origin", publishBranch], { timeout: 120000 });
  return { message: `Published ${aheadAfterCommit} commit(s) to ${publishBranch}.` };
}

function serveStatic(urlPath, response) {
  const requested = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
  const resolved = path.resolve(publicDirectory, requested);
  if (!resolved.startsWith(`${publicDirectory}${path.sep}`) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    send(response, 404, "Not found");
    return;
  }
  const extension = path.extname(resolved);
  const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" }[extension] || "application/octet-stream";
  response.writeHead(200, { "Content-Type": mime, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  fs.createReadStream(resolved).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${host}:${port}`);
  try {
    if (request.method === "GET" && url.pathname === "/api/state") {
      send(response, 200, { token: csrfToken, schemas: publicSchema(), previewUrl: `http://${host}:${previewPort}`, git: gitState(false) });
    } else if (request.method === "GET" && url.pathname === "/api/entries") {
      send(response, 200, listEntries(url.searchParams.get("type")));
    } else if (request.method === "GET" && url.pathname === "/api/entry") {
      send(response, 200, readEntry(url.searchParams.get("type"), url.searchParams.get("filename")));
    } else if (request.method === "GET" && url.pathname === "/api/git-check") {
      send(response, 200, gitState(true));
    } else if (request.method === "POST" && url.pathname === "/api/entry") {
      requireLocalMutation(request);
      const payload = await readRequest(request);
      send(response, 200, saveEntry(payload.type, payload));
    } else if (request.method === "POST" && url.pathname === "/api/upload") {
      requireLocalMutation(request);
      send(response, 200, uploadFile(await readRequest(request)));
    } else if (request.method === "POST" && url.pathname === "/api/publish") {
      requireLocalMutation(request);
      const payload = await readRequest(request);
      send(response, 200, publish(payload.message));
    } else if (request.method === "GET") {
      serveStatic(url.pathname, response);
    } else {
      send(response, 405, { error: "Method not allowed." });
    }
  } catch (error) {
    send(response, 400, { error: error.message || String(error) });
  }
});

const eleventyBinary = path.join(root, "node_modules", ".bin", "eleventy");
const preview = spawn(eleventyBinary, ["--serve", `--port=${previewPort}`], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
preview.stdout.on("data", (data) => process.stdout.write(`[preview] ${data}`));
preview.stderr.on("data", (data) => process.stderr.write(`[preview] ${data}`));
preview.on("exit", (code) => { if (code && server.listening) console.error(`Preview server stopped with code ${code}.`); });

server.listen(port, host, () => {
  console.log(`Kimina CMS: http://${host}:${port}`);
  console.log(`Site preview: http://${host}:${previewPort}`);
  console.log(`Publishing branch: ${publishBranch}`);
});

function shutdown() {
  preview.kill("SIGTERM");
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
