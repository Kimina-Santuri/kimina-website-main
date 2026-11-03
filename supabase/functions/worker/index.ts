// Background worker for the booking calendar, called by pg_cron every 5 minutes (and by the
// `booking` function right after a booking). It only runs with the secret kept in Vault.
// Each run: queue day-before reminders, copy busy times from Kimina's Google Calendar, add
// or remove booking events in that calendar, and send queued emails through Zoho SMTP.
import nodemailer from "npm:nodemailer@6.9.16";
import { busyBetween, google, googleConfigured } from "../_shared/google.ts";
import { emailFor } from "./emails.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function rpc(name: string, args: Record<string, unknown> = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${name}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function settings() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/booking_settings?select=google_calendar_id,days_ahead`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return (await response.json())[0] as { google_calendar_id: string; days_ahead: number };
}

type Job = {
  id: string; status: string; name: string; email: string | null; phone: string | null; message: string;
  service: string; starts_at: string; ends_at: string; google_event_id: string | null; calendar_id: string;
};

function eventBody(job: Job) {
  const prefix = job.status === "completed" ? "✓ " : job.status === "no_show" ? "No-show: " : "";
  const lines = [
    `${job.service}`,
    job.email ? `Email: ${job.email}` : "",
    job.phone ? `Phone: ${job.phone}` : "",
    job.message ? `\n${job.message}` : "",
    "\nBooked on kimina.co.ke. Manage it at https://kimina.co.ke/admin/",
  ].filter(Boolean);
  return {
    summary: `${prefix}${job.service}: ${job.name}`,
    description: lines.join("\n"),
    start: { dateTime: job.starts_at, timeZone: "Africa/Nairobi" },
    end: { dateTime: job.ends_at, timeZone: "Africa/Nairobi" },
  };
}

