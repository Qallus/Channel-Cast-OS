"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { AppIcon } from "@/components/brand/logo";
import { adminNavGroups, isNavItemActive } from "@/lib/nav/navigation";
import { cn } from "@/lib/utils";

export function AppSidebar({
  collapsed,
  onToggleCollapse,
  roleLabel = "Super Admin",
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  roleLabel?: string;
}) {
  const pathname = usePathname();

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
                const active = item.action !== "logout" && isNavItemActive(item.href, pathname);
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                        collapsed && "justify-center",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                        item.action === "logout" && "text-muted-foreground hover:text-destructive",
                      )}
                    >
                      <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-brand")} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse control */}
      <div className="border-t border-border px-3 py-3">
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
