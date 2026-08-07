import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, CalendarClock, MapPin, Radar, Star, Store, Tag, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ListingMap } from "@/components/site/listing-map";
import { BookingCard } from "@/components/site/booking-card";
import { LocationOffers } from "@/components/site/location-offers";
import { money } from "@/lib/marketing/marketplace";
import { resolveListing } from "@/lib/marketing/listings";
import { getListingContentMap } from "@/lib/server/listing-content-config";
import { mergeContent } from "@/lib/marketing/listing-content";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = await resolveListing(slug);
  return { title: l ? `${l.name} · Channel Cast Marketplace` : "Ad space · Channel Cast" };
}

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = await resolveListing(slug);
  if (!l) notFound();

  const contentMap = await getListingContentMap();
  const c = mergeContent(l, contentMap[l.slug]);
  const location = [l.city, l.state].filter(Boolean).join(", ");

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 lg:pb-14">
        <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Marketplace</Link>

        {/* Title */}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{l.name}</h1>
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-brand-strong">{l.type}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium text-foreground"><Star className="h-4 w-4 fill-foreground text-foreground" /> {c.rating.toFixed(2)}</span>
          <span>·</span>
          <span className="underline">{c.reviewCount} reviews</span>
          {location && <><span>·</span><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {location}</span></>}
        </div>

        {/* Hero photo */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-border">
          {l.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.imageUrl} alt={l.name} className="h-64 w-full object-cover sm:h-[440px]" />
          ) : (
            <div className="flex h-64 items-center justify-center bg-[radial-gradient(80%_80%_at_50%_20%,hsl(var(--brand)/0.15),transparent)] sm:h-[440px]"><Store className="h-14 w-14 text-brand-strong/70" /></div>
          )}
        </div>

        {/* Headline + tagline */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{c.headline}</h2>
          <p className="mt-1 text-muted-foreground">{c.tagline}</p>
        </div>

        {/* Details + booking */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div>
            {/* Advertiser favorite */}
            {c.favorite && (
              <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
                <Award className="h-8 w-8 shrink-0 text-brand-strong" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">Advertiser favorite</p>
                  <p className="text-xs text-muted-foreground">One of the most-booked ad spaces on Channel Cast.</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{c.rating.toFixed(2)}</p>
                  <div className="flex justify-center text-brand-strong">{[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-3 w-3 fill-current" />)}</div>
                </div>
                <span className="h-9 w-px bg-border" />
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{c.reviewCount}</p>
                  <p className="text-xs font-medium text-foreground underline">Reviews</p>
                </div>
              </div>
            )}

            {l.description && <p className="text-[15px] leading-relaxed text-foreground/90">{l.description}</p>}

            {l.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {l.tags.map((t) => <span key={t} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"><Tag className="h-3 w-3" /> {t}</span>)}
              </div>
            )}

            <LocationOffers features={c.features} />

            <div className="mt-8 border-t border-border pt-6">
              <p className="text-base font-semibold text-foreground">How your spot plays here</p>
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                <p className="flex items-start gap-2"><Radar className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" /> Plays on presence, respecting cooldowns.</p>
                <p className="flex items-start gap-2"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" /> You choose the play window.</p>
                <p className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" /> Reach a present, local audience.</p>
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-4">
              <BookingCard slug={l.slug} pricePerWeek={l.pricePerWeek} audiencePerWeek={l.audiencePerWeek} devices={l.devices} type={l.type} />
              {l.lat != null && l.lng != null && (
                <div>
                  <ListingMap listing={l} />
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> Approximate location</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky booking bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-foreground">{money(l.pricePerWeek)} <span className="text-sm font-normal text-muted-foreground">/ wk</span></p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="h-3 w-3 fill-foreground text-foreground" /> {c.rating.toFixed(2)} · {c.reviewCount} reviews</p>
          </div>
          <Button asChild><Link href={`/marketplace/${l.slug}/book`}>Reserve</Link></Button>
        </div>
      </div>
    </>
  );
}
