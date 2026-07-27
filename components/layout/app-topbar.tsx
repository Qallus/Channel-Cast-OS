"use client";

import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Menu, Search } from "lucide-react";

import { adminNavGroups } from "@/lib/nav/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";

function useCurrentSection() {
  const pathname = usePathname();
  const items = adminNavGroups.flatMap((g) => g.items);
  const match = items
    .filter((i) => i.action !== "logout")
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  return match?.label ?? "Dashboard";
}

export function AppTopbar({
  onOpenMobileNav,
  roleLabel = "Super Admin",
  userEmail = "alex@channelcast.example",
}: {
  onOpenMobileNav: () => void;
  roleLabel?: string;
  userEmail?: string;
}) {
  const section = useCurrentSection();
  const initials = roleLabel
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="hidden items-center gap-1.5 text-sm sm:flex">
        <span className="text-muted-foreground">{roleLabel}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        <span className="font-medium text-foreground">{section}</span>
      </div>

      <div className="relative ml-auto hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search clients, advertisers, campaigns…"
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand" />
        </button>
        <ThemeToggle />
        <div className="flex items-center gap-2 rounded-md pl-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            {initials}
          </span>
          <span className="hidden text-sm text-muted-foreground lg:inline">{userEmail}</span>
        </div>
      </div>
    </header>
  );
}
