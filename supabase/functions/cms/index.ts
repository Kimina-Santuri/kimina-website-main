// Hosted CMS for kimina.co.ke/admin.
// Only signed-in admins (public.is_admin()) get past the first check. The function then reads
// and writes the Markdown collections in GitHub with GITHUB_TOKEN (an Edge Function secret);
// every save is one commit on main, and the existing GitHub Actions deploy publishes it.
// The rules mirror cms/server.js; the forms come from cms/schema.js (copied to schema.json).
import YAML from "npm:yaml@2.9.0";
import schemas from "./schema.json" with { type: "json" };

type Field = [string, string, string, boolean, string[]?];
type Schema = {
  label: string;
  directory: string;
  exclude?: string[];
  tags: string[];
  defaults: Record<string, unknown>;
  fields: Field[];
};
const SCHEMAS = schemas as Record<string, Schema>;

const OWNER = "Kimina-Santuri";
const REPO = "kimina-website-main";
const BRANCH = "main";
const DEPLOY_WORKFLOW = "deploy.yml";
const ALLOWED_ORIGINS = new Set([
  "https://kimina.co.ke",
  "https://www.kimina.co.ke",
  "http://127.0.0.1:8080",
  "http://localhost:8080",
]);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") || "";

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://kimina.co.ke",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// ---------- sign-in check ----------

async function requireAdmin(request: Request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Please sign in.");
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` };
  const user = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers });
  if (!user.ok) throw new HttpError(401, "Your sign-in has expired. Please sign in again.");
  const admin = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!admin.ok || (await admin.json()) !== true) throw new HttpError(403, "This account is not an admin.");
  const { email } = await user.json();
  return { email: String(email || "") };
}

// ---------- GitHub ----------

async function github(path: string, init: RequestInit = {}, accept = "application/vnd.github+json") {
  if (!GITHUB_TOKEN) throw new HttpError(500, "GITHUB_TOKEN is not set in the Supabase Edge Function secrets.");
  const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/${path}`, {
    ...init,
    headers: {
      Accept: accept,
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "kimina-cms",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  return response;
}

async function githubJson(path: string, init: RequestInit = {}) {
  const response = await github(path, init);
  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 401) throw new HttpError(502, "GitHub refused the token (expired or wrong). Make a new one and update GITHUB_TOKEN.");
    throw new HttpError(response.status === 404 ? 404 : 502, `GitHub ${response.status}: ${detail.slice(0, 300)}`);
  }
  return response.json();
}

