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
    // Native video drives its own timing via onEnded. Stills — and embedded
    // providers, whose end event never reaches us — use the loop's dwell.
    if (current.kind === "video" && !current.embed) return;
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

  // Esc puts the way out on screen, over live creative too. A kiosk browser
  // gives you no title bar and often no cursor, so someone standing at the
  // screen needs one key that reliably produces instructions.
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHelp((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Preload the next creative so a transition never shows an empty frame.
  const next = items.length > 1 ? items[(index + 1) % items.length] : null;

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {current ? (
        <>
          {current.embed ? (
            // Provider iframes handle their own playback, so the loop timer
            // advances them rather than an onEnded event we never receive.
            <iframe
              key={`${current.id}-${index}`}
              src={current.embed}
              title={current.name}
              allow="autoplay; encrypted-media; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              className={`h-full w-full border-0 transition-opacity duration-[400ms] ${visible ? "opacity-100" : "opacity-0"}`}
            />
          ) : current.kind === "video" ? (
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
        <IdleScreen
          name={manifest?.device.name}
          deviceCode={manifest?.device.deviceCode}
          idle={manifest?.idle}
          hasLoop={Boolean(manifest?.loop)}
        />
      )}

      {/* Deliberately tiny and low contrast: an operator can see the screen is
          alive and offline, but a customer never notices it. */}
      {offline && (
        <span className="absolute bottom-2 right-3 text-[10px] text-white/25">offline · cached</span>
      )}

      {help && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-6 text-center">
          <div className="max-w-sm space-y-3">
            <p className="text-xs uppercase tracking-widest text-white/40">Channel Cast player</p>
            <p className="text-2xl font-semibold text-white">Ctrl + Alt + X</p>
            <p className="text-sm text-white/60">Closes the player on this PC. Works with no cursor.</p>
            <p className="text-xs text-white/35">
              Also: Alt+F4, or Start Menu → &ldquo;Stop Channel Cast Display&rdquo;.
              Last resort: Ctrl+Alt+Delete → Task Manager → end Edge.
            </p>
            {manifest?.device.deviceCode && (
              <p className="pt-2 font-mono text-[11px] tracking-widest text-white/30">{manifest.device.deviceCode}</p>
            )}
            <p className="text-[10px] text-white/25">Press Esc to hide this.</p>
          </div>
        </div>
      )}
    </div>
  );
}

const IDLE_MESSAGE: Record<string, string> = {
  unscheduled: "No loop scheduled for this screen yet.",
  off_air: "Off air — outside this screen's scheduled hours.",
  empty_loop: "The scheduled loop has nothing to play.",
};

/**
 * The dark state. Whoever is standing in front of a black screen needs to know
 * which screen it is and why it's dark — the device code is what they'd search
 * for in the dashboard, and without it a wrongly-assigned loop looks identical
 * to a broken player.
 */
function IdleScreen({
  name, deviceCode, idle, hasLoop,
}: {
  name?: string;
  deviceCode?: string | null;
  idle?: { reason: string; nextWindow?: string | null } | null;
  hasLoop: boolean;
}) {
  const message = idle
    ? IDLE_MESSAGE[idle.reason] ?? "Nothing to play right now."
    : hasLoop
      ? "Nothing scheduled for right now."
      : "No loop scheduled for this screen yet.";

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-black text-center">
      <p className="text-sm font-medium tracking-wide text-white/60">{name ?? "Channel Cast"}</p>
      <p className="text-xs text-white/30">{message}</p>
      {idle?.reason === "off_air" && idle.nextWindow && (
        <p className="text-xs text-white/20">Next window starts at {idle.nextWindow}.</p>
      )}
      {deviceCode && (
        <p className="mt-4 font-mono text-[11px] tracking-widest text-white/20">{deviceCode}</p>
      )}
      <p className="mt-1 text-[10px] text-white/15">Checking for a loop every 15 seconds.</p>
      {/* Only on the dark screen, never over live creative: the moment anyone is
          looking at a blank display is exactly when they need the way out. */}
      <p className="mt-6 text-[10px] text-white/25">Press Ctrl + Alt + X to exit the player</p>
    </div>
  );
}
