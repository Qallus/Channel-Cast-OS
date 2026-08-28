"use client";

// Where a device physically is. Shared by the audio player page and the screen
// page — both plot onto the same fleet Map view, so both edit the same fields.

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  deviceId: string;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  onSaved?: (message: string) => void;
};

export function DeviceLocationCard({ deviceId, locationName, latitude, longitude, onSaved }: Props) {
  const [loc, setLoc] = useState<{ name: string; lat: string; lng: string } | null>(null);

  // Adopt the saved values once, then let the inputs own them.
  useEffect(() => {
    if (loc === null) {
      setLoc({
        name: locationName ?? "",
        lat: latitude != null ? String(latitude) : "",
        lng: longitude != null ? String(longitude) : "",
      });
    }
  }, [loc, locationName, latitude, longitude]);

  async function save() {
    if (!loc) return;
    try {
      await fetch(`/api/admin/devices/${deviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationName: loc.name || null,
          latitude: loc.lat.trim() === "" ? null : Number(loc.lat),
          longitude: loc.lng.trim() === "" ? null : Number(loc.lng),
        }),
      });
      onSaved?.("Location saved.");
    } catch {
      onSaved?.("Couldn't save location.");
    }
  }

  if (!loc) return null;

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <p className="text-sm font-semibold text-foreground">Location</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Input value={loc.name} onChange={(e) => setLoc({ ...loc, name: e.target.value })} placeholder="Location name (e.g. Front entrance)" />
          <Input value={loc.lat} onChange={(e) => setLoc({ ...loc, lat: e.target.value })} placeholder="Latitude" inputMode="decimal" className="sm:w-32" />
          <Input value={loc.lng} onChange={(e) => setLoc({ ...loc, lng: e.target.value })} placeholder="Longitude" inputMode="decimal" className="sm:w-32" />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Add latitude/longitude to plot this device on the fleet Map view.</p>
          <Button size="sm" onClick={save}>Save location</Button>
        </div>
      </CardContent>
    </Card>
  );
}
