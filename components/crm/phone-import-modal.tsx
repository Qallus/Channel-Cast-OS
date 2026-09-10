"use client";

// "Import from phone" — the UI over lib/crm/phone-import.
//
// Two screens: pick a route in (OS contact sheet, .vcf file, or a QR handoff to
// the phone), then review what came back before anything is written. Nothing
// touches the CRM until the user presses the button on the review screen.

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, FileUp, Loader2, QrCode as QrIcon, Search, Smartphone, Users } from "lucide-react";

import { QrCode } from "@/components/devices/qr-code";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initialsOf } from "@/components/crm/crm-ui";
import { CONTACT_TAGS, CONTACT_TYPE, CONTACT_TYPE_ORDER, Contact, ContactType } from "@/lib/crm/contacts";
import {
  ContactDraft, ImportCandidate, contactPickerSupported, contactsManager, fromPicked, mergeOnto,
  parseVCards, toCandidates,
} from "@/lib/crm/phone-import";
import { cn } from "@/lib/utils";

/** How the drafts on the review screen got here — changes the copy, nothing else. */
type Route = "picker" | "vcf";

export type PhoneImportResult = { added: number; updated: number; skipped: number };

export function PhoneImportModal({
  existing, onClose, onImport, autoPick = false,
}: {
  existing: Contact[];
  onClose: () => void;
  /** Commit: create the new ones, patch the merged ones. Returns nothing. */
  onImport: (add: ContactDraft[], merge: { contact: Contact; patch: Partial<Contact> }[]) => void;
  /** Arrived by QR from a desktop — open the OS contact sheet straight away. */
  autoPick?: boolean;
}) {
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null);
  const [route, setRoute] = useState<Route>("picker");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickerReady = useSupportsPicker();

  const receive = (drafts: ContactDraft[], from: Route) => {
    if (!drafts.length) {
      setError(from === "vcf"
        ? "No contacts found in that file. Make sure it's the .vcf your phone exported."
        : "Nothing came back from the picker.");
      return;
    }
    setError(null);
    setRoute(from);
    setCandidates(toCandidates(drafts, existing));
  };

  /** Open the Android contact sheet. Cancelling is a no-op, not an error. */
  const openPicker = async () => {
    const manager = contactsManager();
    if (!manager) return;
    setBusy(true);
    setError(null);
    try {
      const supported = await manager.getProperties().catch(() => ["name", "email", "tel"]);
      const wanted = ["name", "email", "tel", "address", "icon"].filter((p) => supported.includes(p));
      const picked = await manager.select(wanted, { multiple: true });
      if (picked.length) {
        const drafts = await Promise.all(picked.map(async (p) => {
          const draft = fromPicked(p);
          const icon = p.icon?.[0];
          if (icon) draft.photoUrl = (await shrinkToDataUrl(icon)) ?? undefined;
          return draft;
        }));
        receive(drafts, "picker");
      }
    } catch (e) {
      // Chrome throws for a cancelled sheet on some builds — treat only real
      // failures as errors, and say something a person can act on.
      const message = e instanceof Error ? e.message : "";
      if (!/abort|cancel/i.test(message)) {
        setError("Couldn't open your phone's contacts. This needs Chrome on Android over HTTPS.");
      }
    } finally {
      setBusy(false);
    }
  };

  // Landed here from the QR handoff: go straight to the contact sheet. The
  // picker demands a user gesture, so this only works where the tap that
  // opened the modal still counts — otherwise the button below is right there.
  const auto = useRef(false);
  useEffect(() => {
    if (autoPick && pickerReady && !auto.current) {
      auto.current = true;
      void openPicker();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPick, pickerReady]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={cn("max-w-xl", candidates && "max-w-2xl")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {candidates ? (
              <>
                <button onClick={() => { setCandidates(null); setError(null); }} className="rounded p-0.5 text-muted-foreground transition hover:text-foreground" aria-label="Back">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                Review {candidates.length} contact{candidates.length === 1 ? "" : "s"}
              </>
            ) : (
              <><Smartphone className="h-4 w-4" /> Import from your phone</>
            )}
          </DialogTitle>
        </DialogHeader>

        {candidates ? (
          <ReviewStep candidates={candidates} route={route} onCancel={onClose} onImport={onImport} />
        ) : (
          <SourceStep pickerReady={pickerReady} busy={busy} error={error} onPick={openPicker} onFile={(d) => receive(d, "vcf")} onError={setError} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Feature detection has to happen after mount — the server has no `navigator`,
 * and rendering the picker button during SSR would hydrate wrong.
 */
function useSupportsPicker(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(contactPickerSupported()), []);
  return ready;
}

// ── Step 1: where are the contacts coming from? ───────────────────────────────

function SourceStep({
  pickerReady, busy, error, onPick, onFile, onError,
}: {
  pickerReady: boolean;
  busy: boolean;
  error: string | null;
  onPick: () => void;
  onFile: (drafts: ContactDraft[]) => void;
  onError: (message: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);

  const readFile = async (file: File) => {
    setReading(true);
    try {
      onFile(parseVCards(await file.text()));
    } catch {
      onError("That file couldn't be read.");
    } finally {
      setReading(false);
    }
  };

  return (
    <div className="space-y-4">
      {pickerReady ? (
        <section className="rounded-lg border border-brand/40 bg-accent/40 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand-strong"><Users className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Pick from your phone&rsquo;s contacts</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Opens Android&rsquo;s own contact list. Choose who to bring over — nothing else is read.</p>
            </div>
          </div>
          <Button className="mt-3 w-full" onClick={onPick} disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Waiting for your phone…</> : <><Smartphone className="h-4 w-4" /> Open phone contacts</>}
          </Button>
        </section>
      ) : (
        <QrHandoff />
      )}

      <section className="rounded-lg border border-border p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><FileUp className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Upload a vCard (.vcf)</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Export from your phone once, then drop the file here. Brings over everything at once.</p>
          </div>
        </div>
        <input
          ref={fileRef} type="file" accept=".vcf,.vcard,text/vcard,text/x-vcard" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f); e.target.value = ""; }}
        />
        <Button variant="outline" className="mt-3 w-full" onClick={() => fileRef.current?.click()} disabled={reading}>
          {reading ? <><Loader2 className="h-4 w-4 animate-spin" /> Reading…</> : <><FileUp className="h-4 w-4" /> Choose .vcf file</>}
        </Button>

        <button onClick={() => setShowHowTo((v) => !v)} className="mt-3 flex w-full items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground">
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showHowTo && "rotate-180")} />
          How to export contacts on Android
        </button>
        {showHowTo && (
          <ol className="mt-2 list-decimal space-y-1 pl-8 text-xs text-muted-foreground">
            <li>Open the <span className="font-medium text-foreground">Contacts</span> app.</li>
            <li>Tap the menu (or your profile) &rarr; <span className="font-medium text-foreground">Settings</span>.</li>
            <li>Tap <span className="font-medium text-foreground">Export</span>, pick the account to export, and save the <span className="font-mono">.vcf</span> file.</li>
            <li>Come back here and choose that file. Samsung phones call this <span className="font-medium text-foreground">Manage contacts &rarr; Import or export contacts</span>.</li>
          </ol>
        )}
      </section>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

/**
 * On a laptop there are no phone contacts to read. Rather than a dead end, hand
 * the page to the phone: same account, same server-backed collection, so
 * whatever they import there is on this screen when they look back.
 */
function QrHandoff() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const link = new URL(window.location.href);
    link.searchParams.set("import", "phone");
    setUrl(link.toString());
  }, []);

  const localOnly = url ? /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(url) : false;

  return (
    <section className="rounded-lg border border-border p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><QrIcon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Continue on your phone</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Reading contacts needs to happen on the phone itself. Scan this with your Android camera to open this page there — anything you import shows up here.
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        {url ? <QrCode value={url} size={168} /> : <div className="h-[168px] w-[168px] animate-pulse rounded-lg bg-muted" />}
      </div>
      {localOnly && (
        <p className="mt-3 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
          This is a <span className="font-mono">localhost</span> address, so your phone can&rsquo;t reach it. Run <span className="font-mono">npm run dev:lan</span> and open the network URL, or use the deployed site.
        </p>
      )}
    </section>
  );
}

