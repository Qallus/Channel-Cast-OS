import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";

import { EventRsvp } from "@/components/site/event-rsvp";
import { listRecords } from "@/lib/server/crm-db";
import { EVENT_TYPE_LABEL, fmtTime, type EventPage } from "@/lib/bookings/types";

export const dynamic = "force-dynamic";

async function getEvent(slug: string): Promise<EventPage | null> {
  try {
    const rows = (await listRecords("event_pages")) as unknown as EventPage[];
    return rows.find((e) => e.slug === slug && e.status === "published") ?? null;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = await getEvent(slug);
  return { title: e ? `${e.title} · Channel Cast` : "Event · Channel Cast" };
}

export default async function EventPageView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = await getEvent(slug);
  if (!e) notFound();

  const dateLabel = new Date(`${e.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const spotsLeft = e.capacity ? Math.max(0, e.capacity - e.rsvps.length) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-strong">{EVENT_TYPE_LABEL[e.eventType]}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{e.title}</h1>
      {e.summary && <p className="mt-2 max-w-2xl text-lg text-muted-foreground">{e.summary}</p>}

      {e.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.photoUrl} alt={e.title} className="mt-6 h-64 w-full rounded-2xl border border-border object-cover sm:h-96" />
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="flex items-center gap-2 text-sm text-foreground"><CalendarDays className="h-4 w-4 text-brand-strong" /> {dateLabel}</p>
            <p className="flex items-center gap-2 text-sm text-foreground"><Clock className="h-4 w-4 text-brand-strong" /> {fmtTime(e.startTime)} – {fmtTime(e.endTime)}</p>
            {e.location && <p className="flex items-center gap-2 text-sm text-foreground"><MapPin className="h-4 w-4 text-brand-strong" /> {e.location}</p>}
            {e.showSpots && spotsLeft != null && <p className="flex items-center gap-2 text-sm text-foreground"><Users className="h-4 w-4 text-brand-strong" /> {spotsLeft} spots left</p>}
          </div>
          {e.description && <p className="mt-6 whitespace-pre-wrap leading-relaxed text-foreground/90">{e.description}</p>}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start"><EventRsvp slug={e.slug} /></aside>
      </div>
    </div>
  );
}
