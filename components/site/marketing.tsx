import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HeroAnimated } from "@/components/site/hero";

type Cta = { label: string; href: string };

export function PageHero({ eyebrow, title, subtitle, primary, secondary }: { eyebrow: string; title: string; subtitle: string; primary?: Cta; secondary?: Cta }) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_55%_at_50%_0%,hsl(var(--brand)/0.10),transparent)]" />
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:py-24">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-strong">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{subtitle}</p>
        {(primary || secondary) && (
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {primary && <Button asChild><Link href={primary.href}>{primary.label} <ArrowRight className="h-4 w-4" /></Link></Button>}
            {secondary && <Button asChild variant="outline"><Link href={secondary.href}>{secondary.label}</Link></Button>}
          </div>
        )}
      </div>
    </section>
  );
}

export function Band({ eyebrow, title, subtitle, children, muted, action }: { eyebrow?: string; title?: string; subtitle?: string; children: React.ReactNode; muted?: boolean; action?: React.ReactNode }) {
  return (
    <section className={muted ? "bg-card/30" : undefined}>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        {(eyebrow || title) && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {eyebrow && <p className="text-xs font-semibold uppercase tracking-wide text-brand-strong">{eyebrow}</p>}
              {title && <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>}
              {subtitle && <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>}
            </div>
            {action}
          </div>
        )}
        <div className={eyebrow || title ? "mt-8" : undefined}>{children}</div>
      </div>
    </section>
  );
}

export function FeatureCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-brand-strong"><Icon className="h-5 w-5" /></span>
      <p className="mt-3 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export function Steps({ items }: { items: { title: string; body: string }[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((s, i) => (
        <div key={s.title} className="rounded-xl border border-border bg-card p-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">{i + 1}</span>
          <p className="mt-3 text-base font-semibold text-foreground">{s.title}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
        </div>
      ))}
    </div>
  );
}

export function FAQList({ items }: { items: [string, string][] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map(([q, a]) => (
        <div key={q} className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground">{q}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">{a}</p>
        </div>
      ))}
    </div>
  );
}

export function CTABand({ title, subtitle, primary, secondary }: { title: string; subtitle?: string; primary: Cta; secondary?: Cta }) {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-border bg-[radial-gradient(70%_120%_at_50%_0%,hsl(var(--brand)/0.12),transparent)] p-8 text-center sm:p-12">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>
          {subtitle && <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{subtitle}</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild><Link href={primary.href}>{primary.label}</Link></Button>
            {secondary && <Button asChild variant="outline"><Link href={secondary.href}>{secondary.label}</Link></Button>}
          </div>
        </div>
      </div>
    </section>
  );
}

// Composed template for the "solution" pages (advertisers, businesses, partners, …).
export function SolutionPage({ hero, heroVariant, valueTitle, values, stepsTitle, steps, faq, cta }: {
  hero: { eyebrow: string; title: string; subtitle: string; primary?: Cta; secondary?: Cta; badge?: string };
  heroVariant?: "how" | "advertisers" | "businesses" | "partners";
  valueTitle: string;
  values: { icon: LucideIcon; title: string; body: string }[];
  stepsTitle: string;
  steps: { title: string; body: string }[];
  faq: [string, string][];
  cta: { title: string; subtitle?: string; primary: Cta; secondary?: Cta };
}) {
  return (
    <>
      {heroVariant ? <HeroAnimated variant={heroVariant} {...hero} /> : <PageHero {...hero} />}
      <Band eyebrow="What you get" title={valueTitle}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((v) => <FeatureCard key={v.title} {...v} />)}
        </div>
      </Band>
      <Band eyebrow="How it works" title={stepsTitle} muted>
        <Steps items={steps} />
      </Band>
      <Band eyebrow="FAQ" title="Common questions">
        <FAQList items={faq} />
      </Band>
      <CTABand {...cta} />
    </>
  );
}
