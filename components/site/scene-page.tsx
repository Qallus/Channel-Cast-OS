import Link from "next/link";

import { ScrollScene, type SceneVariant } from "@/components/site/scroll-scene";
import { SceneTabs } from "@/components/site/scene-tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Content ported verbatim from docs/3js-landing-pages/channelcast-scroll-v3.html (PAGES.beats).
// Action hrefs are wired to real routes; the prototype used placeholder "#" links.
type Action = { label: string; href: string; primary?: boolean };
type Beat = {
  side: "left" | "right" | "center";
  wide?: boolean;
  eyebrow: string;
  h1?: { before: string; em: string; after?: string };
  h?: string;
  sub: string;
  chips?: [string, string][];
  cards?: [string, string, string][];
  actions?: Action[];
  fine?: string;
};

export const SCENE_META: Record<SceneVariant, { title: string; description: string }> = {
  audio: {
    title: "Motion-activated audio · Channel Cast",
    description: "Channel Cast plays the right spot the moment someone walks by — powered by motion and on-device vision. Book ad space, create the audio, and run the network from one dashboard.",
  },
  displays: {
    title: "Digital displays · Channel Cast",
    description: "Menu boards, window displays, lobby screens. Schedule your own content, sell the gaps to advertisers, and change all of it from one place.",
  },
  wall: {
    title: "Wall space · Channel Cast",
    description: "Blank walls, warehouse sides, and long construction fences — large-format ad space that isn't a billboard and doesn't need a billboard permit.",
  },
  street: {
    title: "Street furniture · Channel Cast",
    description: "Bus shelters, transit kiosks, and bench backs — the formats people stand in front of for four minutes at a time. Illuminated, weather-rated, and bookable by the week.",
  },
};

