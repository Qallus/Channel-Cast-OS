"use client";

// The screen itself. Runs full-bleed in a kiosk browser.
//
// Two things matter more than anything else here: it must never stop, and it
// must never show chrome. A shop screen that displays an error page or a spinner
// is worse than one showing the last creative it had, so every failure path
// falls back to continuing with the cached loop.

import { useCallback, useEffect, useRef, useState } from "react";

import type { PlayerManifest } from "@/lib/displays/types";

type Play = { mediaId: string; loopId: string | null; name: string; durationSec: number; playedAt: string };

const CACHE_KEY = (token: string) => `cc:display-manifest:${token}`;

export function DisplayPlayer({ token }: { token: string }) {
  const [manifest, setManifest] = useState<PlayerManifest | null>(null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [offline, setOffline] = useState(false);
  const pending = useRef<Play[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Manifest: fetch, cache, and fall back to cache when the network is down ──
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/display/${token}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as PlayerManifest;
      setManifest((prev) => {
        // Only reset position when the loop actually changed, so a poll doesn't
        // restart a screen mid-loop.
        if (prev?.loop?.id === data.loop?.id && prev?.loop?.version === data.loop?.version) return prev;
        setIndex(0);
        return data;
      });
      setOffline(false);
      try { localStorage.setItem(CACHE_KEY(token), JSON.stringify(data)); } catch { /* private mode */ }
    } catch {
      setOffline(true);
      setManifest((prev) => {
        if (prev) return prev;
        try {
          const cached = localStorage.getItem(CACHE_KEY(token));
          return cached ? (JSON.parse(cached) as PlayerManifest) : null;
        } catch { return null; }
      });
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const seconds = manifest?.pollSeconds ?? 60;
    const id = setInterval(() => void load(), seconds * 1000);
    return () => clearInterval(id);
  }, [load, manifest?.pollSeconds]);

  // ── Proof of play, batched so a screen isn't chatty ─────────────────────────
  const flush = useCallback(async () => {
    if (!pending.current.length) return;
    const plays = pending.current.splice(0, pending.current.length);
    try {
      await fetch(`/api/display/${token}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plays }),
      });
    } catch {
      // Put them back and try on the next flush rather than losing the record.
      pending.current.unshift(...plays);
    }
  }, [token]);
  useEffect(() => {
    const id = setInterval(() => void flush(), 60_000);
    return () => clearInterval(id);
  }, [flush]);

  const items = manifest?.items ?? [];
  const current = items.length ? items[index % items.length] : null;

  // ── Advance ─────────────────────────────────────────────────────────────────
  const advance = useCallback(() => {
    setVisible(false);
    // Matches the CSS fade so creative never hard-cuts mid-transition.
    window.setTimeout(() => {
      setIndex((i) => i + 1);
      setVisible(true);
    }, 400);
  }, []);

  useEffect(() => {
    if (!current) return;
    pending.current.push({
      mediaId: current.id,
      loopId: manifest?.loop?.id ?? null,
      name: current.name,
      durationSec: current.durationSec,
      playedAt: new Date().toISOString(),
    });
    // Video drives its own timing via onEnded; stills use the loop's dwell.
    if (current.kind === "video") return;
    const id = window.setTimeout(advance, Math.max(1, current.durationSec) * 1000);
    return () => window.clearTimeout(id);
  }, [current, advance, manifest?.loop?.id]);

  // Keep the screen awake where the browser allows it.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => {});
    return () => { void lock?.release().catch(() => {}); };
  }, []);

  // Preload the next creative so a transition never shows an empty frame.
  const next = items.length > 1 ? items[(index + 1) % items.length] : null;

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {current ? (
        <>
          {current.kind === "video" ? (
            <video
              ref={videoRef}
              key={`${current.id}-${index}`}
              src={current.url}
              autoPlay
              muted
              playsInline
              onEnded={advance}
              // A creative that fails to decode must not freeze the loop.
              onError={advance}
              className={`h-full w-full object-contain transition-opacity duration-[400ms] ${visible ? "opacity-100" : "opacity-0"}`}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${current.id}-${index}`}
              src={current.url}
              alt=""
              onError={advance}
              className={`h-full w-full object-contain transition-opacity duration-[400ms] ${visible ? "opacity-100" : "opacity-0"}`}
            />
          )}
          {next && (next.kind === "image"
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={next.url} alt="" aria-hidden className="pointer-events-none absolute h-px w-px opacity-0" />
            : <link rel="prefetch" href={next.url} />)}
        </>
      ) : (
        <IdleScreen name={manifest?.device.name} hasLoop={Boolean(manifest?.loop)} />
      )}

      {/* Deliberately tiny and low contrast: an operator can see the screen is
          alive and offline, but a customer never notices it. */}
      {offline && (
        <span className="absolute bottom-2 right-3 text-[10px] text-white/25">offline · cached</span>
      )}
    </div>
  );
}

function IdleScreen({ name, hasLoop }: { name?: string; hasLoop: boolean }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-black text-center">
      <p className="text-sm font-medium tracking-wide text-white/60">{name ?? "Channel Cast"}</p>
      <p className="text-xs text-white/30">
        {hasLoop ? "Nothing scheduled for right now." : "No loop assigned to this screen yet."}
      </p>
    </div>
  );
}
