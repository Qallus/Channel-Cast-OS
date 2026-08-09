import { MarketplaceBrowser } from "@/components/site/marketplace-browser";
import { getAllListings } from "@/lib/marketing/listings";

export const metadata = { title: "Marketplace · Channel Cast", description: "Discover physical ad spaces near your audience — cafés, gyms, salons, transit hubs, and more." };

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const { listings, sample } = await getAllListings();
  return (
    <>
      {sample && (
        <div className="w-full px-5 pt-4 sm:px-8">
          <p className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">Showing sample spaces. As partners publish their locations, real listings appear here.</p>
        </div>
      )}
      <MarketplaceBrowser listings={listings} />
    </>
  );
}
