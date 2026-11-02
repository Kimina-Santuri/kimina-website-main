// Records screens for /admin: enquiries, people (clients and students) and invoices with
// payments. Talks straight to the Supabase tables with the signed-in admin's token; the
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
    view.filter = screen === "people" ? "all" : "open";
    view.search = "";
    A().showArea("records");
    for (const button of document.querySelectorAll("#record-nav button")) button.setAttribute("aria-current", button.dataset.records === screen ? "page" : "false");
    $("#collection-label").textContent = "Records";
    $("#editor-title").textContent = { enquiries: "Enquiries", people: "People", invoices: "Invoices" }[screen];
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
    const filters = {
      enquiries: [["open", "Open"], ["all", "All"]],
      people: [["all", "All"], ["clients", "Clients"], ["students", "Students"]],
      invoices: [["open", "Unpaid"], ["all", "All"]]
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
