// Student materials page (kimina.co.ke/learn.html#<token>). The private token sits after the #,
// which browsers never send to servers or analytics. The `learn` Edge Function returns the
// page; each file's download link is asked for only when the student taps it (it lasts 5 minutes).
// Everything from the server is shown as text, never as HTML.
(() => {
  const LEARN_URL = "https://akswkkcihswupkunstrj.supabase.co/functions/v1/learn";
  const $ = (selector) => document.querySelector(selector);
  const token = (window.location.hash.match(/[0-9a-f]{48}/) || [""])[0];

  function el(tag, attributes = {}, text) {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
      if (value == null || value === false) continue;
      if (key === "class") element.className = value;
      else element.setAttribute(key, value === true ? "" : value);
    }
    if (text != null) element.textContent = text;
    return element;
  }

  async function call(body) {
    const response = await fetch(LEARN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...body })
    });
    return response.json().catch(() => ({ result: "error" }));
  }

  function size(bytes) {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  }

  function host(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
  }

  function fail(title, message) {
    $("#learn-title").textContent = title;
    $("#learn-message").textContent = message;
    document.title = `${title} | Kimina`;
  }

  async function download(item, button) {
    button.disabled = true;
    const label = button.textContent;
    button.textContent = "Preparing…";
    const reply = await call({ action: "file", id: item.id }).catch(() => ({ result: "error" }));
    button.disabled = false;
    button.textContent = label;
    if (reply.result === "ok" && reply.url) window.location.href = reply.url;
    else $("#learn-message").textContent = "That file could not be opened. Check your connection and try again, or ask Kimina.";
  }

  function render(page) {
    $("#learn-title").textContent = page.name;
    document.title = `${page.name} | Kimina`;
    const note = $("#learn-note");
    note.textContent = page.note || "";
    note.hidden = !page.note;
    const items = page.items || [];
    $("#learn-message").textContent = items.length ? "" : "Nothing here yet. Kimina will add files and links for you.";
    $("#learn-list").replaceChildren(...items.map((item) => {
      const text = el("div");
      text.append(el("h3", {}, item.title));
      if (item.description) text.append(el("p", {}, item.description));
      const meta = item.kind === "file"
        ? [item.file_name, size(item.size_bytes)].filter(Boolean).join(" · ")
        : host(item.url);
      if (meta) text.append(el("p", { class: "learn-meta" }, meta));
      let action;
      if (item.kind === "file") {
        action = el("button", { class: "button", type: "button" }, "Download");
        action.addEventListener("click", () => download(item, action));
      } else {
        action = el("a", { class: "button", href: item.url, target: "_blank", rel: "noopener noreferrer" }, "Open link");
      }
      const row = el("li", { class: "learn-item" });
      row.append(text, action);
      return row;
    }));
  }

  async function start() {
    if (!token) return fail("Link needed", "Open this page with the private link Kimina sent you.");
    const reply = await call({ action: "page" }).catch(() => ({ result: "error" }));
    if (reply.result === "ok") return render(reply.page);
    if (reply.result === "not_found") return fail("Link not found", "This link is not active. It may be mistyped or switched off. Ask Kimina for a new one.");
    fail("Could not load", "Your materials could not be loaded. Check your connection and reload the page.");
  }

  window.addEventListener("hashchange", () => window.location.reload());
  start();
})();
