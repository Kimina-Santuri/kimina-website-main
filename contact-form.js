// Sends the Contact form without leaving the page. Without JavaScript the form still posts
// to the same address and the visitor returns to contact.html#enquiry-sent (or -error).
(() => {
  const form = document.getElementById("enquiry");
  if (!form || !window.fetch) return;
  const status = form.querySelector(".enquiry-status");
  const button = form.querySelector('button[type="submit"]');
  form.elements.started.value = String(Date.now());

  // Topic links (?topic=education#enquiry) choose the topic; they also work as plain links.
  const chooseTopic = (topic) => {
    if (topic && [...form.elements.topic.options].some((option) => option.value === topic)) form.elements.topic.value = topic;
  };
  chooseTopic(new URLSearchParams(window.location.search).get("topic"));
  document.querySelectorAll("a[data-topic]").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    chooseTopic(link.dataset.topic);
    form.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    form.elements.name.focus({ preventScroll: true });
  }));

  const show = (message, error = false) => {
    status.textContent = message;
    status.classList.toggle("is-error", error);
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.elements.email.value.trim() && !form.elements.phone.value.trim()) {
      show("Please add an email address or a phone number so I can reply.", true);
      form.elements.email.focus();
      return;
    }
    button.disabled = true;
    show("Sending…");
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      const response = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const reply = await response.json();
      show(reply.message, reply.result !== "sent");
      if (reply.result === "sent") {
        form.reset();
        form.elements.started.value = String(Date.now());
      }
    } catch {
      show("No connection. Your message is still here; try again when you are back online.", true);
    }
    button.disabled = false;
  });
})();
