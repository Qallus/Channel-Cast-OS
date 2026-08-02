import { deleteGroup, updateGroup } from "@/lib/server/db";

export const runtime = "nodejs";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

// PATCH /api/admin/device-groups/:id
//   { name?, description?, imageUrl?, listed?, slug?, spaceType?, city?, state?,
//     pricePerWeek?, audiencePerWeek?, tags? }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Parameters<typeof updateGroup>[1] = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if ("description" in body) patch.description = body.description ?? null;
  if ("imageUrl" in body) patch.imageUrl = body.imageUrl ?? null;
  if (typeof body.listed === "boolean") patch.listed = body.listed;
  if ("spaceType" in body) patch.spaceType = body.spaceType || null;
  if ("city" in body) patch.city = body.city || null;
  if ("state" in body) patch.state = body.state || null;
  if ("pricePerWeek" in body) patch.pricePerWeek = body.pricePerWeek === null || body.pricePerWeek === "" ? null : Math.max(0, Math.round(Number(body.pricePerWeek)));
  if ("audiencePerWeek" in body) patch.audiencePerWeek = body.audiencePerWeek === null || body.audiencePerWeek === "" ? null : Math.max(0, Math.round(Number(body.audiencePerWeek)));
  if (Array.isArray(body.tags)) patch.tags = body.tags.map((t: unknown) => String(t)).filter(Boolean).slice(0, 12);
  if ("latitude" in body) patch.latitude = body.latitude === null || body.latitude === "" ? null : Number(body.latitude);
  if ("longitude" in body) patch.longitude = body.longitude === null || body.longitude === "" ? null : Number(body.longitude);
  if ("slug" in body) patch.slug = body.slug ? slugify(String(body.slug)) : null;

  // When publishing without a slug, derive one from the (possibly new) name.
  if (body.listed === true && !patch.slug) {
    const base = typeof body.name === "string" && body.name.trim() ? body.name : "space";
    patch.slug = `${slugify(base)}-${id.slice(0, 4)}`;
  }

  const group = await updateGroup(id, patch);
  if (!group) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(group);
}

// DELETE /api/admin/device-groups/:id — members become ungrouped.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteGroup(id);
  return Response.json({ ok: true });
}
