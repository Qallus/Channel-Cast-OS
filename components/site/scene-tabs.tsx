"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

// The four scroll landing pages, in the order they appear in the prototype's
// bottom switcher. Kept here so every scene page renders an identical bar.
export const SCENE_TABS: { href: string; label: string }[] = [
  { href: "/audio", label: "Audio device" },
  { href: "/digital-displays", label: "Digital displays" },
  { href: "/wall-space", label: "Wall space" },
  { href: "/street-furniture", label: "Street furniture" },
];

export function SceneTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Choose media type"
      className="fixed bottom-4 left-1/2 z-40 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-full border border-border bg-card/85 p-1.5 shadow-2xl backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {SCENE_TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-2 text-[12.5px] font-medium transition-colors",
              active ? "bg-brand font-semibold text-brand-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
