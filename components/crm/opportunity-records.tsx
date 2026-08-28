"use client";

// Connect an opportunity to the rest of Channel Cast.
//
// Two different jobs behind one row of buttons. Projects and Plans already exist
// elsewhere and get *connected* — picking one, not making a duplicate. Contracts,
// SOWs, quotes and invoices are *raised from* the opportunity, prefilled with
// what the deal already knows so nothing is retyped.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, ExternalLink, FileSignature, FileText, FolderKanban, Link2, Receipt, ScrollText } from "lucide-react";

import { FormField } from "@/components/crm/crm-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Contact } from "@/lib/crm/contacts";
import { contactName } from "@/lib/crm/contacts";
import type { Deal } from "@/lib/crm/deals";
import { QuoteRequest, seedQuotes } from "@/lib/adops/quotes";
import { CHANNEL_CAST_FROM, DEFAULT_LOGO, Invoice, seedInvoices } from "@/lib/ops/invoices";
import { Document, seedDocuments } from "@/lib/ops/documents";
import { Project, seedProjects } from "@/lib/ops/projects";
import { genId, useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

export type RecordAction = "project" | "plan" | "contract" | "sow" | "quote" | "invoice";

export const RECORD_ACTIONS: { key: RecordAction; label: string; icon: typeof FolderKanban; mode: "link" | "create" }[] = [
  { key: "project", label: "Project", icon: FolderKanban, mode: "link" },
  { key: "plan", label: "Plan", icon: ClipboardList, mode: "link" },
  { key: "contract", label: "Contract", icon: FileSignature, mode: "create" },
  { key: "sow", label: "SOW", icon: ScrollText, mode: "create" },
  { key: "quote", label: "Quote", icon: FileText, mode: "create" },
  { key: "invoice", label: "Invoice", icon: Receipt, mode: "create" },
];

type PlanRec = { id: string; name?: string; title?: string; status?: string };

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function OpportunityRecords({
  deal, contact, action, onClose, onDone,
}: {
  deal: Deal;
  contact: Contact | null;
  action: RecordAction | null;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const projects = useCollection<Project>("projects", seedProjects);
  const plans = useCollection<PlanRec>("plans", []);
  const documents = useCollection<Document>("documents", seedDocuments);
  const quotes = useCollection<QuoteRequest>("quotes", seedQuotes);
  const invoices = useCollection<Invoice>("invoices", seedInvoices);

  const person = contact ? contactName(contact) : deal.client;
  const meta = RECORD_ACTIONS.find((a) => a.key === action) ?? null;

  // Link mode
  const [selectedId, setSelectedId] = useState("");
  // Create mode — one shared draft, since the four record types overlap heavily.
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(String(deal.value || 0));
  const [due, setDue] = useState(inDays(14));
  const [notes, setNotes] = useState("");
  const [ready, setReady] = useState<RecordAction | null>(null);

  // Refill whenever a different action opens.
  if (action && ready !== action) {
    setReady(action);
    setSelectedId("");
    setAmount(String(deal.value || 0));
    setDue(inDays(14));
    setNotes(deal.notes ?? "");
    setName(
      action === "contract" ? `${deal.client} — Service Agreement`
      : action === "sow" ? `${deal.client} — Statement of Work`
      : action === "quote" ? `${deal.client} — Quote`
      : action === "invoice" ? `${deal.client} — Invoice`
      : "",
    );
  }

  const linkable = useMemo(() => {
    if (action === "project") return projects.items.map((p) => ({ id: p.id, label: p.name, hint: p.client }));
    if (action === "plan") return plans.items.map((p) => ({ id: p.id, label: p.name || p.title || "Untitled plan", hint: p.status ?? "" }));
    return [];
  }, [action, projects.items, plans.items]);

  function connect() {
    if (!selectedId) return;
    if (action === "project") {
      const p = projects.items.find((x) => x.id === selectedId);
      if (p) projects.update(p.id, { ...p, opportunityId: deal.id, contactId: deal.contactId ?? null });
      onDone(`Connected to ${p?.name ?? "the project"}.`);
    } else {
      const p = plans.items.find((x) => x.id === selectedId);
      if (p) plans.update(p.id, { ...p, opportunityId: deal.id, contactId: deal.contactId ?? null } as PlanRec);
      onDone(`Connected to ${p?.name || p?.title || "the plan"}.`);
    }
    onClose();
  }

  function create() {
    const link = { opportunityId: deal.id, contactId: deal.contactId ?? null };
    const value = Number(amount) || 0;

    if (action === "contract" || action === "sow") {
      documents.create({
        id: genId("doc"), name, type: action === "sow" ? "SOW" : "Contract",
        relatedTo: deal.client, status: "draft", owner: deal.owner, sizeKb: 0,
        notes, createdAt: new Date().toISOString(), ...link,
      });
      onDone(`${action === "sow" ? "SOW" : "Contract"} drafted.`);
    } else if (action === "quote") {
      quotes.create({
        id: genId("qr"), company: deal.client, contact: person,
        email: contact?.email ?? "", phone: contact?.phone ?? "",
        requestType: deal.opportunityType || "New booking",
        budgetRange: value ? usd.format(value) : "",
        locations: 1, status: "new", owner: deal.owner, notes,
        dueDate: due, createdAt: new Date().toISOString(), ...link,
      });
      onDone("Quote request created.");
    } else if (action === "invoice") {
      invoices.create({
        id: genId("inv"), number: `CC-${Math.floor(1000 + Math.random() * 9000)}`,
        client: deal.client, amount: value, status: "draft",
        issueDate: today(), dueDate: due, description: deal.name, owner: deal.owner,
        createdAt: new Date().toISOString(), logoUrl: DEFAULT_LOGO, from: { ...CHANNEL_CAST_FROM },
        billTo: { name: person, company: deal.client, email: contact?.email ?? "", phone: contact?.phone ?? "" },
        // One line for the deal itself — editable in Billing like any other.
        lineItems: [{ id: genId("li"), description: deal.name, qty: 1, rate: value }],
        taxRate: 0, discount: 0, notes, terms: "Payment due within 30 days.", ...link,
      });
      onDone("Draft invoice created.");
    }
    onClose();
  }

  if (!meta) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><meta.icon className="h-4 w-4 text-brand-strong" /> {meta.mode === "link" ? `Connect a ${meta.label.toLowerCase()}` : `New ${meta.label.toLowerCase()}`}</DialogTitle>
        </DialogHeader>

        {meta.mode === "link" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pick an existing {meta.label.toLowerCase()} to connect to <span className="font-medium text-foreground">{deal.name}</span>.
            </p>
            {linkable.length === 0 ? (
              <p className="rounded-lg border border-border p-4 text-center text-sm text-muted-foreground">
                No {meta.label.toLowerCase()}s exist yet. Create one first, then connect it here.
              </p>
            ) : (
              <FormField label={meta.label}>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger><SelectValue placeholder={`Choose a ${meta.label.toLowerCase()}`} /></SelectTrigger>
                  <SelectContent>
                    {linkable.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.label}{o.hint ? ` · ${o.hint}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Prefilled from this opportunity — edit anything before saving.
            </p>
            <FormField label={action === "quote" ? "Company" : "Name"}>
              <Input value={action === "quote" ? deal.client : name} onChange={(e) => setName(e.target.value)} readOnly={action === "quote"} />
            </FormField>
            {action === "quote" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Contact"><Input value={person} readOnly /></FormField>
                <FormField label="Email"><Input value={contact?.email ?? ""} readOnly placeholder="No email on file" /></FormField>
              </div>
            )}
            {(action === "quote" || action === "invoice") && (
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label={action === "invoice" ? "Amount" : "Budget"}>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </FormField>
                <FormField label={action === "invoice" ? "Due date" : "SLA due date"}>
                  <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                </FormField>
              </div>
            )}
            <FormField label="Notes">
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context carried from the opportunity…" />
            </FormField>
            <p className="text-xs text-muted-foreground">
              Owner {deal.owner || "unassigned"} · linked back to this opportunity.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {meta.mode === "link"
            ? <Button onClick={connect} disabled={!selectedId}><Link2 className="h-4 w-4" /> Connect</Button>
            : <Button onClick={create} disabled={action !== "quote" && !name.trim()}>Create {meta.label.toLowerCase()}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Everything this opportunity is connected to or has raised. */
export function LinkedRecords({ deal }: { deal: Deal }) {
  const projects = useCollection<Project>("projects", seedProjects);
  const plans = useCollection<PlanRec & { opportunityId?: string }>("plans", []);
  const documents = useCollection<Document>("documents", seedDocuments);
  const quotes = useCollection<QuoteRequest>("quotes", seedQuotes);
  const invoices = useCollection<Invoice>("invoices", seedInvoices);

  const rows = [
    ...projects.items.filter((p) => p.opportunityId === deal.id).map((p) => ({ id: p.id, kind: "Project", label: p.name, href: "/app/admin/projects" })),
    ...plans.items.filter((p) => p.opportunityId === deal.id).map((p) => ({ id: p.id, kind: "Plan", label: p.name || p.title || "Plan", href: "/app/admin/plans" })),
    ...documents.items.filter((d) => d.opportunityId === deal.id).map((d) => ({ id: d.id, kind: d.type, label: d.name, href: "/app/admin/documents" })),
    ...quotes.items.filter((q) => q.opportunityId === deal.id).map((q) => ({ id: q.id, kind: "Quote", label: `${q.company} · ${q.budgetRange || "no budget"}`, href: "/app/admin/quote-requests" })),
    ...invoices.items.filter((i) => i.opportunityId === deal.id).map((i) => ({ id: i.id, kind: "Invoice", label: `${i.number} · ${usd.format(i.amount)}`, href: "/app/admin/billing" })),
  ];

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">Nothing connected yet.</p>;
  }

  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={`${r.kind}-${r.id}`}>
          <Link href={r.href} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm transition-colors hover:border-brand/40">
            <Badge className={cn("border-transparent bg-muted text-[10px]")}>{r.kind}</Badge>
            <span className="min-w-0 flex-1 truncate text-foreground">{r.label}</span>
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
