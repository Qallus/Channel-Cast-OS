import Link from "next/link";
import { ArrowRight, BarChart3, Building2, Check, Eye, Handshake, MapPin, Megaphone, MessageSquare, Play, Radar, TrendingUp, Users } from "lucide-react";

import { Button } from "@/components/ui/button";

type Cta = { label: string; href: string };
type Variant = "how" | "advertisers" | "businesses" | "partners" | "contact";

// Split-layout marketing hero with a page-specific animated visual.
// Pure CSS animations (cc-fade-up / cc-float / cc-eq-bar / ping) — no client JS.
export function HeroAnimated({
  variant,
  eyebrow,
  title,
  subtitle,
  primary,
  secondary,
  badge,
}: {
  variant: Variant;
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  primary?: Cta;
  secondary?: Cta;
  badge?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,hsl(var(--brand)/0.10),transparent)]" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div className="flex flex-col justify-center">
          <span className="cc-fade-up inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-strong">
            {eyebrow}
          </span>
          <h1 className="cc-fade-up mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl" style={{ animationDelay: "0.08s" }}>
            {title}
          </h1>
          <p className="cc-fade-up mt-4 max-w-xl text-lg text-muted-foreground" style={{ animationDelay: "0.16s" }}>
            {subtitle}
          </p>
          {(primary || secondary) && (
            <div className="cc-fade-up mt-7 flex flex-wrap gap-3" style={{ animationDelay: "0.24s" }}>
              {primary && <Button asChild><Link href={primary.href}>{primary.label} <ArrowRight className="h-4 w-4" /></Link></Button>}
              {secondary && <Button asChild variant="outline"><Link href={secondary.href}>{secondary.label}</Link></Button>}
            </div>
          )}
          {badge && <p className="cc-fade-up mt-4 text-xs text-muted-foreground" style={{ animationDelay: "0.32s" }}>{badge}</p>}
        </div>

        <div className="cc-fade-up flex items-center justify-center" style={{ animationDelay: "0.2s" }}>
          {variant === "how" && <HowVisual />}
          {variant === "advertisers" && <AdvertisersVisual />}
          {variant === "businesses" && <BusinessesVisual />}
          {variant === "partners" && <PartnersVisual />}
          {variant === "contact" && <ContactVisual />}
        </div>
      </div>
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="cc-float w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-2xl">{children}</div>;
}

