import { PageHero } from "@/components/site/marketing";
import { MarketplaceBrowser } from "@/components/site/marketplace-browser";

export const metadata = { title: "Marketplace · Channel Cast", description: "Discover physical ad spaces near your audience — cafés, gyms, salons, transit hubs, and more." };

export default function MarketplacePage() {
  return (
    <>
      <PageHero eyebrow="Marketplace" title="Find ad space near your audience." subtitle="Browse real physical spaces by type, location, and audience. Book a campaign that plays when people are actually there." />
      <MarketplaceBrowser />
    </>
  );
}
