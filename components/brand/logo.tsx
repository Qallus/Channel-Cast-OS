import { cn } from "@/lib/utils";

/** Channel Cast app icon — the lime rounded-square emblem. */
export function AppIcon({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logos/app-icon.svg" alt="Channel Cast" className={cn("block", className)} />;
}
