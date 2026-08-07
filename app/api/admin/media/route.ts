import { getMediaConfig, setMediaConfig, type MediaConfig } from "@/lib/server/media-config";

export const runtime = "nodejs";

// GET   /api/admin/media                          → { listings, slots }
// PATCH /api/admin/media { listings?, slots? }     → merged config
export async function GET() {
  return Response.json(await getMediaConfig());
}

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<MediaConfig>;
  const patch: Partial<MediaConfig> = {};
  if (body.listings && typeof body.listings === "object") patch.listings = body.listings;
  if (body.slots && typeof body.slots === "object") patch.slots = body.slots;
  return Response.json(await setMediaConfig(patch));
}
