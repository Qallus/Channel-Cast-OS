import { randomUUID } from "node:crypto";

import { upsertRecords } from "@/lib/server/crm-db";

export const runtime = "nodejs";

// POST /api/leads — capture a marketing lead (contact / demo) into the CRM.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rec = {
    id: randomUUID(),
    source: "website",
    kind: body.kind === "demo" ? "demo" : "contact",
    name: String(body.name || "").slice(0, 200),
    email: String(body.email || "").slice(0, 200),
    company: String(body.company || "").slice(0, 200),
    phone: String(body.phone || "").slice(0, 60),
    interest: String(body.interest || "").slice(0, 80),
    message: String(body.message || "").slice(0, 4000),
    status: "new",
    createdAt: new Date().toISOString(),
  };
  try {
    await upsertRecords("leads", [rec]);
  } catch {
    /* store best-effort — the visitor is still confirmed */
  }
  return Response.json({ ok: true });
}
