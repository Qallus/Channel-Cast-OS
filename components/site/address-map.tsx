"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin } from "lucide-react";

const Inner = dynamic(() => import("@/components/site/address-map-inner"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading map…</div>,
});

type Status = "idle" | "loading" | "found" | "notfound";

// Geocodes "address, city, state" with OpenStreetMap Nominatim (no key, matches
// the app's keyless tiles) and shows a map + marker once a location resolves.
export function AddressMap({ address, city, state }: { address: string; city: string; state: string }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const lastQuery = useRef("");

  useEffect(() => {
    const parts = [address, city, state].map((s) => s.trim()).filter(Boolean);
    // Need at least city + state before it's worth geocoding.
    if (!city.trim() || !state.trim()) { setStatus("idle"); return; }
    const q = parts.join(", ");
    if (q === lastQuery.current) return;

    const handle = setTimeout(async () => {
      lastQuery.current = q;
      setStatus("loading");
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } });
        const data = (await res.json()) as { lat: string; lon: string }[];
        if (Array.isArray(data) && data[0]) {
          setCoords({ lat: Number(data[0].lat), lng: Number(data[0].lon) });
          setStatus("found");
        } else {
          setStatus("notfound");
        }
      } catch {
        setStatus("notfound");
      }
    }, 900);
    return () => clearTimeout(handle);
  }, [address, city, state]);

  if (status === "idle") return null;

  return (
    <div className="mt-6">
      <p className="flex items-center gap-1.5 text-sm font-medium text-foreground"><MapPin className="h-4 w-4 text-brand-strong" /> Your location</p>
      <div className="mt-2 h-56 overflow-hidden rounded-xl border border-border bg-muted">
        {status === "loading" && <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finding your location…</div>}
        {status === "notfound" && <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">We couldn&apos;t place that address automatically — you can still submit, and we&apos;ll confirm the location with you.</div>}
        {status === "found" && coords && <Inner lat={coords.lat} lng={coords.lng} />}
      </div>
    </div>
  );
}
