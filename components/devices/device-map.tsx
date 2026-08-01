"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapDevice = { id: string; name: string; deviceCode: string; status: string; latitude: number | null; longitude: number | null };

const TILES = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
};
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export default function DeviceMap({ devices }: { devices: MapDevice[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const isDark = document.documentElement.classList.contains("dark");
    const map = L.map(containerRef.current, { scrollWheelZoom: false });
    mapRef.current = map;
    L.tileLayer(isDark ? TILES.dark : TILES.light, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);

    const located = devices.filter((d) => d.latitude != null && d.longitude != null);
    const points: L.LatLngExpression[] = [];
    located.forEach((d) => {
      const lat = d.latitude as number;
      const lng = d.longitude as number;
      points.push([lat, lng]);
      const online = d.status === "online";
      const color = online ? "#22c55e" : "#94a3b8";
      L.circleMarker([lat, lng], { radius: 8, color, fillColor: color, fillOpacity: 0.85, weight: 2 })
        .addTo(map)
        .bindPopup(`<strong>${d.name}</strong><br/>${d.deviceCode} · ${online ? "Online" : "Offline"}`);
    });
    if (points.length) map.fitBounds(L.latLngBounds(points as L.LatLngExpression[]).pad(0.3));
    else map.setView([39.5, -98.35], 4); // continental US

    return () => { map.remove(); mapRef.current = null; };
  }, [devices]);

  return <div ref={containerRef} className="h-[520px] w-full rounded-lg border border-border" />;
}
