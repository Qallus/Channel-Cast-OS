import { getListingContentMap, setListingContentMap, type ListingContentMap } from "@/lib/server/listing-content-config";

export const runtime = "nodejs";

// GET   /api/admin/listing-content              → { [slug]: override }
// PATCH /api/admin/listing-content { content }   → replaces the whole map
export async function GET() {
  return Response.json(await getListingContentMap());
}

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { content?: ListingContentMap };
  if (!body.content || typeof body.content !== "object") return Response.json({ error: "content object required" }, { status: 400 });
  return Response.json(await setListingContentMap(body.content));
}
