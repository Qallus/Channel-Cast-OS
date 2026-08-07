import { getAllListings } from "@/lib/marketing/listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight listing catalog for the client cart / upsell.
export async function GET() {
  const { listings } = await getAllListings();
  return Response.json({
    listings: listings.map((l) => ({
      slug: l.slug, name: l.name, type: l.type, city: l.city, state: l.state,
      imageUrl: l.imageUrl, pricePerWeek: l.pricePerWeek, audiencePerWeek: l.audiencePerWeek,
    })),
  });
}