const SCENES: Record<SceneVariant, Beat[]> = {
  audio: [
    {
      side: "left", eyebrow: "Motion-activated audio",
      h1: { before: "Turn physical spaces into ", em: "smart audio channels." },
      sub: "Channel Cast plays the right spot the moment someone walks by — powered by motion and on-device vision. Book ad space, create the audio, and run the network from one dashboard.",
      actions: [{ label: "View ad space →", href: "/marketplace", primary: true }, { label: "Advertise with us", href: "/advertisers" }],
      fine: "No credit card to explore the marketplace · Runs on any Windows mini-PC + USB webcam",
    },
    {
      side: "left", eyebrow: "The sensor", h: "It watches the doorway, not the person.",
      sub: "A USB webcam clipped to the mini-PC runs the vision model locally. Footfall and dwell time are read at the edge — no faces stored, no video leaves the building.",
      chips: [["Processing", "on-device"], ["Faces stored", "0"], ["Upload", "events only"]],
    },
    {
      side: "right", eyebrow: "The trigger", h: "Footfall in. The right 15 seconds out.",
      sub: "Every play is a decision: who booked this daypart, how long since the last spot, how many people are actually there.",
      chips: [["Trigger to audio", "180 ms"], ["Cooldown", "per zone"], ["Dayparting", "on"]],
    },
    {
      side: "left", wide: true, eyebrow: "The network", h: "One dashboard. Every location.",
      sub: "Each mini-PC is a node. Group by store, city, or advertiser, push a campaign to all of them at once, and get proof of play back the same minute.",
      cards: [
        ["Locations", "List your space", "Publish your zones and set your own rate card."],
        ["Advertisers", "Book a daypart", "Pick zones, upload the spot, go live the same day."],
        ["Everyone", "See proof of play", "Timestamped plays, motion counts, and spend."],
      ],
    },
    {
      side: "center", eyebrow: "Early access", h: "Your entrance already has an audience.",
      sub: "Plug in a mini-PC and a webcam. We'll handle the rest.",
      actions: [{ label: "Request access", href: "/register", primary: true }, { label: "Schedule a demo", href: "/request-demo" }],
    },
  ],
  displays: [
    {
      side: "left", eyebrow: "Digital displays",
      h1: { before: "Every screen you own is ", em: "ad space." },
      sub: "Menu boards, window displays, lobby screens. Schedule your own content, sell the gaps to advertisers, and change all of it from one place.",
      actions: [{ label: "See the marketplace →", href: "/marketplace", primary: true }, { label: "List your screens", href: "/businesses" }],
      fine: "Runs on any Windows or Android player · No proprietary hardware",
    },
    {
      side: "left", eyebrow: "The player", h: "Plug in. It's already on air.",
      sub: "Pair a screen with a six-digit code and the player pulls its playlist and starts. If the network drops, it keeps playing from cache and reports back when it returns.",
      chips: [["Pairing", "6-digit code"], ["Offline", "plays from cache"], ["Uptime", "reported hourly"]],
    },
    {
      side: "right", eyebrow: "The wall", h: "One playlist across every screen in the room.",
      sub: "Group screens into a zone and they play in sync — or split them so the menu board runs pricing while the window runs the promo.",
      chips: [["Sync", "frame-aligned"], ["Zones", "unlimited"], ["Menus", "live pricing"]],
    },
    {
      side: "left", wide: true, eyebrow: "The network", h: "Monetize the screens you already have.",
      sub: "Open your unsold slots to the marketplace. Advertisers book by location and daypart, your own content stays in rotation, and revenue splits automatically.",
      cards: [
        ["Venues", "Sell your gaps", "Set a floor price and which categories you accept."],
        ["Advertisers", "Buy by daypart", "Filter by neighborhood, foot traffic, screen size."],
        ["Everyone", "Proof of display", "Screenshots and play logs, timestamped per screen."],
      ],
    },
    {
      side: "center", eyebrow: "Get started", h: "Your screens are running ads for nobody.",
      sub: "Pair the first one in about five minutes.",
      actions: [{ label: "Add a screen", href: "/register", primary: true }, { label: "Talk to us", href: "/contact" }],
    },
  ],
  wall: [
    {
      side: "left", eyebrow: "Wall space",
      h1: { before: "The side of your building is ", em: "unsold inventory." },
      sub: "Blank walls, warehouse sides, and long construction fences — large-format ad space that isn't a billboard and doesn't need a billboard permit. Own the wall, set the rate, keep the revenue.",
      actions: [{ label: "List a wall →", href: "/businesses", primary: true }, { label: "Find wall space", href: "/marketplace" }],
      fine: "Painted walls, vinyl and mesh wraps, fence banners · Surveyed, permitted, and installed by Channel Cast",
    },
    {
      side: "right", eyebrow: "The wall", h: "Print at building scale.",
      sub: "We survey the wall, pull the permit, print on vinyl or mesh, and rig the install. You approve one proof and get photos when it's up. Walls hold a campaign for months, not eight seconds.",
      chips: [["Survey", "included"], ["Permitting", "handled"], ["Term", "monthly or seasonal"]],
    },
    {
      side: "left", eyebrow: "The fence line", h: "Construction fence is the cheapest reach in the city.",
      sub: "A block of site fencing sits in front of the same commuters every morning for a year. Mesh banners go up in an afternoon and come down without a mark.",
      chips: [["Material", "printed mesh"], ["Wind", "rated & vented"], ["Install", "half a day"]],
    },
    {
      side: "left", wide: true, eyebrow: "The block", h: "Buy a corridor, not a single wall.",
      sub: "Group walls and fence runs by street so a campaign follows the route instead of sitting on one facade. Filter by traffic count, sightline, and how long the space is available.",
      cards: [
        ["Owners", "List the surface", "Send a photo and dimensions — we price it."],
        ["Advertisers", "Buy the block", "Every wall and fence on a corridor, one line item."],
        ["Everyone", "Photo verified", "Install and quarterly condition photos per surface."],
      ],
    },
    {
      side: "center", eyebrow: "Get listed", h: "That wall has been advertising for the weather.",
      sub: "Send us a photo and the address. We'll tell you what it's worth.",
      actions: [{ label: "Get a wall assessed", href: "/contact", primary: true }, { label: "See available walls", href: "/marketplace" }],
    },
  ],
  street: [
    {
      side: "left", eyebrow: "Street furniture",
      h1: { before: "Advertising at ", em: "eye level." },
      sub: "Bus shelters, transit kiosks, and bench backs — the formats people stand in front of for four minutes at a time. Illuminated, weather-rated, and bookable by the week.",
      actions: [{ label: "Find street inventory →", href: "/marketplace", primary: true }, { label: "Partner with us", href: "/partners" }],
      fine: "Backlit and digital faces · Municipal permitting handled per city",
    },
    {
      side: "right", eyebrow: "The shelter", h: "Four minutes of undivided attention.",
      sub: "A rider waiting for the bus is a captive audience with nothing else to look at. Backlit shelter panels run day and night without a power run to each face.",
      chips: [["Dwell", "≈4 min"], ["Faces", "2 per shelter"], ["Lighting", "solar backlit"]],
    },
    {
      side: "left", eyebrow: "The kiosk", h: "Two-sided, both directions of foot traffic.",
      sub: "Freestanding kiosks catch pedestrians coming and going. Digital versions swap creative on a schedule; printed versions change over in one visit.",
      chips: [["Format", "two-sided"], ["Change over", "weekly"], ["Rating", "IP65"]],
    },
    {
      side: "left", wide: true, eyebrow: "The district", h: "Book a neighborhood, block by block.",
      sub: "Group shelters, kiosks, and benches into districts so a campaign covers a whole retail corridor instead of one intersection.",
      cards: [
        ["Cities", "Shelter partnerships", "Revenue share on transit stops you already maintain."],
        ["Advertisers", "Buy a district", "Every face on a corridor, one line item."],
        ["Everyone", "Verified installs", "Photo proof and GPS per face, every cycle."],
      ],
    },
    {
      side: "center", eyebrow: "Get started", h: "The bus stop outside is unsold.",
      sub: "Tell us the cross streets and we'll show you what's available.",
      actions: [{ label: "Check availability", href: "/marketplace", primary: true }, { label: "Become a partner", href: "/partners" }],
    },
  ],
};

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-brand-strong">{children}</p>
);

