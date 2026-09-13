"use client";

import * as React from "react";
import { Check, Copy, Lock, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { BusinessCard } from "@/lib/business-cards/types";

const PUBLIC_BASE = (process.env.NEXT_PUBLIC_APP_URL || "https://channelcast.io").replace(/\/$/, "");

/** The URL a tag should open. `?source=nfc` is what records a tap as an NFC scan. */
export function nfcUrlFor(slug: string) {
  return `${PUBLIC_BASE}/card/${slug}?source=nfc`;
}

/**
 * Web NFC only exists in Chrome on Android. Resolved after mount so the server
 * render and the first client render agree.
 */
export function useWebNfc() {
  const [supported, setSupported] = React.useState<boolean | null>(null);
  React.useEffect(() => { setSupported("NDEFReader" in window); }, []);
  return supported;
}

type WriteState = "idle" | "writing" | "done" | "error";

// Web NFC throws DOMExceptions whose raw messages mean little to a person
// holding a bracelet against their phone.
function explain(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "AbortError") return "Cancelled.";
  if (name === "NotAllowedError") return "NFC permission was blocked. Allow NFC for this site in Chrome's site settings, then try again.";
  if (name === "NotSupportedError") return "This item can't take a URL — it may be locked, or not an NDEF tag. Try an NTAG213, 215 or 216.";
  if (name === "NetworkError") return "The item moved away before writing finished. Hold it still against the phone and try again.";
  return err instanceof Error ? err.message : "Could not write the tag.";
}

/**
 * Writes the card URL to one NFC item after another — a card, then a bracelet,
 * then a ring — without leaving the screen. Renders nothing useful where Web
 * NFC is unavailable; callers decide what to show instead.
 */
export function NfcWriter({
  url, cardId, onWritten,
}: {
  url: string;
  /** When set, a successful write marks the saved card's NFC status active. */
  cardId?: string;
  onWritten?: () => void;
}) {
  const [state, setState] = React.useState<WriteState>("idle");
  const [msg, setMsg] = React.useState("");
  const [count, setCount] = React.useState(0);
  const [lock, setLock] = React.useState(false);
  const abort = React.useRef<AbortController | null>(null);

  // Stop listening for a tag if the writer goes away mid-write.
  React.useEffect(() => () => abort.current?.abort(), []);

  async function write() {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setState("writing");
    setMsg("Hold the item flat against the back of your phone…");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ndef = new (window as any).NDEFReader();
      await ndef.write({ records: [{ recordType: "url", data: url }] }, { overwrite: true, signal: ctrl.signal });
      if (lock) await ndef.makeReadOnly({ signal: ctrl.signal });
      setCount((n) => n + 1);
      setState("done");
      setMsg(lock ? "Written and locked. A tap now opens this card." : "Written. A tap now opens this card.");
      if (cardId) {
        await fetch(`/api/admin/business-cards/${cardId}`, {
          method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ nfcStatus: "active" }),
        }).catch(() => {});
      }
      onWritten?.();
    } catch (err) {
      setState("error");
      setMsg(explain(err));
    } finally {
      if (abort.current === ctrl) abort.current = null;
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" className="mt-0.5" checked={lock} onChange={(e) => setLock(e.target.checked)} disabled={state === "writing"} />
        <span>
          <span className="flex items-center gap-1 font-medium text-foreground"><Lock className="h-3 w-3" /> Lock after writing</span>
          Permanent — a locked item can never be rewritten. Use it for items you hand out.
        </span>
      </label>

      {state === "writing" ? (
        <Button size="sm" variant="outline" className="w-full" onClick={() => abort.current?.abort()}>
          Cancel — waiting for an item…
        </Button>
      ) : (
        <Button size="sm" className="w-full" onClick={write}>
          <Smartphone className="h-3.5 w-3.5" /> {count > 0 ? "Write another item" : "Write to NFC item"}
        </Button>
      )}

      {msg && (
        <p className={cn("text-xs", state === "error" ? "text-destructive" : state === "done" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
          {msg}
        </p>
      )}
      {count > 0 && (
        <p className="flex items-center gap-1 text-xs font-medium text-foreground">
          <Check className="h-3.5 w-3.5 text-brand-strong" /> {count} {count === 1 ? "item" : "items"} written this session
        </p>
      )}
    </div>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={value} onFocus={(e) => e.currentTarget.select()}
        className="h-9 w-full min-w-0 rounded-md border border-border bg-background px-2 font-mono text-xs" />
      <Button size="sm" variant="outline" onClick={async () => {
        try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
      }}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

/** Opened from a card in the list: program an NFC item without opening the editor. */
export function NfcWriteDialog({
  card, onOpenChange, onWritten,
}: {
  card: BusinessCard | null;
  onOpenChange: (open: boolean) => void;
  onWritten?: () => void;
}) {
  const supported = useWebNfc();
  if (!card) return null;

  const url = nfcUrlFor(card.slug);
  const name = card.display_name || [card.first_name, card.last_name].filter(Boolean).join(" ") || card.card_name;
  // The phone page lives on whichever host is serving this dashboard.
  const phonePage = `${window.location.origin}/app/admin/business-cards/${card.id}/nfc`;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Write to an NFC item</DialogTitle>
          <DialogDescription>
            Program a card, bracelet, ring, sticker or key fob so a tap opens {name}&apos;s card.
          </DialogDescription>
        </DialogHeader>

        {card.status !== "published" && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            This card isn&apos;t published. Items will still be written, but a tap shows nothing until you publish it.
          </div>
        )}

        <div className="space-y-1.5">
          <div className="text-xs font-medium">Tag URL</div>
          <CopyField value={url} />
          <p className="text-[11px] text-muted-foreground">Taps on this link are counted as NFC scans in Analytics.</p>
        </div>

        {supported === null ? null : supported ? (
          <NfcWriter url={url} cardId={card.id} onWritten={onWritten} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <div className="mx-auto rounded-lg bg-white p-2 sm:mx-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/cards/qr?url=${encodeURIComponent(phonePage)}&size=320`} alt="QR code to the phone write page" className="h-32 w-32" />
            </div>
            <div className="space-y-3 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">This browser can&apos;t write NFC.</span>{" "}
                Only Chrome on Android can.
              </p>
              <p>
                <span className="font-medium text-foreground">Android:</span> scan this code with the phone, sign in if asked, then tap each item to it.
              </p>
              <p>
                <span className="font-medium text-foreground">iPhone:</span> Safari can&apos;t write tags. In the free NFC Tools app, choose Write → Add a record → URL, and paste the tag URL above.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
