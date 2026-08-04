import { randomUUID } from "node:crypto";

import { upsertRecords } from "@/lib/server/crm-db";

export const runtime = "nodejs";

// POST /api/leads — capture a marketing lead (contact / demo) into the CRM.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const interests = Array.isArray(body.interests) ? body.interests.map((s: unknown) => String(s).slice(0, 80)).slice(0, 12) : [];
  const KINDS = ["contact", "demo", "placement"];
  const rec = {
    id: randomUUID(),
    source: "website",
    kind: KINDS.includes(body.kind) ? body.kind : "contact",
    name: String(body.name || "").slice(0, 200),
    firstName: String(body.firstName || "").slice(0, 100),
    lastName: String(body.lastName || "").slice(0, 100),
    email: String(body.email || "").slice(0, 200),
    company: String(body.company || body.businessName || "").slice(0, 200),
    website: String(body.website || "").slice(0, 200),
    phone: String(body.phone || "").slice(0, 60),
    interest: String(body.interest || (interests.length ? interests.join(", ") : "")).slice(0, 200),
    interests,
    subject: String(body.subject || "").slice(0, 200),
    message: String(body.message || "").slice(0, 4000),
    meta: body.meta && typeof body.meta === "object" && !Array.isArray(body.meta) ? body.meta : undefined,
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