function Chips({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {items.map(([l, v]) => (
        <span key={l} className="rounded-lg border border-border bg-card px-3 py-2 font-mono text-[11px] text-muted-foreground">
          {l} <b className="font-medium text-brand-strong">{v}</b>
        </span>
      ))}
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

function Actions({ items, center }: { items: Action[]; center?: boolean }) {
  return (
    <div className={cn("mt-7 flex flex-wrap gap-2.5", center && "justify-center")}>
      {items.map((a) => (
        <Button key={a.label} asChild variant={a.primary ? "default" : "outline"}>
          <Link href={a.href}>{a.label}</Link>
        </Button>
      ))}
    </div>
  );
}

function BeatSection({ beat, first }: { beat: Beat; first: boolean }) {
  const lede = cn("max-w-[48ch] text-[15.5px] leading-relaxed text-muted-foreground sm:text-[17px]", beat.side === "center" && "mx-auto");
  return (
    <section className="flex min-h-screen items-center px-4 py-28 sm:px-8 lg:px-20">
      <div
        className={cn(
          "rounded-2xl border border-border bg-card/90 p-8 shadow-2xl backdrop-blur-md",
          beat.wide ? "max-w-3xl" : "max-w-xl",
          beat.side === "right" && "ml-auto",
          beat.side === "center" && "mx-auto text-center",
        )}
      >
        <Eyebrow>{beat.eyebrow}</Eyebrow>
        {beat.h1 ? (
          first ? (
            <h1 className="mb-4 text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
              {beat.h1.before}
              <span className="text-brand-strong">{beat.h1.em}</span>
              {beat.h1.after}
            </h1>
          ) : (
            <h2 className="mb-4 text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
              {beat.h1.before}
              <span className="text-brand-strong">{beat.h1.em}</span>
              {beat.h1.after}
            </h2>
          )
        ) : (
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">{beat.h}</h2>
        )}
        <p className={lede}>{beat.sub}</p>
        {beat.chips && <Chips items={beat.chips} />}
        {beat.cards && <Cards items={beat.cards} />}
        {beat.actions && <Actions items={beat.actions} center={beat.side === "center"} />}
        {beat.fine && <p className="mt-5 font-mono text-[11px] leading-relaxed text-muted-foreground">{beat.fine}</p>}
      </div>
    </section>
  );
}

export function ScenePage({ variant }: { variant: SceneVariant }) {
  return (
    <>
      <ScrollScene variant={variant} />
      <div className="relative z-10">
        {SCENES[variant].map((beat, i) => (
          <BeatSection key={beat.eyebrow} beat={beat} first={i === 0} />
        ))}
      </div>
      <SceneTabs />
    </>
  );
}
