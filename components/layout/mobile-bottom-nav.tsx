"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AudioLines, ChevronDown, ChevronUp, CircleUserRound, Headphones, IdCard, LayoutDashboard, MessageSquare, UserPlus } from "lucide-react";

import { cn } from "@/lib/utils";

// Fixed mobile-only bottom navigation — the most-used dashboard destinations,
// icon-only, with a hide/restore toggle. Hidden on lg+ where the sidebar shows.
const ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/app/admin" },
  { label: "Communications", icon: MessageSquare, href: "/app/admin/communications" },
  { label: "Contacts", icon: CircleUserRound, href: "/app/admin/contacts" },
  { label: "Leads", icon: UserPlus, href: "/app/admin/leads" },
  { label: "Audio Management", icon: AudioLines, href: "/app/admin/audio" },
  { label: "Devices", icon: Headphones, href: "/app/admin/devices" },
  { label: "Business Cards", icon: IdCard, href: "/app/admin/business-cards" },
];

const HIDE_KEY = "cc-bottomnav-hidden";

function isActive(href: string, pathname: string) {
  if (href === "/app/admin") return pathname === "/app/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHidden(localStorage.getItem(HIDE_KEY) === "1");
    setReady(true);
  }, []);

  function setHiddenPersist(next: boolean) {
    setHidden(next);
    localStorage.setItem(HIDE_KEY, next ? "1" : "0");
  }

  return (
    <>
      {/* Restore handle — shown only when the bar is hidden */}
      {ready && hidden && (
        <button
          type="button"
          onClick={() => setHiddenPersist(false)}
          aria-label="Show navigation bar"
          className="fixed bottom-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-lg lg:hidden"
        >
          <ChevronUp className="h-4 w-4" /> Menu
        </button>
      )}

      <nav
        aria-label="Primary"
        aria-hidden={hidden}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur transition-transform duration-300 lg:hidden",
          hidden ? "pointer-events-none translate-y-full" : "translate-y-0",
        )}
      >
        {/* Hide tab — on the left so it clears the bottom-right quick-actions FAB */}
        <button
          type="button"
          onClick={() => setHiddenPersist(true)}
          aria-label="Hide navigation bar"
          className="absolute -top-6 left-3 flex items-center gap-1 rounded-t-lg border border-b-0 border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground shadow-sm"
        >
          <ChevronDown className="h-3.5 w-3.5" /> Hide
        </button>

        <ul className="flex items-stretch justify-between px-1">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            const on = isActive(it.href, pathname);
            return (
              <li key={it.href} className="flex-1">
                <Link
                  href={it.href}
                  aria-label={it.label}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-center py-2.5 transition-colors",
                    on ? "text-brand-strong" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-[22px] w-[22px]" />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
