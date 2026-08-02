import Link from "next/link";
import { Check } from "lucide-react";

import { Band, CTABand, FAQList, PageHero } from "@/components/site/marketing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Pricing · Channel Cast", description: "Simple, transparent pricing for advertisers, businesses hosting devices, and partners." };

const PLANS: { name: string; price: string; note: string; features: string[]; cta: { label: string; href: string }; featured?: boolean }[] = [
  {
    name: "Advertiser",
    price: "Pay per campaign",
    note: "Book the spaces you want, pay for the reach.",
    features: ["Browse & book ad space", "Upload or record spots", "Scheduling & motion targeting", "Real-time play reporting"],
    cta: { label: "Start advertising", href: "/register" },
  },
  {
    name: "Host a device",
    price: "Free to host",
    note: "Earn from audio that plays to your visitors.",
    features: ["Monetize your foot traffic", "One-line device setup", "You set categories & hours", "Privacy-first, on-device sensing"],
    cta: { label: "Become a partner", href: "/register" },
    featured: true,
  },
  {
    name: "Partner / Reseller",
    price: "Custom",
    note: "For resellers, agencies, radio, and operators.",
    features: ["Manage many accounts", "White-label options", "Revenue share", "Shared analytics"],
    cta: { label: "Contact sales", href: "/contact" },
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHero eyebrow="Pricing" title="Simple, transparent pricing." subtitle="Advertisers pay for the reach they book. Businesses host for free and earn. Partners get custom terms." />
      <Band>
        <div className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={cn("flex flex-col rounded-2xl border bg-card p-6", p.featured ? "border-brand-strong shadow-lg" : "border-border")}>
              {p.featured && <span className="mb-2 w-fit rounded-full bg-brand/15 px-2.5 py-0.5 text-[11px] font-semibold text-brand-strong">Most popular</span>}
              <p className="text-sm font-semibold text-foreground">{p.name}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{p.price}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.note}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" /> {f}</li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full" variant={p.featured ? "default" : "outline"}><Link href={p.cta.href}>{p.cta.label}</Link></Button>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">Need a tailored quote? <Link href="/request-demo" className="font-medium text-brand-strong hover:underline">Request a demo</Link>.</p>
      </Band>
      <Band eyebrow="FAQ" title="Pricing questions" muted>
        <FAQList items={[
          ["How much does a campaign cost?", "It depends on the spaces and reach you book — pricing is shown per ad space in the marketplace."],
          ["Is hosting really free?", "Yes. Businesses host devices at no cost and earn a share of the campaigns that run."],
          ["Are there contracts?", "Advertiser campaigns are booked as you go; partner terms are agreed up front."],
          ["What about hardware?", "You provide a mini-PC + webcam; the software and one-line installer are included."],
        ]} />
      </Band>
      <CTABand title="Ready when you are." primary={{ label: "Get started", href: "/register" }} secondary={{ label: "Talk to sales", href: "/contact" }} />
    </>
  );
}
