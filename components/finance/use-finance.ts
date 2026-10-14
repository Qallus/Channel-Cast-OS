"use client";

// Loads the whole Financing workbook (ledger, mileage, time, profile) from the
// admin-only /api/finance routes and exposes optimistic CRUD helpers. Same shape
// as lib/crm/store's useCollection, minus the seeding: these records never come
// from the repo.

import { useCallback, useEffect, useRef, useState } from "react";

import { normalizeProfile, type FinEntry, type FinProfile, type FinanceCollection, type MileageTrip, type TimeLog } from "@/lib/finance/types";

type WithId = { id: string };

async function api(path: string, init?: RequestInit) {
  return fetch(`/api/finance/${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
}
async function ok(req: Promise<Response>) {
  try { return (await req).ok; } catch { return false; }
}

function useFinCollection<T extends WithId>(collection: FinanceCollection, reloadKey: number) {
  const [items, setItems] = useState<T[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<T[]>([]);
  ref.current = items;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api(collection);
        const data = await res.json().catch(() => null);
        if (!alive) return;
        if (!res.ok) { setError(data?.error || `Couldn't load ${collection}.`); setState("error"); return; }
        setItems(Array.isArray(data) ? data : []);
        setState("ready");
      } catch {
        if (alive) { setError("Couldn't reach the server."); setState("error"); }
      }
    })();
    return () => { alive = false; };
  }, [collection, reloadKey]);

  const saveMany = useCallback((records: T[]) => {
    if (!records.length) return Promise.resolve(true);
    setItems((prev) => {
      const incoming = new Map(records.map((r) => [r.id, r]));
      const known = new Set(prev.map((p) => p.id));
      return [...records.filter((r) => !known.has(r.id)), ...prev.map((p) => incoming.get(p.id) ?? p)];
    });
    return ok(api(collection, { method: "POST", body: JSON.stringify({ records }) }));
  }, [collection]);

  const update = useCallback((id: string, patch: Partial<T>) => {
    const next = ref.current.map((it) => (it.id === id ? { ...it, ...patch } : it));
    setItems(next);
    const rec = next.find((it) => it.id === id);
    return rec ? ok(api(`${collection}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(rec) })) : Promise.resolve(false);
  }, [collection]);

  const removeMany = useCallback((ids: string[]) => {
    const drop = new Set(ids);
    setItems((prev) => prev.filter((p) => !drop.has(p.id)));
    return ok(api(collection, { method: "DELETE", body: JSON.stringify({ ids }) }));
  }, [collection]);

  return { items, state, error, saveMany, update, removeMany };
}

export function useFinance() {
  const [reloadKey, setReloadKey] = useState(0);
  const entries = useFinCollection<FinEntry>("fin_entries", reloadKey);
  const trips = useFinCollection<MileageTrip>("fin_trips", reloadKey);
  const time = useFinCollection<TimeLog>("fin_time", reloadKey);
  const profiles = useFinCollection<FinProfile>("fin_profile", reloadKey);

  const profile = normalizeProfile(profiles.items.find((p) => p.id === "profile"));
  const profileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [profileDraft, setProfileDraft] = useState<FinProfile | null>(null);
  const [profileSaved, setProfileSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");

  /** Edits apply instantly and save after a short pause, so typing in the profile doesn't fire a request per keystroke. */
  const saveProfile = useCallback((next: FinProfile) => {
    setProfileDraft(next);
    setProfileSaved("saving");
    if (profileTimer.current) clearTimeout(profileTimer.current);
    profileTimer.current = setTimeout(async () => {
      const done = await profiles.saveMany([{ ...next, updatedAt: new Date().toISOString() }]);
      setProfileSaved(done ? "saved" : "error");
      setProfileDraft(null);
    }, 600);
  }, [profiles]);

  useEffect(() => () => { if (profileTimer.current) clearTimeout(profileTimer.current); }, []);

  const loading = [entries, trips, time, profiles].some((c) => c.state === "loading");
  const error = [entries, trips, time, profiles].find((c) => c.state === "error")?.error ?? null;

  return {
    entries, trips, time,
    profile: profileDraft ?? profile,
    saveProfile, profileSaved,
    loading, error,
    reload: () => setReloadKey((k) => k + 1),
  };
}

export type FinanceStore = ReturnType<typeof useFinance>;
