"use client";

import * as React from "react";
import { Bot, ListTodo, Mic, RefreshCw, Send, Users } from "lucide-react";

import { PageHeader } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Toast, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type ServiceHealth = {
  configured: boolean;
  ok: boolean;
  authorized?: boolean;
  detail?: string;
  missing?: string[];
  model?: string;
  models?: string[];
  agents?: { id: string; name?: string }[];
  voice?: string;
};

type StatusResponse = { hermes: ServiceHealth; paperclip: ServiceHealth; voice: ServiceHealth };
type Task = { id: string; title: string; status?: string; priority?: string; createdAt?: string };

const PRIORITIES = ["critical", "high", "medium", "low"] as const;

/** Grey = never set up, amber = set up but failing, green = working. */
function statusOf(h: ServiceHealth | undefined): "off" | "warn" | "ok" {
  if (!h || !h.configured) return "off";
  return h.ok ? "ok" : "warn";
}

function ServiceCard({
  icon: Icon, name, role, health, children,
}: {
  icon: typeof Bot; name: string; role: string; health?: ServiceHealth; children?: React.ReactNode;
}) {
  const state = statusOf(health);
  const label = state === "ok" ? "Working" : state === "warn" ? "Needs attention" : "Not set up";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <div className="font-semibold">{name}</div>
            <div className="text-xs text-muted-foreground">{role}</div>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
            state === "ok" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
            state === "warn" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
            state === "off" && "bg-muted text-muted-foreground",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", state === "ok" ? "bg-emerald-500" : state === "warn" ? "bg-amber-500" : "bg-muted-foreground")} />
          {label}
        </span>
      </div>

      {health?.detail && <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">{health.detail}</p>}

      {!health?.configured && health?.missing?.length ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Add to the server environment:{" "}
          <span className="font-mono text-[11px] text-foreground">{health.missing.join(", ")}</span>
        </p>
      ) : null}

      {children}
    </div>
  );
}

export function AgentsConsole() {
  const { toast, flash } = useToast();
  const [status, setStatus] = React.useState<StatusResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [prompt, setPrompt] = React.useState("");
  const [reply, setReply] = React.useState("");
  const [asking, setAsking] = React.useState(false);

  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<string>("medium");
  const [creating, setCreating] = React.useState(false);

  const loadStatus = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/agents/status");
      const json = await res.json();
      if (res.ok) setStatus(json);
      else flash(json.error || "Could not read agent status.", "error");
    } catch {
      flash("Could not read agent status.", "error");
    } finally {
      setLoading(false);
    }
  }, [flash]);

  const loadTasks = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/agents/tasks");
      const json = await res.json();
      setTasks(Array.isArray(json.tasks) ? json.tasks : []);
    } catch {
      setTasks([]);
    }
  }, []);

  React.useEffect(() => { loadStatus(); }, [loadStatus]);
  React.useEffect(() => { if (status?.paperclip?.ok) loadTasks(); }, [status?.paperclip?.ok, loadTasks]);

  const hermesReady = Boolean(status?.hermes?.ok);
  const paperclipReady = Boolean(status?.paperclip?.ok);

  async function ask() {
    const q = prompt.trim();
    if (!q) return;
    setAsking(true);
    setReply("");
    try {
      const res = await fetch("/api/admin/agents/ask", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: q }),
      });
      const json = await res.json();
      if (!res.ok) { flash(json.error || "Hermes did not answer.", "error"); return; }
      setReply(json.reply || "");
    } catch {
      flash("Hermes did not answer.", "error");
    } finally {
      setAsking(false);
    }
  }

  async function createTask() {
    const t = title.trim();
    if (!t) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/agents/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: t, description, priority, source: "console" }),
      });
      const json = await res.json();
      if (!res.ok) { flash(json.error || "Paperclip did not confirm the task.", "error"); return; }
      // An unconfirmed save is real work that a person still needs to verify.
      if (json.state === "unconfirmed") flash("Task saved, but Paperclip did not confirm it. Check it in Paperclip.", "error");
      else flash("Task handed to the agent team.");
      setTitle("");
      setDescription("");
      loadTasks();
    } catch {
      flash("Paperclip did not confirm the task.", "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Bot}
        title="AI Agents"
        description="Hermes answers and drafts, the Paperclip agent team works multi-step tasks, and xAI Voice handles calls."
        action={
          <Button size="sm" variant="outline" onClick={loadStatus} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
          </Button>
        }
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <ServiceCard icon={Bot} name="Hermes" role="Assistant with memory and a persona" health={status?.hermes}>
          {status?.hermes?.configured && status.hermes.model && (
            <p className="mt-3 text-xs text-muted-foreground">
              Profile: <span className="font-mono text-[11px] text-foreground">{status.hermes.model}</span>
            </p>
          )}
        </ServiceCard>

        <ServiceCard icon={Users} name="Paperclip" role="Agent team working tasks" health={status?.paperclip}>
          {status?.paperclip?.agents?.length ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {status.paperclip.agents.length} agent{status.paperclip.agents.length === 1 ? "" : "s"} in this company
            </p>
          ) : null}
        </ServiceCard>

        <ServiceCard icon={Mic} name="xAI Voice" role="Real-time speech and phone calls" health={status?.voice}>
          {status?.voice?.configured && (
            <p className="mt-3 text-xs text-muted-foreground">
              Model: <span className="font-mono text-[11px] text-foreground">{status.voice.model}</span>
              {status.voice.voice ? <> · Voice: <span className="font-mono text-[11px] text-foreground">{status.voice.voice}</span></> : null}
            </p>
          )}
        </ServiceCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ask Hermes */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 font-semibold"><Bot className="h-4 w-4 text-brand-strong" /> Ask Hermes</div>
          <p className="mt-1 text-xs text-muted-foreground">One question, one answer. For work that takes several steps, send it to the agent team instead.</p>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            disabled={!hermesReady}
            placeholder={hermesReady ? "Draft a follow-up to the Scottsdale advertiser about their September report" : "Hermes is not set up yet"}
            className="mt-3 w-full rounded-md border border-border bg-background p-2.5 text-sm disabled:opacity-60"
          />
          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={ask} disabled={!hermesReady || asking || !prompt.trim()}>
              <Send className="h-3.5 w-3.5" /> {asking ? "Asking…" : "Ask"}
            </Button>
          </div>

          {reply && <div className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-background p-3 text-sm">{reply}</div>}
        </div>

        {/* Paperclip tasks */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 font-semibold"><ListTodo className="h-4 w-4 text-brand-strong" /> Agent team</div>
          <p className="mt-1 text-xs text-muted-foreground">Hand over a job that takes several steps. It is tracked in Paperclip.</p>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!paperclipReady}
            placeholder={paperclipReady ? "Research the Salt River Fields listing" : "Paperclip is not set up yet"}
            className="mt-3 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm disabled:opacity-60"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            disabled={!paperclipReady}
            placeholder="What does done look like?"
            className="mt-2 w-full rounded-md border border-border bg-background p-2.5 text-sm disabled:opacity-60"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={!paperclipReady}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm capitalize disabled:opacity-60"
            >
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <Button size="sm" onClick={createTask} disabled={!paperclipReady || creating || !title.trim()}>
              <Send className="h-3.5 w-3.5" /> {creating ? "Sending…" : "Send to team"}
            </Button>
          </div>

          {tasks.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recent tasks</div>
              {tasks.slice(0, 8).map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
                  <span className="truncate text-sm">{t.title}</span>
                  {t.status && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize text-muted-foreground">{t.status.replace(/_/g, " ")}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
