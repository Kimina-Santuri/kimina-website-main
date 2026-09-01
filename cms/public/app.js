const state = { token: "", schemas: {}, type: "performances", filename: null, entry: null };
const $ = (selector) => document.querySelector(selector);
const collections = $("#collections");
const entries = $("#entries");
const form = $("#entry-form");
const fields = $("#fields");
const galleryItems = $("#gallery-items");
const creditItems = $("#credit-items");

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", "X-CMS-Token": state.token, ...(options.headers || {}) }
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "The local CMS request failed.");
  return payload;
}

function slugify(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}

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
  } else if (definition.type === "image" || definition.type === "file") {
    const uploadRow = document.createElement("div");
    uploadRow.className = "upload";
    input = document.createElement("input");
    input.type = "text";
    input.value = value || "";
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = definition.type === "image" ? "image/jpeg,image/png,image/webp,image/gif,image/svg+xml" : ".pdf,.zip,.wav,.mp3,.aiff,.aif,.flac,.txt";
    picker.addEventListener("change", async () => {
      if (!picker.files[0]) return;
      try {
        input.value = await upload(picker.files[0], definition.type === "file" ? "download" : "image");
      } catch (error) { setStatus(error.message, true); }
    });
    uploadRow.append(input, picker);
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

async function upload(file, kind) {
  setStatus(`Uploading ${file.name}…`);
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const slug = form.elements.slug?.value || form.elements.title?.value || "general";
  const result = await api("/api/upload", { method: "POST", body: JSON.stringify({ filename: file.name, data, kind, slug }) });
  setStatus(`${file.name} uploaded locally.`);
  return result.path;
}

function addGalleryItem(item = {}) {
  const row = document.createElement("div");
  row.className = "repeater";
  row.innerHTML = `<label class="field wide"><span>Image path</span><div class="upload"><input data-key="src" type="text"><input data-upload="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"></div></label><label class="field wide"><span>Alternative text</span><textarea data-key="alt" rows="3"></textarea></label><label class="field"><span>Caption</span><input data-key="caption" type="text"></label><label class="checkbox"><input data-key="wide" type="checkbox"><span>Wide layout</span></label><button class="remove wide" type="button">Remove image</button>`;
  row.querySelector('[data-key="src"]').value = item.src || "";
  row.querySelector('[data-key="alt"]').value = item.alt || "";
  row.querySelector('[data-key="caption"]').value = item.caption || "";
  row.querySelector('[data-key="wide"]').checked = Boolean(item.wide);
  row.querySelector(".remove").addEventListener("click", () => row.remove());
  row.querySelector('[data-upload="image"]').addEventListener("change", async (event) => {
    if (!event.target.files[0]) return;
    try { row.querySelector('[data-key="src"]').value = await upload(event.target.files[0], "image"); }
    catch (error) { setStatus(error.message, true); }
  });
  galleryItems.append(row);
}

function addCreditItem(item = {}) {
  const row = document.createElement("div");
  row.className = "repeater";
  row.innerHTML = `<label class="field"><span>Label</span><input data-key="label" type="text"></label><label class="field"><span>Value</span><input data-key="value" type="text"></label><button class="remove wide" type="button">Remove credit</button>`;
  row.querySelector('[data-key="label"]').value = item.label || "";
  row.querySelector('[data-key="value"]').value = item.value || "";
  row.querySelector(".remove").addEventListener("click", () => row.remove());
  creditItems.append(row);
}

function repeaterData(container, keys) {
  return [...container.querySelectorAll(".repeater")].map((row) => Object.fromEntries(keys.map((key) => {
    const input = row.querySelector(`[data-key="${key}"]`);
    return [key, input.type === "checkbox" ? input.checked : input.value.trim()];
  }))).filter((item) => Object.values(item).some(Boolean));
}

function renderForm(entry = { filename: null, data: {}, body: "" }) {
  state.filename = entry.filename;
  state.entry = entry;
  fields.replaceChildren();
  galleryItems.replaceChildren();
  creditItems.replaceChildren();
  const schema = state.schemas[state.type];
  const slugDefinition = { field: "slug", label: "URL slug", type: "text", required: true };
  fields.append(fieldElement(slugDefinition, entry.filename?.replace(/\.md$/, "") || slugify(entry.data.title)));
  for (const definition of schema.fields) fields.append(fieldElement(definition, entry.data[definition.field]));
  form.elements.body.value = entry.body || "";
  form.elements.gallery_title.value = entry.data.gallery_title || "";
  for (const image of entry.data.gallery || []) addGalleryItem(image);
  for (const credit of entry.data.credits || []) addCreditItem(credit);
  const simple = state.type === "downloads";
  $("#story-section").hidden = simple;
  $("#gallery-section").hidden = simple;
  $("#credits-section").hidden = simple;
  form.elements.body.required = !simple;
  $("#editor-title").textContent = entry.data.title || `New ${schema.label.slice(0, -1)}`;
  $("#welcome").hidden = true;
  form.hidden = false;
  markSelectedEntry();
  setStatus(entry.filename ? "Editing local content." : "New entry—not saved yet.");

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
  return { type: state.type, originalFilename: state.filename, slug: form.elements.slug.value, data, body: form.elements.body.value };
}

function setStatus(message, error = false) {
  const target = $("#save-status");
  target.textContent = message;
  target.style.color = error ? "#b00020" : "";
}

async function loadEntries() {
  const list = await api(`/api/entries?type=${encodeURIComponent(state.type)}`);
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
    button.addEventListener("click", async () => renderForm(await api(`/api/entry?type=${encodeURIComponent(state.type)}&filename=${encodeURIComponent(entry.filename)}`)));
    entries.append(button);
  }
  markSelectedEntry();
}

