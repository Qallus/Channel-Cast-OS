"use client";

import dynamic from "next/dynamic";

import type { Listing } from "@/lib/marketing/marketplace";

const MarketplaceMap = dynamic(() => import("@/components/site/marketplace-map"), {
  ssr: false,
  loading: () => <div className="flex h-56 items-center justify-center rounded-xl border border-border text-sm text-muted-foreground">Loading map…</div>,
});

export function ListingMap({ listing }: { listing: Listing }) {
  if (listing.lat == null || listing.lng == null) return null;
  return (
    <div className="h-56">
      <MarketplaceMap listings={[listing]} />
    </div>
  );
}
