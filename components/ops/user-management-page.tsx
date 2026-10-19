"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban, CheckCircle2, Clock, Eye, KeyRound, Link2, Mail, PauseCircle, PlayCircle, ShieldCheck, Trash2, Undo2, UserPlus, XCircle,
} from "lucide-react";

import { Avatar, DetailField, PageHeader, RowActions, SearchBox, StatRow, StatTile, type RowAction } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Toast, useToast } from "@/components/ui/toast";
import { useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type Access = "approved" | "pending" | "declined" | "blocked";
type ManagedUser = {
  id: string; email: string; role: string; access: Access; suspendedUntil: string | null;
  contactId: string | null; contactName: string | null; note: string; reason: string;
  decidedAt: string | null; decidedBy: string | null; createdAt?: string; lastSignInAt: string | null;
  emailConfirmed: boolean; invitedAt: string | null; provider: string; lockedSuper?: boolean;
};
type ContactRec = { id: string; name?: string };
type Filter = "all" | "pending" | "active" | "suspended" | "declined" | "blocked";
// Actions that ask for a reason before they run.
type ReasonAction = "decline" | "block" | "suspend";

const ROLE_LABEL: Record<string, string> = { super_admin: "Super Admin", admin: "Admin", advertiser: "Advertiser", owner: "Location Owner" };
const ROLE_OPTIONS = ["super_admin", "admin", "advertiser", "owner"];
const selCls = "h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-brand-strong";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "active", label: "Active" },
  { id: "suspended", label: "Suspended" },
  { id: "declined", label: "Declined" },
  { id: "blocked", label: "Blocked" },
];

const statusOf = (u: ManagedUser): Exclude<Filter, "all"> =>
  u.access === "blocked" ? "blocked" : u.suspendedUntil ? "suspended" : u.access === "approved" ? "active" : u.access;

const STATUS_STYLE: Record<Exclude<Filter, "all">, { label: string; icon: typeof Clock; cls: string }> = {
  active: { label: "Active", icon: CheckCircle2, cls: "bg-success/15 text-success" },
  pending: { label: "Pending", icon: Clock, cls: "bg-warning/15 text-warning" },
  suspended: { label: "Suspended", icon: PauseCircle, cls: "bg-warning/15 text-warning" },
  declined: { label: "Declined", icon: XCircle, cls: "bg-muted text-muted-foreground" },
  blocked: { label: "Blocked", icon: Ban, cls: "bg-destructive/15 text-destructive" },
};

const REASON_COPY: Record<ReasonAction, { title: string; body: string; cta: string }> = {
  decline: { title: "Decline access", body: "They stay signed up but can't enter the console, and see a “not approved” notice. You can approve them later.", cta: "Decline" },
  block: { title: "Block account", body: "Signs them out and stops them signing in again. The email stays taken, so they can't re-register. You can unblock later.", cta: "Block" },
  suspend: { title: "Suspend account", body: "Temporarily stops sign-in. Access returns automatically when the suspension ends.", cta: "Suspend" },
};

function ago(iso: string | null | undefined) {
  if (!iso) return "never";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : "");

function StatusBadge({ u }: { u: ManagedUser }) {
  const st = STATUS_STYLE[statusOf(u)];
  const Icon = st.icon;
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", st.cls)}><Icon className="h-3.5 w-3.5" /> {st.label}</span>;
}

