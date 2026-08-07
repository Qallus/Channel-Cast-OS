import { PageHero } from "@/components/site/marketing";
import { MarketplaceBrowser } from "@/components/site/marketplace-browser";
import { getAllListings } from "@/lib/marketing/listings";

export const metadata = { title: "Marketplace · Channel Cast", description: "Discover physical ad spaces near your audience — cafés, gyms, salons, transit hubs, and more." };

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const { listings, sample } = await getAllListings();
  return (
    <>
      <PageHero eyebrow="Marketplace" title="Find ad space near your audience." subtitle="Browse real physical spaces by type, location, and audience. Book a campaign that plays when people are actually there." />
      {sample && (
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <p className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">Showing sample spaces. As partners publish their locations, real listings appear here.</p>
        </div>
      )}
      <MarketplaceBrowser listings={listings} />
    </>
  );
}
