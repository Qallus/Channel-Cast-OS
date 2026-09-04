"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

export type ToastTone = "ok" | "error";
/** `key` re-triggers the entrance animation when the same text fires twice. */
export type ToastMessage = { text: string; tone: ToastTone; key: number };

const DURATION: Record<ToastTone, number> = { ok: 3000, error: 6000 };

/**
 * Page-level confirmations.
 *
 * These used to render as a small line of text inside a toolbar, which meant a
 * confirmation raised while a dialog was open sat behind the overlay where it
 * could not be read — so an action that had in fact succeeded looked like it had
 * done nothing. `flash` keeps the same call signature those pages already use;
 * pair it with <Toast /> and the message lands above every layer instead.
 */
export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const flash = useCallback((text: string, tone: ToastTone = "ok") => {
    if (timer.current) clearTimeout(timer.current);
    seq.current += 1;
    setToast({ text, tone, key: seq.current });
    timer.current = setTimeout(() => setToast(null), DURATION[tone]);
  }, []);

  // A message outliving the page that raised it would leak a state update.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { toast, flash };
}

/**
 * Renders into <body> so the toast is never trapped inside a card's stacking
 * context or hidden under a dialog overlay. Position in the JSX tree is
 * therefore irrelevant — put it wherever it reads best.
 */
export function Toast({ toast }: { toast: ToastMessage | null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !toast) return null;

  const error = toast.tone === "error";
  const Icon = error ? TriangleAlert : CheckCircle2;

  return createPortal(
    <div
      key={toast.key}
      role="status"
      aria-live={error ? "assertive" : "polite"}
      className={cn(
        // cc-toast-in supplies the translate(-50%) that centres it.
        "cc-toast-in pointer-events-none fixed bottom-6 left-1/2 z-[100] flex items-center gap-2",
        "rounded-lg border px-4 py-2.5 text-sm font-medium shadow-lg",
        error
          ? "border-destructive/40 bg-destructive text-destructive-foreground"
          : "border-border bg-card text-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", !error && "text-brand-strong")} />
      {toast.text}
    </div>,
    document.body,
  );
}
