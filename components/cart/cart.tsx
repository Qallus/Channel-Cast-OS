"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type CartItem = {
  slug: string;
  name: string;
  type: string;
  city?: string;
  state?: string;
  imageUrl?: string | null;
  pricePerWeek: number;
  start?: string;
  end?: string;
};

type CartCtx = {
  items: CartItem[];
  open: boolean;
  count: number;
  add: (item: CartItem) => void;
  remove: (slug: string) => void;
  update: (slug: string, patch: Partial<CartItem>) => void;
  clear: () => void;
  setOpen: (v: boolean) => void;
  has: (slug: string) => boolean;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "cc-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setItems(JSON.parse(raw)); } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items, ready]);

  const add = useCallback((item: CartItem) => setItems((xs) => (xs.some((x) => x.slug === item.slug) ? xs.map((x) => (x.slug === item.slug ? { ...x, ...item } : x)) : [...xs, item])), []);
  const remove = useCallback((slug: string) => setItems((xs) => xs.filter((x) => x.slug !== slug)), []);
  const update = useCallback((slug: string, patch: Partial<CartItem>) => setItems((xs) => xs.map((x) => (x.slug === slug ? { ...x, ...patch } : x))), []);
  const clear = useCallback(() => setItems([]), []);
  const has = useCallback((slug: string) => items.some((x) => x.slug === slug), [items]);

  return <Ctx.Provider value={{ items, open, count: items.length, add, remove, update, clear, setOpen, has }}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}

export function weeksBetween(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const s = new Date(`${start}T12:00:00`).getTime();
  const e = new Date(`${end}T12:00:00`).getTime();
  const days = Math.round((e - s) / 86_400_000);
  return days > 0 ? Math.max(1, Math.ceil(days / 7)) : 0;
}

export function itemTotal(i: CartItem): number {
  const w = weeksBetween(i.start, i.end);
  return w > 0 ? w * i.pricePerWeek : 0;
}
