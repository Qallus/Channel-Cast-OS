import { AudioLines } from "lucide-react";

import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-8 w-8 rounded-md",
  md: "h-10 w-10 rounded-md",
  lg: "h-12 w-12 rounded-lg",
};

/** Square cover thumbnail for an audio spot. Falls back to a waveform tile. */
export function SpotThumb({
  image,
  alt,
  size = "md",
  className,
}: {
  image?: string | null;
  alt?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const base = cn("shrink-0 overflow-hidden border border-border", SIZES[size], className);
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={alt || "Spot cover"} className={cn(base, "object-cover")} />;
  }
  return (
    <span className={cn(base, "flex items-center justify-center bg-muted text-muted-foreground")}>
      <AudioLines className="h-1/2 w-1/2" />
    </span>
  );
}
