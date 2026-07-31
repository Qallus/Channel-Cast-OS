"use client";

// Generic client-side collection store for the CRM pages. Seeded with realistic
// data so pages are immediately useful; persists edits to localStorage. This is
// the single seam that swaps to Supabase tables when the schema lands — the page
// components only ever call the returned CRUD helpers, never touch storage.

import { useCallback, useEffect, useState } from "react";

export type WithId = { id: string };

export function genId(prefix = "id"): string {
  const rnd = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rnd}`;
}

export function useCollection<T extends WithId>(key: string, seed: T[]) {
  const storageKey = `cc-crm-${key}`;
  const [items, setItems] = useState<T[]>(seed);
  const [loaded, setLoaded] = useState(false);

  // Hydrate from localStorage after mount (keeps SSR === first client render).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setItems(JSON.parse(raw) as T[]);
    } catch {
      /* ignore malformed */
    }
    setLoaded(true);
  }, [storageKey]);

  const persist = useCallback(
    (next: T[]) => {
      setItems(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* quota / unavailable */
      }
    },
    [storageKey],
  );

  const create = useCallback((record: T) => persist([record, ...items]), [items, persist]);
  const update = useCallback(
    (id: string, patch: Partial<T>) => persist(items.map((it) => (it.id === id ? { ...it, ...patch } : it))),
    [items, persist],
  );
  const remove = useCallback((id: string) => persist(items.filter((it) => it.id !== id)), [items, persist]);
  const reset = useCallback(() => persist(seed), [persist, seed]);

  return { items, loaded, create, update, remove, reset };
}
