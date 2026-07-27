"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { AudioSpot } from "@/lib/audio/spots";
import { SPOT_STATUS_META } from "@/lib/audio/spots";

const numFmt = new Intl.NumberFormat("en-US");

// Free, no-key tiles (CARTO basemaps). Override with a keyed provider via env.
const OVERRIDE = process.env.NEXT_PUBLIC_MAP_TILE_URL;
const TILES = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
};
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export default function SpotsMap({ spots }: { spots: AudioSpot[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const isDark = document.documentElement.classList.contains("dark");
    const map = L.map(containerRef.current, { scrollWheelZoom: false, attributionControl: true });
    mapRef.current = map;

    L.tileLayer(OVERRIDE || (isDark ? TILES.dark : TILES.light), { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);

    const brand = getComputedStyle(document.documentElement).getPropertyValue("--brand").trim();
    const brandColor = brand ? `hsl(${brand})` : "#c6ff00";

    const points: L.LatLngExpression[] = [];
    spots.forEach((s) => {
      points.push([s.lat, s.lng]);
      const statusLabel = SPOT_STATUS_META[s.status].label;
      L.circleMarker([s.lat, s.lng], {
        radius: 8,
        color: brandColor,
        weight: 2,
        fillColor: brandColor,
        fillOpacity: 0.55,
      })
        .addTo(map)
        .bindPopup(
          `<strong>${s.name}</strong><br/>${s.advertiser} · ${statusLabel}<br/>${s.city}, ${s.state}<br/>${numFmt.format(s.plays)} plays`,
        );
    });

    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 7 });
    else map.setView([39.5, -98.35], 4);

    // Leaflet needs a size recompute once the container has laid out.
    setTimeout(() => map.invalidateSize(), 60);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [spots]);

  return <div ref={containerRef} className="h-[520px] w-full rounded-lg border border-border" />;
}
