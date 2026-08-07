import { randomUUID } from "node:crypto";

import { upsertRecords } from "@/lib/server/crm-db";
import { notificationHtml, sendNotificationEmail } from "@/lib/server/email";

export const runtime = "nodejs";

const KIND_LABEL: Record<string, string> = { contact: "Contact form", demo: "Demo request", placement: "Placement inquiry", booking: "Ad-space booking" };

// POST /api/leads — capture a marketing lead (contact / demo) into the CRM.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const interests = Array.isArray(body.interests) ? body.interests.map((s: unknown) => String(s).slice(0, 80)).slice(0, 12) : [];
  const KINDS = ["contact", "demo", "placement", "booking"];
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

  // Notify the team (best-effort; no-op without RESEND_API_KEY).
  try {
    const label = KIND_LABEL[rec.kind] || "Website submission";
    const who = rec.name || rec.email || "Someone";
    await sendNotificationEmail({
      subject: `${label}: ${rec.subject || who}`,
      replyTo: rec.email || undefined,
      html: notificationHtml({
        eyebrow: "New submission",
        heading: label,
        rows: [
          ["Name", rec.name],
          ["Email", rec.email],
          ["Phone", rec.phone],
          ["Company", rec.company],
          ["Website", rec.website],
          ["Interested in", rec.interest],
          ["Subject", rec.subject],
          ["Received", new Date(rec.createdAt).toLocaleString("en-US")],
        ],
        message: rec.message || undefined,
        footer: "Also visible in Communications → Form Submissions.",
      }),
    });
  } catch {
    /* email is best-effort */
  }

  return Response.json({ ok: true });
}