export function UserManagementPage() {
  const contacts = useCollection<ContactRec>("contacts", []);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [me, setMe] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const { toast, flash } = useToast();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [contactId, setContactId] = useState("");
  const [inviting, setInviting] = useState(false);

  const [filter, setFilter] = useState<Filter>("all");
  const [roleFilter, setRoleFilter] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reasonFor, setReasonFor] = useState<{ action: ReasonAction; ids: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/admin/users");
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Couldn't load users."); return; }
      setUsers(d.users || []); setMe(d.me || ""); setError("");
    } catch { setError("Couldn't load users."); }
    finally { setLoaded(true); }
  }
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: users.length, pending: 0, active: 0, suspended: 0, declined: 0, blocked: 0 };
    users.forEach((u) => { c[statusOf(u)]++; });
    return c;
  }, [users]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) =>
      (filter === "all" || statusOf(u) === filter)
      && (!roleFilter || u.role === roleFilter)
      && (!q || u.email.toLowerCase().includes(q) || (u.contactName || "").toLowerCase().includes(q) || u.note.toLowerCase().includes(q)));
  }, [users, filter, roleFilter, query]);

  // Owners and yourself can't be bulk-restricted, so they're never selectable.
  const selectable = (u: ManagedUser) => !u.lockedSuper && u.id !== me;
  const visibleSelectable = visible.filter(selectable);
  const allChecked = visibleSelectable.length > 0 && visibleSelectable.every((u) => selected.has(u.id));
  const detail = users.find((u) => u.id === detailId) || null;

  async function invite() {
    if (!email.trim()) return;
    setInviting(true); setError("");
    const contact = contacts.items.find((c) => c.id === contactId);
    try {
      const r = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), role, contactId: contactId || undefined, contactName: contact?.name || undefined }) });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Invite failed."); }
      else { setEmail(""); setContactId(""); flash("Invitation sent."); load(); }
    } catch { setError("Invite failed."); }
    finally { setInviting(false); }
  }

  async function patch(ids: string[], body: Record<string, unknown>, done?: string) {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, ...body }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) flash(d.error || "Update failed.", "error");
      else if (d.errors?.length) flash(`${ids.length - d.errors.length} updated, ${d.errors.length} skipped: ${d.errors[0]}`, "error");
      else if (done) flash(done);
    } catch { flash("Update failed.", "error"); }
    finally { setBusy(false); setSelected(new Set()); load(); }
  }

  async function removeUser(u: ManagedUser) {
    if (!confirm(`Delete ${u.email}? This frees the email to sign up again — use Block to keep them out.`)) return;
    const r = await fetch(`/api/admin/users?id=${u.id}`, { method: "DELETE" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) flash(d.error || "Delete failed.", "error"); else { flash("User deleted."); setDetailId(null); }
    load();
  }

  const plural = (n: number) => (n === 1 ? "user" : `${n} users`);

  function actionsFor(u: ManagedUser): RowAction[] {
    const s = statusOf(u);
    const a: RowAction[] = [{ label: "Details", icon: Eye, onClick: () => setDetailId(u.id) }];
    a.push({ label: u.emailConfirmed ? "Send reset link" : "Resend invite", icon: KeyRound, onClick: () => patch([u.id], { action: "send_link" }, u.emailConfirmed ? "Password reset sent." : "Invite re-sent.") });
    if (!selectable(u)) return a;
    if (s === "active") a.push({ label: "Revoke access", icon: Undo2, onClick: () => patch([u.id], { action: "revoke" }, "Access revoked — back to pending.") });
    if (s === "suspended") a.push({ label: "Lift suspension", icon: PlayCircle, onClick: () => patch([u.id], { action: "unsuspend" }, "Suspension lifted.") });
    else if (s !== "blocked") a.push({ label: "Suspend…", icon: PauseCircle, onClick: () => setReasonFor({ action: "suspend", ids: [u.id] }) });
    if (s === "pending") a.push({ label: "Decline…", icon: XCircle, onClick: () => setReasonFor({ action: "decline", ids: [u.id] }) });
    if (s === "blocked") a.push({ label: "Unblock", icon: Undo2, onClick: () => patch([u.id], { action: "unblock" }, "Unblocked — now pending review.") });
    else a.push({ label: "Block…", icon: Ban, onClick: () => setReasonFor({ action: "block", ids: [u.id] }), destructive: true });
    a.push({ label: "Delete", icon: Trash2, onClick: () => removeUser(u), destructive: true });
    return a;
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={ShieldCheck} title="User Management" description="Invite users, review sign-ups, and control who gets in. Invite-only — sign-ups have no access until approved here." />

      <StatRow>
        <StatTile label="Users" value={counts.all} />
        <StatTile label="Active" value={counts.active} />
        <StatTile label="Awaiting review" value={counts.pending} accent={counts.pending > 0} />
        <StatTile label="Blocked / declined" value={counts.blocked + counts.declined} />
      </StatRow>

      {/* Invite */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground"><UserPlus className="h-4 w-4 text-brand-strong" /> Invite a user</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_150px_1fr_auto]">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
          <select value={role} onChange={(e) => setRole(e.target.value)} className={cn(selCls, "h-9")}>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={cn(selCls, "h-9")}>
            <option value="">Link a contact (optional)</option>
            {contacts.items.map((c) => <option key={c.id} value={c.id}>{c.name || "Untitled"}</option>)}
          </select>
          <Button onClick={invite} disabled={inviting || !email.trim()}><Mail className="h-4 w-4" /> {inviting ? "Sending…" : "Send invite"}</Button>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
      <Toast toast={toast} />

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => { setFilter(f.id); setSelected(new Set()); }}
              className={cn("flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors", filter === f.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")}>
              {f.label}
              <span className={cn("rounded-full px-1.5 text-[11px]", f.id === "pending" && counts.pending ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground")}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={cn(selCls, "h-9")}>
            <option value="">All roles</option>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <SearchBox value={query} onChange={setQuery} placeholder="Search email, contact, notes…" />
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand/40 bg-brand/5 px-4 py-2.5">
          <span className="mr-auto text-sm font-medium text-foreground">{selected.size} selected</span>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => patch([...selected], { action: "approve" }, `Approved ${plural(selected.size)}.`)}><CheckCircle2 className="h-4 w-4" /> Approve</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setReasonFor({ action: "decline", ids: [...selected] })}><XCircle className="h-4 w-4" /> Decline</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setReasonFor({ action: "suspend", ids: [...selected] })}><PauseCircle className="h-4 w-4" /> Suspend</Button>
          <Button size="sm" variant="outline" disabled={busy} className="text-destructive" onClick={() => setReasonFor({ action: "block", ids: [...selected] })}><Ban className="h-4 w-4" /> Block</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      {/* Users */}
      <div className="rounded-xl border border-border bg-card">
        {!loaded ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Loading users…</p>
        ) : visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{users.length ? "No users match these filters." : "No users yet."}</p>
        ) : (
          <div className="divide-y divide-border">
            <label className="flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground">
              <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--brand-strong))]" checked={allChecked} disabled={!visibleSelectable.length}
                onChange={(e) => setSelected(e.target.checked ? new Set(visibleSelectable.map((u) => u.id)) : new Set())} />
              Select all {visibleSelectable.length}
            </label>
            {visible.map((u) => {
              const s = statusOf(u);
              return (
                <div key={u.id} className={cn("flex flex-wrap items-center gap-3 px-4 py-3", selected.has(u.id) && "bg-accent/40")}>
                  <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--brand-strong))]" disabled={!selectable(u)} checked={selected.has(u.id)}
                    onChange={(e) => setSelected((prev) => { const n = new Set(prev); if (e.target.checked) n.add(u.id); else n.delete(u.id); return n; })} />
                  <Avatar name={u.contactName || u.email} />
                  <button className="min-w-0 flex-1 text-left" onClick={() => setDetailId(u.id)}>
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                      {u.email}
                      {u.lockedSuper && <span className="rounded-full bg-brand/15 px-1.5 text-[10px] font-semibold text-brand-strong">Owner</span>}
                      {u.id === me && <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">You</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.contactName ? `${u.contactName} · ` : ""}Joined {ago(u.createdAt)} · Last sign-in {ago(u.lastSignInAt)}
                      {!u.emailConfirmed && " · Email unconfirmed"}
                      {u.reason && (s === "blocked" || s === "declined" || s === "suspended") && ` · “${u.reason}”`}
                    </p>
                  </button>
                  <StatusBadge u={u} />
                  <select value={u.role} disabled={u.lockedSuper || u.id === me} onChange={(e) => patch([u.id], { role: e.target.value }, "Role updated.")} className={selCls}>
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                  {selectable(u) && s === "pending" && (
                    <>
                      <Button size="sm" disabled={busy} onClick={() => patch([u.id], { action: "approve" }, "Approved.")}>Approve</Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setReasonFor({ action: "decline", ids: [u.id] })}>Decline</Button>
                    </>
                  )}
                  {selectable(u) && (s === "declined" || s === "blocked") && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => patch([u.id], { action: "approve" }, "Approved.")}>Approve</Button>
                  )}
                  <RowActions actions={actionsFor(u)} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ReasonDialog
        target={reasonFor}
        count={reasonFor?.ids.length || 0}
        onClose={() => setReasonFor(null)}
        onConfirm={(reason, days) => {
          if (!reasonFor) return;
          const n = reasonFor.ids.length;
          const verb = { decline: "Declined", block: "Blocked", suspend: "Suspended" }[reasonFor.action];
          patch(reasonFor.ids, { action: reasonFor.action, reason, days }, `${verb} ${plural(n)}.`);
          setReasonFor(null);
        }}
      />

      <UserDetail
        user={detail}
        isMe={detail?.id === me}
        contacts={contacts.items}
        busy={busy}
        onClose={() => setDetailId(null)}
        onPatch={(body, done) => detail && patch([detail.id], body, done)}
        actions={detail ? actionsFor(detail).filter((a) => a.label !== "Details") : []}
      />
    </div>
  );
}

