import Link from "next/link";

import { AppIcon } from "@/components/brand/logo";

const COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/marketplace", label: "Marketplace" },
      { href: "/pricing", label: "Pricing" },
      { href: "/request-demo", label: "Request a demo" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { href: "/advertisers", label: "For advertisers" },
      { href: "/businesses", label: "For businesses" },
      { href: "/partners", label: "For partners" },
      { href: "/radio-stations", label: "For radio stations" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/login", label: "Log in" },
      { href: "/register", label: "Get started" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <AppIcon className="h-9 w-9 rounded-lg" />
            <span className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">Channel Cast</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">Turn physical spaces into smart, motion-triggered audio advertising channels.</p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.title}</p>
            <ul className="mt-3 space-y-2">
              {c.links.map((l) => (
                <li key={l.href}><Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {2026} Channel Cast. All rights reserved.</p>
          <p>Motion-based audio advertising.</p>
        </div>
      </div>
    </footer>
  );
}
