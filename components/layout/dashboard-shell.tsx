"use client";

import { useState } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { Fab } from "@/components/fab/fab";
import { cn } from "@/lib/utils";

export function DashboardShell({
  children,
  roleLabel = "Super Admin",
  userEmail,
}: {
  children: React.ReactNode;
  roleLabel?: string;
  userEmail?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-card transition-[width] duration-200 lg:block",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        <AppSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          roleLabel={roleLabel}
        />
      </aside>

      {/* Mobile full-screen slide-out menu */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", mobileOpen ? "" : "pointer-events-none")}>
        <div
          className={cn(
            "absolute inset-0 bg-background/70 backdrop-blur-sm transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-full border-r border-border bg-card shadow-2xl transition-transform duration-300 sm:max-w-sm",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <AppSidebar mobile collapsed={false} onToggleCollapse={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} roleLabel={roleLabel} />
        </aside>
      </div>

      {/* Content */}
      <div className={cn("flex min-h-screen flex-col transition-[padding] duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-64")}>
        <AppTopbar onOpenMobileNav={() => setMobileOpen(true)} roleLabel={roleLabel} userEmail={userEmail} />
        <main className="flex-1 px-4 py-6 pb-28 md:px-6 lg:px-8 lg:pb-8">{children}</main>
      </div>

      {/* Fixed mobile bottom navigation */}
      <MobileBottomNav />

      {/* Global quick-actions FAB */}
      <Fab />
    </div>
  );
}
