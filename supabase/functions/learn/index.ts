// Public endpoint for kimina.co.ke/learn.html, a student's materials page opened by its private
// link (the 48-hex token after the #). `page` returns the note and the list of files and links;
// `file` returns a download link for one file that works for 5 minutes. The token is the only
// key, so pages are read with the service role through public.student_page()/student_file().

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE = "https://kimina.co.ke";
const ALLOWED_ORIGINS = new Set([SITE, "https://www.kimina.co.ke", "http://127.0.0.1:8080", "http://localhost:8080"]);
const TOKEN = /^[0-9a-f]{48}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function cors(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : SITE,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

async function rpc(name: string, args: Record<string, unknown>) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${name}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function signedUrl(path: string, fileName: string) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/materials/${encoded}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 300 }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.signedURL) throw new Error(`sign: ${response.status} ${JSON.stringify(payload).slice(0, 200)}`);
  // ?download= makes the browser save the file under its original name.
  return `${SUPABASE_URL}/storage/v1${payload.signedURL}&download=${encodeURIComponent(fileName)}`;
}

Deno.serve(async (request) => {
  const headers = cors(request.headers.get("origin"));
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  const reply = (status: number, payload: unknown) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  if (request.method !== "POST") return reply(405, { result: "error" });

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return reply(400, { result: "error" });
  }
  const token = String(body.token || "");
  if (!TOKEN.test(token)) return reply(404, { result: "not_found" });
  try {
    if (body.action === "page") {
      const page = await rpc("student_page", { p_token: token });
      return page ? reply(200, { result: "ok", page }) : reply(404, { result: "not_found" });
    }
    if (body.action === "file") {
      const id = String(body.id || "");
      if (!UUID.test(id)) return reply(404, { result: "not_found" });
      const file = await rpc("student_file", { p_token: token, p_material: id });
      if (!file?.path) return reply(404, { result: "not_found" });
      return reply(200, { result: "ok", url: await signedUrl(file.path, file.file_name || "download") });
    }
    return reply(400, { result: "error" });
  } catch (error) {
    console.error(error);
    return reply(500, { result: "error" });
  }
});
