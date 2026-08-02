import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, MapPin, Monitor, Radar, Store, Tag, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getListing, LISTINGS, money } from "@/lib/marketing/marketplace";

export function generateStaticParams() {
  return LISTINGS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = getListing(slug);
  return { title: l ? `${l.name} · Channel Cast Marketplace` : "Ad space · Channel Cast" };
}

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = getListing(slug);
  if (!l) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Marketplace</Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="flex h-56 items-center justify-center rounded-2xl border border-border bg-[radial-gradient(80%_80%_at_50%_20%,hsl(var(--brand)/0.15),transparent)]"><Store className="h-12 w-12 text-brand-strong/70" /></div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{l.name}</h1>
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-brand-strong">{l.type}</span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> {l.city}, {l.state}</p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{l.description}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {l.tags.map((t) => <span key={t} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"><Tag className="h-3 w-3" /> {t}</span>)}
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground">How your spot plays here</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm text-muted-foreground">
              <p className="flex items-start gap-2"><Radar className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" /> Plays on presence, respecting cooldowns.</p>
              <p className="flex items-start gap-2"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" /> You choose the play window.</p>
              <p className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" /> Reach a present, local audience.</p>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-2xl font-semibold tracking-tight text-foreground">{money(l.pricePerWeek)} <span className="text-sm font-normal text-muted-foreground">/ week</span></p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between"><dt className="text-muted-foreground">Est. audience</dt><dd className="font-medium text-foreground">{l.audiencePerWeek.toLocaleString("en-US")}/wk</dd></div>
              <div className="flex items-center justify-between"><dt className="text-muted-foreground">Devices</dt><dd className="font-medium text-foreground">{l.devices}</dd></div>
              <div className="flex items-center justify-between"><dt className="text-muted-foreground">Type</dt><dd className="font-medium text-foreground">{l.type}</dd></div>
            </dl>
            <Button asChild className="mt-5 w-full"><Link href={`/marketplace/${l.slug}/book`}>Book this space</Link></Button>
            <Button asChild variant="outline" className="mt-2 w-full"><Link href="/request-demo">Ask a question</Link></Button>
            <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><Monitor className="h-3.5 w-3.5" /> Real plays tracked and reported.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
