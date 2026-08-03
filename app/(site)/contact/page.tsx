import Link from "next/link";
import { ArrowRight, CalendarClock, Clock, Mail, MapPin, Megaphone, Phone, Radio, Server } from "lucide-react";

import { HeroAnimated } from "@/components/site/hero";
import { ContactForm } from "@/components/site/contact-form";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Contact · Channel Cast", description: "Get in touch with the Channel Cast team — advertising, system placement, partnerships, and more." };

const OFFICE_ADDRESS = "5835 W Ray Rd, Chandler, AZ 85226";

export default function ContactPage() {
  return (
    <>
      <HeroAnimated
        variant="contact"
        eyebrow="Get in touch"
        title={<>Let&apos;s start a <span className="text-brand-strong">conversation</span>.</>}
        subtitle="Whether you have a project in mind or just want to learn more about what we do, we'd love to hear from you. Our team typically responds within one business day."
      />

      <section>
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.5fr_1fr] lg:py-20">
          {/* Column 1 — form */}
          <ContactForm />

          {/* Column 2 — contact card + CTA */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Our Office</h2>

              <div className="mt-5 space-y-5 text-sm">
                <InfoRow icon={MapPin}>
                  <p className="font-medium text-foreground">{OFFICE_ADDRESS}</p>
                  <p className="mt-1 flex gap-3">
                    <a className="text-brand-strong hover:underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE_ADDRESS)}`}>Google Maps →</a>
                    <span className="text-border">|</span>
                    <a className="text-brand-strong hover:underline" target="_blank" rel="noreferrer" href={`https://maps.apple.com/?q=${encodeURIComponent(OFFICE_ADDRESS)}`}>Apple Maps →</a>
                  </p>
                </InfoRow>

                <InfoRow icon={Megaphone}>
                  <p className="font-medium text-foreground">Advertising</p>
                  <a href="tel:+14809999906" className="text-muted-foreground hover:text-foreground">(480) 999-9906</a>
                </InfoRow>

                <InfoRow icon={Server}>
                  <p className="font-medium text-foreground">System Placement</p>
                  <a href="tel:+14809999926" className="text-muted-foreground hover:text-foreground">(480) 999-9926</a>
                </InfoRow>

                <InfoRow icon={Mail}>
                  <p className="font-medium text-foreground">Email</p>
                  <a href="mailto:hello@channelcast.io" className="text-muted-foreground hover:text-foreground">hello@channelcast.io</a>
                </InfoRow>

                <InfoRow icon={Clock}>
                  <p className="font-medium text-foreground">Office Hours</p>
                  <p className="text-muted-foreground">Mon – Fri: 8:00 AM – 5:00 PM</p>
                </InfoRow>
              </div>
            </div>

            {/* CTA — schedule online */}
            <div className="rounded-2xl border border-border bg-[radial-gradient(90%_90%_at_50%_0%,hsl(var(--brand)/0.10),transparent)] p-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-strong">
                <CalendarClock className="h-3.5 w-3.5" /> Schedule online
              </span>
              <h3 className="mt-3 text-base font-semibold text-foreground">Not sure where to start?</h3>
              <p className="mt-1 text-sm text-muted-foreground">Explore your options, then grab a time that works — we&apos;ll walk you through it.</p>

              <div className="mt-4 space-y-2">
                <PathLink icon={Megaphone} href="/advertisers" title="Advertising" note="Reach a present audience in real spaces" />
                <PathLink icon={Radio} href="/radio-stations" title="Partners — Radio stations" note="Bring the network to your listeners" />
                <PathLink icon={Server} href="/businesses" title="Revenue — System placement" note="Host a device and earn from your space" />
              </div>

              <Button asChild className="mt-5 w-full"><Link href="/request-demo">Book online <ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function InfoRow({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-brand-strong"><Icon className="h-4 w-4" /></span>
      <div>{children}</div>
    </div>
  );
}

function PathLink({ icon: Icon, href, title, note }: { icon: typeof Mail; href: string; title: string; note: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-brand-strong/40">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-brand-strong"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{note}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