/* How It Works — the sense→play→match→measure loop, steps lighting up in sequence. */
function HowVisual() {
  const steps = [
    { icon: Radar, label: "Sense", note: "Presence detected" },
    { icon: Play, label: "Play", note: "Spot triggered" },
    { icon: Eye, label: "Match", note: "Audience counted" },
    { icon: BarChart3, label: "Measure", note: "Play reported" },
  ];
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground"><span className="h-2 w-2 animate-pulse rounded-full bg-success" /> Front Entrance</span>
        <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-medium text-brand-strong">Live loop</span>
      </div>
      <div className="mt-4 space-y-2">
        {steps.map((s, i) => (
          <div key={s.label} className="cc-fade-up flex items-center gap-3 rounded-xl border border-border bg-background p-3" style={{ animationDelay: `${0.3 + i * 0.14}s` }}>
            <span className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15 text-brand-strong">
              <s.icon className="h-5 w-5" />
              {i === 0 && <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-brand" /></span>}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{i + 1} · {s.label}</p>
              <p className="text-xs text-muted-foreground">{s.note}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex h-7 items-end gap-0.5">
        {[6, 14, 22, 12, 26, 18, 30, 16, 24, 10, 20, 28, 14, 8, 22].map((h, i) => (
          <span key={i} className="cc-eq-bar w-1.5 rounded-full bg-brand-strong/70" style={{ height: `${h}px`, animationDelay: `${(i % 5) * 0.12}s` }} />
        ))}
      </div>
    </Card>
  );
}

/* Advertisers — one campaign reaching many spaces; pins light up across a mini map. */
function AdvertisersVisual() {
  const pins = [
    { x: 18, y: 26, d: 0 }, { x: 62, y: 18, d: 0.4 }, { x: 82, y: 44, d: 0.9 },
    { x: 34, y: 58, d: 0.2 }, { x: 70, y: 70, d: 0.6 }, { x: 48, y: 38, d: 1.1 },
  ];
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground"><Megaphone className="h-4 w-4 text-brand-strong" /> Summer Sale — 15s</span>
        <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-medium text-brand-strong">6 spaces</span>
      </div>
      <div className="relative mt-4 h-40 overflow-hidden rounded-xl border border-border bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(var(--brand)/0.08),transparent_70%)]" />
        {pins.map((p, i) => (
          <span key={i} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <span className="relative flex h-3 w-3 -translate-x-1/2 -translate-y-1/2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-60" style={{ animation: `cc-pulse 2.4s ease-in-out ${p.d}s infinite` }} />
              <span className="relative inline-flex h-3 w-3 items-center justify-center rounded-full bg-brand-strong text-background"><MapPin className="h-2 w-2" /></span>
            </span>
          </span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[["Impressions", "12.4k"], ["Plays", "3,180"], ["CPM", "$4.20"]].map(([l, v]) => (
          <div key={l} className="rounded-lg border border-border bg-background p-2">
            <p className="text-lg font-semibold text-foreground">{v}</p>
            <p className="text-[11px] text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* Businesses — a hosted space earning; revenue bars rising + payout ticker. */
function BusinessesVisual() {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground"><Building2 className="h-4 w-4 text-brand-strong" /> Corner Café</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success"><TrendingUp className="h-3 w-3" /> Earning</span>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-background p-4">
        <p className="text-xs text-muted-foreground">This month</p>
        <p className="text-3xl font-semibold tracking-tight text-foreground">$248<span className="text-lg text-muted-foreground">.50</span></p>
        <div className="mt-3 flex h-16 items-end gap-1.5">
          {[30, 42, 38, 55, 48, 66, 60, 78].map((h, i) => (
            <span key={i} className="cc-eq-bar flex-1 rounded-t bg-brand-strong/70" style={{ height: `${h}%`, animationDelay: `${i * 0.1}s`, animationDuration: "1.6s" }} />
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        {[["Plays", "1,024"], ["Fill rate", "92%"]].map(([l, v]) => (
          <div key={l} className="rounded-lg border border-border bg-background p-2">
            <p className="text-lg font-semibold text-foreground">{v}</p>
            <p className="text-[11px] text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* Contact — a live chat: visitor message in, Channel Cast typing, then a reply. */
function ContactVisual() {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/15 text-brand-strong"><MessageSquare className="h-4 w-4" /></span>
          Channel Cast
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Replies in ~1 day
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {/* Visitor message */}
        <div className="cc-fade-up flex justify-end" style={{ animationDelay: "0.3s" }}>
          <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-brand-strong px-3.5 py-2.5 text-sm text-background">
            Hi! I&apos;d love to run audio ads where my customers already are.
          </p>
        </div>

        {/* Typing indicator */}
        <div className="cc-fade-up flex justify-start" style={{ animationDelay: "0.9s" }}>
          <span className="inline-flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-background px-3.5 py-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animation: `cc-pulse 1.1s ease-in-out ${i * 0.18}s infinite` }} />
            ))}
          </span>
        </div>

        {/* Reply */}
        <div className="cc-fade-up flex justify-start" style={{ animationDelay: "1.6s" }}>
          <p className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-background px-3.5 py-2.5 text-sm text-foreground">
            Perfect — tell us about your area and we&apos;ll match you to nearby spaces. 🎯
          </p>
        </div>
      </div>

      <div className="cc-fade-up mt-4 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2" style={{ animationDelay: "2.1s" }}>
        <span className="flex-1 text-sm text-muted-foreground">Write a message…</span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-strong text-background"><Check className="h-4 w-4" /></span>
      </div>
    </Card>
  );
}

/* Partners — a growing network; a central node connected to pulsing satellites. */
function PartnersVisual() {
  const nodes = [
    { x: 16, y: 22, d: 0 }, { x: 84, y: 20, d: 0.5 }, { x: 88, y: 62, d: 1 },
    { x: 20, y: 68, d: 0.3 }, { x: 50, y: 84, d: 0.8 },
  ];
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground"><Handshake className="h-4 w-4 text-brand-strong" /> Partner network</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-medium text-brand-strong"><TrendingUp className="h-3 w-3" /> +18% MoM</span>
      </div>
      <div className="relative mt-4 h-44 overflow-hidden rounded-xl border border-border bg-background">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {nodes.map((n, i) => (
            <line key={i} x1="50" y1="50" x2={n.x} y2={n.y} stroke="hsl(var(--brand-strong))" strokeWidth="0.5" strokeOpacity="0.35" />
          ))}
        </svg>
        {nodes.map((n, i) => (
          <span key={i} className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-brand-strong shadow" style={{ left: `${n.x}%`, top: `${n.y}%`, animation: `cc-pulse 2.6s ease-in-out ${n.d}s infinite` }}>
            <Users className="h-3.5 w-3.5" />
          </span>
        ))}
        <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-strong text-background shadow-lg">
          <Handshake className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[["Partners", "128"], ["Devices", "1,940"], ["Payouts", "$62k"]].map(([l, v]) => (
          <div key={l} className="rounded-lg border border-border bg-background p-2">
            <p className="text-lg font-semibold text-foreground">{v}</p>
            <p className="text-[11px] text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
