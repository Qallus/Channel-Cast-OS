import { read, type StoredDevice } from "@/lib/server/store";

/** Resolve the device that owns the Bearer token on the request, if any. */
export function authDevice(req: Request): StoredDevice | null {
  const header = req.headers.get("authorization") || "";
  const tok = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!tok) return null;
  return read((db) => db.devices.find((d) => d.deviceToken === tok) ?? null);
}

export function clientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

export function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
