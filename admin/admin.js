// Hosted content studio for kimina.co.ke/admin. Signs in with Supabase Auth (email and
// password) and talks to the `cms` Edge Function, which commits to GitHub. The forms match
// the Mac CMS in cms/public/app.js; the URL and publishable key below are public by design.
const SUPABASE_URL = "https://akswkkcihswupkunstrj.supabase.co";
const SUPABASE_KEY = "sb_publishable_pNIsRMByIlC-hplzg9cqOg_4MNfno5Q";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/cms`;
const SESSION_KEY = "kimina-admin-session";
const MAX_IMAGE_EDGE = 2400;

const state = { session: null, schemas: {}, type: "performances", filename: null, sha: null, uploads: new Map(), deployTimer: null };
const $ = (selector) => document.querySelector(selector);
const collections = $("#collections");
const entries = $("#entries");
const form = $("#entry-form");
const fields = $("#fields");
const galleryItems = $("#gallery-items");
const creditItems = $("#credit-items");
const trackItems = $("#track-items");

// ---------- session ----------

function storeSession(session) {
  state.session = session;
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* private mode: the session lasts until the tab closes */ }
}

function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}

async function auth(path, body) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error_description || payload.msg || payload.message || "Sign-in failed.");
  return { access_token: payload.access_token, refresh_token: payload.refresh_token, expires_at: payload.expires_at, email: payload.user?.email || "" };
}

async function freshToken() {
  const session = state.session;
  if (!session) throw new Error("Please sign in.");
  if (session.expires_at && session.expires_at - 60 > Date.now() / 1000) return session.access_token;
  try {
    storeSession(await auth("token?grant_type=refresh_token", { refresh_token: session.refresh_token }));
    return state.session.access_token;
  } catch {
    showSignIn("Your sign-in has expired. Please sign in again.");
    throw new Error("Please sign in again.");
  }
}

async function api(action, body = {}) {
  const token = await freshToken();
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body })
  });
  const payload = await response.json().catch(() => ({ error: "The server sent an unreadable reply." }));
  if (response.status === 401) showSignIn(payload.error);
  if (!response.ok) throw new Error(payload.error || "The request failed.");
  return payload;
}

function showSignIn(message = "") {
  $("#studio").hidden = true;
  $("#signin").hidden = false;
  $("#signin-status").textContent = message;
  $("#account-status").textContent = "Content studio";
}

// ---------- helpers ----------

function slugify(value) {
  return String(value || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}

function setStatus(message, error = false) {
  const target = $("#save-status");
  target.textContent = message;
  target.style.color = error ? "#b00020" : "";
}

function fileToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Shrinks large JPEG/PNG/WebP photos before upload; GIF and SVG are sent as they are.
async function prepareImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !window.createImageBitmap) return { blob: file, name: file.name };
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { return { blob: file, name: file.name }; }
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1.5 * 1024 * 1024) return { blob: file, name: file.name };
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const png = file.type === "image/png";
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, png ? "image/png" : "image/jpeg", 0.85));
  if (!blob || blob.size >= file.size) return { blob: file, name: file.name };
  return { blob, name: png ? file.name : file.name.replace(/\.[^.]+$/, "") + ".jpg" };
}

async function upload(file, kind) {
  const prepared = kind === "image" ? await prepareImage(file) : { blob: file, name: file.name };
  const megabytes = (prepared.blob.size / 1024 / 1024).toFixed(1);
  setStatus(`Uploading ${prepared.name} (${megabytes} MB)…`);
  const slug = form.elements.slug?.value || form.elements.title?.value || "general";
  const result = await api("upload", { filename: prepared.name, data: await fileToBase64(prepared.blob), kind, slug });
  state.uploads.set(result.path, result.sha);
  setStatus(`${prepared.name} uploaded. It goes live with the next save.`);
  return result.path;
}

function uploadControl(input, kind, accept, onFile) {
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = accept;
  picker.addEventListener("change", async () => {
    const file = picker.files[0];
    if (!file) return;
    picker.disabled = true;
    try {
      onFile?.(file);
      input.value = await upload(file, kind);
    } catch (error) { setStatus(error.message, true); }
    picker.disabled = false;
    picker.value = "";
  });
  return picker;
}

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/svg+xml";
const AUDIO_ACCEPT = ".mp3,.m4a,.aac,.ogg,.oga,.opus,.wav,.flac,audio/*";

// ---------- form ----------

function fieldElement(definition, value) {
  const label = document.createElement("label");
  label.className = "field";
  const title = document.createElement("span");
  title.textContent = definition.label;
  if (definition.required) title.insertAdjacentHTML("beforeend", " <b>*</b>");
  label.append(title);
  let input;

  if (definition.type === "textarea" || definition.type === "lines") {
    input = document.createElement("textarea");
    input.rows = definition.type === "lines" ? 4 : 6;
    input.value = definition.type === "lines" && Array.isArray(value) ? value.join("\n") : value || "";
  } else if (definition.type === "select" || definition.type === "multiselect") {
    input = document.createElement("select");
    input.multiple = definition.type === "multiselect";
    if (input.multiple) input.size = Math.min(definition.options.length, 5);
    for (const optionValue of definition.options || []) {
      const option = new Option(optionValue[0].toUpperCase() + optionValue.slice(1), optionValue);
      option.selected = input.multiple ? (value || []).includes(optionValue) : value === optionValue;
      input.add(option);
    }
  } else if (definition.type === "checkbox") {
    label.classList.add("checkbox");
    label.replaceChildren();
    input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(value);
    label.append(input, title);
  } else if (definition.type === "image") {
    const uploadRow = document.createElement("div");
    uploadRow.className = "upload";
    input = document.createElement("input");
    input.type = "text";
    input.value = value || "";
    uploadRow.append(input, uploadControl(input, "image", IMAGE_ACCEPT));
    label.append(uploadRow);
  } else {
    input = document.createElement("input");
    input.type = definition.type === "url" ? "url" : definition.type === "date" ? "date" : "text";
    input.value = value || "";
  }
  input.name = definition.field;
  input.required = Boolean(definition.required);
  if (!label.contains(input)) label.append(input);
  return label;
}

function addGalleryItem(item = {}) {
  const row = document.createElement("div");
  row.className = "repeater";
  row.innerHTML = `<label class="field wide"><span>Image path</span><div class="upload"><input data-key="src" type="text"></div></label><label class="field wide"><span>Alternative text</span><textarea data-key="alt" rows="3"></textarea></label><label class="field"><span>Caption</span><input data-key="caption" type="text"></label><label class="checkbox"><input data-key="wide" type="checkbox"><span>Wide layout</span></label><div class="repeater-actions wide"><button class="remove" data-move="up" type="button">Move up</button><button class="remove" data-move="down" type="button">Move down</button><button class="remove" data-remove type="button">Remove image</button></div>`;
  const src = row.querySelector('[data-key="src"]');
  src.value = item.src || "";
  src.after(uploadControl(src, "image", IMAGE_ACCEPT));
  row.querySelector('[data-key="alt"]').value = item.alt || "";
  row.querySelector('[data-key="caption"]').value = item.caption || "";
  row.querySelector('[data-key="wide"]').checked = Boolean(item.wide);
  bindRowActions(row);
  galleryItems.append(row);
}

function bindRowActions(row) {
  row.querySelector("[data-remove]").addEventListener("click", () => row.remove());
  row.querySelector('[data-move="up"]')?.addEventListener("click", () => row.previousElementSibling?.before(row));
  row.querySelector('[data-move="down"]')?.addEventListener("click", () => row.nextElementSibling?.after(row));
}

function audioDuration(source) {
  return new Promise((resolve) => {
    const probe = new Audio();
    probe.preload = "metadata";
    probe.addEventListener("loadedmetadata", () => {
      const seconds = Math.round(probe.duration);
      resolve(Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "");
    }, { once: true });
    probe.addEventListener("error", () => resolve(""), { once: true });
    probe.src = source;
  });
}

function addTrackItem(item = {}) {
  const row = document.createElement("div");
  row.className = "repeater";
  row.innerHTML = `<label class="field"><span>Track title</span><input data-key="title" type="text"></label><label class="field"><span>Duration (m:ss, optional)</span><input data-key="duration" type="text" placeholder="3:42"></label><label class="field wide"><span>Audio file or https link</span><div class="upload"><input data-key="src" type="text"></div></label><div class="repeater-actions wide"><button class="remove" data-move="up" type="button">Move up</button><button class="remove" data-move="down" type="button">Move down</button><button class="remove" data-remove type="button">Remove track</button></div>`;
  for (const key of ["title", "duration", "src"]) row.querySelector(`[data-key="${key}"]`).value = item[key] || "";
  const src = row.querySelector('[data-key="src"]');
  src.after(uploadControl(src, "audio", AUDIO_ACCEPT, (file) => {
    const durationInput = row.querySelector('[data-key="duration"]');
    const titleInput = row.querySelector('[data-key="title"]');
    if (!titleInput.value) titleInput.value = file.name.replace(/\.[^.]+$/, "");
    const objectUrl = URL.createObjectURL(file);
    audioDuration(objectUrl).then((duration) => {
      if (duration && !durationInput.value) durationInput.value = duration;
      URL.revokeObjectURL(objectUrl);
    });
  }));
  bindRowActions(row);
  trackItems.append(row);
}

function addCreditItem(item = {}) {
  const row = document.createElement("div");
  row.className = "repeater";
  row.innerHTML = `<label class="field"><span>Label</span><input data-key="label" type="text"></label><label class="field"><span>Value</span><input data-key="value" type="text"></label><div class="repeater-actions wide"><button class="remove" data-remove type="button">Remove credit</button></div>`;
  row.querySelector('[data-key="label"]').value = item.label || "";
  row.querySelector('[data-key="value"]').value = item.value || "";
  bindRowActions(row);
  creditItems.append(row);
}

function repeaterData(container, keys) {
  return [...container.querySelectorAll(".repeater")].map((row) => Object.fromEntries(keys.map((key) => {
    const input = row.querySelector(`[data-key="${key}"]`);
    return [key, input.type === "checkbox" ? input.checked : input.value.trim()];
  }))).filter((item) => Object.values(item).some(Boolean));
}

function renderForm(entry = { filename: null, sha: null, data: {}, body: "" }) {
  state.filename = entry.filename;
  state.sha = entry.sha || null;
  state.uploads.clear();
  fields.replaceChildren();
  galleryItems.replaceChildren();
  creditItems.replaceChildren();
  trackItems.replaceChildren();
  const schema = state.schemas[state.type];
  const slugDefinition = { field: "slug", label: "URL slug", type: "text", required: true };
  fields.append(fieldElement(slugDefinition, entry.filename?.replace(/\.md$/, "") || slugify(entry.data.title)));
  for (const definition of schema.fields) fields.append(fieldElement(definition, entry.data[definition.field]));
  form.elements.body.value = entry.body || "";
  form.elements.gallery_title.value = entry.data.gallery_title || "";
  for (const image of entry.data.gallery || []) addGalleryItem(image);
  for (const credit of entry.data.credits || []) addCreditItem(credit);
  for (const track of entry.data.tracks || []) addTrackItem(track);
  $("#tracks-section").hidden = state.type !== "releases";
  const simple = state.type === "downloads";
  $("#story-section").hidden = simple;
  $("#gallery-section").hidden = simple;
  $("#credits-section").hidden = simple;
  form.elements.body.required = !simple;
  $("#editor-title").textContent = entry.data.title || `New ${schema.label.slice(0, -1)}`;
  $("#welcome").hidden = true;
  form.hidden = false;
  markSelectedEntry();
  setStatus(entry.filename ? "" : "New entry, not saved yet.");

  const titleInput = form.elements.title;
  const displayInput = form.elements.display_title;
  titleInput?.addEventListener("input", () => {
    if (!state.filename) form.elements.slug.value = slugify(titleInput.value);
    if (displayInput && !displayInput.dataset.edited) displayInput.value = titleInput.value;
    $("#editor-title").textContent = titleInput.value || "New entry";
  });
  displayInput?.addEventListener("input", () => { displayInput.dataset.edited = "true"; });
}

function collectForm() {
  const data = {};
  for (const definition of state.schemas[state.type].fields) {
    const input = form.elements[definition.field];
    if (definition.type === "checkbox") data[definition.field] = input.checked;
    else if (definition.type === "lines") data[definition.field] = input.value.split("\n").map((line) => line.trim()).filter(Boolean);
    else if (definition.type === "multiselect") data[definition.field] = [...input.selectedOptions].map((option) => option.value);
    else data[definition.field] = input.value;
  }
  if (state.type !== "downloads") {
    data.gallery_title = form.elements.gallery_title.value.trim();
    data.gallery = repeaterData(galleryItems, ["src", "alt", "caption", "wide"]);
    data.credits = repeaterData(creditItems, ["label", "value"]);
  }
  if (state.type === "releases") data.tracks = repeaterData(trackItems, ["title", "src", "duration"]);
  return {
    type: state.type,
    originalFilename: state.filename,
    sha: state.sha,
    slug: form.elements.slug.value,
    data,
    body: form.elements.body.value,
    uploads: [...state.uploads].map(([path, sha]) => ({ path, sha }))
  };
}

// ---------- lists ----------

async function loadEntries() {
  entries.innerHTML = "<p>Loading…</p>";
  const list = await api("list", { type: state.type });
  entries.replaceChildren();
  if (!list.length) entries.innerHTML = "<p>No entries yet.</p>";
  for (const entry of list) {
    const button = document.createElement("button");
    button.className = "entry-button";
    button.type = "button";
    button.dataset.filename = entry.filename;
    const title = document.createElement("strong");
    title.textContent = entry.title;
    const meta = document.createElement("span");
    meta.textContent = `${entry.date || "No date"} · ${entry.published ? "Published" : "Draft"}`;
    button.append(title, meta);
    button.addEventListener("click", async () => {
      if (state.uploads.size && !confirmLeave()) return;
      try { renderForm(await api("read", { type: state.type, filename: entry.filename })); }
      catch (error) { setStatus(error.message, true); }
    });
    entries.append(button);
  }
  markSelectedEntry();
}

function confirmLeave() {
  return window.confirm("You have uploads that are not saved yet. Leave this entry anyway?");
}

function markSelectedEntry() {
  for (const button of entries.querySelectorAll("button")) button.setAttribute("aria-current", String(button.dataset.filename === state.filename));
}

// Switches the main area between the website collections and the records screens (records.js).
function showArea(area) {
  $("#cms-workspace").hidden = area !== "cms";
  $("#records").hidden = area !== "records";
  if (area === "records") for (const button of collections.querySelectorAll("button")) button.setAttribute("aria-current", "false");
  else for (const button of document.querySelectorAll("#record-nav button")) button.setAttribute("aria-current", "false");
}

async function chooseCollection(type) {
  showArea("cms");
  state.type = type;
  state.filename = null;
  form.hidden = true;
  $("#welcome").hidden = false;
  $("#editor-title").textContent = state.schemas[type].label;
  $("#collection-label").textContent = state.schemas[type].label;
  for (const button of collections.querySelectorAll("button")) button.setAttribute("aria-current", button.dataset.type === type ? "page" : "false");
  try { await loadEntries(); } catch (error) { entries.textContent = error.message; }
}

// ---------- live-site status ----------

function describeDeploy(run) {
  if (!run || run.status === "none") return "No site updates yet.";
  const when = run.started ? new Date(run.started).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
  if (run.status !== "completed") return `Updating now (${when})…`;
  if (run.conclusion === "success") return `Up to date. Last update ${when}.`;
  return `The last update failed (${when}). The site still shows the previous version.`;
}

async function refreshDeploy(watch = false) {
  clearTimeout(state.deployTimer);
  try {
    const run = await api("status");
    $("#deploy-summary").textContent = describeDeploy(run);
    if (watch && run.status !== "completed") state.deployTimer = setTimeout(() => refreshDeploy(true), 15000);
    if (watch && run.status === "completed" && run.conclusion !== "success") setStatus("The site build failed, so the live site was not changed. Check the entry for a missing image or field.", true);
    else if (watch && run.status === "completed") setStatus("Live on kimina.co.ke.");
  } catch (error) {
    $("#deploy-summary").textContent = error.message;
  }
}

// ---------- events ----------

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("#save");
  button.disabled = true;
  setStatus("Saving…");
  try {
    const result = await api("save", collectForm());
    state.filename = result.filename;
    state.sha = result.sha || state.sha;
    state.uploads.clear();
    setStatus(result.message);
    await loadEntries();
    if (result.commit) setTimeout(() => refreshDeploy(true), 8000);
  } catch (error) { setStatus(error.message, true); }
  button.disabled = false;
});

$("#new-entry").addEventListener("click", () => {
  if (state.uploads.size && !confirmLeave()) return;
  renderForm();
});
document.querySelector('[data-add="gallery"]').addEventListener("click", () => addGalleryItem());
document.querySelector('[data-add="credits"]').addEventListener("click", () => addCreditItem());
document.querySelector('[data-add="tracks"]').addEventListener("click", () => addTrackItem());
window.addEventListener("beforeunload", (event) => { if (state.uploads.size) event.preventDefault(); });

$("#sign-out").addEventListener("click", async () => {
  const token = state.session?.access_token;
  storeSession(null);
  showSignIn("Signed out.");
  if (token) fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } }).catch(() => {});
});

$("#signin-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const signin = event.currentTarget;
  const button = signin.querySelector("button");
  button.disabled = true;
  $("#signin-status").textContent = "";
  try {
    storeSession(await auth("token?grant_type=password", { email: signin.elements.email.value.trim(), password: signin.elements.password.value }));
    signin.elements.password.value = "";
    await openStudio();
  } catch (error) {
    $("#signin-status").textContent = error.message === "Invalid login credentials" ? "Wrong email or password." : error.message;
  }
  button.disabled = false;
});

async function openStudio() {
  const initial = await api("state");
  state.schemas = initial.schemas;
  $("#account-status").textContent = initial.email;
  $("#signin").hidden = true;
  $("#studio").hidden = false;
  collections.replaceChildren();
  for (const [type, schema] of Object.entries(state.schemas)) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.type = type;
    button.textContent = schema.label;
    button.addEventListener("click", () => {
      if (state.uploads.size && !confirmLeave()) return;
      chooseCollection(type);
    });
    collections.append(button);
  }
  if (!initial.githubReady) $("#welcome").insertAdjacentHTML("afterbegin", "<p><strong>Saving is not set up yet:</strong> the GitHub token is missing from the Supabase secrets.</p>");
  refreshDeploy();
  window.kiminaRecords?.init();
  await chooseCollection(state.type);
}

// Shared with records.js, which reads and writes the records tables directly; the
// database rules (admins only) are what protect them.
window.kiminaAdmin = {
  SUPABASE_URL,
  SUPABASE_KEY,
  freshToken,
  showArea,
  hasUnsavedUploads: () => state.uploads.size > 0 && !confirmLeave(),
  showSignIn
};

state.session = loadSession();
if (state.session) openStudio().catch((error) => showSignIn(error.message === "Please sign in again." ? "" : error.message));
else showSignIn();
