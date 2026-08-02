import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CheckoutConfirm } from "@/components/site/checkout-confirm";
import { money } from "@/lib/marketing/marketplace";
import { resolveListing } from "@/lib/marketing/listings";

export const metadata = { title: "Checkout · Channel Cast" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const slug = one(sp.slug);
  const listing = await resolveListing(slug);
  const campaign = one(sp.campaign) || "Untitled campaign";
  const weeks = Math.max(1, Number(one(sp.weeks)) || 1);
  const windowLabel = one(sp.window) || "All day";
  const start = one(sp.start);
  const total = listing ? listing.pricePerWeek * weeks : 0;

  if (!listing) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-muted-foreground">We couldn&apos;t find that ad space.</p>
        <Link href="/marketplace" className="mt-3 inline-block text-sm font-medium text-brand-strong hover:underline">Back to marketplace</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href={`/marketplace/${slug}/book`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Edit booking</Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Checkout</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm font-semibold text-foreground">Order summary</p>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Ad space</dt><dd className="font-medium text-foreground">{listing.name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Location</dt><dd className="font-medium text-foreground">{listing.city}, {listing.state}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Campaign</dt><dd className="font-medium text-foreground">{campaign}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Duration</dt><dd className="font-medium text-foreground">{weeks} week{weeks === 1 ? "" : "s"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Play window</dt><dd className="font-medium text-foreground">{windowLabel}</dd></div>
            {start && <div className="flex justify-between"><dt className="text-muted-foreground">Starts</dt><dd className="font-medium text-foreground">{start}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted-foreground">Rate</dt><dd className="font-medium text-foreground">{money(listing.pricePerWeek)}/wk</dd></div>
          </dl>
          <div className="mt-3 flex justify-between border-t border-border pt-3 text-lg font-semibold text-foreground"><span>Total</span><span>{money(total)}</span></div>
        </div>

        <CheckoutConfirm summary={{ slug, listing: listing.name, campaign, weeks, windowLabel, start, total }} />
      </div>
    </div>
  );
}
