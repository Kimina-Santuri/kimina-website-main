// Google Calendar access through a service account (the same method as Santuri Bookings).
// Secrets: GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY (the "private_key" value from
// the service account's JSON file; literal \n sequences are accepted). Kimina shares their
// calendar with the service account's email with "Make changes to events".
const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

export function googleConfigured() {
  return Boolean(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") && Deno.env.get("GOOGLE_PRIVATE_KEY"));
}

let cached: { token: string; expires: number } | null = null;

export async function googleToken(): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const email = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const pem = Deno.env.get("GOOGLE_PRIVATE_KEY")?.replace(/\\n/g, "\n");
  if (!email || !pem) throw new Error("Google credentials are not configured");
  const raw = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", raw, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = b64url(enc.encode(JSON.stringify({
    iss: email,
    // calendar.events adds and removes booking events; calendar.freebusy reads busy times.
    scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })));
  const input = `${header}.${claims}`;
  const signature = b64url(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(input))));
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${input}.${signature}` }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Google sign-in failed (${response.status})`);
  const token = (await response.json()).access_token as string;
  cached = { token, expires: Date.now() + 3500_000 };
  return token;
}

export async function google(path: string, init: RequestInit = {}) {
  return fetch(`https://www.googleapis.com/calendar/v3/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await googleToken()}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
  });
}

// Busy periods across several calendars between two times (titles are never read). Returns the
// merged busy list plus a problem message per calendar that could not be read, so one unshared
// calendar does not hide the others.
export async function busyAcross(calendarIds: string[], from: Date, to: Date) {
  const ids = [...new Set(calendarIds.map((id) => id.trim()).filter(Boolean))].slice(0, 20);
  const response = await google("freeBusy", {
    method: "POST",
    body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), timeZone: "Africa/Nairobi", items: ids.map((id) => ({ id })) }),
  });
  if (!response.ok) throw new Error(`Google free/busy failed (${response.status}): ${(await response.text()).slice(0, 200)}`);
  const calendars = (await response.json()).calendars || {};
  const busy: { start: string; end: string }[] = [];
  const problems: string[] = [];
  for (const id of ids) {
    const result = calendars[id];
    if (!result || result.errors?.length) {
      const reason = result?.errors?.[0]?.reason || "missing";
      problems.push(reason === "notFound" ? `${id} is not shared with the booking system` : `${id}: ${reason}`);
      continue;
    }
    busy.push(...(result.busy || []));
  }
  busy.sort((a, b) => a.start.localeCompare(b.start));
  return { busy, problems, readable: ids.length - problems.length };
}
