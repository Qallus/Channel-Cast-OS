"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
};

const OVERRIDE = process.env.NEXT_PUBLIC_MAP_TILE_URL;
const TILES = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
};
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] || c);

// Generic Leaflet map for any records that carry a lat/lng. Reused across pages.
export default function RecordsMap({ points, onOpen }: { points: MapPoint[]; onOpen?: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const openRef = useRef(onOpen);
  openRef.current = onOpen;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const isDark = document.documentElement.classList.contains("dark");
    const map = L.map(containerRef.current, { scrollWheelZoom: false, attributionControl: true });
    mapRef.current = map;
    L.tileLayer(OVERRIDE || (isDark ? TILES.dark : TILES.light), { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);

    const brand = getComputedStyle(document.documentElement).getPropertyValue("--brand").trim();
    const brandColor = brand ? `hsl(${brand})` : "#c6ff00";

    const latlngs: L.LatLngExpression[] = [];
    points.forEach((p) => {
      if (typeof p.lat !== "number" || typeof p.lng !== "number") return;
      latlngs.push([p.lat, p.lng]);
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 8,
        color: brandColor,
        weight: 2,
        fillColor: brandColor,
        fillOpacity: 0.5,
      }).addTo(map);
      marker.bindPopup(
        `<div style="min-width:140px"><strong>${esc(p.title)}</strong>${p.subtitle ? `<br/><span style="opacity:.7">${esc(p.subtitle)}</span>` : ""}</div>`,
      );
      if (openRef.current) marker.on("click", () => openRef.current?.(p.id));
    });

    if (latlngs.length) map.fitBounds(L.latLngBounds(latlngs).pad(0.25));
    else map.setView([39.5, -98.35], 4); // continental US fallback

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  return <div ref={containerRef} className="h-[520px] w-full rounded-lg" />;
}
