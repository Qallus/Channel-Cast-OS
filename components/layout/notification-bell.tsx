"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Inbox, ListChecks, Mail, MessageSquare, Phone, StickyNote, Users } from "lucide-react";

import { cn } from "@/lib/utils";

type Notif = { id: string; kind: string; title: string; subtitle: string; at: string; href: string };

const SEEN_KEY = "cc-notif-seen";
const ICON: Record<string, typeof Bell> = {
  form: Inbox, call: Phone, sms: MessageSquare, email: Mail, note: StickyNote, meeting: Users, task: ListChecks,
};
const ACT_TITLE: Record<string, string> = {
  call: "Call logged", sms: "New SMS", email: "Email logged", note: "New note", meeting: "Meeting", task: "Task",
};

function timeAgo(iso: string): string {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [seen, setSeen] = useState<string>("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setSeen(localStorage.getItem(SEEN_KEY) || ""); }, []);

  const load = useCallback(async () => {
    const out: Notif[] = [];
    // Website form submissions still marked "new".
    try {
      const r = await fetch("/api/comm/form-submissions");
      if (r.ok) {
        const d = await r.json();
        for (const s of (d.submissions ?? []) as Record<string, string>[]) {
          if ((s.status || "new") !== "new") continue;
          out.push({ id: `form_${s.id}`, kind: "form", title: "New form submission", subtitle: s.name || s.email || "", at: s.createdAt || "", href: "/app/admin/communications" });
        }
      }
    } catch { /* ignore */ }
    // Missed inbound calls (needs Twilio; skips silently otherwise).
    try {
      const r = await fetch("/api/comm/calls?limit=30");
      if (r.ok) {
        const d = await r.json();
        for (const c of (d.calls ?? []) as Record<string, string>[]) {
          if (!c.direction?.includes("inbound") || c.status !== "no-answer") continue;
          out.push({ id: `call_${c.from}_${c.startTime}`, kind: "call", title: "Missed call", subtitle: c.from || "", at: c.startTime || "", href: "/app/admin/communications" });
        }
      }
    } catch { /* ignore */ }
    // CRM activities (calls / SMS / emails / notes / meetings), newest first.
    try {
      const r = await fetch("/api/crm/activities");
      if (r.ok) {
        const rows = (await r.json()) as Record<string, string>[];
        (Array.isArray(rows) ? rows : [])
          .filter((a) => a.kind && a.kind !== "stage")
          .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
          .slice(0, 30)
          .forEach((a) => out.push({ id: `act_${a.id}`, kind: a.kind, title: ACT_TITLE[a.kind] || "Activity", subtitle: a.body || "", at: a.createdAt || "", href: a.contactId ? `/app/admin/contacts/${a.contactId}` : "/app/admin/contacts" }));
      }
    } catch { /* ignore */ }

    out.sort((a, b) => (b.at || "").localeCompare(a.at || ""));
    setItems(out.slice(0, 40));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const unread = useMemo(() => items.filter((i) => i.at && (!seen || i.at > seen)).length, [items, seen]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) { const now = new Date().toISOString(); localStorage.setItem(SEEN_KEY, now); setSeen(now); }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-brand-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            <span className="text-xs text-muted-foreground">{items.length}</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
            ) : (
              items.map((n) => {
                const Icon = ICON[n.kind] ?? Bell;
                const isNew = n.at && (!seen || n.at > seen);
                return (
                  <button
                    key={n.id}
                    onClick={() => { setOpen(false); router.push(n.href); }}
                    className="flex w-full items-start gap-2.5 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-accent"
                  >
                    <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", isNew ? "bg-brand/15 text-brand-strong" : "bg-muted text-muted-foreground")}><Icon className="h-3.5 w-3.5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{n.title}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(n.at)}</span>
                      </span>
                      {n.subtitle ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{n.subtitle}</span> : null}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
