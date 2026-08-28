"use client";

// Email Studio — Send, Templates, and the visual Template Editor.
//
// Block model and renderer live in lib/email/blocks.ts so the builder, the
// composer preview and the server all produce identical HTML. Merge fields are
// Channel Cast's CRM vocabulary, not MJG's participant model.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check, Code2, Copy, Eye, Image as ImageIcon, Layers, LayoutTemplate, Loader2, Mail,
  Minus, MoveVertical, PanelTop, Plus, Search, Send, SquareSplitHorizontal, Trash2, Type,
} from "lucide-react";

import { EmptyState, FormField } from "@/components/crm/crm-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BLOCK_LABELS, BLOCK_ORDER, type BlockType, type EmailBlock, type EmailSchema,
  MERGE_FIELDS, createBlock, createDefaultSchema, schemaToHtml, schemaToText,
} from "@/lib/email/blocks";
import {
  EMAIL_TRIGGERS, type EmailAutomation, RECIPIENT_OPTIONS, TRIGGER_BY_KEY, TRIGGER_GROUPS,
} from "@/lib/email/automations";
import { cn } from "@/lib/utils";

export type EmailTemplate = {
  id: string; name: string; subject: string; preheader: string | null; category: string;
  status: "draft" | "active" | "archived"; html_body: string; text_body: string | null;
  schema: EmailSchema | null; owner: string | null; sends: number; last_sent_at: string | null;
  updated_at: string;
};

const CATEGORIES = ["General", "Onboarding", "Billing", "Campaign", "Support", "Marketing", "Pipeline", "System"];
const STATUS_TONE: Record<string, string> = {
  active: "bg-success/15 text-success",
  draft: "bg-muted text-muted-foreground",
  archived: "bg-secondary text-secondary-foreground",
};

const BLOCK_ICON: Record<BlockType, typeof Type> = {
  header: PanelTop, columns: SquareSplitHorizontal, heading: Type, text: Layers,
  button: Check, image: ImageIcon, divider: Minus, spacer: MoveVertical, footer: LayoutTemplate,
};

type Tab = "send" | "templates" | "editor" | "automations" | "history";