async function syncEvent(job: Job) {
  const path = `calendars/${encodeURIComponent(job.calendar_id)}/events`;
  if (job.status === "cancelled") {
    if (job.google_event_id) {
      const response = await google(`${path}/${job.google_event_id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404 && response.status !== 410) {
        throw new Error(`delete ${response.status}: ${(await response.text()).slice(0, 200)}`);
      }
    }
    return null;
  }
  // A fixed id per booking makes a repeated insert harmless.
  const id = job.google_event_id || `kb${job.id.replaceAll("-", "")}`;
  let response = await google(`${path}/${id}`, { method: "PATCH", body: JSON.stringify(eventBody(job)) });
  if (response.status === 404) {
    response = await google(path, { method: "POST", body: JSON.stringify({ id, ...eventBody(job) }) });
  }
  if (!response.ok) throw new Error(`save ${response.status}: ${(await response.text()).slice(0, 200)}`);
  return id;
}

async function runCalendar(report: Record<string, unknown>) {
  if (!googleConfigured()) return (report.calendar = "Google is not set up yet");
  const { google_calendar_id: calendarId, days_ahead } = await settings();
  if (!calendarId) return (report.calendar = "No calendar ID in /admin settings yet");
  try {
    const now = new Date();
    const busy = await busyBetween(calendarId, now, new Date(now.getTime() + (days_ahead + 1) * 86400_000));
    await rpc("set_calendar_busy", { p_busy: busy, p_error: null });
    report.busy = busy.length;
  } catch (error) {
    await rpc("set_calendar_busy", { p_busy: [], p_error: String((error as Error).message) });
    report.busy_error = String((error as Error).message);
    return;
  }
  const jobs: Job[] = await rpc("calendar_jobs");
  let synced = 0;
  for (const job of jobs) {
    try {
      const eventId = await syncEvent({ ...job, calendar_id: calendarId });
      await rpc("calendar_done", { p_id: job.id, p_event_id: eventId, p_error: null });
      synced++;
    } catch (error) {
      await rpc("calendar_done", { p_id: job.id, p_event_id: null, p_error: String((error as Error).message) });
    }
  }
  report.events = synced;
}

async function runEmails(report: Record<string, unknown>) {
  // Cleaned: a pasted value often carries a space, line break or invisible character, which Zoho refuses.
  const user = Deno.env.get("SMTP_USER")?.replace(/[^\x21-\x7e]/g, "");
  const pass = Deno.env.get("SMTP_PASS")?.replace(/\s/g, "");
  if (!user || !pass) {
    // Names only, never values: shows a misspelt or mis-cased secret name (for example "SMTP_PASS ").
    let seen: string[] = [];
    try { seen = Object.keys(Deno.env.toObject()).filter((key) => /smtp/i.test(key)).map((key) => JSON.stringify(key)); } catch { /* not allowed */ }
    const missing = [!user && "SMTP_USER", !pass && "SMTP_PASS"].filter(Boolean).join(" and ");
    return (report.email = `SMTP is not set up yet: ${missing} missing${seen.length ? `; found ${seen.join(", ")}` : ""}`);
  }
  // Only sign in to Zoho when there is something to send (cron runs every 5 minutes).
  const jobs = await rpc("claim_emails", { p_limit: 20 });
  if (!jobs.length) return (report.emails = 0);
  const port = Number(Deno.env.get("SMTP_PORT")?.trim() || 465);
  const make = (host: string, method: string) =>
    nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass }, authMethod: method });
  // Find a server and sign-in method that Zoho accepts: SMTP_HOST if set, else Zoho's server for
  // organisation accounts, then the one for free/personal accounts; PLAIN, then LOGIN.
  const hosts = Deno.env.get("SMTP_HOST")?.trim() ? [Deno.env.get("SMTP_HOST")!.trim()] : ["smtppro.zoho.com", "smtp.zoho.com"];
  let host = hosts[0], method = "PLAIN";
  const tried: string[] = [];
  search: for (const candidate of hosts) {
    for (const candidateMethod of ["PLAIN", "LOGIN"]) {
      try { await make(candidate, candidateMethod).verify(); host = candidate; method = candidateMethod; break search; }
      catch (error) { tried.push(`${candidate} ${candidateMethod}: ${String((error as Error).message).slice(0, 80)}`); }
    }
  }
  report.smtp = tried.length === hosts.length * 2 ? { failed: tried } : `${host} ${method}`;
  // First 6 hex characters of the password's SHA-256: lets Kimina compare it with a local test without revealing it.
  const fingerprint = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pass)))]
    .map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 6);
  const transporter = make(host, method);
  const from = `${Deno.env.get("SMTP_SENDER_NAME") || "Kimina"} <${Deno.env.get("SMTP_FROM") || user}>`;
  let sent = 0;
  for (const job of jobs) {
    try {
      const mail = emailFor(job.kind, job.payload);
      await transporter.sendMail({ from, to: job.recipient, ...mail });
      await rpc("complete_email", { p_id: job.id, p_error: null });
      sent++;
    } catch (error) {
      // Server, port and username (never the password) help tell a wrong password from a wrong server.
      const detail = `${String((error as Error).message)} [${host}:${port} ${method} as ${user} (${user.length} characters), password ${pass.length} characters, fingerprint ${fingerprint}]`;
      await rpc("complete_email", { p_id: job.id, p_error: detail.slice(0, 500) });
    }
  }
  report.emails = sent;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = request.headers.get("x-worker-secret") || "";
  if (!secret || !(await rpc("worker_check", { p_secret: secret }))) return new Response("Unauthorized", { status: 401 });
  const report: Record<string, unknown> = {};
  for (const [name, step] of [
    ["reminders", async () => { report.reminders = await rpc("queue_booking_reminders"); }],
    ["calendar", () => runCalendar(report)],
    ["email", () => runEmails(report)],
  ] as const) {
    try {
      await step();
    } catch (error) {
      report[`${name}_error`] = String((error as Error).message);
      console.error(name, error);
    }
  }
  return Response.json(report);
});
