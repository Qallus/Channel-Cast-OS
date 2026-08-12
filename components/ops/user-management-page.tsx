"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Link2, Mail, ShieldCheck, Trash2, UserPlus } from "lucide-react";

import { PageHeader, StatRow, StatTile } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type ManagedUser = { id: string; email: string; role: string; access: string; contactId: string | null; contactName: string | null; createdAt?: string; lockedSuper?: boolean };
type ContactRec = { id: string; name?: string };

const ROLE_LABEL: Record<string, string> = { super_admin: "Super Admin", admin: "Admin", advertiser: "Advertiser", owner: "Location Owner" };
const ROLE_OPTIONS = ["super_admin", "admin", "advertiser", "owner"];
const selCls = "h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-brand-strong";

export function UserManagementPage() {
  const contacts = useCollection<ContactRec>("contacts", []);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [contactId, setContactId] = useState("");
  const [inviting, setInviting] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/admin/users");
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Couldn't load users."); return; }
      setUsers(d.users || []); setError("");
    } catch { setError("Couldn't load users."); }
    finally { setLoaded(true); }
  }
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => u.role === "admin" || u.role === "super_admin").length,
    active: users.filter((u) => u.access === "approved").length,
    pending: users.filter((u) => u.access !== "approved").length,
  }), [users]);

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

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    load();
  }
  async function removeUser(id: string) {
    if (!confirm("Remove this user's account?")) return;
    await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={ShieldCheck} title="User Management" description="Invite Super Admins and Admins, set access, and link each user to a contact. Invite-only — sign-ups have no access until approved here." />

      <StatRow>
        <StatTile label="Users" value={stats.total} />
        <StatTile label="Admins" value={stats.admins} accent />
        <StatTile label="Active" value={stats.active} />
        <StatTile label="Pending" value={stats.pending} />
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
        {toast && <p className="mt-2 text-sm text-brand-strong">{toast}</p>}
      </div>

      {/* Users */}
      <div className="rounded-xl border border-border bg-card">
        {!loaded ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No users yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">{u.email}{u.lockedSuper && <span className="rounded-full bg-brand/15 px-1.5 text-[10px] font-semibold text-brand-strong">Owner</span>}</p>
                  {u.contactId && u.contactName && <Link href={`/app/admin/contacts/${u.contactId}`} className="inline-flex items-center gap-1 text-xs text-brand-strong hover:underline"><Link2 className="h-3 w-3" /> {u.contactName}</Link>}
                </div>
                <span className={cn("inline-flex items-center gap-1 text-xs font-medium", u.access === "approved" ? "text-success" : "text-warning")}>{u.access === "approved" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />} {u.access === "approved" ? "Active" : "Pending"}</span>
                <select value={u.role} disabled={u.lockedSuper} onChange={(e) => patch(u.id, { role: e.target.value })} className={selCls}>
                  {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
                {!u.lockedSuper && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => patch(u.id, { access: u.access === "approved" ? "pending" : "approved" })}>{u.access === "approved" ? "Revoke" : "Approve"}</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeUser(u.id)}><Trash2 className="h-4 w-4" /></Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
