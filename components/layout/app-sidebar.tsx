"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

import { AppIcon } from "@/components/brand/logo";
import { adminNavGroups, isNavItemActive } from "@/lib/nav/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

export function AppSidebar({
  collapsed,
  onToggleCollapse,
  roleLabel = "Super Admin",
  mobile = false,
  onNavigate,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  roleLabel?: string;
  /** Rendered inside the full-screen mobile slide-out menu. */
  mobile?: boolean;
  /** Called when a nav item is tapped — used to close the mobile menu. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <AppIcon className="h-9 w-9 shrink-0 rounded-lg" />
        {!collapsed && (
          <span className="flex flex-col leading-tight">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Channel Cast
            </span>
            <span className="text-sm font-semibold text-foreground">{roleLabel}</span>
          </span>
        )}
        {mobile && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close menu"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {adminNavGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <p className="px-2 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isLogout = item.action === "logout";
                const active = !isLogout && isNavItemActive(item.href, pathname);
                const Icon = item.icon;
                const className = cn(
                  "group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  isLogout && "text-muted-foreground hover:text-destructive",
                );
                const inner = (
                  <>
                    <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-brand-strong")} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </>
                );
                return (
                  <li key={item.label}>
                    {isLogout ? (
                      <button type="button" onClick={() => { onNavigate?.(); handleLogout(); }} title={collapsed ? item.label : undefined} className={className}>
                        {inner}
                      </button>
                    ) : (
                      <Link href={item.href} onClick={onNavigate} title={collapsed ? item.label : undefined} className={className}>
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse control — desktop only (the mobile menu closes via its X) */}
      <div className={cn("border-t border-border px-3 py-3", mobile && "hidden")}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground",
            collapsed && "justify-center",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px]" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px]" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
