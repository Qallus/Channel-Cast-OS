import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageHero } from "@/components/site/marketing";
import { POSTS, formatDate } from "@/lib/marketing/posts";

export const metadata = { title: "Resources · Channel Cast", description: "Guides, hardware notes, and analytics on motion-based audio advertising." };

export default function ResourcesPage() {
  return (
    <>
      <PageHero eyebrow="Resources" title="Guides & blog archive." subtitle="How motion-based audio advertising works in practice — from sensors to earnings to measuring real plays." />
      <section>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {POSTS.map((p) => (
              <Link key={p.slug} href={`/resources/${p.slug}`} className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-brand-strong/40">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-brand-strong">{p.category}</span>
                  <span>{formatDate(p.date)}</span>
                  <span>· {p.readMins} min</span>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-foreground">{p.title}</h2>
                <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{p.excerpt}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-strong">Read article <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
