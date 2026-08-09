import Link from "next/link";

import { ScrollScene } from "@/components/site/scroll-scene";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Motion-activated audio · Channel Cast",
  description: "Channel Cast plays the right spot the moment someone walks by — powered by motion and on-device vision. Book ad space, create the audio, and run the network from one dashboard.",
};

type Side = "left" | "right" | "center";

function Section({ side, wide, children }: { side: Side; wide?: boolean; children: React.ReactNode }) {
  return (
    <section className="flex min-h-screen items-center px-4 py-28 sm:px-8 lg:px-20">
      <div
        className={cn(
          "rounded-2xl border border-border bg-card/90 p-8 shadow-2xl backdrop-blur-md",
          wide ? "max-w-3xl" : "max-w-xl",
          side === "right" && "ml-auto",
          side === "center" && "mx-auto text-center",
        )}
      >
        {children}
      </div>
    </section>
  );
}

const Eyebrow = ({ children }: { children: React.ReactNode }) => <p className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-brand-strong">{children}</p>;
const Lede = ({ children, center }: { children: React.ReactNode; center?: boolean }) => <p className={cn("max-w-[48ch] text-[15.5px] leading-relaxed text-muted-foreground sm:text-[17px]", center && "mx-auto")}>{children}</p>;

function Chips({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {items.map(([l, v]) => <span key={l} className="rounded-lg border border-border bg-card px-3 py-2 font-mono text-[11px] text-muted-foreground">{l} <b className="font-medium text-brand-strong">{v}</b></span>)}
    </div>
  );
}

function Cards({ items }: { items: [string, string, string][] }) {
  return (
    <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
      {items.map(([tag, h, p]) => (
        <div key={h} className="rounded-xl border border-border bg-card p-4">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-brand-strong">{tag}</span>
          <h5 className="mb-1.5 mt-2 text-[15.5px] font-semibold text-foreground">{h}</h5>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{p}</p>
        </div>
      ))}
    </div>
  );
}

function Actions({ items, center }: { items: { label: string; href: string; primary?: boolean }[]; center?: boolean }) {
  return (
    <div className={cn("mt-7 flex flex-wrap gap-2.5", center && "justify-center")}>
      {items.map((a) => <Button key={a.label} asChild variant={a.primary ? "default" : "outline"}><Link href={a.href}>{a.label}</Link></Button>)}
    </div>
  );
}

export default function AudioPage() {
  return (
    <>
      <ScrollScene variant="audio" />
      <div className="relative z-10">
        <Section side="left">
          <Eyebrow>Motion-activated audio</Eyebrow>
          <h1 className="mb-4 text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">Turn physical spaces into <span className="text-brand-strong">smart audio channels.</span></h1>
          <Lede>Channel Cast plays the right spot the moment someone walks by — powered by motion and on-device vision. Book ad space, create the audio, and run the network from one dashboard.</Lede>
          <Actions items={[{ label: "View ad space →", href: "/marketplace", primary: true }, { label: "Advertise with us", href: "/advertisers" }]} />
          <p className="mt-5 font-mono text-[11px] leading-relaxed text-muted-foreground">No credit card to explore the marketplace · Runs on any Windows mini-PC + USB webcam</p>
        </Section>

        <Section side="left">
          <Eyebrow>The sensor</Eyebrow>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">It watches the doorway, not the person.</h2>
          <Lede>A USB webcam clipped to the mini-PC runs the vision model locally. Footfall and dwell time are read at the edge — no faces stored, no video leaves the building.</Lede>
          <Chips items={[["Processing", "on-device"], ["Faces stored", "0"], ["Upload", "events only"]]} />
        </Section>

        <Section side="right">
          <Eyebrow>The trigger</Eyebrow>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Footfall in. The right 15 seconds out.</h2>
          <Lede>Every play is a decision: who booked this daypart, how long since the last spot, how many people are actually there.</Lede>
          <Chips items={[["Trigger to audio", "180 ms"], ["Cooldown", "per zone"], ["Dayparting", "on"]]} />
        </Section>

        <Section side="left" wide>
          <Eyebrow>The network</Eyebrow>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">One dashboard. Every location.</h2>
          <Lede>Each mini-PC is a node. Group by store, city, or advertiser, push a campaign to all of them at once, and get proof of play back the same minute.</Lede>
          <Cards items={[
            ["Locations", "List your space", "Publish your zones and set your own rate card."],
            ["Advertisers", "Book a daypart", "Pick zones, upload the spot, go live the same day."],
            ["Everyone", "See proof of play", "Timestamped plays, motion counts, and spend."],
          ]} />
        </Section>

        <Section side="center">
          <Eyebrow>Early access</Eyebrow>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Your entrance already has an audience.</h2>
          <Lede center>Plug in a mini-PC and a webcam. We&apos;ll handle the rest.</Lede>
          <Actions center items={[{ label: "Request access", href: "/register", primary: true }, { label: "Schedule a demo", href: "/request-demo" }]} />
        </Section>
      </div>
    </>
  );
}
