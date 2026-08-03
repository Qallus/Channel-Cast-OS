"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, ChevronDown, Menu, Radar, X } from "lucide-react";

import { AppIcon } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

// Grouped links surfaced in the Discover mega menu (and reused in the mobile menu).
const DISCOVER: { href: string; label: string; note: string }[][] = [
  [
    { href: "/how-it-works", label: "How it works", note: "From presence to play, measured" },
    { href: "/advertisers", label: "Advertisers", note: "Reach a present audience" },
    { href: "/resources", label: "Resources", note: "Guides & blog archive" },
  ],
  [
    { href: "/businesses", label: "Businesses", note: "Monetize your space" },
    { href: "/partners", label: "Partners", note: "Build on the network" },
    { href: "/faq", label: "FAQ", note: "Answers to common questions" },
  ],
];

// Simple top-level links after Discover.
const NAV = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <AppIcon className="h-9 w-9 rounded-lg" />
          <span className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">Channel Cast</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {/* Discover — mega menu on hover/focus */}
          <div className="group relative">
            <button className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground group-hover:text-foreground">
              Discover <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
            </button>
            <div className="invisible absolute left-0 top-full pt-2 opacity-0 transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <MegaMenu />
            </div>
          </div>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{n.label}</Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" asChild className="hidden sm:inline-flex"><Link href="/login">Log in</Link></Button>
          <Button asChild className="hidden sm:inline-flex"><Link href="/register">Get started</Link></Button>
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground lg:hidden">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={cn("border-t border-border lg:hidden", open ? "block" : "hidden")}>
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
          <button
            onClick={() => setDiscoverOpen((v) => !v)}
            className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
          >
            Discover <ChevronDown className={cn("h-4 w-4 transition-transform", discoverOpen && "rotate-180")} />
          </button>
          {discoverOpen && (
            <div className="mb-1 ml-2 flex flex-col gap-0.5 border-l border-border pl-3">
              {DISCOVER.flat().map((n) => (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">{n.label}</Link>
              ))}
            </div>
          )}
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">{n.label}</Link>
          ))}
          <div className="mt-2 flex gap-2">
            <Button variant="outline" asChild className="flex-1"><Link href="/login">Log in</Link></Button>
            <Button asChild className="flex-1"><Link href="/register">Get started</Link></Button>
          </div>
        </nav>
      </div>
    </header>
  );
}

function MegaMenu() {
  return (
    <div className="w-[46rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
      <div className="grid grid-cols-3">
        {DISCOVER.map((col, i) => (
          <div key={i} className="border-r border-border p-3">
            {col.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-accent">
                <p className="text-sm font-semibold text-foreground">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.note}</p>
              </Link>
            ))}
          </div>
        ))}

        {/* Column 3 — CTA with eyebrow, heading, infographic, button */}
        <div className="relative bg-[radial-gradient(80%_80%_at_50%_0%,hsl(var(--brand)/0.12),transparent)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-strong">New here?</p>
          <p className="mt-1 text-base font-semibold leading-snug text-foreground">See motion turn into measured plays.</p>

          {/* Mini infographic */}
          <div className="mt-4 rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-brand/15 text-brand-strong">
                <Radar className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" /></span>
              </span>
              Motion detected
            </div>
            <div className="mt-2 flex h-6 items-end gap-0.5">
              {[5, 11, 18, 9, 22, 14, 26, 12, 20, 8, 16, 24].map((h, i) => (
                <span key={i} className="cc-eq-bar w-1 rounded-full bg-brand-strong/70" style={{ height: `${h}px`, animationDelay: `${(i % 5) * 0.12}s` }} />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><BarChart3 className="h-3 w-3" /> 128 plays today</span>
              <span className="font-semibold text-brand-strong">+24%</span>
            </div>
          </div>

          <Button asChild size="sm" className="mt-4 w-full"><Link href="/how-it-works">Learn more <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
      </div>
    </div>
  );
}
