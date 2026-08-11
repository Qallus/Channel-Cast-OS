"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { Listing } from "@/lib/marketing/marketplace";

const TILES = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  // Voyager: a full-color but clean basemap (blue water, green parks, colored roads).
  light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
};
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const priceIcon = (price: number) =>
  L.divIcon({ className: "cc-pin", html: `<div class="cc-price-pin">$${price.toLocaleString("en-US")}</div>`, iconSize: [0, 0], iconAnchor: [0, 0] });

export default function MarketplaceMap({
  listings, highlightSlug, onHover, onSelect,
}: {
  listings: Listing[];
  highlightSlug?: string | null;
  onHover?: (slug: string | null) => void;
  onSelect?: (slug: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Build the map + markers once (and rebuild when the located set changes).
  useEffect(() => {
    if (!containerRef.current) return;
    const located = listings.filter((l) => l.lat != null && l.lng != null);
    const isDark = document.documentElement.classList.contains("dark");

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, { scrollWheelZoom: true, attributionControl: true });
      L.tileLayer(isDark ? TILES.dark : TILES.light, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(mapRef.current);
    }
    const map = mapRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    const pts: L.LatLngExpression[] = [];
    located.forEach((l) => {
      const lat = l.lat as number;
      const lng = l.lng as number;
      pts.push([lat, lng]);
      const marker = L.marker([lat, lng], { icon: priceIcon(l.pricePerWeek), riseOnHover: true }).addTo(map);
      marker.on("mouseover", () => onHover?.(l.slug));
      marker.on("mouseout", () => onHover?.(null));
      marker.on("click", () => onSelect?.(l.slug));
      markersRef.current.set(l.slug, marker);
    });
    if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.35));
    else map.setView([39.5, -98.35], 4);

    return () => { /* keep the map instance across highlight changes */ };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings]);

  // Toggle the active class on the highlighted marker without rebuilding the map.
  useEffect(() => {
    markersRef.current.forEach((m, slug) => {
      const el = m.getElement()?.querySelector(".cc-price-pin");
      if (el) el.classList.toggle("is-active", slug === highlightSlug);
    });
  }, [highlightSlug]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  return <div ref={containerRef} className="h-full w-full rounded-xl border border-border" />;
}