function markSelectedEntry() {
  for (const button of entries.querySelectorAll("button")) button.setAttribute("aria-current", String(button.dataset.filename === state.filename));
}

async function chooseCollection(type) {
  state.type = type;
  state.filename = null;
  form.hidden = true;
  $("#welcome").hidden = false;
  $("#editor-title").textContent = state.schemas[type].label;
  $("#collection-label").textContent = state.schemas[type].label;
  for (const button of collections.querySelectorAll("button")) button.setAttribute("aria-current", button.dataset.type === type ? "page" : "false");
  await loadEntries();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Saving…");
  try {
    const result = await api("/api/entry", { method: "POST", body: JSON.stringify(collectForm()) });
    state.filename = result.filename;
    setStatus("Saved locally. Preview is rebuilding automatically.");
    await loadEntries();
  } catch (error) { setStatus(error.message, true); }
});

$("#new-entry").addEventListener("click", () => renderForm());
document.querySelector('[data-add="gallery"]').addEventListener("click", () => addGalleryItem());
document.querySelector('[data-add="credits"]').addEventListener("click", () => addCreditItem());

$("#check-git").addEventListener("click", async () => {
  const button = $("#check-git");
  button.disabled = true;
  $("#git-summary").textContent = "Checking GitHub…";
  try {
    const result = await api("/api/git-check");
    $("#git-summary").textContent = result.connection === "ok" ? `Connected via ${result.remote}` : `Connection failed: ${result.connectionError}`;
  } catch (error) { $("#git-summary").textContent = error.message; }
  button.disabled = false;
});

$("#publish").addEventListener("click", () => $("#publish-dialog").showModal());
$("#confirm-publish").addEventListener("click", async (event) => {
  event.preventDefault();
  const button = $("#confirm-publish");
  button.disabled = true;
  $("#publish-status").textContent = "Building, validating and publishing…";
  try {
    const result = await api("/api/publish", { method: "POST", body: JSON.stringify({ message: $("#commit-message").value }) });
    $("#publish-status").textContent = result.message;
    setTimeout(() => $("#publish-dialog").close(), 1800);
  } catch (error) { $("#publish-status").textContent = error.message; }
  button.disabled = false;
});

async function start() {
  const initial = await api("/api/state");
  state.token = initial.token;
  state.schemas = initial.schemas;
  $("#preview-link").href = initial.previewUrl;
  $("#branch-status").textContent = `${initial.git.branch} → ${initial.git.publishBranch}`;
  for (const [type, schema] of Object.entries(state.schemas)) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.type = type;
    button.textContent = schema.label;
    button.addEventListener("click", () => chooseCollection(type));
    collections.append(button);
  }
  await chooseCollection(state.type);
}

start().catch((error) => {
  $("#welcome").innerHTML = `<p>The local CMS could not start.</p><pre></pre>`;
  $("#welcome pre").textContent = error.message;
});