function decodeBase64(text: string) {
  const binary = atob(text.replace(/\n/g, ""));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

async function getFile(path: string): Promise<{ text: string; sha: string } | null> {
  const response = await github(`contents/${encodePath(path)}?ref=${BRANCH}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new HttpError(502, `GitHub ${response.status} reading ${path}`);
  const file = await response.json();
  if (Array.isArray(file) || file.type !== "file") throw new HttpError(400, `${path} is not a file.`);
  // Files over 1 MB come without inline content; fetch them as a blob instead.
  const content = file.content ? file.content : (await githubJson(`git/blobs/${file.sha}`)).content;
  return { text: decodeBase64(content), sha: file.sha };
}

async function pathExists(path: string) {
  const response = await github(`contents/${encodePath(path)}?ref=${BRANCH}`);
  if (response.status === 404) return false;
  if (!response.ok) throw new HttpError(502, `GitHub ${response.status} checking ${path}`);
  return true;
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

// ---------- content rules (same as cms/server.js) ----------

function schemaFor(type: unknown) {
  const schema = SCHEMAS[String(type)];
  if (!schema) throw new HttpError(400, "Unknown content type.");
  return schema;
}

function safeFilename(value: unknown, extension = "") {
  const base = String(value || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  if (!base) throw new HttpError(400, "A valid filename or slug is required.");
  return `${base}${extension}`;
}

function assertEntryFilename(value: unknown) {
  const filename = String(value || "").split("/").pop() || "";
  if (!/^[a-z0-9][a-z0-9-]*\.md$/.test(filename)) throw new HttpError(400, "Invalid content filename.");
  return filename;
}

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  }
  return value;
}

function parseEntry(filename: string, source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new HttpError(400, `Invalid front matter in ${filename}.`);
  return { filename, data: normalize(YAML.parse(match[1]) || {}) as Record<string, unknown>, body: match[2].trim() };
}

async function readEntry(type: string, filename: string) {
  const schema = schemaFor(type);
  const name = assertEntryFilename(filename);
  const file = await getFile(`${schema.directory}/${name}`);
  if (!file) throw new HttpError(404, `${name} was not found.`);
  return { ...parseEntry(name, file.text), sha: file.sha };
}

async function listEntries(type: string) {
  const schema = schemaFor(type);
  const response = await github(`contents/${encodePath(schema.directory)}?ref=${BRANCH}`);
  if (response.status === 404) return [];
  if (!response.ok) throw new HttpError(502, `GitHub ${response.status} listing ${schema.directory}`);
  const excluded = new Set(schema.exclude || []);
  const files = (await response.json() as { name: string; type: string }[])
    .filter((item) => item.type === "file" && item.name.endsWith(".md") && !excluded.has(item.name));
  const entries = await Promise.all(files.map((item) => readEntry(type, item.name)));
  return entries
    .sort((a, b) => String(b.data.date || "").localeCompare(String(a.data.date || "")))
    .map(({ filename, data }) => ({
      filename,
      title: data.title || filename,
      date: data.date || "",
      published: Boolean(data.published),
    }));
}

function cleanField(schema: Schema, field: string, value: unknown) {
  const definition = schema.fields.find(([name]) => name === field);
  if (!definition) return undefined;
  const kind = definition[2];
  if (kind === "checkbox") return Boolean(value);
  if (kind === "lines" || kind === "multiselect") return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
  const cleaned = typeof value === "string" ? value.trim() : "";
  if (kind === "url" && cleaned) {
    let parsed: URL;
    try {
      parsed = new URL(cleaned);
    } catch {
      throw new HttpError(400, `${field.replaceAll("_", " ")} must be a valid web address.`);
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new HttpError(400, `${field.replaceAll("_", " ")} must use http or https.`);
    }
  }
  return cleaned;
}

const AUDIO_PATH = /^downloads\/[a-z0-9-]+\/[a-z0-9-]+\.(?:mp3|m4a|aac|ogg|oga|opus|wav|flac)$/;

async function cleanTracks(value: unknown, pending: Set<string>) {
  if (!Array.isArray(value)) return [];
  const tracks = [];
  for (const [index, track] of value.entries()) {
    const title = String(track?.title || "").trim();
    const src = String(track?.src || "").trim();
    const duration = String(track?.duration || "").trim();
    if (!title || !src) throw new HttpError(400, `Track ${index + 1} needs a title and an audio file or link.`);
    if (/^[a-z]+:/i.test(src)) {
      let parsed: URL;
      try {
        parsed = new URL(src);
      } catch {
        throw new HttpError(400, `Track ${index + 1} audio link is not a valid web address.`);
      }
      if (parsed.protocol !== "https:") throw new HttpError(400, `Track ${index + 1} audio link must use https.`);
    } else if (!AUDIO_PATH.test(src)) {
      throw new HttpError(400, `Track ${index + 1} audio must be an uploaded file or an https link.`);
    } else if (!pending.has(src) && !(await pathExists(src))) {
      throw new HttpError(400, `Track ${index + 1} audio file was not found: ${src}`);
    }
    if (duration && !/^\d{1,3}:[0-5]\d$/.test(duration)) {
      throw new HttpError(400, `Track ${index + 1} duration should look like 3:42.`);
    }
    tracks.push(duration ? { title, src, duration } : { title, src });
  }
  return tracks;
}

// ---------- uploads: stored as GitHub blobs, committed with the next save ----------

const UPLOAD_RULES = {
  image: { extensions: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"], maxBytes: 10 * 1024 * 1024 },
  audio: { extensions: [".mp3", ".m4a", ".aac", ".ogg", ".oga", ".opus", ".wav", ".flac"], maxBytes: 25 * 1024 * 1024 },
};
const UPLOAD_PATH = /^(?:images\/uploads|downloads)\/[a-z0-9-]+\/[a-z0-9-]+\.[a-z0-9]+$/;

async function uploadFile(payload: Record<string, unknown>) {
  const kind = payload.kind === "audio" ? "audio" : "image";
  const rules = UPLOAD_RULES[kind];
  const original = String(payload.filename || "").split("/").pop() || "";
  const extension = (original.match(/\.[^.]+$/)?.[0] || "").toLowerCase();
  if (!rules.extensions.includes(extension)) throw new HttpError(400, `Unsupported ${kind} file type.`);
  const data = String(payload.data || "");
  if (!/^[A-Za-z0-9+/=]+$/.test(data)) throw new HttpError(400, "Invalid upload.");
  if (data.length * 0.75 > rules.maxBytes) {
    throw new HttpError(400, `That file is too large (limit ${rules.maxBytes / 1024 / 1024} MB).`);
  }
  const slug = safeFilename(payload.slug || "general");
  const name = safeFilename(original.slice(0, -extension.length), extension);
  const directory = kind === "image" ? `images/uploads/${slug}` : `downloads/${slug}`;
  let path = `${directory}/${name}`;
  if (await pathExists(path)) path = `${directory}/${name.slice(0, -extension.length)}-${Date.now()}${extension}`;
  const blob = await githubJson("git/blobs", { method: "POST", body: JSON.stringify({ content: data, encoding: "base64" }) });
  return { path, sha: blob.sha };
}

// ---------- save: one commit with the entry and its new uploads ----------

async function saveEntry(payload: Record<string, unknown>, email: string) {
  const type = String(payload.type);
  const schema = schemaFor(type);
  const originalFilename = payload.originalFilename ? assertEntryFilename(payload.originalFilename) : null;
  const filename = `${safeFilename(payload.slug || (payload.data as Record<string, unknown>)?.title)}.md`;
  const destination = `${schema.directory}/${filename}`;

  const uploads = (Array.isArray(payload.uploads) ? payload.uploads : []).map((item) => {
    const path = String(item?.path || "");
    const sha = String(item?.sha || "");
    if (!UPLOAD_PATH.test(path) || !/^[0-9a-f]{40}$/.test(sha)) throw new HttpError(400, "Invalid upload reference.");
    return { path, sha };
  });

  let original: Awaited<ReturnType<typeof readEntry>> | null = null;
  if (originalFilename) {
    try {
      original = await readEntry(type, originalFilename);
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 404)) throw error;
    }
    if (original && payload.sha && original.sha !== payload.sha) {
      throw new HttpError(409, "This entry was changed somewhere else since you opened it. Copy your text, reload the entry and try again.");
    }
  }
  if (filename !== originalFilename && (await pathExists(destination))) {
    throw new HttpError(409, `An entry called ${filename} already exists. Choose another URL slug.`);
  }

  const submitted = (payload.data || {}) as Record<string, unknown>;
  const data: Record<string, unknown> = { ...(original?.data || {}), ...schema.defaults, tags: schema.tags };
  for (const [field, , , required] of schema.fields) {
    const value = cleanField(schema, field, submitted[field]);
    if (value !== undefined) data[field] = value;
    const current = data[field];
    if (required && (current === "" || current == null || (Array.isArray(current) && !current.length))) {
      throw new HttpError(400, `${field.replaceAll("_", " ")} is required.`);
    }
  }
  for (const field of ["gallery_title", "gallery", "credits"]) {
    if (submitted[field] !== undefined) data[field] = submitted[field];
  }
  const pendingPaths = new Set(uploads.map((item) => item.path));
  if (type === "releases" && submitted.tracks !== undefined) data.tracks = await cleanTracks(submitted.tracks, pendingPaths);
  if (type === "residencies") {
    data.work_title = submitted.work_title || data.work_title || data.title;
    data.work_summary = submitted.work_summary || data.work_summary || data.summary;
  }

  const yaml = YAML.stringify(data, { lineWidth: 0 }).trimEnd();
  const body = String(payload.body || "").trim();
  const content = `---\n${yaml}\n---\n${body}${body ? "\n" : ""}`;

  // Only commit uploads the entry still points at (a replaced photo is left out).
  const used = uploads.filter((item) => content.includes(item.path));
  const tree: Record<string, unknown>[] = [
    { path: destination, mode: "100644", type: "blob", content },
    ...used.map((item) => ({ path: item.path, mode: "100644", type: "blob", sha: item.sha })),
  ];
  if (originalFilename && originalFilename !== filename && original) {
    tree.push({ path: `${schema.directory}/${originalFilename}`, mode: "100644", type: "blob", sha: null });
  }
  const title = String(data.title || filename).replace(/[\r\n]+/g, " ").slice(0, 80);
  const message = `${original ? "Update" : "Add"} ${schema.label.toLowerCase().replace(/s$/, "")}: ${title}\n\nSaved from kimina.co.ke/admin by ${email}.`;

  // Commit on top of the latest main; if something else pushed in between, try once more.
  for (let attempt = 0; attempt < 2; attempt++) {
    const head = await githubJson(`git/ref/heads/${BRANCH}`);
    const parent = await githubJson(`git/commits/${head.object.sha}`);
    const newTree = await githubJson("git/trees", { method: "POST", body: JSON.stringify({ base_tree: parent.tree.sha, tree }) });
    if (newTree.sha === parent.tree.sha) return { filename, message: "No changes to save.", commit: null };
    const commit = await githubJson("git/commits", {
      method: "POST",
      body: JSON.stringify({ message, tree: newTree.sha, parents: [head.object.sha] }),
    });
    const update = await github(`git/refs/heads/${BRANCH}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
    if (update.ok) {
      const saved = await readEntryAt(type, filename, commit.sha);
      return { filename, sha: saved, commit: commit.sha, message: "Saved. The live site updates in about two minutes." };
    }
    if (update.status !== 422 || attempt === 1) throw new HttpError(502, `GitHub ${update.status} saving: ${(await update.text()).slice(0, 200)}`);
  }
  throw new HttpError(502, "Could not save.");
}

async function readEntryAt(type: string, filename: string, ref: string) {
  const schema = schemaFor(type);
  const response = await github(`contents/${encodePath(`${schema.directory}/${filename}`)}?ref=${ref}`);
  return response.ok ? (await response.json()).sha : null;
}

// ---------- live-site status ----------

async function deployStatus() {
  const runs = await githubJson(`actions/workflows/${DEPLOY_WORKFLOW}/runs?branch=${BRANCH}&per_page=1`);
  const run = runs.workflow_runs?.[0];
  if (!run) return { status: "none" };
  return {
    status: run.status,
    conclusion: run.conclusion,
    commit: run.head_sha,
    title: run.display_title,
    started: run.run_started_at || run.created_at,
    url: run.html_url,
  };
}

function publicSchema() {
  return Object.fromEntries(Object.entries(SCHEMAS).map(([name, schema]) => [name, {
    label: schema.label,
    fields: schema.fields.map(([field, label, type, required, options]) => ({ field, label, type, required, options })),
  }]));
}

// ---------- entry point ----------

Deno.serve(async (request) => {
  const cors = corsHeaders(request.headers.get("origin"));
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  const reply = (status: number, payload: unknown) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });

  try {
    if (request.method !== "POST") throw new HttpError(405, "Method not allowed.");
    const { email } = await requireAdmin(request);
    const payload = await request.json().catch(() => {
      throw new HttpError(400, "Invalid request data.");
    });
    switch (payload.action) {
      case "state":
        return reply(200, { email, schemas: publicSchema(), githubReady: Boolean(GITHUB_TOKEN) });
      case "list":
        return reply(200, await listEntries(payload.type));
      case "read":
        return reply(200, await readEntry(payload.type, payload.filename));
      case "upload":
        return reply(200, await uploadFile(payload));
      case "save":
        return reply(200, await saveEntry(payload, email));
      case "status":
        return reply(200, await deployStatus());
      default:
        throw new HttpError(400, "Unknown action.");
    }
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status === 500) console.error(error);
    return reply(status, { error: error instanceof Error ? error.message : String(error) });
  }
});
