"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TILES = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
};
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Teardrop pin (asset-free divIcon) — dark-green body, lime dot, white outline
// so it reads on both light and dark tiles.
const pinIcon = L.divIcon({
  className: "",
  html:
    '<svg width="28" height="35" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M12 0C6.5 0 2 4.5 2 10c0 7 10 20 10 20s10-13 10-20C22 4.5 17.5 0 12 0Z" fill="#2f5417" stroke="#ffffff" stroke-width="1.5"/>' +
    '<circle cx="12" cy="10" r="4.6" fill="#c6ff00"/></svg>',
  iconSize: [28, 35],
  iconAnchor: [14, 35],
});

export default function AddressMapInner({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const isDark = document.documentElement.classList.contains("dark");

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, { scrollWheelZoom: false, attributionControl: true });
      L.tileLayer(isDark ? TILES.dark : TILES.light, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(mapRef.current);
    }
    const map = mapRef.current;
    map.setView([lat, lng], 15);

    if (!markerRef.current) markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
    else markerRef.current.setLatLng([lat, lng]);

    // Leaflet needs a size recalc when it mounts inside a just-shown container.
    setTimeout(() => map.invalidateSize(), 60);
  }, [lat, lng]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; markerRef.current = null; }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
