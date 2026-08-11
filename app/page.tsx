import Link from "next/link";
import { ArrowRight, BarChart3, Building2, CalendarClock, Eye, Megaphone, Mic, Radar, Radio, Play, ShieldCheck, Sparkles, Store } from "lucide-react";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SupportFab } from "@/components/site/support-fab";
import { AiVisionDemo } from "@/components/site/ai-vision-demo";
import { DeviceCaption } from "@/components/site/device-anim";
import { LISTINGS, type Listing } from "@/lib/marketing/marketplace";
import { Button } from "@/components/ui/button";

// A varied trio of real listings for the homepage marketplace preview.
const MARKETPLACE_PREVIEW: Listing[] = ["scottsdale-fashion-square-garage", "salt-river-fields", "sky-harbor-parking-garage"]
  .map((s) => LISTINGS.find((l) => l.slug === s))
  .filter((l): l is Listing => Boolean(l))
  .concat(LISTINGS)
  .slice(0, 3);

function audienceLabel(n: number): string {
  return n >= 1000 ? `~${(n / 1000).toFixed(1)}k/wk` : `~${n}/wk`;
}

export const metadata = {
  title: "Channel Cast — Motion-Based Audio Advertising",
  description: "Turn physical spaces into smart, motion-triggered audio advertising channels. Discover ad space, book campaigns, and manage a device network from one dashboard.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,hsl(var(--brand)/0.10),transparent)]" />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="flex flex-col justify-center">
            <span className="cc-fade-up inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-brand-strong" /> Motion-based audio advertising
            </span>
            <h1 className="cc-fade-up mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl" style={{ animationDelay: "0.08s" }}>
              How do you get consumers to notice your ads? <span className="text-brand-strong">You don&apos;t. You get them to hear them.</span>
            </h1>
            <p className="cc-fade-up mt-4 max-w-xl text-lg text-muted-foreground" style={{ animationDelay: "0.16s" }}>
              Consumers are practically glued to their phones. Channel Cast&apos;s AI Vision Audio Advertisement Playback Device plays targeted content the moment someone walks by — getting their attention back. Discover ad space, book campaigns, create audio, and run the whole network from one dashboard.
            </p>
            <div className="cc-fade-up mt-7 flex flex-wrap gap-3" style={{ animationDelay: "0.24s" }}>
              <Button asChild><Link href="/marketplace">View ad space <ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild variant="outline"><Link href="/register">Advertise with us</Link></Button>
              <Button asChild variant="ghost"><Link href="/businesses">Become a location partner</Link></Button>
            </div>
            <p className="cc-fade-up mt-4 text-xs text-muted-foreground" style={{ animationDelay: "0.32s" }}>No credit card to explore the marketplace · Works on any Windows mini-PC + USB webcam</p>
          </div>

          {/* Stylized device preview */}
          <div className="cc-fade-up flex items-center justify-center" style={{ animationDelay: "0.2s" }}>
            <div className="cc-float w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground"><span className="h-2 w-2 animate-pulse rounded-full bg-success" /> Mini PC — Front Entrance</span>
                <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-medium text-brand-strong">Motion</span>
              </div>
              <div className="mt-4 rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15 text-brand-strong">
                    <Radar className="h-5 w-5" />
                    <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-brand" /></span>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Motion detected</p>
                    <p className="text-xs text-muted-foreground">Playing “Summer Sale — 15s” · just now</p>
                  </div>
                </div>
                <div className="mt-3 flex h-8 items-end gap-0.5">
                  {[6, 12, 20, 28, 18, 32, 24, 14, 26, 20, 10, 22, 30, 16, 8].map((h, i) => (
                    <span key={i} className="cc-eq-bar w-1.5 rounded-full bg-brand-strong/70" style={{ height: `${h}px`, animationDelay: `${(i % 5) * 0.12}s` }} />
                  ))}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[["Plays today", "128"], ["Motion", "96"], ["Scheduled", "32"]].map(([l, v]) => (
                  <div key={l} className="rounded-lg border border-border bg-background p-2">
                    <p className="text-lg font-semibold text-foreground">{v}</p>
                    <p className="text-[11px] text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <Section id="how" eyebrow="How it works" title="Motion in, the right message out" subtitle="Powered by on-device AI Vision, PIR sensors, and crystal-clear Dolby Digital audio.">
        <div className="grid gap-4 md:grid-cols-3">
          <Feature icon={Radar} title="1 · Detect" body="A device watches for presence — via a USB webcam (software vision) or a simple PIR sensor." />
          <Feature icon={Play} title="2 · Trigger" body="The moment someone is near, it plays the scheduled spot — respecting cooldowns and play windows." />
          <Feature icon={BarChart3} title="3 · Measure" body="Every play is reported in real time: motion vs scheduled, by device, by audience." />
        </div>
      </Section>

      {/* AI Vision — dynamic content demo */}
      <Section eyebrow="AI Vision · Dynamic content" title="One device. The right message for every audience." subtitle="On-device AI Vision reads who's nearby and plays content geared to them. Tap an audience to see it switch." muted>
        <AiVisionDemo />
      </Section>

      {/* Device types */}
      <Section eyebrow="Devices" title="Two ways to sense your audience" muted>
        <div className="grid gap-4 md:grid-cols-2">
          <Feature icon={Eye} title="AI vision devices" body="On-device computer vision counts who's nearby and plays the most relevant spot — privacy-first, with no images stored or uploaded. Perfect for audience-aware campaigns." />
          <Feature icon={Radar} title="PIR motion devices" body="A low-cost passive-infrared sensor triggers playback on movement. Simple, reliable, and inexpensive to deploy at scale." />
        </div>
      </Section>

      {/* Marketplace preview */}
      <Section eyebrow="Marketplace" title="Discover ad space near your audience"
        action={<Button asChild variant="outline"><Link href="/marketplace">Browse the marketplace <ArrowRight className="h-4 w-4" /></Link></Button>}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MARKETPLACE_PREVIEW.map((l) => (
            <Link key={l.slug} href={`/marketplace/${l.slug}`} className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-brand/50">
              {l.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.imageUrl} alt={l.name} className="h-28 w-full object-cover" />
              ) : (
                <div className="flex h-28 items-center justify-center bg-[radial-gradient(80%_80%_at_50%_20%,hsl(var(--brand)/0.15),transparent)]"><Store className="h-8 w-8 text-brand-strong/70" /></div>
              )}
              <div className="p-4">
                <p className="text-sm font-semibold text-foreground group-hover:text-brand-strong">{l.name}</p>
                <p className="text-xs text-muted-foreground">{l.type} · {[l.city, l.state].filter(Boolean).join(", ")}</p>
                <p className="mt-2 text-xs text-muted-foreground">Est. audience <span className="font-medium text-foreground">{audienceLabel(l.audiencePerWeek)}</span></p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* Audience paths */}
      <Section eyebrow="Who it's for" title="One network, every side of the deal" muted>
        <div className="grid gap-4 md:grid-cols-3">
          <Feature icon={Megaphone} title="Advertisers" body="Find the right spaces, create or record spots, book campaigns, and track real plays." href="/advertisers" cta="For advertisers" />
          <Feature icon={Building2} title="Businesses" body="Monetize your space. Host a device and earn from audio that plays to your visitors." href="/businesses" cta="For businesses" />
          <Feature icon={Radio} title="Partners & radio" body="Produce spots, resell inventory, and bring your audio talent to a growing network." href="/partners" cta="For partners" />
        </div>
      </Section>

      {/* Value proof */}
      <Section eyebrow="Why Channel Cast" title="Built to run a real network">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={BarChart3} title="Live analytics" body="Playtime, revenue, motion vs scheduled — updating as it happens." />
          <Feature icon={Mic} title="Audio studio" body="Upload, record, and overlay spots; send them straight to any device." />
          <Feature icon={CalendarClock} title="Scheduling" body="Play windows, cooldowns, and per-device deployments." />
          <Feature icon={ShieldCheck} title="Private by design" body="On-device vision — no faces stored or uploaded, ever." />
        </div>
        <div className="mt-8"><DeviceCaption /></div>
      </Section>

      {/* FAQ */}
      <Section eyebrow="FAQ" title="Good questions" muted>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["What hardware do I need?", "Any Windows mini-PC with a speaker, plus a USB webcam for motion/vision. A one-line install connects it in about a minute."],
            ["Is the camera watching people?", "No footage is stored or uploaded. Vision runs on the device and only produces anonymous counts — never identities or images."],
            ["How do advertisers get charged?", "Campaigns are booked against ad space with transparent pricing; plays are tracked and reported."],
            ["Can I start without a device?", "Yes — browse the marketplace and plan campaigns first. Hosting a device is a separate, optional step."],
          ].map(([q, a]) => (
            <div key={q} className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-foreground">{q}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Final CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-border bg-[radial-gradient(70%_120%_at_50%_0%,hsl(var(--brand)/0.12),transparent)] p-8 text-center sm:p-12">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Ready to put your space — or your message — to work?</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Explore the marketplace, or set up your first device in minutes.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild><Link href="/register">Get started</Link></Button>
              <Button asChild variant="outline"><Link href="/request-demo">Request a demo</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
      <SupportFab />
    </div>
  );
}

function Section({ id, eyebrow, title, subtitle, children, action, muted }: { id?: string; eyebrow: string; title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode; muted?: boolean }) {
  return (
    <section id={id} className={muted ? "bg-card/30" : undefined}>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-strong">{eyebrow}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>
            {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function Feature({ icon: Icon, title, body, href, cta }: { icon: typeof Radar; title: string; body: string; href?: string; cta?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-brand-strong"><Icon className="h-5 w-5" /></span>
      <p className="mt-3 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
      {href && cta && (
        <Link href={href} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-strong hover:underline">{cta} <ArrowRight className="h-3.5 w-3.5" /></Link>
      )}
    </div>
  );
}
