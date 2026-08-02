"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, CalendarCheck, LayoutDashboard, LogOut, Megaphone, Menu, Store, X } from "lucide-react";
import { useState } from "react";

import { AppIcon } from "@/components/brand/logo";
import { Fab } from "@/components/fab/fab";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app/advertiser", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/app/advertiser/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/app/advertiser/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/app/advertiser/reports", label: "Reports", icon: BarChart3 },
  { href: "/marketplace", label: "Browse marketplace", icon: Store },
];

export function AdvertiserShell({ children, userEmail }: { children: React.ReactNode; userEmail?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const active = (n: (typeof NAV)[number]) => (n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(`${n.href}/`));

  async function logout() {
    await getSupabaseBrowserClient()?.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <AppIcon className="h-9 w-9 shrink-0 rounded-lg" />
        <span className="flex flex-col leading-tight">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Channel Cast</span>
          <span className="text-sm font-semibold text-foreground">Advertiser</span>
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 pb-4">
        {NAV.map((n) => {
          const Icon = n.icon;
          const on = active(n);
          return (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors", on ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")}>
              <Icon className={cn("h-[18px] w-[18px] shrink-0", on && "text-brand-strong")} /> {n.label}
            </Link>
          );
        })}
      </nav>
      <button onClick={logout} className="mx-3 mb-4 flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive">
        <LogOut className="h-[18px] w-[18px]" /> Log out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border bg-card">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <button onClick={() => setOpen(true)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground lg:hidden" aria-label="Menu">{open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>
          <span className="text-sm text-muted-foreground">Advertiser dashboard</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {userEmail && <span className="hidden text-sm text-muted-foreground sm:inline">{userEmail}</span>}
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>

      <Fab />
    </div>
  );
}
