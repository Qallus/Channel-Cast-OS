"use client";

// CRM collection store — Supabase-backed via /api/crm/:collection. Seeded on first
// run (if the collection is empty server-side) so pages are immediately useful.
// The page components only call the returned CRUD helpers; this is the single
// place that talks to the server.

import { useCallback, useEffect, useRef, useState } from "react";

export type WithId = { id: string };

export function genId(prefix = "id"): string {
  const rnd = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rnd}`;
}

async function api(path: string, init?: RequestInit) {
  return fetch(`/api/crm/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
}

export function useCollection<T extends WithId>(collection: string, seed: T[]) {
  const [items, setItems] = useState<T[]>(seed);
  const [loaded, setLoaded] = useState(false);
  const itemsRef = useRef<T[]>(seed);
  itemsRef.current = items;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api(collection);
        if (res.ok) {
          const rows = (await res.json()) as T[];
          if (!alive) return;
          if (Array.isArray(rows) && rows.length > 0) {
            setItems(rows);
          } else {
            // First run: seed the server, then use the seed.
            await api(collection, { method: "POST", body: JSON.stringify({ records: seed }) }).catch(() => {});
            if (alive) setItems(seed);
          }
        }
      } catch {
        /* offline — fall back to seed already in state */
      }
      if (alive) setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [collection, seed]);

  const create = useCallback(
    (record: T) => {
      setItems((prev) => [record, ...prev]);
      api(collection, { method: "POST", body: JSON.stringify(record) }).catch(() => {});
    },
    [collection],
  );

  const update = useCallback(
    (id: string, patch: Partial<T>) => {
      const next = itemsRef.current.map((it) => (it.id === id ? { ...it, ...patch } : it));
      setItems(next);
      const rec = next.find((it) => it.id === id);
      if (rec) api(`${collection}/${id}`, { method: "PATCH", body: JSON.stringify(rec) }).catch(() => {});
    },
    [collection],
  );

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((it) => it.id !== id));
      api(`${collection}/${id}`, { method: "DELETE" }).catch(() => {});
    },
    [collection],
  );

  return { items, loaded, create, update, remove };
}
