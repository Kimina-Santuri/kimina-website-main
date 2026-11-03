// Booking calendar for kimina.co.ke/book.html. Reads services and free times straight from
// Supabase with the public key (read-only functions), and books or cancels through the
// `booking` Edge Function. One month of free times is fetched at a time to keep data use low.
(() => {
  const SUPABASE_URL = "https://akswkkcihswupkunstrj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_pNIsRMByIlC-hplzg9cqOg_4MNfno5Q";
  const BOOKING_URL = `${SUPABASE_URL}/functions/v1/booking`;
  const TZ = "Africa/Nairobi";
  const $ = (selector) => document.querySelector(selector);
  const params = new URLSearchParams(window.location.search);
  const state = { services: [], service: null, month: null, slots: new Map(), day: null, slot: null, started: Date.now() };

  const fmt = (options) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...options });
  const dayKey = (date) => fmt({ year: "numeric", month: "2-digit", day: "2-digit" }).format(date).split("/").reverse().join("-");
  const timeLabel = (date) => fmt({ hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  const longDay = (date) => fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
  const todayKey = () => dayKey(new Date());

  async function rpc(name, body) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error("Could not load free times. Check your connection and reload.");
    return response.json();
  }

  async function bookingApi(body) {
    const response = await fetch(BOOKING_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return response.json().catch(() => ({ result: "error", message: "The server sent an unreadable reply." }));
  }

  function el(tag, attributes = {}, text) {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
      if (value === false || value == null) continue;
      if (key === "class") element.className = value;
      else element.setAttribute(key, value === true ? "" : value);
    }
    if (text != null) element.textContent = text;
    return element;
  }

  // ---------- step 1: service ----------

  function renderServices() {
    const list = $("#service-list");
    list.replaceChildren(...state.services.map((service) => {
      const button = el("button", { type: "button", class: "service-option", role: "radio", "aria-checked": String(state.service?.slug === service.slug) });
      button.append(el("strong", {}, service.name), el("span", {}, service.price_note));
      button.addEventListener("click", () => chooseService(service.slug));
      return button;
    }));
  }

  async function chooseService(slug) {
    state.service = state.services.find((service) => service.slug === slug) || null;
    state.slots.clear();
    state.day = null;
    state.slot = null;
    renderServices();
    renderTimes();
    $("#details").hidden = true;
    const url = new URL(window.location.href);
    url.searchParams.set("service", slug);
    history.replaceState(null, "", url);
    await loadMonth();
  }

  // ---------- step 2: day ----------

  function monthStart(year, month) { return `${year}-${String(month + 1).padStart(2, "0")}-01`; }

  async function loadMonth() {
    const { year, month } = state.month;
    const key = `${state.service?.slug}|${year}-${month}`;
    const grid = $("#month-grid");
    $("#month-label").textContent = new Date(Date.UTC(year, month, 15)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
    const [ty, tm] = todayKey().split("-").map(Number);
    $("#month-prev").disabled = year < ty || (year === ty && month + 1 <= tm);
    if (!state.service) { renderMonth([]); $("#day-hint").textContent = "Choose a service first."; return; }
    grid.setAttribute("aria-busy", "true");
    try {
      if (!state.slots.has(key)) {
        const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        const rows = await rpc("booking_slots", { p_service: state.service.slug, p_from: monthStart(year, month), p_days: days });
        state.slots.set(key, rows.map((row) => new Date(row.starts_at)));
      }
      const slots = state.slots.get(key);
      renderMonth(slots);
      $("#day-hint").textContent = slots.length ? "" : "No free times this month. Try the next month.";
    } catch (error) {
      $("#day-hint").textContent = error.message;
    }
    grid.removeAttribute("aria-busy");
  }

  function renderMonth(slots) {
    const { year, month } = state.month;
    const grid = $("#month-grid");
    const open = new Set(slots.map(dayKey));
    const cells = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name) => el("span", { class: "weekday", "aria-hidden": "true" }, name));
    const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
    for (let i = 0; i < (first + 6) % 7; i++) cells.push(el("span", { class: "blank", "aria-hidden": "true" }));
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (let d = 1; d <= days; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isOpen = open.has(key);
      const label = new Date(Date.UTC(year, month, d, 12)).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
      const button = el("button", { type: "button", class: "day", disabled: !isOpen, "aria-pressed": String(state.day === key), "aria-label": `${label}${isOpen ? ", free times" : ", no free times"}` }, String(d));
      if (key === todayKey()) button.classList.add("is-today");
      button.addEventListener("click", () => chooseDay(key));
      cells.push(button);
    }
    grid.replaceChildren(...cells);
  }

  function moveMonth(step) {
    let { year, month } = state.month;
    month += step;
    if (month < 0) { month = 11; year--; }
    if (month > 11) { month = 0; year++; }
    state.month = { year, month };
    state.day = null;
    state.slot = null;
    renderTimes();
    $("#details").hidden = true;
    loadMonth();
  }

  function chooseDay(key) {
    state.day = key;
    state.slot = null;
    $("#details").hidden = true;
    const { year, month } = state.month;
    renderMonth(state.slots.get(`${state.service.slug}|${year}-${month}`) || []);
    $("#month-grid .day[aria-pressed='true']")?.focus({ preventScroll: true });
    renderTimes();
    if (window.matchMedia("(max-width: 720px)").matches) $("#time-list").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // ---------- step 3: time ----------

  function renderTimes() {
    const list = $("#time-list");
    if (!state.day) { list.replaceChildren(); $("#time-hint").textContent = "Choose a day first."; return; }
    const { year, month } = state.month;
    const slots = (state.slots.get(`${state.service.slug}|${year}-${month}`) || []).filter((slot) => dayKey(slot) === state.day);
    $("#time-hint").textContent = `${longDay(slots[0] || new Date(`${state.day}T12:00:00+03:00`))} · ${state.service.session_minutes} minutes`;
    list.replaceChildren(...slots.map((slot) => {
      const button = el("button", { type: "button", class: "time", "aria-pressed": String(state.slot?.getTime() === slot.getTime()) }, timeLabel(slot));
      button.addEventListener("click", () => chooseTime(slot));
      return button;
    }));
  }

  function chooseTime(slot) {
    state.slot = slot;
    renderTimes();
    const end = new Date(slot.getTime() + state.service.session_minutes * 60000);
    $("#book-summary").textContent = `${state.service.name} · ${longDay(slot)} · ${timeLabel(slot)}–${timeLabel(end)} (Nairobi time) · ${state.service.price_note}`;
    $("#details").hidden = false;
    $("#book-status").textContent = "";
    $("#details").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    $("#book-form").elements.name.focus({ preventScroll: true });
  }

  // ---------- step 4: book ----------

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const status = $("#book-status");
    const button = form.querySelector("button[type=submit]");
    status.classList.remove("is-error");
    if (!form.elements.email.value.trim() && !form.elements.phone.value.trim()) {
      status.textContent = "Please add an email address or a phone number.";
      status.classList.add("is-error");
      form.elements.email.focus();
      return;
    }
    button.disabled = true;
    status.textContent = "Booking…";
    let reply;
    try {
      reply = await bookingApi({
        action: "book", service: state.service.slug, starts_at: state.slot.toISOString(),
        name: form.elements.name.value, email: form.elements.email.value, phone: form.elements.phone.value,
        message: form.elements.message.value, website: form.elements.website.value, started: state.started
      });
    } catch {
      reply = { result: "error", message: "No connection. Nothing was booked; try again when you are back online." };
    }
    button.disabled = false;
    if (reply.result === "booked" && !reply.fake) return showDone(reply, form.elements.email.value.trim());
    if (reply.result === "taken") {
      status.textContent = "Sorry, that time was just taken. Please choose another.";
      const { year, month } = state.month;
      state.slots.delete(`${state.service.slug}|${year}-${month}`);
      state.slot = null;
      await loadMonth();
      renderTimes();
    } else if (reply.result === "limited") {
      status.textContent = "Too many bookings from this connection today. Please use the Contact form.";
    } else {
      status.textContent = reply.message || "Something went wrong. Please try again.";
    }
    status.classList.add("is-error");
  }

  function showDone(reply, email) {
    const start = new Date(reply.starts_at);
    const end = new Date(reply.ends_at);
    const panel = $("#book-done");
    const cancelUrl = `${window.location.origin}${window.location.pathname}?cancel=${reply.cancel_token}`;
    panel.replaceChildren(
      el("p", { class: "eyebrow" }, "Booked"),
      el("h3", {}, `${reply.service}`),
      el("p", { class: "book-when" }, `${longDay(start)}, ${timeLabel(start)}–${timeLabel(end)} (Nairobi time)`),
      el("p", {}, reply.emailed
        ? `A confirmation is on its way to ${email}, with a link to cancel if you need to.`
        : "Keep this link to cancel if you need to:"),
    );
    if (!reply.emailed) {
      const line = el("p");
      line.append(el("a", { href: cancelUrl, class: "book-cancel-link" }, cancelUrl));
      panel.append(line);
    }
    panel.append(el("a", { class: "button", href: "bookings.html" }, "Back to Bookings"));
    $("#booker").hidden = true;
    panel.hidden = false;
    panel.focus();
    panel.scrollIntoView({ block: "start" });
  }

  // ---------- cancel link ----------

  async function showCancel(token) {
    const panel = $("#cancel-view");
    $("#book-loading").hidden = true;
    panel.hidden = false;
    panel.replaceChildren(el("p", {}, "Finding your booking…"));
    const reply = await bookingApi({ action: "lookup", token }).catch(() => ({ result: "error" }));
    if (reply.result !== "found") {
      panel.replaceChildren(el("p", { class: "eyebrow" }, "Cancel a booking"), el("p", {}, "This cancel link was not found. It may be mistyped."),
        el("a", { class: "button", href: "book.html" }, "Book a session"));
      return;
    }
    const b = reply.booking;
    const start = new Date(b.starts_at);
    const end = new Date(b.ends_at);
    const heading = [el("p", { class: "eyebrow" }, "Your booking"), el("h3", {}, b.service), el("p", { class: "book-when" }, `${longDay(start)}, ${timeLabel(start)}–${timeLabel(end)} (Nairobi time)`)];
    if (b.status === "cancelled") {
      panel.replaceChildren(...heading, el("p", {}, "This booking is already cancelled."), el("a", { class: "button", href: "book.html" }, "Book another time"));
      return;
    }
    if (b.status !== "confirmed" || b.past) {
      panel.replaceChildren(...heading, el("p", {}, "This session has already taken place."));
      return;
    }
    const button = el("button", { class: "button", type: "button" }, "Cancel this booking");
    const status = el("p", { class: "book-status", role: "status" });
    button.addEventListener("click", async () => {
      button.disabled = true;
      status.textContent = "Cancelling…";
      const result = await bookingApi({ action: "cancel", token }).catch(() => ({ result: "error" }));
      if (result.result === "cancelled" || result.result === "already") {
        panel.replaceChildren(...heading, el("p", {}, "Cancelled. The time is free again."), el("a", { class: "button", href: "book.html" }, "Book another time"));
      } else {
        status.textContent = "Could not cancel. Check your connection and try again.";
        button.disabled = false;
      }
    });
    panel.replaceChildren(...heading, el("p", {}, "Need to cancel? The time will be freed for someone else."), button, status);
  }

  // ---------- start ----------

  async function start() {
    const token = params.get("cancel");
    if (token) return showCancel(token);
    const [ty, tm] = todayKey().split("-").map(Number);
    state.month = { year: ty, month: tm - 1 };
    try {
      state.services = await rpc("booking_services", {});
    } catch (error) {
      $("#book-loading").textContent = error.message;
      return;
    }
    $("#book-loading").hidden = true;
    $("#booker").hidden = false;
    renderServices();
    $("#month-prev").addEventListener("click", () => moveMonth(-1));
    $("#month-next").addEventListener("click", () => moveMonth(1));
    $("#book-form").addEventListener("submit", submit);
    const wanted = params.get("service");
    if (wanted && state.services.some((service) => service.slug === wanted)) await chooseService(wanted);
    else await loadMonth();
  }

  start();
})();
