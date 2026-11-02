// Public endpoint for the Contact-page form on kimina.co.ke.
// Accepts the form as JSON (from contact-form.js) or as a plain form post (no JavaScript),
// checks it, drops obvious bots, and stores it through public.submit_enquiry(), which only
// the service role may call and which limits how often one visitor can send.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE = "https://kimina.co.ke";
const ALLOWED_ORIGINS = new Set([SITE, "https://www.kimina.co.ke", "http://127.0.0.1:8080", "http://localhost:8080"]);
const TOPICS = new Set(["collaboration", "education", "live-sound", "booking", "press", "general"]);
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function cors(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : SITE,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

async function hashIp(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const bytes = new TextEncoder().encode(`${ip}|${SERVICE_KEY.slice(-16)}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function check(form: Record<string, string>) {
  const name = (form.name || "").trim();
  const email = (form.email || "").trim();
  const phone = (form.phone || "").trim();
  const message = (form.message || "").trim();
  const topic = TOPICS.has(form.topic) ? form.topic : "general";
  if (!name || name.length > 160) return { error: "Please add your name." };
  if (!email && !phone) return { error: "Please add an email address or a phone number so I can reply." };
  if (email && (!EMAIL.test(email) || email.length > 254)) return { error: "That email address does not look right." };
  if (phone && !/^[+0-9 ()-]{7,40}$/.test(phone)) return { error: "That phone number does not look right." };
  if (!message) return { error: "Please write a message." };
  if (message.length > 5000) return { error: "Please keep the message under 5,000 characters." };
  return { name, email, phone, topic, message };
}

// Bots fill the hidden "website" field or post within a couple of seconds of the page loading.
function looksLikeBot(form: Record<string, string>) {
  if ((form.website || "").trim()) return true;
  const started = Number(form.started || 0);
  return started > 0 && Date.now() - started < 3000;
}

Deno.serve(async (request) => {
  const headers = cors(request.headers.get("origin"));
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  const type = request.headers.get("content-type") || "";
  const isJson = type.includes("application/json");
  const answer = (status: number, result: "sent" | "error" | "limited", message: string) => {
    if (isJson) {
      return new Response(JSON.stringify({ result, message }), {
        status,
        headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
    // Plain form post: send the visitor back to the Contact page with the outcome.
    return new Response(null, { status: 303, headers: { Location: `${SITE}/contact.html#enquiry-${result}` } });
  };

  if (request.method !== "POST") return answer(405, "error", "Method not allowed.");
  let form: Record<string, string>;
  try {
    if (isJson) form = await request.json();
    else form = Object.fromEntries([...(await request.formData()).entries()].map(([k, v]) => [k, String(v)]));
  } catch {
    return answer(400, "error", "The form could not be read.");
  }

  if (looksLikeBot(form)) return answer(200, "sent", "Thank you. Your message has been sent.");
  const checked = check(form);
  if ("error" in checked) return answer(400, "error", checked.error!);

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_enquiry`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_name: checked.name, p_email: checked.email, p_phone: checked.phone,
      p_topic: checked.topic, p_message: checked.message, p_ip_hash: await hashIp(request),
    }),
  });
  if (!response.ok) {
    console.error("submit_enquiry failed", response.status, await response.text());
    return answer(500, "error", "Something went wrong. Please try again later.");
  }
  if ((await response.json()) === "limited") {
    return answer(429, "limited", "Too many messages for now. Please try again later.");
  }
  return answer(200, "sent", "Thank you. Your message has been sent.");
});
