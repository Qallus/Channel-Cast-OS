"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Menu, Search } from "lucide-react";

import { adminNavGroups } from "@/lib/nav/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { loadProfile, initials as profileInitials, PROFILE_EVENT, STORAGE_KEY } from "@/lib/profile/profile";

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
  userEmail = "",
}: {
  onOpenMobileNav: () => void;
  roleLabel?: string;
  userEmail?: string;
}) {
  const section = useCurrentSection();

  // Avatar + name come from the saved profile (localStorage). Falls back to the
  // role label's initials until the profile hydrates after mount.
  const roleInitials = roleLabel.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState("");
  useEffect(() => {
    const sync = () => { const p = loadProfile(); setAvatar(p.avatar); setName(p.fullName); };
    sync();
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) sync(); };
    window.addEventListener(PROFILE_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener(PROFILE_EVENT, sync); window.removeEventListener("storage", onStorage); };
  }, []);
  const initials = name.trim() ? profileInitials(name) : roleInitials;

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
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={name || "Profile"} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-foreground">
              {initials}
            </span>
          )}
          {userEmail && <span className="hidden text-sm text-muted-foreground lg:inline">{userEmail}</span>}
        </div>
      </div>
    </header>
  );
}
