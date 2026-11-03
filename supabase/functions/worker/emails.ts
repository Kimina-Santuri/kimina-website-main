// Email wording for the booking calendar and Contact alerts. Plain and short, with a text
// version for every message. All values are escaped before they go into the HTML version.
type Payload = Record<string, unknown>;
type Mail = { subject: string; text: string; html: string; replyTo?: string };

const SITE = "https://kimina.co.ke";
const escape = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const day = (value: unknown) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(String(value)));
const time = (value: unknown) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(String(value)));
const when = (p: Payload) => `${day(p.starts_at)}, ${time(p.starts_at)}–${time(p.ends_at)} (Nairobi time)`;
const cancelLink = (p: Payload) => `${SITE}/bookings.html?cancel=${p.cancel_token}#book`;

function build(subject: string, greeting: string, paragraphs: string[], details: [string, unknown][], link?: [string, string], replyTo?: string): Mail {
  const rows = details.filter(([, value]) => value != null && String(value).trim() !== "");
  const text = [
    greeting,
    "",
    ...paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ...(link ? ["", `${link[0]}: ${link[1]}`] : []),
    "",
    "Kimina",
    SITE,
  ].join("\n");
  const html = `<div style="font-family:Menlo,Consolas,monospace;font-size:14px;line-height:1.6;color:#050505;max-width:560px">
<p style="font-size:28px;letter-spacing:-.08em;margin:0 0 24px">K.</p>
<p>${escape(greeting)}</p>
${paragraphs.map((paragraph) => `<p>${escape(paragraph)}</p>`).join("\n")}
${rows.length ? `<table style="border-collapse:collapse;margin:8px 0 16px">${rows.map(([label, value]) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#666;vertical-align:top">${escape(label)}</td><td style="padding:4px 0;white-space:pre-wrap">${escape(value)}</td></tr>`).join("")}</table>` : ""}
${link ? `<p><a href="${escape(link[1])}" style="color:#050505">${escape(link[0])}</a></p>` : ""}
<p style="margin-top:28px;border-top:1px solid #050505;padding-top:12px">Kimina<br><a href="${SITE}" style="color:#050505">kimina.co.ke</a></p>
</div>`;
  return { subject, text, html, ...(replyTo ? { replyTo } : {}) };
}

export function emailFor(kind: string, p: Payload): Mail {
  const hello = `Hello ${p.name || "there"},`;
  const session: [string, unknown][] = [["Session", p.service], ["When", when(p)], ["Price", p.price_note]];
  const client: [string, unknown][] = [["Name", p.name], ["Email", p.email], ["Phone", p.phone], ["Message", p.message]];
  switch (kind) {
    case "booking_confirmed":
      return build(`Booked: ${p.service}, ${day(p.starts_at)}`, hello,
        ["Your session is booked. Reply to this email if you have a question."],
        session, ["Cancel this booking", cancelLink(p)]);
    case "booking_reminder":
      return build(`Tomorrow: ${p.service}`, hello, ["A reminder that your session is tomorrow."],
        session, ["Can't make it? Cancel the booking", cancelLink(p)]);
    case "booking_cancelled":
      return p.cancelled_by === "admin"
        ? build(`Cancelled: ${p.service}, ${day(p.starts_at)}`, hello,
          ["I'm sorry, I have had to cancel this session. Please choose another time that suits you."],
          session, ["Book a new time", `${SITE}/bookings.html#book`])
        : build(`Cancelled: ${p.service}, ${day(p.starts_at)}`, hello,
          ["Your booking is cancelled. You are welcome to book another time."],
          session, ["Book a new time", `${SITE}/bookings.html#book`]);
    case "booking_moved":
      return build(`New time: ${p.service}`, hello, ["Your session has moved to a new time."],
        session, ["Cancel this booking", cancelLink(p)]);
    case "booking_new":
      return build(`New booking: ${p.name}, ${day(p.starts_at)} ${time(p.starts_at)}`, "New booking on kimina.co.ke.",
        [], [...session, ...client], ["Open /admin", `${SITE}/admin/`], String(p.email || "") || undefined);
    case "booking_cancelled_notice":
      return build(`Cancelled by client: ${p.name}, ${day(p.starts_at)} ${time(p.starts_at)}`,
        "A client cancelled their booking. The time is free again.", [], [...session, ...client],
        ["Open /admin", `${SITE}/admin/`], String(p.email || "") || undefined);
    case "enquiry_alert":
      return build(`New message: ${p.name}`, "New message from the Contact page.", [],
        [["Topic", p.topic], ...client], ["Open /admin", `${SITE}/admin/`], String(p.email || "") || undefined);
    default:
      throw new Error(`Unknown email kind ${kind}`);
  }
}
