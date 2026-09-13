"use client";

import { NfcWriter, nfcUrlFor, useWebNfc } from "./nfc-writer";

/** The phone-side half of the write flow. */
export function NfcPhoneWriter({ cardId, slug, published }: { cardId: string; slug: string; published: boolean }) {
  const supported = useWebNfc();
  const url = nfcUrlFor(slug);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      {!published && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          This card isn&apos;t published. Items will still be written, but a tap shows nothing until you publish it.
        </div>
      )}
      <div className="break-all rounded-md bg-muted px-3 py-2 font-mono text-xs">{url}</div>
      {supported === null ? null : supported ? (
        <NfcWriter url={url} cardId={cardId} />
      ) : (
        <p className="text-sm text-muted-foreground">
          This browser can&apos;t write NFC — open this page in <span className="font-medium text-foreground">Chrome on Android</span>.
          On iPhone, use the free NFC Tools app: Write → Add a record → URL, and enter the link above.
        </p>
      )}
    </div>
  );
}
