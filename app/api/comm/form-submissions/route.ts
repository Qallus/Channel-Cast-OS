import { listRecords, upsertRecords } from "@/lib/server/crm-db";

export const runtime = "nodejs";

// GET /api/comm/form-submissions → website form submissions (leads), newest first.
export async function GET() {
  try {
    const rows = await listRecords("leads");
    const submissions = rows
      .filter((r) => (r as { source?: string }).source === "website")
      .sort((a, b) => String((b as { createdAt?: string }).createdAt || "").localeCompare(String((a as { createdAt?: string }).createdAt || "")));
    return Response.json({ submissions });
  } catch {
    return Response.json({ submissions: [] });
  }
}

// PATCH /api/comm/form-submissions { id, status } → update a submission's status (new|read|archived).
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = String((body as { id?: string }).id || "");
  const status = String((body as { status?: string }).status || "");
  if (!id || !["new", "read", "archived"].includes(status)) return Response.json({ error: "id and valid status required" }, { status: 400 });
  try {
    const rows = await listRecords("leads");
    const rec = rows.find((r) => r.id === id);
    if (!rec) return Response.json({ error: "not found" }, { status: 404 });
    await upsertRecords("leads", [{ ...rec, status }]);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "update failed" }, { status: 500 });
  }
}
