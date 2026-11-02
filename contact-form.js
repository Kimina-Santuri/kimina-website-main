// Sends the Contact form without leaving the page. Without JavaScript the form still posts
// to the same address and the visitor returns to contact.html#enquiry-sent (or -error).
(() => {
  const form = document.getElementById("enquiry");
  if (!form || !window.fetch) return;
  const status = form.querySelector(".enquiry-status");
  const button = form.querySelector('button[type="submit"]');
  form.elements.started.value = String(Date.now());

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
      show("No connection. Your message is still here; try again, or email kimina@santuri.org.", true);
    }
    button.disabled = false;
  });
})();