// ── Step 2: review before anything is written ─────────────────────────────────

function ReviewStep({
  candidates, route, onCancel, onImport,
}: {
  candidates: ImportCandidate[];
  route: Route;
  onCancel: () => void;
  onImport: (add: ContactDraft[], merge: { contact: Contact; patch: Partial<Contact> }[]) => void;
}) {
  // Duplicates start unticked: the safe default is "don't touch what's here".
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(candidates.filter((c) => !c.duplicateOf).map((c) => c.key)));
  const [search, setSearch] = useState("");
  const [type, setType] = useState<ContactType>("contact");
  const [tag, setTag] = useState<string>("none");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(({ draft }) =>
      [draft.name, draft.company, draft.email, draft.phone].some((v) => (v ?? "").toLowerCase().includes(q)));
  }, [candidates, search]);

  const toggle = (key: string) => setChosen((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const allShownChosen = shown.length > 0 && shown.every((c) => chosen.has(c.key));
  const toggleAll = () => setChosen((prev) => {
    const next = new Set(prev);
    if (allShownChosen) shown.forEach((c) => next.delete(c.key));
    else shown.forEach((c) => next.add(c.key));
    return next;
  });

  const picked = candidates.filter((c) => chosen.has(c.key));
  const newOnes = picked.filter((c) => !c.duplicateOf);
  const merges = picked.filter((c) => c.duplicateOf);
  const dupCount = candidates.filter((c) => c.duplicateOf).length;

  const commit = () => {
    const add = newOnes.map((c) => ({
      ...c.draft,
      type,
      tags: tag === "none" ? c.draft.tags : Array.from(new Set([...c.draft.tags, tag])),
    }));
    const merge = merges
      .map((c) => ({ contact: c.duplicateOf!, patch: mergeOnto(c.duplicateOf!, c.draft) }))
      .filter((m) => Object.keys(m.patch).length > 0);
    onImport(add, merge);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {route === "picker" ? <>From your phone&rsquo;s contact list.</> : <>From the vCard file.</>}{" "}
        {dupCount > 0
          ? <>{dupCount} already {dupCount === 1 ? "looks like someone" : "look like people"} in your CRM and {dupCount === 1 ? "is" : "are"} unticked. Tick one to fill in its blank fields — existing values are never overwritten.</>
          : <>None of these are in your CRM yet.</>}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search these contacts…" className="h-9 pl-8" />
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
          <input type="checkbox" checked={allShownChosen} onChange={toggleAll} className="h-4 w-4 rounded border-input accent-brand" />
          Select all{search.trim() ? " shown" : ""}
        </label>
      </div>

      <div className="max-h-[46vh] space-y-1.5 overflow-y-auto pr-1">
        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nobody matches &ldquo;{search}&rdquo;.</p>
        ) : shown.map((c) => (
          <CandidateRow key={c.key} candidate={c} checked={chosen.has(c.key)} onToggle={() => toggle(c.key)} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
        <span className="text-xs text-muted-foreground">Bring them in as</span>
        <Select value={type} onValueChange={(v) => setType(v as ContactType)}>
          <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{CONTACT_TYPE_ORDER.map((t) => <SelectItem key={t} value={t}>{CONTACT_TYPE[t].label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={tag} onValueChange={setTag}>
          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="No tag" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No tag</SelectItem>
            {CONTACT_TAGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">applied to the new ones.</span>
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        <span className="text-xs text-muted-foreground">
          {newOnes.length} new{merges.length ? `, ${merges.length} to update` : ""}
        </span>
        <span className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={commit} disabled={picked.length === 0}><Check className="h-4 w-4" /> Import {picked.length || ""}</Button>
        </span>
      </DialogFooter>
    </div>
  );
}

function CandidateRow({ candidate, checked, onToggle }: { candidate: ImportCandidate; checked: boolean; onToggle: () => void }) {
  const { draft, duplicateOf, matchedOn } = candidate;
  const subtitle = [draft.title, draft.company].filter(Boolean).join(" · ") || draft.email || draft.phone;

  return (
    <label className={cn(
      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition",
      checked ? "border-brand/40 bg-accent/40" : "border-border hover:bg-muted/50",
    )}>
      <input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 shrink-0 rounded border-input accent-brand" />
      {draft.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={draft.photoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-xs font-semibold text-brand-strong">{initialsOf(draft.name)}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{draft.name}</span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      {duplicateOf && (
        <Badge variant="outline" className="shrink-0 text-[10px] font-normal text-muted-foreground">
          Already here{matchedOn ? ` · ${matchedOn}` : ""}
        </Badge>
      )}
    </label>
  );
}

// ── Contact photos ────────────────────────────────────────────────────────────

const AVATAR_PX = 128;

/**
 * The picker hands back full-resolution contact photos. These get stored on the
 * record, so shrink to a small square JPEG first — a few hundred contacts at
 * full size would bloat every read of the collection.
 */
async function shrinkToDataUrl(blob: Blob): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_PX;
    canvas.height = AVATAR_PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // Centre crop, so a portrait photo doesn't come out squashed.
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_PX, AVATAR_PX);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch {
    return null;
  }
}
