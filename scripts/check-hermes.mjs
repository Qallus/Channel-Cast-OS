/**
 * Verifies a Hermes Agent deployment end to end: reachable, key accepted,
 * profile present, and able to answer. Works against local or the VPS.
 *
 *   node scripts/check-hermes.mjs                         # uses .env
 *   node scripts/check-hermes.mjs --url http://localhost:8642 --key ... --model channelcast
 *
 * Each failure maps to a cause, so a red line tells you what to change.
 */
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const url = (arg("url") || process.env.HERMES_API_URL || process.env.HERMES_URL || "").trim().replace(/\/+$/, "");
const key = (arg("key") || process.env.HERMES_API_KEY || "").trim();
const model = (arg("model") || process.env.HERMES_MODEL || "").trim();

const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m, why) => { console.log(`  FAIL  ${m}`); if (why) console.log(`        ${why}`); };

if (!url) {
  console.log("No Hermes URL. Set HERMES_API_URL in .env or pass --url.");
  process.exit(1);
}
console.log(`Checking Hermes at ${url}\n`);

let healthy = false;
try {
  const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(8000) });
  if (res.ok) { healthy = true; ok(`GET /health -> ${res.status}`); }
  else bad(`GET /health -> ${res.status}`, "Reached a server, but not Hermes. In Coolify, map the domain to port 8642.");
} catch (e) {
  const hint = /certificate|TLS|SSL/i.test(e.message || "")
    ? "TLS is not ready. The certificate issues once the domain is routed to the app."
    : "Nothing answered. The app may not be deployed, or the domain is not attached to it yet.";
  bad("GET /health", `${e.message || e}. ${hint}`);
}

if (!key) {
  console.log("\nNo API key set, so authorization was not checked. Set HERMES_API_KEY (same value as API_SERVER_KEY in the Hermes app).");
  process.exit(healthy ? 0 : 1);
}

let models = [];
try {
  const res = await fetch(`${url}/v1/models`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 401 || res.status === 403) {
    bad(`GET /v1/models -> ${res.status}`, "Key rejected. HERMES_API_KEY here must equal API_SERVER_KEY in the Hermes app.");
  } else if (!res.ok) {
    bad(`GET /v1/models -> ${res.status}`);
  } else {
    const body = await res.json().catch(() => ({}));
    models = (body.data || []).map((m) => m.id).filter(Boolean);
    ok(`GET /v1/models -> 200 (${models.length ? models.join(", ") : "no profiles yet"})`);
  }
} catch (e) {
  bad("GET /v1/models", String(e.message || e));
}

if (!model) {
  console.log("\nNo HERMES_MODEL set. Hermes advertises PROFILE names as models, so set it to one of the names above.");
  process.exit(1);
}

if (models.length && !models.includes(model)) {
  bad(`profile "${model}"`, `Not advertised by Hermes. Available: ${models.join(", ") || "none"}. Create the profile or fix HERMES_MODEL.`);
} else if (models.length) {
  ok(`profile "${model}" is advertised`);
}

try {
  const res = await fetch(`${url}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, stream: false, messages: [{ role: "user", content: "Reply with OK" }] }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const detail = res.status === 404 ? `No profile named "${model}".` : "";
    bad(`POST /v1/chat/completions -> ${res.status}`, detail);
  } else {
    const body = await res.json().catch(() => ({}));
    const reply = body?.choices?.[0]?.message?.content?.trim();
    if (reply) ok(`POST /v1/chat/completions -> 200 ("${reply.slice(0, 60)}")`);
    else bad("POST /v1/chat/completions -> 200 but no reply text");
  }
} catch (e) {
  bad("POST /v1/chat/completions", String(e.message || e));
}

console.log("\nWhen every line passes, the AI Agents page will show Hermes as Working.");
