import { getAllListings } from "@/lib/marketing/listings";

export const runtime = "nodejs";

// GET /api/marketplace → published ad-space listings (falls back to samples).
export async function GET() {
  const { listings } = await getAllListings();
  return Response.json(listings);
}