function ReasonDialog({ target, count, onClose, onConfirm }: {
  target: { action: ReasonAction } | null; count: number;
  onClose: () => void; onConfirm: (reason: string, days?: number) => void;
}) {
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(7);
  useEffect(() => { if (target) { setReason(""); setDays(7); } }, [target]);
  if (!target) return null;
  const copy = REASON_COPY[target.action];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}{count > 1 ? ` (${count} users)` : ""}</DialogTitle>
          <DialogDescription>{copy.body}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {target.action === "suspend" && (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">Duration</span>
              <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={cn(selCls, "h-9 w-full")}>
                {[1, 3, 7, 14, 30, 90].map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>)}
              </select>
            </label>
          )}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">Reason <span className="font-normal text-muted-foreground">(internal, optional)</span></span>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. Not a customer, spam sign-up, unpaid invoice…" />
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={target.action === "block" ? "destructive" : "default"} onClick={() => onConfirm(reason.trim(), target.action === "suspend" ? days : undefined)}>{copy.cta}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserDetail({ user, isMe, contacts, busy, onClose, onPatch, actions }: {
  user: ManagedUser | null; isMe: boolean; contacts: ContactRec[]; busy: boolean;
  onClose: () => void; onPatch: (body: Record<string, unknown>, done?: string) => void; actions: RowAction[];
}) {
  const [note, setNote] = useState("");
  useEffect(() => { setNote(user?.note || ""); }, [user?.id, user?.note]);

  return (
    <Sheet open={!!user} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto">
        {user && (
          <div className="space-y-5">
            <SheetHeader>
              <div className="flex items-center gap-3">
                <Avatar name={user.contactName || user.email} />
                <div className="min-w-0">
                  <SheetTitle className="truncate">{user.email}</SheetTitle>
                  <SheetDescription>{ROLE_LABEL[user.role] || user.role}{isMe ? " · You" : ""}</SheetDescription>
                </div>
              </div>
              <div className="pt-1"><StatusBadge u={user} /></div>
            </SheetHeader>

            <div>
              <DetailField label="Joined">{fmtDate(user.createdAt)}</DetailField>
              <DetailField label="Last sign-in">{user.lastSignInAt ? fmtDate(user.lastSignInAt) : "Never"}</DetailField>
              <DetailField label="Email">{user.emailConfirmed ? "Confirmed" : "Unconfirmed"}</DetailField>
              <DetailField label="Sign-in method">{user.provider}</DetailField>
              {user.invitedAt && <DetailField label="Invited">{fmtDate(user.invitedAt)}</DetailField>}
              {user.suspendedUntil && <DetailField label="Suspended until">{fmtDate(user.suspendedUntil)}</DetailField>}
              {user.decidedAt && <DetailField label="Last decision">{fmtDate(user.decidedAt)}{user.decidedBy ? ` by ${user.decidedBy}` : ""}</DetailField>}
              {user.reason && <DetailField label="Reason">{user.reason}</DetailField>}
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">Linked contact</span>
              <div className="flex items-center gap-2">
                <select value={user.contactId || ""} className={cn(selCls, "h-9 flex-1")}
                  onChange={(e) => { const c = contacts.find((x) => x.id === e.target.value); onPatch({ contactId: e.target.value, contactName: c?.name || "" }, "Contact updated."); }}>
                  <option value="">None</option>
                  {contacts.map((c) => <option key={c.id} value={c.id}>{c.name || "Untitled"}</option>)}
                </select>
                {user.contactId && <Link href={`/app/admin/contacts/${user.contactId}`} className="inline-flex items-center gap-1 text-xs text-brand-strong hover:underline"><Link2 className="h-3 w-3" /> Open</Link>}
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">Admin notes</span>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Private notes about this user — only Super Admins see these." />
              <div className="flex justify-end">
                <Button size="sm" variant="outline" disabled={busy || note === user.note} onClick={() => onPatch({ note }, "Notes saved.")}>Save notes</Button>
              </div>
            </label>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Actions</p>
              {user.lockedSuper && <p className="text-xs text-muted-foreground">Owner accounts can't be restricted or deleted.</p>}
              <div className="flex flex-wrap gap-2">
                {statusOf(user) !== "active" && statusOf(user) !== "suspended" && !user.lockedSuper && !isMe && (
                  <Button size="sm" disabled={busy} onClick={() => onPatch({ action: "approve" }, "Approved.")}><CheckCircle2 className="h-4 w-4" /> Approve</Button>
                )}
                {actions.map((a) => {
                  const Icon = a.icon;
                  return <Button key={a.label} size="sm" variant="outline" disabled={busy} className={cn(a.destructive && "text-destructive")} onClick={a.onClick}><Icon className="h-4 w-4" /> {a.label}</Button>;
                })}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
