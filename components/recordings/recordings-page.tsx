"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Archive, Columns3, Copy, LayoutList, Link2, Mic, Pencil, Share2, Table2, Trash2, CalendarDays } from "lucide-react";

import { PageHeader, RecordCalendar } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { openRecorder } from "@/components/recordings/quick-recorder";
import { useCollection } from "@/lib/crm/store";
import { RECORDING_STATUS, Recording, RecordingStatus, fmtDuration, seedRecordings } from "@/lib/recordings/types";
import { cn } from "@/lib/utils";

type View = "list" | "table" | "kanban" | "calendar";
const KANBAN: RecordingStatus[] = ["draft", "transcribed", "archived"];
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL?.split(",")[0]?.replace(/\/$/, "") || "";

export function RecordingsPage() {
  const { items, update, remove } = useCollection<Recording>("recordings", seedRecordings);
  const [view, setView] = useState<View>("list");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Recording | null>(null);
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1800); };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...items]
      .filter((r) => !q || [r.title, r.transcript, r.linkName].join(" ").toLowerCase().includes(q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [items, search]);

  function archive(r: Recording) { update(r.id, { ...r, status: r.status === "archived" ? (r.transcript ? "transcribed" : "draft") : "archived" }); }
  async function copyTranscript(r: Recording) { try { await navigator.clipboard.writeText(r.transcript || ""); flash("Transcript copied"); } catch { /* ignore */ } }
  async function share(r: Recording) {
    const url = r.url;
    if (navigator.share) { try { await navigator.share({ title: r.title, url }); return; } catch { /* fall through */ } }
    try { await navigator.clipboard.writeText(url); flash("Audio link copied"); } catch { /* ignore */ }
  }

  const actions = (r: Recording) => (
    <div className="flex flex-wrap items-center gap-1">
      <IconBtn label="Edit" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></IconBtn>
      <IconBtn label="Copy transcript" onClick={() => copyTranscript(r)}><Copy className="h-3.5 w-3.5" /></IconBtn>
      <IconBtn label="Share" onClick={() => share(r)}><Share2 className="h-3.5 w-3.5" /></IconBtn>
      <IconBtn label={r.status === "archived" ? "Unarchive" : "Archive"} onClick={() => archive(r)}><Archive className="h-3.5 w-3.5" /></IconBtn>
      <IconBtn label="Delete" onClick={() => { if (confirm("Delete this recording?")) remove(r.id); }} danger><Trash2 className="h-3.5 w-3.5" /></IconBtn>
    </div>
  );

  const linkChip = (r: Recording) => r.linkType !== "none" && r.linkName ? (
    r.linkType === "contact"
      ? <Link href={`/app/admin/contacts/${r.linkId}`} className="inline-flex items-center gap-1 text-xs text-brand-strong hover:underline"><Link2 className="h-3 w-3" /> {r.linkName}</Link>
      : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Link2 className="h-3 w-3" /> {r.linkName}</span>
  ) : null;

  return (
    <div className="space-y-5">
      <PageHeader icon={Mic} title="Voice Recordings" description="Record meetings and notes, transcribe with one click, and attach them to contacts, plans, or workspaces."
        action={<Button onClick={openRecorder}><Mic className="h-4 w-4" /> Record</Button>} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {([["list", "List", LayoutList], ["table", "Table", Table2], ["kanban", "Kanban", Columns3], ["calendar", "Calendar", CalendarDays]] as [View, string, typeof Mic][]).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setView(id)} className={cn("flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors", view === id ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground")}><Icon className="h-4 w-4" /> {label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {toast && <span className="text-xs text-brand-strong">{toast}</span>}
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search recordings…" className="h-9 w-56" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">No recordings yet. Tap <button onClick={openRecorder} className="font-medium text-brand-strong hover:underline">Record</button> to capture your first meeting or note.</div>
      ) : view === "list" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()} · {fmtDuration(r.durationSec)} · <span className={RECORDING_STATUS[r.status].tone}>{RECORDING_STATUS[r.status].label}</span></p>
                </div>
                {actions(r)}
              </div>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio controls src={r.url} className="mt-3 w-full" />
              {r.transcript && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{r.transcript}</p>}
              <div className="mt-2">{linkChip(r)}</div>
            </div>
          ))}
        </div>
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground"><th className="px-4 py-2.5">Title</th><th className="px-4 py-2.5">When</th><th className="px-4 py-2.5">Length</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Linked</th><th className="px-4 py-2.5 text-right">Actions</th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="max-w-[220px] truncate px-4 py-2.5 font-medium text-foreground">{r.title}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{fmtDuration(r.durationSec)}</td>
                  <td className={cn("px-4 py-2.5 font-medium", RECORDING_STATUS[r.status].tone)}>{RECORDING_STATUS[r.status].label}</td>
                  <td className="px-4 py-2.5">{linkChip(r) || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-2.5"><div className="flex justify-end">{actions(r)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === "kanban" ? (
        <div className="grid gap-3 md:grid-cols-3">
          {KANBAN.map((st) => (
            <div key={st} className="rounded-xl border border-border bg-card p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><span className={RECORDING_STATUS[st].tone}>{RECORDING_STATUS[st].label}</span><span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{filtered.filter((r) => r.status === st).length}</span></p>
              <div className="space-y-2">
                {filtered.filter((r) => r.status === st).map((r) => (
                  <div key={r.id} className="rounded-lg border border-border p-2.5">
                    <div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-medium text-foreground">{r.title}</p></div>
                    <p className="text-xs text-muted-foreground">{fmtDuration(r.durationSec)} · {new Date(r.createdAt).toLocaleDateString()}</p>
                    <div className="mt-2">{actions(r)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <RecordCalendar items={filtered} getId={(r) => r.id} getDate={(r) => r.createdAt} getTitle={(r) => r.title} onOpen={(id) => { const r = items.find((x) => x.id === id); if (r) setEditing(r); }} footer="Placed by recording date. Click one to edit." />
      )}

      {/* Edit dialog */}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit recording</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio controls src={editing.url} className="w-full" />
              <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Title" />
              <Textarea rows={6} value={editing.transcript} onChange={(e) => setEditing({ ...editing, transcript: e.target.value })} placeholder="Transcript" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => { if (editing) { update(editing.id, { ...editing, status: editing.status === "archived" ? "archived" : editing.transcript ? "transcribed" : "draft" }); setEditing(null); } }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return <button type="button" title={label} aria-label={label} onClick={onClick} className={cn("flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent", danger ? "hover:text-destructive" : "hover:text-foreground")}>{children}</button>;
}
