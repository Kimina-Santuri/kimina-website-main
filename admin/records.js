// Records screens for /admin: enquiries, people (clients and students), invoices with
// payments, the booking calendar, and student pages with their materials. Talks straight to the Supabase tables with the signed-in admin's token; the
// row-level rules let only admins read or write. Enquiries come from the public Contact
// form, so every value is shown with textContent, never as HTML.
(() => {
  const A = () => window.kiminaAdmin;
  const $ = (selector) => document.querySelector(selector);
  const tools = $("#records-tools");
  const list = $("#records-list");
  const detail = $("#records-detail");
  const view = { screen: "enquiries", filter: "open", search: "", selected: null };
  let services = [];
  let lessons = [];

  // ---------- data ----------

  async function rest(path, { method = "GET", body, single = false } = {}) {
    const token = await A().freshToken();
    const response = await fetch(`${A().SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: A().SUPABASE_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(single ? { Accept: "application/vnd.pgrst.object+json" } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (response.status === 401) A().showSignIn("Your sign-in has expired. Please sign in again.");
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(friendly(payload?.message || "The request failed."));
    return payload;
  }

  function friendly(message) {
    if (/violates foreign key.*invoices/.test(message)) return "This person has invoices, so they cannot be removed.";
    if (/people_email_check|email/.test(message) && /check/.test(message)) return "That email address does not look right.";
    return message;
  }

  const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
  const kes = (value) => `${Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} KES`;
  const when = (value) => value ? new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
  const day = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const enc = encodeURIComponent;

  // ---------- tiny DOM helpers (text only) ----------

  function h(tag, attributes = {}, ...children) {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
      if (value == null || value === false) continue;
      if (key === "class") element.className = value;
      else if (key.startsWith("on")) element.addEventListener(key.slice(2), value);
      else if (key in element && typeof value !== "string") element[key] = value;
      else element.setAttribute(key, value === true ? "" : value);
    }
    for (const child of children.flat()) if (child != null && child !== false) element.append(child instanceof Node ? child : String(child));
    return element;
  }

  function field(label, input, wide = false) {
    return h("label", { class: `field${wide ? " field--wide" : ""}` }, h("span", {}, label), input);
  }
  const input = (name, value = "", type = "text", extra = {}) => h("input", { name, type, value: value ?? "", ...extra });
  const textarea = (name, value = "", rows = 4) => { const t = h("textarea", { name, rows }); t.value = value || ""; return t; };
  function select(name, options, value) {
    const element = h("select", { name });
    for (const [optionValue, label] of options) element.add(new Option(label, optionValue, false, optionValue === value));
    return element;
  }
  function checkbox(name, checked, label) {
    return h("label", { class: "checkbox" }, h("input", { name, type: "checkbox", checked: Boolean(checked) }), h("span", {}, label));
  }
  function status(message = "", error = false) {
    const element = h("p", { class: "record-status", role: "status" }, message);
    if (error) element.classList.add("is-error");
    return element;
  }
  function heading(eyebrow, title) {
    return h("div", { class: "section-heading" }, h("div", {}, h("p", { class: "eyebrow" }, eyebrow), h("h2", {}, title)));
  }
  function listButton(title, meta, id, onclick) {
    return h("button", { class: "entry-button", type: "button", "data-id": id, "aria-current": String(id === view.selected), onclick }, h("strong", {}, title), h("span", {}, meta));
  }

  // Runs a save, shows the outcome next to the button and keeps it from double-submitting.
  async function guarded(form, work) {
    const button = form.querySelector('button[type="submit"]');
    const note = form.querySelector(".record-status");
    if (button) button.disabled = true;
    if (note) { note.textContent = "Saving…"; note.classList.remove("is-error"); }
    try {
      await work();
      if (note) note.textContent = "Saved.";
    } catch (error) {
      if (note) { note.textContent = error.message; note.classList.add("is-error"); }
    }
    if (button) button.disabled = false;
  }

  // ---------- navigation ----------

  async function open(screen) {
    if (A().hasUnsavedUploads()) return;
    view.screen = screen;
    view.selected = null;
    view.filter = { people: "all", calendar: "upcoming", pages: "active", materials: "all" }[screen] || "open";
    view.search = "";
    A().showArea("records");
    for (const button of document.querySelectorAll("#record-nav button")) button.setAttribute("aria-current", button.dataset.records === screen ? "page" : "false");
    $("#collection-label").textContent = "Records";
    $("#editor-title").textContent = { enquiries: "Enquiries", people: "People", invoices: "Invoices", calendar: "Calendar", pages: "Student pages", materials: "Materials" }[screen];
    detail.replaceChildren(h("div", { class: "welcome" }, h("p", {}, "Choose an entry on the left, or add a new one.")));
    renderTools();
    await refreshList();
  }

  function renderTools() {
    tools.replaceChildren();
    if (view.screen === "people") {
      tools.append(
        h("button", { class: "new-entry", type: "button", onclick: () => showPerson(null) }, "＋ New person"),
        h("input", { class: "search", type: "search", placeholder: "Search names", "aria-label": "Search people", value: view.search,
          oninput: (event) => { view.search = event.target.value; clearTimeout(view.timer); view.timer = setTimeout(refreshList, 300); } })
      );
    }
    if (view.screen === "invoices") tools.append(h("button", { class: "new-entry", type: "button", onclick: () => showNewInvoice() }, "＋ New invoice"));
    if (view.screen === "calendar") tools.append(
      h("button", { class: "new-entry", type: "button", onclick: () => showNewBlock() }, "＋ Block time"),
      h("button", { class: "new-entry", type: "button", onclick: () => showSettings() }, "Hours & settings"));
    if (view.screen === "pages") tools.append(h("button", { class: "new-entry", type: "button", onclick: () => showStudentPage(null) }, "＋ New student page"));
    if (view.screen === "materials") tools.append(h("button", { class: "new-entry", type: "button", onclick: () => showMaterial(null) }, "＋ Add file or link"));
    const filters = {
      enquiries: [["open", "Open"], ["all", "All"]],
      people: [["all", "All"], ["clients", "Clients"], ["students", "Students"]],
      invoices: [["open", "Unpaid"], ["all", "All"]],
      calendar: [["upcoming", "Upcoming"], ["past", "Past"], ["cancelled", "Cancelled"]],
      pages: [["active", "Active"], ["all", "All"]],
      materials: [["all", "All"], ["files", "Files"], ["links", "Links"]]
    }[view.screen];
    tools.append(h("div", { class: "filters", role: "group", "aria-label": "Filter" }, filters.map(([value, label]) =>
      h("button", { type: "button", "aria-pressed": String(view.filter === value), onclick: () => { view.filter = value; renderTools(); refreshList(); } }, label))));
  }

  async function refreshList() {
    list.replaceChildren(h("p", {}, "Loading…"));
    try {
      if (view.screen === "enquiries") await listEnquiries();
      if (view.screen === "people") await listPeople();
      if (view.screen === "invoices") await listInvoices();
      if (view.screen === "calendar") await listCalendar();
      if (view.screen === "pages") await listStudentPages();
      if (view.screen === "materials") await listMaterials();
    } catch (error) {
      list.replaceChildren(h("p", { class: "is-error" }, error.message));
    }
    refreshBadge();
  }

  async function refreshBadge() {
    try {
      const rows = await rest("enquiries?select=id&status=eq.new");
      $("#new-enquiries").textContent = rows.length ? String(rows.length) : "";
    } catch { /* the badge is a convenience */ }
  }

  // ---------- enquiries ----------

  const TOPICS = { collaboration: "Collaboration", education: "Workshops & education", "live-sound": "Live sound", booking: "Studio or tutoring", press: "Press", general: "General" };
  const ENQUIRY_STATUS = [["new", "New"], ["replied", "Replied"], ["quoted", "Quoted"], ["booked", "Booked"], ["closed", "Closed"]];

  async function listEnquiries() {
    const filter = view.filter === "open" ? "&status=in.(new,replied,quoted)" : "";
    const rows = await rest(`enquiries?select=id,name,topic,status,created_at&order=created_at.desc&limit=200${filter}`);
    list.replaceChildren(...(rows.length ? rows.map((row) => listButton(
      `${row.status === "new" ? "● " : ""}${row.name}`,
      `${day(row.created_at.slice(0, 10))} · ${TOPICS[row.topic] || row.topic} · ${row.status}`,
      row.id,
      () => showEnquiry(row.id)
    )) : [h("p", {}, view.filter === "open" ? "No open enquiries." : "No enquiries yet.")]));
  }

  async function showEnquiry(id) {
    view.selected = id;
    markSelected();
    const row = await rest(`enquiries?id=eq.${id}&select=*,people(id,full_name)`, { single: true });
    const digits = (row.phone || "").replace(/[^0-9]/g, "");
    const whatsapp = digits ? `https://wa.me/${digits.startsWith("0") ? `254${digits.slice(1)}` : digits}` : null;
    const form = h("form", { class: "record-form" },
      h("div", { class: "record-summary" },
        h("p", { class: "eyebrow" }, `${TOPICS[row.topic] || row.topic} · ${when(row.created_at)} · ${row.source}`),
        h("h2", {}, row.name),
        h("p", { class: "contact-lines" },
          row.email ? h("a", { href: `mailto:${row.email}` }, row.email) : null,
          row.phone ? h("a", { href: `tel:${row.phone.replace(/\s/g, "")}` }, row.phone) : null,
          whatsapp ? h("a", { href: whatsapp, target: "_blank", rel: "noopener" }, "WhatsApp") : null),
        h("p", { class: "message" }, row.message)),
      h("div", { class: "form-grid" },
        field("Status", select("status", ENQUIRY_STATUS, row.status)),
        field("Your notes", textarea("notes", row.notes), true)),
      h("footer", { class: "editor-footer" },
        status(),
        h("div", { class: "footer-actions" },
          row.people
            ? h("button", { class: "button button--quiet", type: "button", onclick: () => { open("people").then(() => showPerson(row.people.id)); } }, `Open ${row.people.full_name}`)
            : h("button", { class: "button button--quiet", type: "button", onclick: (event) => makePerson(row, event.currentTarget) }, "Add to people"),
          h("button", { class: "button button--dark", type: "submit" }, "Save")))
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      guarded(form, async () => {
        await rest(`enquiries?id=eq.${id}`, { method: "PATCH", body: { status: form.elements.status.value, notes: form.elements.notes.value } });
        await refreshList();
      });
    });
    reveal(form);
  }

  async function makePerson(enquiry, button) {
    const note = detail.querySelector(".record-status");
    button.disabled = true;
    note.textContent = "Adding…";
    note.classList.remove("is-error");
    try {
      await createPersonFrom(enquiry);
    } catch (error) {
      note.textContent = error.message;
      note.classList.add("is-error");
      button.disabled = false;
    }
  }

  async function createPersonFrom(enquiry) {
    const person = await rest("people", { method: "POST", single: true, body: {
      full_name: enquiry.name, email: enquiry.email || null, phone: enquiry.phone || null, is_client: true,
      notes: `From a ${TOPICS[enquiry.topic] || enquiry.topic} enquiry on ${day(enquiry.created_at.slice(0, 10))}.`
    } });
    await rest(`enquiries?id=eq.${enquiry.id}`, { method: "PATCH", body: { person_id: person.id } });
    await showEnquiry(enquiry.id);
  }

  // ---------- people ----------

  async function listPeople() {
    let filter = "";
    if (view.filter === "clients") filter += "&is_client=is.true";
    if (view.filter === "students") filter += "&is_student=is.true";
    const search = view.search.trim().replace(/[,*()]/g, " ");
    if (search) filter += `&full_name=ilike.*${enc(search)}*`;
    const rows = await rest(`people?select=id,full_name,is_client,is_student,phone,email&order=full_name&limit=300${filter}`);
    list.replaceChildren(...(rows.length ? rows.map((row) => listButton(
      row.full_name,
      [row.is_client && "Client", row.is_student && "Student", row.phone || row.email].filter(Boolean).join(" · ") || "No details",
      row.id,
      () => showPerson(row.id)
    )) : [h("p", {}, "Nobody here yet.")]));
  }

  async function showPerson(id) {
    view.selected = id;
    markSelected();
    const person = id ? await rest(`people?id=eq.${id}`, { single: true }) : { full_name: "", email: "", phone: "", is_client: true, is_student: false, notes: "" };
    const form = h("form", { class: "record-form" },
      heading(id ? "Person" : "New person", id ? person.full_name : "Add someone"),
      h("div", { class: "form-grid" },
        field("Full name *", input("full_name", person.full_name, "text", { required: true, maxLength: 160 })),
        field("Phone", input("phone", person.phone, "tel", { maxLength: 40 })),
        field("Email", input("email", person.email, "email")),
        h("div", { class: "checks" }, checkbox("is_client", person.is_client, "Client"), checkbox("is_student", person.is_student, "Student")),
        field("Notes", textarea("notes", person.notes), true)),
      h("footer", { class: "editor-footer" }, status(), h("button", { class: "button button--dark", type: "submit" }, id ? "Save" : "Add person"))
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      guarded(form, async () => {
        const body = {
          full_name: form.elements.full_name.value.trim(),
          phone: form.elements.phone.value.trim() || null,
          email: form.elements.email.value.trim() || null,
          is_client: form.elements.is_client.checked,
          is_student: form.elements.is_student.checked,
          notes: form.elements.notes.value
        };
        const saved = id
          ? await rest(`people?id=eq.${id}`, { method: "PATCH", body, single: true })
          : await rest("people", { method: "POST", body, single: true });
        await refreshList();
        if (!id) await showPerson(saved.id);
      });
    });
    reveal(form);
    if (!id) return;

    const [invoices, payments, studentLessons] = await Promise.all([
      rest(`invoice_balances?person_id=eq.${id}&order=issued_on.desc`),
      rest(`payments?person_id=eq.${id}&select=*,invoices(number)&order=paid_on.desc&limit=50`),
      rest(`student_lessons?person_id=eq.${id}&select=*,lessons(title,url)&order=created_at`)
    ]);
    const owed = invoices.reduce((sum, row) => sum + Number(row.outstanding), 0);
    detail.append(
      h("section", { class: "editor-section" },
        h("div", { class: "section-heading" },
          h("div", {}, h("p", { class: "eyebrow" }, `Money · ${owed ? `${kes(owed)} owed` : "nothing owed"}`), h("h2", {}, "Invoices")),
          h("button", { class: "button button--quiet", type: "button", onclick: () => { open("invoices").then(() => showNewInvoice(id)); } }, "New invoice")),
        invoices.length ? h("div", { class: "rows" }, invoices.map((row) => h("button", { class: "row", type: "button", onclick: () => { open("invoices").then(() => showInvoice(row.id)); } },
          h("span", {}, row.number), h("span", {}, row.description), h("span", {}, row.status === "void" ? "Void" : Number(row.outstanding) ? `${kes(row.outstanding)} owed` : "Paid")))) : h("p", { class: "hint" }, "No invoices."),
        payments.length ? h("div", { class: "rows" }, h("p", { class: "eyebrow" }, "Payments"), payments.map((row) => h("p", { class: "row" },
          h("span", {}, day(row.paid_on)), h("span", {}, `${methodLabel(row.method)}${row.reference ? ` ${row.reference}` : ""}${row.invoices ? ` · ${row.invoices.number}` : ""}`), h("span", {}, kes(row.amount))))) : null),
      lessonSection(id, person, studentLessons)
    );
  }

  const LESSON_STATUS = [["planned", "Planned"], ["in_progress", "In progress"], ["done", "Done"]];

  function lessonSection(personId, person, rows) {
    const section = h("section", { class: "editor-section" }, heading("Student", "Lessons"));
    if (!person.is_student && !rows.length) {
      section.append(h("p", { class: "hint" }, "Tick Student above and save to track lessons."));
      return section;
    }
    for (const row of rows) {
      const choice = select("status", LESSON_STATUS, row.status);
      choice.addEventListener("change", async () => {
        const body = { status: choice.value };
        if (choice.value === "in_progress" && !row.started_on) body.started_on = today();
        if (choice.value === "done") body.finished_on = today();
        try { await rest(`student_lessons?id=eq.${row.id}`, { method: "PATCH", body }); } catch (error) { alert(error.message); }
      });
      section.append(h("div", { class: "row lesson-row" },
        row.lessons.url ? h("a", { href: row.lessons.url, target: "_blank", rel: "noopener" }, row.lessons.title) : h("span", {}, row.lessons.title),
        choice));
    }
    const available = lessons.filter((lesson) => !rows.some((row) => row.lesson_id === lesson.id));
    if (available.length) {
      const form = h("form", { class: "inline-form" },
        select("lesson", available.map((lesson) => [lesson.id, lesson.title])),
        h("button", { class: "button button--quiet", type: "submit" }, "Add lesson"), status());
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        guarded(form, async () => {
          await rest("student_lessons", { method: "POST", body: { person_id: personId, lesson_id: form.elements.lesson.value } });
          await showPerson(personId);
        });
      });
      section.append(form);
    }
    return section;
  }

  // ---------- invoices and payments ----------

  const METHODS = [["mpesa", "M-Pesa"], ["cash", "Cash"], ["bank", "Bank"], ["card", "Card"], ["other", "Other"]];
  const methodLabel = (value) => (METHODS.find(([key]) => key === value) || [value, value])[1];

  async function listInvoices() {
    const rows = await rest("invoice_balances?select=id,number,description,amount,outstanding,status,issued_on,person_id&order=issued_on.desc,number.desc&limit=300");
    const people = await peopleNames(rows.map((row) => row.person_id));
    const shown = view.filter === "open" ? rows.filter((row) => row.status === "open" && Number(row.outstanding) > 0) : rows;
    const total = shown.reduce((sum, row) => sum + Number(row.outstanding), 0);
    list.replaceChildren(
      h("p", { class: "list-total" }, view.filter === "open" ? `Owed: ${kes(total)}` : `${rows.length} invoices`),
      ...(shown.length ? shown.map((row) => listButton(
        `${row.number} · ${people[row.person_id] || ""}`,
        `${day(row.issued_on)} · ${row.status === "void" ? "Void" : Number(row.outstanding) ? `${kes(row.outstanding)} owed` : "Paid"}`,
        row.id,
        () => showInvoice(row.id)
      )) : [h("p", {}, view.filter === "open" ? "Nothing is owed." : "No invoices yet.")])
    );
  }

  async function peopleNames(ids) {
    const unique = [...new Set(ids)];
    if (!unique.length) return {};
    const rows = await rest(`people?select=id,full_name&id=in.(${unique.join(",")})`);
    return Object.fromEntries(rows.map((row) => [row.id, row.full_name]));
  }

  async function showNewInvoice(personId = "") {
    view.selected = null;
    markSelected();
    const people = await rest("people?select=id,full_name&order=full_name&limit=1000");
    if (!people.length) {
      detail.replaceChildren(h("div", { class: "welcome" }, h("p", {}, "Add the person first under People, then make their invoice.")));
      return;
    }
    const serviceChoice = select("service_id", [["", "No service"], ...services.map((service) => [service.id, service.name])], "");
    const form = h("form", { class: "record-form" },
      heading("New invoice", "Bill someone"),
      h("div", { class: "form-grid" },
        field("Person *", select("person_id", [["", "Choose…"], ...people.map((person) => [person.id, person.full_name])], personId)),
        field("Service", serviceChoice),
        field("Description *", input("description", "", "text", { required: true, maxLength: 500 }), true),
        field("Amount (KES) *", input("amount", "", "number", { required: true, min: "1", step: "0.01", inputMode: "decimal" })),
        field("Issued", input("issued_on", today(), "date", { required: true })),
        field("Due", input("due_on", "", "date")),
        field("Notes (printed on the invoice)", textarea("notes", "", 3), true)),
      h("footer", { class: "editor-footer" }, status(), h("button", { class: "button button--dark", type: "submit" }, "Create invoice"))
    );
    serviceChoice.addEventListener("change", () => {
      const service = services.find((item) => item.id === serviceChoice.value);
      if (!service) return;
      if (!form.elements.description.value) form.elements.description.value = service.name;
      if (!form.elements.amount.value && service.price_kes) form.elements.amount.value = Number(service.price_kes);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.elements.person_id.value) { form.querySelector(".record-status").textContent = "Choose who the invoice is for."; return; }
      guarded(form, async () => {
        const saved = await rest("invoices", { method: "POST", single: true, body: {
          person_id: form.elements.person_id.value,
          service_id: form.elements.service_id.value || null,
          description: form.elements.description.value.trim(),
          amount: Number(form.elements.amount.value),
          issued_on: form.elements.issued_on.value,
          due_on: form.elements.due_on.value || null,
          notes: form.elements.notes.value
        } });
        await refreshList();
        await showInvoice(saved.id);
      });
    });
    reveal(form);
  }

  async function showInvoice(id) {
    view.selected = id;
    markSelected();
    const [invoice, balance, payments] = await Promise.all([
      rest(`invoices?id=eq.${id}&select=*,people(id,full_name,email,phone)`, { single: true }),
      rest(`invoice_balances?id=eq.${id}`, { single: true }),
      rest(`payments?invoice_id=eq.${id}&order=paid_on`)
    ]);
    const isVoid = invoice.status === "void";
    const owed = Number(balance.outstanding);
    const form = h("form", { class: "record-form" },
      h("div", { class: "record-summary" },
        h("p", { class: "eyebrow" }, `Invoice · issued ${day(invoice.issued_on)}${invoice.due_on ? ` · due ${day(invoice.due_on)}` : ""}`),
        h("h2", {}, `${invoice.number} · ${invoice.people.full_name}`),
        h("p", { class: "money" },
          h("span", {}, `Amount ${kes(invoice.amount)}`), h("span", {}, `Paid ${kes(balance.paid)}`),
          h("strong", {}, isVoid ? "Void" : owed ? `Owed ${kes(owed)}` : "Paid in full"))),
      h("div", { class: "form-grid" },
        field("Description", input("description", invoice.description, "text", { required: true, maxLength: 500 }), true),
        field("Due", input("due_on", invoice.due_on || "", "date")),
        field("Status", select("status", [["open", "Open"], ["void", "Void (cancelled)"]], invoice.status)),
        field("Notes (printed on the invoice)", textarea("notes", invoice.notes, 3), true)),
      h("footer", { class: "editor-footer" },
        status(),
        h("div", { class: "footer-actions" },
          h("button", { class: "button button--quiet", type: "button", onclick: () => printInvoice(invoice, balance, payments) }, "Print / PDF"),
          h("button", { class: "button button--dark", type: "submit" }, "Save")))
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      guarded(form, async () => {
        await rest(`invoices?id=eq.${id}`, { method: "PATCH", body: {
          description: form.elements.description.value.trim(),
          due_on: form.elements.due_on.value || null,
          status: form.elements.status.value,
          notes: form.elements.notes.value
        } });
        await refreshList();
        await showInvoice(id);
      });
    });

    const section = h("section", { class: "editor-section" }, heading("Money in", "Payments"));
    section.append(payments.length
      ? h("div", { class: "rows" }, payments.map((row) => h("p", { class: "row" },
          h("span", {}, day(row.paid_on)), h("span", {}, `${methodLabel(row.method)}${row.reference ? ` ${row.reference}` : ""}`), h("span", {}, kes(row.amount)))))
      : h("p", { class: "hint" }, "No payments yet."));
    if (!isVoid && owed > 0) {
      const pay = h("form", { class: "record-form" },
        h("div", { class: "form-grid" },
          field("Amount (KES)", input("amount", owed, "number", { required: true, min: "1", max: String(owed), step: "0.01", inputMode: "decimal" })),
          field("Method", select("method", METHODS, "mpesa")),
          field("Reference (e.g. M-Pesa code)", input("reference", "", "text", { maxLength: 80, autocapitalize: "characters" })),
          field("Paid on", input("paid_on", today(), "date", { required: true }))),
        h("footer", { class: "editor-footer" }, status(), h("button", { class: "button button--dark", type: "submit" }, "Record payment")));
      pay.addEventListener("submit", (event) => {
        event.preventDefault();
        guarded(pay, async () => {
          await rest("payments", { method: "POST", body: {
            person_id: invoice.person_id,
            invoice_id: id,
            amount: Number(pay.elements.amount.value),
            method: pay.elements.method.value,
            reference: pay.elements.reference.value.trim().toUpperCase(),
            paid_on: pay.elements.paid_on.value
          } });
          await refreshList();
          await showInvoice(id);
        });
      });
      section.append(pay);
    }
    reveal(form, section);
  }

  // A plain black-and-white invoice for the browser's Print or Save as PDF.
  function printInvoice(invoice, balance, payments) {
    const person = invoice.people;
    const area = $("#print-area");
    area.replaceChildren(
      h("header", {}, h("p", { class: "print-mark" }, "K."), h("div", {}, h("p", {}, "Kimina"), h("p", {}, "kimina@santuri.org"), h("p", {}, "kimina.co.ke"))),
      h("h1", {}, `Invoice ${invoice.number}`),
      h("dl", {},
        h("dt", {}, "Issued"), h("dd", {}, day(invoice.issued_on)),
        invoice.due_on ? [h("dt", {}, "Due"), h("dd", {}, day(invoice.due_on))] : null,
        h("dt", {}, "Bill to"), h("dd", {}, [person.full_name, person.email, person.phone].filter(Boolean).join(" · "))),
      h("table", {},
        h("thead", {}, h("tr", {}, h("th", {}, "Description"), h("th", {}, "Amount"))),
        h("tbody", {},
          h("tr", {}, h("td", {}, invoice.description), h("td", {}, kes(invoice.amount))),
          payments.map((row) => h("tr", {}, h("td", {}, `Paid ${day(row.paid_on)} · ${methodLabel(row.method)}${row.reference ? ` ${row.reference}` : ""}`), h("td", {}, `−${kes(row.amount)}`)))),
        h("tfoot", {}, h("tr", {}, h("th", {}, invoice.status === "void" ? "Void" : "Balance due"), h("th", {}, kes(invoice.status === "void" ? 0 : balance.outstanding))))),
      invoice.notes ? h("p", { class: "print-notes" }, invoice.notes) : null
    );
    const previous = document.title;
    document.title = `Invoice ${invoice.number} ${person.full_name}`;
    window.print();
    document.title = previous;
  }

  // Shows a record; on a phone the list sits above it, so scroll the record into view.
  function reveal(...nodes) {
    detail.replaceChildren(...nodes);
    if (window.matchMedia("(max-width: 680px)").matches) detail.scrollIntoView({ block: "start" });
  }

  function markSelected() {
    for (const button of list.querySelectorAll(".entry-button")) button.setAttribute("aria-current", String(button.dataset.id === view.selected));
  }

  // ---------- calendar: bookings, blocks, hours ----------

  const STATUS_LABEL = { confirmed: "Booked", cancelled: "Cancelled", completed: "Done", no_show: "No-show" };
  const nairobi = (value, options) => new Date(value).toLocaleString("en-GB", { timeZone: "Africa/Nairobi", ...options });
  const slotLabel = (start, end) => `${nairobi(start, { weekday: "short", day: "2-digit", month: "short" })} ${nairobi(start, { hour: "2-digit", minute: "2-digit", hour12: false })}–${nairobi(end, { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  const toInstant = (date, time) => new Date(`${date}T${time}:00+03:00`).toISOString();

  async function listCalendar() {
    const now = new Date().toISOString();
    let query = "bookings?select=id,name,starts_at,ends_at,status,services(name)&limit=200";
    if (view.filter === "upcoming") query += `&status=eq.confirmed&ends_at=gte.${enc(now)}&order=starts_at`;
    if (view.filter === "past") query += `&status=neq.cancelled&ends_at=lt.${enc(now)}&order=starts_at.desc`;
    if (view.filter === "cancelled") query += "&status=eq.cancelled&order=starts_at.desc";
    const [rows, blocks] = await Promise.all([
      rest(query),
      view.filter === "upcoming" ? rest(`booking_blocks?ends_at=gte.${enc(now)}&order=starts_at&limit=100`) : Promise.resolve([])
    ]);
    const items = [
      ...rows.map((row) => ({ at: row.starts_at, node: listButton(`${slotLabel(row.starts_at, row.ends_at)} · ${row.name}`,
        `${row.services?.name || ""} · ${STATUS_LABEL[row.status]}`, row.id, () => showBooking(row.id)) })),
      ...blocks.map((block) => ({ at: block.starts_at, node: listButton(`${slotLabel(block.starts_at, block.ends_at)} · Blocked`,
        block.reason || "No reason given", block.id, () => showBlock(block)) }))
    ].sort((a, b) => view.filter === "upcoming" ? a.at.localeCompare(b.at) : b.at.localeCompare(a.at));
    list.replaceChildren(...(items.length ? items.map((item) => item.node) : [h("p", {}, view.filter === "upcoming" ? "Nothing booked yet." : "Nothing here.")]));
  }

  async function showBooking(id) {
    view.selected = id;
    markSelected();
    const b = await rest(`bookings?id=eq.${id}&select=*,services(name,price_note)`, { single: true });
    const digits = (b.phone || "").replace(/[^0-9]/g, "");
    const whatsapp = digits ? `https://wa.me/${digits.startsWith("0") ? `254${digits.slice(1)}` : digits}` : null;
    const upcoming = b.status === "confirmed" && new Date(b.ends_at) > new Date();
    const setStatus = (status, question) => async () => {
      if (question && !window.confirm(question)) return;
      try {
        await rest(`bookings?id=eq.${id}`, { method: "PATCH", body: status === "cancelled" ? { status, cancelled_by: "admin" } : { status } });
        await refreshList();
        await showBooking(id);
      } catch (error) { form.querySelector(".record-status").textContent = error.message; }
    };
    const calendarNote = b.calendar_state === "synced" ? "In Google Calendar" : b.calendar_state === "error" ? `Google Calendar error: ${b.calendar_error}` : "Waiting for Google Calendar";
    const form = h("form", { class: "record-form" },
      h("div", { class: "record-summary" },
        h("p", { class: "eyebrow" }, `${STATUS_LABEL[b.status]}${b.cancelled_by ? ` by ${b.cancelled_by}` : ""} · booked ${when(b.created_at)} · ${calendarNote}`),
        h("h2", {}, `${b.services.name} · ${b.name}`),
        h("p", { class: "money" }, h("strong", {}, `${nairobi(b.starts_at, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, ${slotLabel(b.starts_at, b.ends_at).split(" ").pop()}`), h("span", {}, b.services.price_note)),
        h("p", { class: "contact-lines" },
          b.email ? h("a", { href: `mailto:${b.email}` }, b.email) : null,
          b.phone ? h("a", { href: `tel:${b.phone.replace(/\s/g, "")}` }, b.phone) : null,
          whatsapp ? h("a", { href: whatsapp, target: "_blank", rel: "noopener" }, "WhatsApp") : null,
          b.person_id ? h("a", { href: "#", onclick: (event) => { event.preventDefault(); open("people").then(() => showPerson(b.person_id)); } }, "Open person") : null),
        b.message ? h("p", { class: "message" }, b.message) : null),
      h("div", { class: "form-grid" }, field("Your notes (private)", textarea("admin_notes", b.admin_notes), true)),
      h("footer", { class: "editor-footer" },
        status(),
        h("div", { class: "footer-actions" },
          upcoming ? h("button", { class: "button button--quiet", type: "button", onclick: setStatus("cancelled", `Cancel ${b.name}'s booking? They will get an email if they gave one.`) }, "Cancel booking") : null,
          b.status === "confirmed" && !upcoming ? h("button", { class: "button button--quiet", type: "button", onclick: setStatus("completed") }, "Mark done") : null,
          b.status === "confirmed" && !upcoming ? h("button", { class: "button button--quiet", type: "button", onclick: setStatus("no_show") }, "No-show") : null,
          h("button", { class: "button button--dark", type: "submit" }, "Save notes")))
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      guarded(form, () => rest(`bookings?id=eq.${id}`, { method: "PATCH", body: { admin_notes: form.elements.admin_notes.value } }));
    });
    reveal(form);
  }

  function showNewBlock() {
    view.selected = null;
    markSelected();
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
    const form = h("form", { class: "record-form" },
      heading("Block time", "Make time unavailable"),
      h("p", { class: "hint" }, "For gigs, travel or time off. Times already booked are not affected; cancel those separately."),
      h("div", { class: "form-grid" },
        field("From date", input("from_date", today, "date", { required: true })),
        field("From time", input("from_time", "09:00", "time", { required: true })),
        field("To date", input("to_date", today, "date", { required: true })),
        field("To time", input("to_time", "18:00", "time", { required: true })),
        field("Reason (only you see it)", input("reason", "", "text", { maxLength: 200 }), true)),
      h("footer", { class: "editor-footer" }, status(), h("button", { class: "button button--dark", type: "submit" }, "Block"))
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      guarded(form, async () => {
        const starts = toInstant(form.elements.from_date.value, form.elements.from_time.value);
        const ends = toInstant(form.elements.to_date.value, form.elements.to_time.value);
        if (ends <= starts) throw new Error("The end must be after the start.");
        await rest("booking_blocks", { method: "POST", body: { starts_at: starts, ends_at: ends, reason: form.elements.reason.value.trim() } });
        await refreshList();
      });
    });
    reveal(form);
  }

  function showBlock(block) {
    view.selected = block.id;
    markSelected();
    const form = h("form", { class: "record-form" },
      heading("Blocked time", slotLabel(block.starts_at, block.ends_at)),
      h("p", {}, block.reason || "No reason given."),
      h("footer", { class: "editor-footer" }, status(), h("button", { class: "button button--dark", type: "submit" }, "Remove block")));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      guarded(form, async () => {
        await rest(`booking_blocks?id=eq.${block.id}`, { method: "DELETE" });
        await refreshList();
        detail.replaceChildren(h("div", { class: "welcome" }, h("p", {}, "Block removed.")));
      });
    });
    reveal(form);
  }

  const WEEKDAYS = [[1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"], [5, "Friday"], [6, "Saturday"], [0, "Sunday"]];

  async function showSettings() {
    view.selected = null;
    markSelected();
    const [settings, hours, health] = await Promise.all([
      rest("booking_settings?select=*", { single: true }),
      rest("booking_hours?select=*"),
      rest("rpc/booking_system_status", { method: "POST", body: {} })
    ]);
    const byDay = Object.fromEntries(hours.map((row) => [row.weekday, row]));
    const form = h("form", { class: "record-form" },
      heading("Calendar", "Hours & settings"),
      checkbox("bookings_open", settings.bookings_open, "Bookings open (untick to pause all new bookings)"),
      h("div", { class: "rows hours" }, WEEKDAYS.map(([day, label]) => h("div", { class: "row hours-row" },
        checkbox(`open_${day}`, Boolean(byDay[day]), label),
        input(`opens_${day}`, byDay[day]?.opens?.slice(0, 5) || "09:00", "time", { "aria-label": `${label} opens` }),
        input(`closes_${day}`, byDay[day]?.closes?.slice(0, 5) || "18:00", "time", { "aria-label": `${label} closes` })))),
      h("div", { class: "form-grid" },
        field("Minimum notice (hours)", input("min_notice_hours", settings.min_notice_hours, "number", { min: "0", max: "336", required: true })),
        field("Bookable days ahead", input("days_ahead", settings.days_ahead, "number", { min: "1", max: "365", required: true })),
        field("Google Calendar ID (bookings are added here)", input("google_calendar_id", settings.google_calendar_id, "text", { placeholder: "e.g. your Gmail address" }), true),
        field("Other calendars that count as busy (one calendar ID per line)", textarea("busy_calendar_ids", (settings.busy_calendar_ids || []).join("\n"), 3), true),
        h("p", { class: "hint field--wide" }, "Find a calendar's ID in Google Calendar → Settings → the calendar → Integrate calendar. Share each one with the booking system's Google account (the service account email) with \"See only free/busy\"; nothing about the events is read."),
        field("Send alerts to", input("notify_email", settings.notify_email, "email", { required: true }), true)),
      h("footer", { class: "editor-footer" }, status(), h("button", { class: "button button--dark", type: "submit" }, "Save")),
      h("section", { class: "editor-section" }, heading("Health", "Google & email"),
        h("div", { class: "rows" },
          h("p", { class: "row" }, h("span", {}, "Google"), h("span", {}, health.calendar_error
            ? `Problem: ${health.calendar_error}`
            : health.calendar_refreshed_at ? `Busy times read ${when(health.calendar_refreshed_at)} (${health.busy_blocks} upcoming)` : "Not connected yet"), h("span", {}, "")),
          h("p", { class: "row" }, h("span", {}, "Email"), h("span", {}, health.last_email_error
            ? `Last error: ${health.last_email_error}`
            : health.last_email_sent ? `Last sent ${when(health.last_email_sent)}` : "Nothing sent yet"),
            h("span", {}, `${health.emails_waiting} waiting${health.emails_failed ? `, ${health.emails_failed} failed` : ""}`))))
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      guarded(form, async () => {
        const rows = [];
        for (const [day, label] of WEEKDAYS) {
          if (!form.elements[`open_${day}`].checked) continue;
          const opens = form.elements[`opens_${day}`].value;
          const closes = form.elements[`closes_${day}`].value;
          if (!opens || !closes || closes <= opens) throw new Error(`${label}: closing time must be after opening time.`);
          rows.push({ weekday: day, opens, closes });
        }
        await rest(`booking_settings?id=eq.true`, { method: "PATCH", body: {
          bookings_open: form.elements.bookings_open.checked,
          min_notice_hours: Number(form.elements.min_notice_hours.value),
          days_ahead: Number(form.elements.days_ahead.value),
          google_calendar_id: form.elements.google_calendar_id.value.trim(),
          busy_calendar_ids: [...new Set(form.elements.busy_calendar_ids.value.split(/[\s,]+/).map((id) => id.trim()).filter(Boolean))].slice(0, 20),
          notify_email: form.elements.notify_email.value.trim(),
          updated_at: new Date().toISOString()
        } });
        await rest("booking_hours?weekday=gte.0", { method: "DELETE" });
        if (rows.length) await rest("booking_hours", { method: "POST", body: rows });
      });
    });
    reveal(form);
  }

  // ---------- student pages and materials (stage 5) ----------
  // A student page is opened by its private link, kimina.co.ke/learn.html#<token>. It shows the
  // note and the materials given to it (or to all students). Files live in the private
  // Storage bucket "materials"; students get them through the `learn` Edge Function.

  const MAX_FILE = 50 * 1024 * 1024;
  const pageLink = (token) => `https://kimina.co.ke/learn.html#${token}`;
  const newToken = () => [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const fileSize = (bytes) => !bytes ? "" : bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

  async function storage(path, { method = "POST", body, contentType } = {}) {
    const token = await A().freshToken();
    const response = await fetch(`${A().SUPABASE_URL}/storage/v1/object/materials/${path}`, {
      method,
      headers: { apikey: A().SUPABASE_KEY, Authorization: `Bearer ${token}`, ...(contentType ? { "Content-Type": contentType, "x-upsert": "false" } : {}) },
      body
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || payload.error || `Upload failed (${response.status}).`);
    }
  }

  async function listStudentPages() {
    const filter = view.filter === "active" ? "&active=is.true" : "";
    const rows = await rest(`student_pages?select=id,name,active,last_opened_at&order=name${filter}`);
    list.replaceChildren(...(rows.length ? rows.map((row) => listButton(row.name,
      [row.active ? "" : "Switched off", row.last_opened_at ? `Opened ${when(row.last_opened_at)}` : "Not opened yet"].filter(Boolean).join(" · "),
      row.id, () => showStudentPage(row.id))) : [h("p", {}, "No student pages yet.")]));
  }

  // Ticks for which pages (or materials) are linked; returns the chosen ids.
  function checklist(name, options, chosen) {
    const box = h("fieldset", { class: "checklist" });
    if (!options.length) box.append(h("p", { class: "hint" }, "Nothing to choose yet."));
    for (const [id, label] of options) box.append(checkbox(`${name}:${id}`, chosen.has(id), label));
    return box;
  }
  const ticked = (form, name) => [...form.querySelectorAll(`input[name^="${name}:"]`)].filter((box) => box.checked).map((box) => box.name.slice(name.length + 1));

  async function showStudentPage(id) {
    view.selected = id;
    markSelected();
    const [page, materials, links] = await Promise.all([
      id ? rest(`student_pages?id=eq.${id}`, { single: true }) : Promise.resolve({ name: "", note: "", active: true }),
      rest("materials?select=id,title,kind,for_all&order=created_at.desc"),
      id ? rest(`material_pages?select=material_id&page_id=eq.${id}`) : Promise.resolve([])
    ]);
    const chosen = new Set(links.map((row) => row.material_id));
    const own = materials.filter((m) => !m.for_all);
    const shared = materials.filter((m) => m.for_all);
    const linkBox = id ? h("div", { class: "share" },
      h("p", { class: "eyebrow" }, "Private link"),
      h("p", { class: "share__link" }, pageLink(page.token)),
      h("div", { class: "share__actions" },
        h("button", { class: "button button--quiet", type: "button", onclick: async (event) => {
          await navigator.clipboard.writeText(pageLink(page.token)).catch(() => {});
          event.target.textContent = "Copied";
          setTimeout(() => { event.target.textContent = "Copy link"; }, 1800);
        } }, "Copy link"),
        h("a", { class: "button button--quiet", href: `https://wa.me/?text=${enc(`Your materials from Kimina: ${pageLink(page.token)}`)}`, target: "_blank", rel: "noopener" }, "Send on WhatsApp"),
        h("button", { class: "button button--quiet", type: "button", onclick: async (event) => {
          if (!confirm("Make a new link? The old link stops working straight away.")) return;
          event.target.disabled = true;
          try { await rest(`student_pages?id=eq.${id}`, { method: "PATCH", body: { token: newToken() } }); await showStudentPage(id); }
          catch (error) { event.target.disabled = false; alert(error.message); }
        } }, "New link")),
      h("p", { class: "hint" }, "Anyone with this link can open the page, so send it only to the student. \"New link\" ends the old one.")) : null;
    const form = h("form", { class: "record-form" },
      heading(id ? "Student page" : "New student page", id ? page.name : "Make a page for a student"),
      linkBox,
      h("div", { class: "form-grid" },
        field("Name (shown at the top of their page)", input("name", page.name, "text", { required: true, maxLength: 160 }), true),
        field("Note to the student (optional)", textarea("note", page.note, 5), true)),
      checkbox("active", page.active, "Link is on (switch off to stop access)"),
      h("p", { class: "eyebrow" }, "Files and links for this student"),
      checklist("m", own.map((m) => [m.id, `${m.title} (${m.kind === "file" ? "file" : "link"})`]), chosen),
      shared.length ? h("p", { class: "hint" }, `Every student also sees: ${shared.map((m) => m.title).join(", ")}.`) : null,
      h("footer", { class: "editor-footer" },
        status(),
        id ? h("button", { class: "button button--quiet", type: "button", onclick: async () => {
          if (!confirm(`Delete the page for ${page.name}? The link stops working. Files stay in Materials.`)) return;
          try { await rest(`student_pages?id=eq.${id}`, { method: "DELETE" }); await refreshList(); detail.replaceChildren(h("div", { class: "welcome" }, h("p", {}, "Page deleted."))); }
          catch (error) { alert(error.message); }
        } }, "Delete page") : null,
        h("button", { class: "button button--dark", type: "submit" }, id ? "Save" : "Create page"))
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      guarded(form, async () => {
        const body = { name: form.elements.name.value.trim(), note: form.elements.note.value.trim(), active: form.elements.active.checked };
        const saved = id ? (await rest(`student_pages?id=eq.${id}`, { method: "PATCH", body }))[0] : (await rest("student_pages", { method: "POST", body }))[0];
        await rest(`material_pages?page_id=eq.${saved.id}`, { method: "DELETE" });
        const picks = ticked(form, "m").map((material_id) => ({ material_id, page_id: saved.id }));
        if (picks.length) await rest("material_pages", { method: "POST", body: picks });
        await refreshList();
        if (!id) await showStudentPage(saved.id);
      });
    });
    reveal(form);
  }

  async function listMaterials() {
    const filter = view.filter === "files" ? "&kind=eq.file" : view.filter === "links" ? "&kind=eq.link" : "";
    const rows = await rest(`materials?select=id,title,kind,for_all,size_bytes,material_pages(count)&order=created_at.desc${filter}`);
    list.replaceChildren(...(rows.length ? rows.map((row) => listButton(row.title,
      [row.kind === "file" ? `File ${fileSize(row.size_bytes)}` : "Link",
        row.for_all ? "All students" : `${row.material_pages?.[0]?.count || 0} student${row.material_pages?.[0]?.count === 1 ? "" : "s"}`].join(" · "),
      row.id, () => showMaterial(row.id))) : [h("p", {}, "No files or links yet.")]));
  }

  async function showMaterial(id) {
    view.selected = id;
    markSelected();
    const [item, pages, links] = await Promise.all([
      id ? rest(`materials?id=eq.${id}`, { single: true }) : Promise.resolve({ kind: "file", title: "", description: "", url: "", for_all: false }),
      rest("student_pages?select=id,name,active&order=name"),
      id ? rest(`material_pages?select=page_id&material_id=eq.${id}`) : Promise.resolve([])
    ]);
    const chosen = new Set(links.map((row) => row.page_id));
    const kind = select("kind", [["file", "A file (PDF, audio, project, samples)"], ["link", "A link (Google Drive, YouTube…)"]], item.kind);
    if (id) kind.disabled = true;
    const fileField = field(id ? "File" : "File (up to 50 MB)", id
      ? h("p", { class: "hint" }, `${item.file_name || ""} ${fileSize(item.size_bytes)}`.trim())
      : input("file", "", "file"), true);
    const urlField = field("Link (starts with https://)", input("url", item.url || "", "url", { maxLength: 2000, placeholder: "https://" }), true);
    const sync = () => { fileField.hidden = kind.value !== "file"; urlField.hidden = kind.value !== "link"; };
    kind.addEventListener("change", sync);
    const pagesBox = checklist("p", pages.map((p) => [p.id, p.active ? p.name : `${p.name} (link off)`]), chosen);
    const forAll = checkbox("for_all", item.for_all, "Give this to all students");
    const syncAll = () => { pagesBox.disabled = form.elements.for_all.checked; };
    const form = h("form", { class: "record-form" },
      heading(id ? "Material" : "Add a file or link", id ? item.title : "For your students"),
      h("div", { class: "form-grid" },
        field("Type", kind, true),
        fileField,
        urlField,
        field("Title (what students see)", input("title", item.title, "text", { required: true, maxLength: 200 }), true),
        field("Short description (optional)", textarea("description", item.description, 3), true)),
      forAll,
      h("p", { class: "eyebrow" }, "Or choose students"),
      pagesBox,
      h("footer", { class: "editor-footer" },
        status(),
        id ? h("button", { class: "button button--quiet", type: "button", onclick: async () => {
          if (!confirm(`Delete "${item.title}"? Students lose it straight away.`)) return;
          try {
            if (item.storage_path) await storage(item.storage_path.split("/").map(enc).join("/"), { method: "DELETE" }).catch(() => {});
            await rest(`materials?id=eq.${id}`, { method: "DELETE" });
            await refreshList();
            detail.replaceChildren(h("div", { class: "welcome" }, h("p", {}, "Deleted.")));
          } catch (error) { alert(error.message); }
        } }, "Delete") : null,
        h("button", { class: "button button--dark", type: "submit" }, id ? "Save" : "Add"))
    );
    form.elements.for_all.addEventListener("change", syncAll);
    sync();
    syncAll();
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      guarded(form, async () => {
        const body = { title: form.elements.title.value.trim(), description: form.elements.description.value.trim(), for_all: form.elements.for_all.checked };
        if (!id && kind.value === "file") {
          const file = form.elements.file.files[0];
          if (!file) throw new Error("Choose a file to upload.");
          if (file.size > MAX_FILE) throw new Error("That file is over 50 MB. Upload it to Google Drive and add it as a link instead.");
          const safe = file.name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-").slice(-120) || "file";
          const path = `${crypto.randomUUID()}/${safe}`;
          form.querySelector(".record-status").textContent = "Uploading…";
          await storage(path.split("/").map(enc).join("/"), { body: file, contentType: file.type || "application/octet-stream" });
          Object.assign(body, { kind: "file", storage_path: path, file_name: file.name.slice(0, 255), size_bytes: file.size });
        }
        if (kind.value === "link") {
          const url = form.elements.url.value.trim();
          if (!/^https:\/\//.test(url)) throw new Error("The link must start with https://");
          Object.assign(body, id ? { url } : { kind: "link", url });
        }
        const saved = id ? (await rest(`materials?id=eq.${id}`, { method: "PATCH", body }))[0] : (await rest("materials", { method: "POST", body }))[0];
        await rest(`material_pages?material_id=eq.${saved.id}`, { method: "DELETE" });
        const picks = body.for_all ? [] : ticked(form, "p").map((page_id) => ({ material_id: saved.id, page_id }));
        if (picks.length) await rest("material_pages", { method: "POST", body: picks });
        await refreshList();
        if (!id) await showMaterial(saved.id);
      });
    });
    reveal(form);
  }

  // ---------- start ----------

  let ready = false;
  async function init() {
    if (!ready) {
      ready = true;
      for (const button of document.querySelectorAll("#record-nav button")) button.addEventListener("click", () => open(button.dataset.records));
    }
    try {
      [services, lessons] = await Promise.all([
        rest("services?select=id,name,price_kes&active=is.true&order=sort_order"),
        rest("lessons?select=id,title&order=title")
      ]);
    } catch { /* lists stay empty; the screens still work */ }
    refreshBadge();
  }

  window.kiminaRecords = { init };
  if (window.kiminaAdmin && !$("#studio").hidden) init();
})();
