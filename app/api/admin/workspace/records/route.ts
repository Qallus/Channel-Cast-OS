import { wsActor, wsError } from "@/lib/workspace/route-helpers";
import { listRecords } from "@/lib/server/crm-db";
import { createPlan } from "@/lib/plans/store";

export const runtime = "nodejs";

type Hit = { recordType: string; recordId: string; label: string; sublabel: string | null; href: string };

// Create a real Plan so a Project Tracker row lives in both Workspace and Plans.
export async function POST(request: Request) {
  try {
    const actor = await wsActor();
    const body = (await request.json().catch(() => ({}))) as { name?: string; type?: string };
    const name = String(body.name ?? "").trim();
    if (!name) return Response.json({ error: "A name is required." }, { status: 400 });
    if (body.type !== "plan") return Response.json({ error: "Only plans can be created here." }, { status: 400 });
    const planId = await createPlan(actor, { name, planType: "basic", visibility: "team", defaultView: "board", color: "gold", icon: "clipboard-list" });
    return Response.json({ ok: true, recordId: planId, label: name, href: `/app/admin/plans/${planId}` });
  } catch (error) {
    return wsError(error, "Unable to create record.");
  }
}

export async function GET(request: Request) {
  try {
    await wsActor();
    const url = new URL(request.url);
    const type = url.searchParams.get("type") ?? "plan";
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const results: Hit[] = [];
    const match = (s: unknown) => !q || String(s ?? "").toLowerCase().includes(q);

    if (type === "plan") {
      const rows = await listRecords("plans");
      for (const r of rows) {
        if (r.deleted_at || !match(r.name)) continue;
        results.push({ recordType: "plan", recordId: String(r.id), label: String(r.name || "Untitled plan"), sublabel: (r.status as string) ?? null, href: `/app/admin/plans/${r.id}` });
        if (results.length >= 20) break;
      }
    } else if (type === "client") {
      const rows = await listRecords("clients");
      for (const r of rows) {
        if (!match(r.name)) continue;
        results.push({ recordType: "client", recordId: String(r.id), label: String(r.name || "Client"), sublabel: (r.company as string) ?? null, href: `/app/admin/clients` });
        if (results.length >= 20) break;
      }
    } else if (type === "advertiser") {
      const rows = await listRecords("advertisers");
      for (const r of rows) {
        if (!match(r.name)) continue;
        results.push({ recordType: "advertiser", recordId: String(r.id), label: String(r.name || "Advertiser"), sublabel: (r.company as string) ?? null, href: `/app/admin/advertisers` });
        if (results.length >= 20) break;
      }
    } else if (type === "workspace") {
      const rows = await listRecords("ws_documents");
      for (const r of rows) {
        if (r.deleted_at || !match(r.title)) continue;
        results.push({ recordType: "workspace", recordId: String(r.id), label: String(r.title || "Untitled"), sublabel: null, href: `/app/admin/workspace/${r.id}` });
        if (results.length >= 20) break;
      }
    }
    return Response.json({ ok: true, results });
  } catch (error) {
    return wsError(error, "Record search failed.");
  }
}