export function EmailStudio() {
  const [tab, setTab] = useState<Tab>("send");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/email/templates");
      const d = await res.json();
      setTemplates(d.templates ?? []);
    } catch { /* studio still usable without the library */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const openEditor = (t: EmailTemplate | null) => { setEditing(t); setTab("editor"); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-border">
        {([["send", "Send Email"], ["templates", "Templates"], ["editor", "Template Editor"], ["automations", "Automations"], ["history", "History"]] as [Tab, string][]).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={cn("-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === id ? "border-brand-strong text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>

      {tab === "send" && <SendEmail templates={templates} />}
      {tab === "templates" && <TemplateLibrary templates={templates} loading={loading} onEdit={openEditor} onChanged={load} />}
      {tab === "editor" && <TemplateEditor template={editing} onSaved={() => { void load(); setTab("templates"); }} />}
      {tab === "automations" && <Automations templates={templates} />}
      {tab === "history" && <History />}
    </div>
  );
}

// ── Template picker ──────────────────────────────────────────────────────────
export function TemplatePicker({ templates, value, onPick }: { templates: EmailTemplate[]; value: string; onPick: (t: EmailTemplate | null) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const cats = useMemo(() => ["All", ...Array.from(new Set(templates.map((t) => t.category)))], [templates]);
  const shown = useMemo(
    () => templates.filter((t) =>
      (cat === "All" || t.category === cat) &&
      (!q.trim() || `${t.name} ${t.subject}`.toLowerCase().includes(q.toLowerCase()))),
    [templates, q, cat],
  );
  const selected = templates.find((t) => t.id === value) ?? null;

  return (
    <div className="relative">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)} className="max-w-[240px]">
        <LayoutTemplate className="h-3.5 w-3.5" />
        <span className="truncate">{selected ? selected.name : "No template (manual)"}</span>
      </Button>
      {open && (
        <>
          <button type="button" aria-hidden className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-[340px] rounded-lg border border-border bg-popover p-2 shadow-lg">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" className="h-8 pl-7 text-sm" />
            </div>
            <div className="mb-2 flex flex-wrap gap-1">
              {cats.map((c) => (
                <button key={c} type="button" onClick={() => setCat(c)}
                  className={cn("rounded-md border px-2 py-0.5 text-[11px]", cat === c ? "border-brand-strong bg-brand/10 text-brand-strong" : "border-border text-muted-foreground hover:text-foreground")}>
                  {c} {c !== "All" && <span className="opacity-60">{templates.filter((t) => t.category === c).length}</span>}
                </button>
              ))}
            </div>
            <div className="max-h-72 space-y-0.5 overflow-y-auto">
              <button type="button" onClick={() => { onPick(null); setOpen(false); }}
                className={cn("flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted", !value && "bg-muted")}>
                {!value && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-strong" />}
                <span><span className="block font-medium text-foreground">No template (manual)</span>
                <span className="block text-xs text-muted-foreground">Compose a custom email</span></span>
              </button>
              {shown.map((t) => (
                <button key={t.id} type="button" onClick={() => { onPick(t); setOpen(false); }}
                  className={cn("flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted", value === t.id && "bg-muted")}>
                  {value === t.id && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-strong" />}
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-medium text-foreground">{t.name}</span>
                      {t.status !== "active" && <Badge className={cn("border-transparent text-[9px] uppercase", STATUS_TONE[t.status])}>{t.status}</Badge>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{t.subject || "No subject"}</span>
                  </span>
                </button>
              ))}
              {shown.length === 0 && <p className="px-2 py-4 text-center text-xs text-muted-foreground">No templates match.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FieldChips({ onInsert }: { onInsert: (token: string) => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fields</span>
      {MERGE_FIELDS.map((f) => (
        <button key={f.token} type="button" title={f.label}
          onClick={() => { onInsert(f.token); navigator.clipboard?.writeText(f.token); setCopied(f.token); setTimeout(() => setCopied(null), 1200); }}
          className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-brand-strong hover:text-brand-strong">
          {copied === f.token ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}{f.token}
        </button>
      ))}
    </div>
  );
}

// ── Send ─────────────────────────────────────────────────────────────────────
function SendEmail({ templates }: { templates: EmailTemplate[] }) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [html, setHtml] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pick(t: EmailTemplate | null) {
    setTemplateId(t?.id ?? "");
    if (!t) { setHtml(null); return; }
    setSubject(t.subject);
    setBody(t.text_body ?? "");
    setHtml(t.html_body);
  }

  async function send() {
    setBusy(true); setError(null); setMsg(null);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, cc, bcc, subject, body, html, templateId: templateId || null }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d?.error || "The email didn't send."); return; }
      setMsg(`Sent to ${d.sent} recipient${d.sent === 1 ? "" : "s"}.`);
    } finally { setBusy(false); }
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Compose email</h2>
        <p className="text-xs text-muted-foreground">Send to specific recipients, or pick a saved template next to the subject line.</p>
      </div>
      <div className="space-y-3 p-4">
        <FormField label="To"><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="person@example.com, another@example.com" /></FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="CC"><Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Optional CC recipients" /></FormField>
          <FormField label="BCC"><Input value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="Optional BCC recipients" /></FormField>
        </div>

        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <FormField label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject…" /></FormField>
          </div>
          <TemplatePicker templates={templates} value={templateId} onPick={pick} />
        </div>

        <FieldChips onInsert={(t) => setBody((b) => b + t)} />

        {html ? (
          <div className="rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
              <p className="text-xs text-muted-foreground">
                Using <span className="font-medium text-foreground">{templates.find((t) => t.id === templateId)?.name}</span>
              </p>
              <button type="button" onClick={() => setShowPreview((v) => !v)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <Eye className="h-3 w-3" /> {showPreview ? "Hide preview" : "Show preview"}
              </button>
            </div>
            {showPreview && <iframe title="Email preview" srcDoc={html} className="h-[380px] w-full rounded-b-lg bg-white" />}
          </div>
        ) : (
          <FormField label="Message">
            <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi {{first_name}}," className="min-h-[220px]" />
          </FormField>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Button onClick={send} disabled={busy || !to.trim() || !subject.trim() || (!body.trim() && !html)}>
            <Send className="h-4 w-4" /> {busy ? "Sending…" : "Send email"}
          </Button>
          {templateId && <Button variant="outline" onClick={() => pick(null)}>Clear template</Button>}
          {msg && <span className="text-sm text-brand-strong">{msg}</span>}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Library ──────────────────────────────────────────────────────────────────
function TemplateLibrary({ templates, loading, onEdit, onChanged }: {
  templates: EmailTemplate[]; loading: boolean; onEdit: (t: EmailTemplate | null) => void; onChanged: () => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const shown = templates.filter((t) =>
    (status === "all" || t.status === status) &&
    (!q.trim() || `${t.name} ${t.subject} ${t.category}`.toLowerCase().includes(q.toLowerCase())));

  async function remove(t: EmailTemplate) {
    if (!confirm(`Delete "${t.name}"? This can't be undone.`)) return;
    await fetch(`/api/email/templates?id=${encodeURIComponent(t.id)}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" className="h-9 w-[220px] pl-7" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => onEdit(null)}><Plus className="h-4 w-4" /> New template</Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading templates…</div>
      ) : shown.length === 0 ? (
        <EmptyState message="No templates yet. Create one to get started." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((t) => (
            <div key={t.id} className="flex flex-col rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.subject || "No subject"}</p>
                </div>
                <Badge className={cn("border-transparent text-[10px] uppercase", STATUS_TONE[t.status])}>{t.status}</Badge>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge className="border-transparent bg-muted text-[10px]">{t.category}</Badge>
                <span>{t.sends} sends</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => onEdit(t)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => remove(t)} aria-label="Delete template"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Editor ───────────────────────────────────────────────────────────────────
function TemplateEditor({ template, onSaved }: { template: EmailTemplate | null; onSaved: () => void }) {
  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [preheader, setPreheader] = useState(template?.preheader ?? "");
  const [category, setCategory] = useState(template?.category ?? "General");
  const [status, setStatus] = useState<EmailTemplate["status"]>(template?.status ?? "draft");
  const [schema, setSchema] = useState<EmailSchema>(template?.schema ?? createDefaultSchema());
  const [mode, setMode] = useState<"visual" | "html">(template && !template.schema ? "html" : "visual");
  const [rawHtml, setRawHtml] = useState(template?.html_body ?? "");
  const [selected, setSelected] = useState<string>(schema.blocks[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const html = mode === "visual" ? schemaToHtml(schema, { preheader }) : rawHtml;
  const block = schema.blocks.find((b) => b.id === selected) ?? null;

  const patch = (id: string, p: Partial<EmailBlock>) =>
    setSchema((s) => ({ ...s, blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...p } : b)) }));
  const add = (type: BlockType) => {
    const b = createBlock(type);
    setSchema((s) => ({ ...s, blocks: [...s.blocks, b] }));
    setSelected(b.id);
  };
  const removeBlock = (id: string) => setSchema((s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== id) }));
  const move = (id: string, dir: -1 | 1) =>
    setSchema((s) => {
      const i = s.blocks.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.blocks.length) return s;
      const next = s.blocks.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return { ...s, blocks: next };
    });

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/email/templates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: template?.id, name, subject, preheader, category, status,
          html_body: html,
          text_body: mode === "visual" ? schemaToText(schema) : null,
          // Raw-HTML templates keep a null schema so reopening them doesn't
          // silently replace hand-written markup with a generated document.
          schema: mode === "visual" ? schema : null,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setMsg(d?.error || "Save failed."); return; }
      onSaved();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_180px_150px]">
          <FormField label="Template name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client welcome" /></FormField>
          <FormField label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Hi {{first_name}}," /></FormField>
          <FormField label="Category">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={status} onValueChange={(v) => setStatus(v as EmailTemplate["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
          <FormField label="Preview text"><Input value={preheader ?? ""} onChange={(e) => setPreheader(e.target.value)} placeholder="Short preview shown in the inbox…" /></FormField>
          <div className="flex items-end gap-2">
            <div className="flex rounded-md border border-border p-0.5">
              {(["visual", "html"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={cn("rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors", mode === m ? "bg-brand-strong text-background" : "text-muted-foreground hover:text-foreground")}>
                  {m === "html" ? <Code2 className="mr-1 inline h-3 w-3" /> : null}{m}
                </button>
              ))}
            </div>
            <Button onClick={save} disabled={busy || !name.trim()}>{busy ? "Saving…" : "Save template"}</Button>
            {msg && <span className="self-center text-sm text-destructive">{msg}</span>}
          </div>
        </div>
        <div className="mt-3 border-t border-border pt-3"><FieldChips onInsert={() => {}} /></div>
      </div>

      {mode === "html" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Textarea value={rawHtml} onChange={(e) => setRawHtml(e.target.value)} className="min-h-[520px] font-mono text-xs" placeholder="<table>…</table>" />
          <iframe title="HTML preview" srcDoc={rawHtml} className="h-[520px] w-full rounded-lg border border-border bg-white" />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_260px]">
          {/* Palette */}
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add block</p>
            <div className="space-y-1.5">
              {BLOCK_ORDER.map((t) => {
                const Icon = BLOCK_ICON[t];
                return (
                  <button key={t} type="button" onClick={() => add(t)}
                    className="flex w-full items-start gap-2 rounded-lg border border-border p-2 text-left transition-colors hover:border-brand/40">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{BLOCK_LABELS[t].label}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{BLOCK_LABELS[t].hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview + block list */}
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-card p-2">
              <p className="mb-2 px-1 text-xs text-muted-foreground">{schema.blocks.length} blocks · click one to edit</p>
              <div className="space-y-1">
                {schema.blocks.map((b, i) => (
                  <div key={b.id} className={cn("flex items-center gap-1.5 rounded-md border px-2 py-1.5", selected === b.id ? "border-brand-strong bg-brand/10" : "border-border")}>
                    <button type="button" onClick={() => setSelected(b.id)} className="min-w-0 flex-1 text-left text-sm text-foreground">
                      {BLOCK_LABELS[b.type].label}
                      <span className="ml-2 truncate text-xs text-muted-foreground">{(b.text ?? b.title ?? "").slice(0, 34)}</span>
                    </button>
                    <button type="button" onClick={() => move(b.id, -1)} disabled={i === 0} className="rounded px-1 text-xs text-muted-foreground disabled:opacity-30 hover:text-foreground">↑</button>
                    <button type="button" onClick={() => move(b.id, 1)} disabled={i === schema.blocks.length - 1} className="rounded px-1 text-xs text-muted-foreground disabled:opacity-30 hover:text-foreground">↓</button>
                    <button type="button" onClick={() => removeBlock(b.id)} className="rounded px-1 text-muted-foreground hover:text-destructive" aria-label="Remove block"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
            <iframe title="Template preview" srcDoc={html} className="h-[520px] w-full rounded-xl border border-border bg-white" />
          </div>

          {/* Settings */}
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {block ? `${BLOCK_LABELS[block.type].label} settings` : "Block settings"}
            </p>
            {!block ? <p className="text-sm text-muted-foreground">Select a block to edit it.</p> : (
              <div className="space-y-3">
                {["heading", "text", "button", "footer"].includes(block.type) && (
                  <FormField label="Text"><Textarea rows={4} value={block.text ?? ""} onChange={(e) => patch(block.id, { text: e.target.value })} /></FormField>
                )}
                {["button", "image"].includes(block.type) && (
                  <FormField label="Link URL"><Input value={block.linkUrl ?? ""} onChange={(e) => patch(block.id, { linkUrl: e.target.value })} placeholder="https://" /></FormField>
                )}
                {["image", "header"].includes(block.type) && (
                  <>
                    <FormField label="Image URL"><Input value={block.url ?? ""} onChange={(e) => patch(block.id, { url: e.target.value })} placeholder="/logos/logo-email-white.png" /></FormField>
                    <FormField label="Alt text"><Input value={block.alt ?? ""} onChange={(e) => patch(block.id, { alt: e.target.value })} /></FormField>
                  </>
                )}
                {block.type === "heading" && (
                  <FormField label="Level">
                    <Select value={block.headingLevel ?? "h2"} onValueChange={(v) => patch(block.id, { headingLevel: v as "h1" | "h2" | "h3" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="h1">H1</SelectItem><SelectItem value="h2">H2</SelectItem><SelectItem value="h3">H3</SelectItem></SelectContent>
                    </Select>
                  </FormField>
                )}
                {["heading", "text", "footer"].includes(block.type) && (
                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="Font size"><Input type="number" value={block.fontSize ?? 16} onChange={(e) => patch(block.id, { fontSize: Number(e.target.value) || 16 })} /></FormField>
                    <FormField label="Text colour"><Input value={block.textColor ?? ""} onChange={(e) => patch(block.id, { textColor: e.target.value })} placeholder="#334155" /></FormField>
                  </div>
                )}
                {block.type === "button" && (
                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="Button colour"><Input value={block.buttonColor ?? ""} onChange={(e) => patch(block.id, { buttonColor: e.target.value })} /></FormField>
                    <FormField label="Label colour"><Input value={block.buttonTextColor ?? ""} onChange={(e) => patch(block.id, { buttonTextColor: e.target.value })} /></FormField>
                  </div>
                )}
                {block.type === "spacer" && (
                  <FormField label="Height (px)"><Input type="number" value={block.height ?? 24} onChange={(e) => patch(block.id, { height: Number(e.target.value) || 0 })} /></FormField>
                )}
                <FormField label="Align">
                  <Select value={block.align ?? "left"} onValueChange={(v) => patch(block.id, { align: v as "left" | "center" | "right" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent>
                  </Select>
                </FormField>
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Pad top"><Input type="number" value={block.padTop ?? 0} onChange={(e) => patch(block.id, { padTop: Number(e.target.value) || 0 })} /></FormField>
                  <FormField label="Pad bottom"><Input type="number" value={block.padBottom ?? 0} onChange={(e) => patch(block.id, { padBottom: Number(e.target.value) || 0 })} /></FormField>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const EMAIL_STUDIO_ICON = Mail;


// ── Automations ──────────────────────────────────────────────────────────────
type Run = { id: string; automation_id: string; trigger_key: string; to_addr: string | null; status: string; detail: string | null; created_at: string };

const blankRule = (): Partial<EmailAutomation> => ({
  name: "", trigger_key: "stage_changed", template_id: null, enabled: false,
  conditions: {}, delay_minutes: 0, recipient: "contact", custom_email: null,
});

function Automations({ templates }: { templates: EmailTemplate[] }) {
  const [rules, setRules] = useState<EmailAutomation[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [draft, setDraft] = useState<Partial<EmailAutomation> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/email/automations");
      const d = await res.json();
      setRules(d.automations ?? []);
      setRuns(d.runs ?? []);
    } catch { /* list stays empty */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!draft) return;
    setError(null);
    const res = await fetch("/api/email/automations", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d?.error || "Save failed."); return; }
    setDraft(null); void load();
  }

  async function toggle(rule: EmailAutomation) {
    await fetch("/api/email/automations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rule, enabled: !rule.enabled }),
    });
    void load();
  }

  async function remove(rule: EmailAutomation) {
    if (!confirm(`Delete "${rule.name}"?`)) return;
    await fetch(`/api/email/automations?id=${encodeURIComponent(rule.id)}`, { method: "DELETE" });
    void load();
  }

  const trigger = draft?.trigger_key ? TRIGGER_BY_KEY[draft.trigger_key] : null;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">A pipeline event fires a template. Rules are off until you enable them.</p>
          <Button onClick={() => setDraft(blankRule())}><Plus className="h-4 w-4" /> New rule</Button>
        </div>

        {draft && (
          <div className="space-y-3 rounded-xl border border-brand-strong/40 bg-card p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Rule name">
                <Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Welcome new client" />
              </FormField>
              <FormField label="Trigger">
                <Select value={draft.trigger_key} onValueChange={(v) => setDraft({ ...draft, trigger_key: v, conditions: {} })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_GROUPS.map((g) => (
                      <div key={g}>
                        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{g}</div>
                        {EMAIL_TRIGGERS.filter((t) => t.group === g).map((t) => (
                          <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            {trigger && <p className="text-xs text-muted-foreground">{trigger.hint}</p>}

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Template">
                <Select value={draft.template_id ?? "none"} onValueChange={(v) => setDraft({ ...draft, template_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select a template…</SelectItem>
                    {templates.filter((t) => t.status === "active").map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Send to">
                <Select value={draft.recipient ?? "contact"} onValueChange={(v) => setDraft({ ...draft, recipient: v as EmailAutomation["recipient"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RECIPIENT_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </div>

            {draft.recipient === "custom" && (
              <FormField label="Fixed address">
                <Input value={draft.custom_email ?? ""} onChange={(e) => setDraft({ ...draft, custom_email: e.target.value })} placeholder="alerts@channelcast.io" />
              </FormField>
            )}

            {trigger?.conditions?.map((c) => (
              <FormField key={c.key} label={c.label}>
                <Input
                  value={(draft.conditions ?? {})[c.key] ?? ""}
                  onChange={(e) => setDraft({ ...draft, conditions: { ...(draft.conditions ?? {}), [c.key]: e.target.value } })}
                  placeholder="Leave blank for any"
                />
              </FormField>
            ))}

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Button onClick={save} disabled={!draft.name?.trim()}>Save rule</Button>
              <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
              {error && <span className="text-sm text-destructive">{error}</span>}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading rules…</div>
        ) : rules.length === 0 ? (
          <EmptyState message="No automations yet. Create a rule to send a template when a pipeline event fires." />
        ) : (
          <div className="space-y-2">
            {rules.map((r) => {
              const t = TRIGGER_BY_KEY[r.trigger_key];
              const tpl = templates.find((x) => x.id === r.template_id);
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <button type="button" onClick={() => toggle(r)} role="switch" aria-checked={r.enabled}
                    className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", r.enabled ? "bg-brand-strong" : "bg-muted")}>
                    <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform", r.enabled ? "translate-x-4" : "translate-x-0.5")} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t?.label ?? r.trigger_key} → {tpl?.name ?? <span className="text-warning">no template</span>}
                      {Object.entries(r.conditions ?? {}).filter(([, v]) => v).map(([k, v]) => ` · ${k}=${v}`)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{r.runs} runs</span>
                  <Button size="sm" variant="outline" onClick={() => setDraft(r)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => remove(r)} aria-label="Delete rule"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent firings</h3>
        </div>
        <div className="max-h-[560px] overflow-y-auto p-3">
          {runs.length === 0 ? <p className="p-4 text-center text-xs text-muted-foreground">Nothing has fired yet.</p> : (
            <ol className="space-y-2">
              {runs.map((r) => (
                <li key={r.id} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full",
                      r.status === "sent" ? "bg-success" : r.status === "failed" ? "bg-destructive" : "bg-muted-foreground/50")} />
                    <span className="font-medium text-foreground">{TRIGGER_BY_KEY[r.trigger_key]?.label ?? r.trigger_key}</span>
                    <span className="text-muted-foreground">{r.status}</span>
                  </span>
                  <span className="ml-3 block text-muted-foreground">{r.to_addr ?? "—"} · {new Date(r.created_at).toLocaleString()}</span>
                  {r.detail && <span className="ml-3 block text-muted-foreground/80">{r.detail}</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

// ── History ──────────────────────────────────────────────────────────────────
type LogRow = {
  id: string; to_addr: string; subject: string | null; status: string; error: string | null;
  created_at: string; opportunity_id: string | null; owner: string | null;
  email_templates?: { name: string } | null;
};

function History() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/email/history?status=${status}`)
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sends</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{logs.length} messages</span>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading history…</div>
      ) : logs.length === 0 ? (
        <EmptyState message="No emails sent yet." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="p-3">To</th><th className="p-3">Subject</th><th className="p-3">Template</th><th className="p-3">Status</th><th className="p-3">Sent</th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="p-3 text-foreground">{l.to_addr}</td>
                  <td className="max-w-[280px] truncate p-3 text-muted-foreground">{l.subject ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{l.email_templates?.name ?? "—"}</td>
                  <td className="p-3">
                    <Badge className={cn("border-transparent text-[10px] uppercase", l.status === "sent" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>{l.status}</Badge>
                    {l.error && <span className="ml-2 text-xs text-destructive">{l.error}</span>}
                  </td>
                  <td className="whitespace-nowrap p-3 text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
