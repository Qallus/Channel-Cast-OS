"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { AppIcon } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/advertisers", label: "Advertisers" },
  { href: "/businesses", label: "Businesses" },
  { href: "/partners", label: "Partners" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <AppIcon className="h-9 w-9 rounded-lg" />
          <span className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">Channel Cast</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
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

      <div className={cn("border-t border-border lg:hidden", open ? "block" : "hidden")}>
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
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
