import { requireUser, AuthError } from "@/lib/server/require-user";
import { loadLeadById, updateLeadStatus } from "@/lib/business-cards/store";
import { upsertRecords, type CrmCollection } from "@/lib/server/crm-db";

export const runtime = "nodejs";

type Target = "contact" | "lead" | "advertiser" | "client";

const MAP: Record<Target, { collection: CrmCollection; prefix: string; href: string; label: string }> = {
  contact: { collection: "contacts", prefix: "contact", href: "/app/admin/contacts", label: "Contact" },
  lead: { collection: "leads", prefix: "lead", href: "/app/admin/leads", label: "Lead" },
  advertiser: { collection: "advertisers", prefix: "adv", href: "/app/admin/advertisers", label: "Advertiser" },
  client: { collection: "clients", prefix: "client", href: "/app/admin/clients", label: "Client" },
};

function genId(prefix: string): string {
  const rnd = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rnd}`;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try { user = await requireUser(); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  const lead = await loadLeadById(id);
  if (!lead) return Response.json({ error: "Lead not found." }, { status: 404 });
  if (!user.isAdmin && lead.owner_id !== user.id) return Response.json({ error: "Not your lead." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { target?: Target; type?: string };
  const target = (body.target && MAP[body.target]) ? body.target : "contact";
  const conf = MAP[target];

  const name = lead.name || lead.email || lead.phone || "New contact";
  const now = new Date().toISOString();
  const record = {
    id: genId(conf.prefix),
    name,
    company: lead.company || "",
    email: lead.email || "",
    phone: lead.phone || "",
    notes: lead.message || "",
    type: body.type || "Lead",
    stage: "New",
    status: "new",
    source: "Business Card",
    createdAt: now,
    updatedAt: now,
  };

  try {
    await upsertRecords(conf.collection, [record]);
    await updateLeadStatus(id, "qualified");
    return Response.json({ label: `${conf.label}: ${name}`, href: conf.href });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Conversion failed." }, { status: 500 });
  }
}
