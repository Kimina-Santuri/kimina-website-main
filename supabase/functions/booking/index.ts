// Public endpoint for the booking calendar on kimina.co.ke/bookings.html: make a booking, look one up by its cancel link,
// or cancel it. Free times are read straight from public.booking_slots(); this function only
// handles changes. Before saving, it asks Google Calendar about that exact time (if set up),
// then public.create_booking() re-checks the slot, limits repeat bookings and saves it.
import { busyAcross, googleConfigured } from "../_shared/google.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE = "https://kimina.co.ke";
const ALLOWED_ORIGINS = new Set([SITE, "https://www.kimina.co.ke", "http://127.0.0.1:8080", "http://localhost:8080"]);
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const TOKEN = /^[0-9a-f]{48}$/;

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;

function cors(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : SITE,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

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

async function hashIp(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${SERVICE_KEY.slice(-16)}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

// Runs the worker now so the confirmation email and calendar event don't wait for the next 5-minute run.
async function nudgeWorker() {
  try {
    const secret = await rpc("worker_secret");
    await fetch(`${SUPABASE_URL}/functions/v1/worker`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-worker-secret": secret },
      body: "{}",
    });
  } catch (error) {
    console.error("worker nudge failed", error);
  }
}

async function googleSaysBusy(service: string, startsAt: Date) {
  if (!googleConfigured()) return false;
  try {
    const settings = await (await fetch(`${SUPABASE_URL}/rest/v1/booking_settings?select=google_calendar_id,busy_calendar_ids`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })).json();
    const calendarId = settings?.[0]?.google_calendar_id;
    if (!calendarId) return false;
    const services: { slug: string; session_minutes: number }[] = await rpc("booking_services");
    const minutes = services.find((item) => item.slug === service)?.session_minutes || 60;
    const extra: string[] = settings?.[0]?.busy_calendar_ids || [];
    const { busy } = await busyAcross([calendarId, ...extra], startsAt, new Date(startsAt.getTime() + minutes * 60_000));
    return busy.length > 0;
  } catch (error) {
    // If Google is unreachable, the copy of busy times (refreshed every 5 minutes) still applies.
    console.error("live Google check failed", error);
    return false;
  }
}

async function book(form: Record<string, string>, request: Request) {
  if ((form.website || "").trim()) return { result: "booked", fake: true };
  const started = Number(form.started || 0);
  if (started > 0 && Date.now() - started < 4000) return { result: "booked", fake: true };

  const name = String(form.name || "").trim();
  const email = String(form.email || "").trim();
  const phone = String(form.phone || "").trim();
  const message = String(form.message || "").trim();
  const service = String(form.service || "");
  const startsAt = new Date(String(form.starts_at || ""));
  if (!/^[a-z0-9-]{1,60}$/.test(service) || Number.isNaN(startsAt.getTime())) return { result: "error", message: "Please choose a service and a time." };
  if (!name || name.length > 160) return { result: "error", message: "Please add your name." };
  if (!email && !phone) return { result: "error", message: "Please add an email address or a phone number." };
  if (email && (!EMAIL.test(email) || email.length > 254)) return { result: "error", message: "That email address does not look right." };
  if (phone && !/^[+0-9 ()-]{7,40}$/.test(phone)) return { result: "error", message: "That phone number does not look right." };
  if (message.length > 2000) return { result: "error", message: "Please keep the note under 2,000 characters." };

  if (await googleSaysBusy(service, startsAt)) return { result: "taken" };
  const outcome = await rpc("create_booking", {
    p_service: service, p_starts_at: startsAt.toISOString(), p_name: name, p_email: email, p_phone: phone,
    p_message: message, p_ip_hash: await hashIp(request),
  });
  if (outcome?.result === "booked") {
    const nudge = nudgeWorker();
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(nudge);
  }
  return outcome;
}

Deno.serve(async (request) => {
  const headers = cors(request.headers.get("origin"));
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  const reply = (status: number, payload: unknown) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  if (request.method !== "POST") return reply(405, { result: "error", message: "Method not allowed." });

  let form: Record<string, string>;
  try {
    form = await request.json();
  } catch {
    return reply(400, { result: "error", message: "The request could not be read." });
  }
  try {
    if (form.action === "book") {
      const outcome = await book(form, request);
      const status = outcome?.result === "booked" ? 200 : outcome?.result === "limited" ? 429 : outcome?.result === "taken" ? 409 : 400;
      return reply(status, outcome);
    }
    if (form.action === "lookup" || form.action === "cancel") {
      const token = String(form.token || "");
      if (!TOKEN.test(token)) return reply(404, { result: "not_found" });
      if (form.action === "lookup") {
        const booking = await rpc("booking_by_token", { p_token: token });
        return booking ? reply(200, { result: "found", booking }) : reply(404, { result: "not_found" });
      }
      const result = await rpc("cancel_booking_by_token", { p_token: token });
      if (result === "cancelled") {
        const nudge = nudgeWorker();
        if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(nudge);
      }
      return reply(result === "cancelled" || result === "already" ? 200 : 400, { result });
    }
    return reply(400, { result: "error", message: "Unknown action." });
  } catch (error) {
    console.error(error);
    return reply(500, { result: "error", message: "Something went wrong. Please try again." });
  }
});
