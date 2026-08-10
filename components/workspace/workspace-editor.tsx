"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, Check, Loader2, AlertTriangle, Plus, Star, FileText, Folder } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CommentsPanel } from "@/components/workspace/comments-panel";
import { ShareControl } from "@/components/workspace/share-control";
import type { WorkspaceScope } from "@/lib/workspace/types";
import type { WorkspaceComment, MentionUser } from "@/lib/workspace/comments";

const WorkspaceEditorSurface = dynamic(() => import("@/components/workspace/plate-editor").then((m) => m.WorkspaceEditorSurface), {
  ssr: false,
  loading: () => <div className="min-h-[62vh] rounded-md border bg-background px-4 py-3 text-sm text-muted-foreground">Loading editor…</div>,
});

type SaveState = "idle" | "saving" | "saved" | "error";
type NavDoc = { id: string; title: string; is_favorite: boolean; folder_name: string | null };

export function WorkspaceEditor({
  doc,
  navDocs,
  folders,
  comments,
  mentionable,
  workspaceId,
}: {
  doc: { id: string; title: string; content_json: unknown; scope: string; updated_at: string };
  navDocs: NavDoc[];
  folders: { id: string; name: string }[];
  comments: WorkspaceComment[];
  mentionable: MentionUser[];
  workspaceId?: string;
}) {
  const actionToken = "";
  const router = useRouter();
  const [title, setTitle] = useState(doc.title);
  const [state, setState] = useState<SaveState>("idle");

  const latest = useRef<{ title: string; content: unknown }>({ title: doc.title, content: doc.content_json });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async () => {
    setState("saving");
    try {
      const res = await fetch(`/api/admin/workspace/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionToken, title: latest.current.title, content: latest.current.content }),
      });
      setState(res.ok ? "saved" : "error");
    } catch { setState("error"); }
  }, [actionToken, doc.id]);

  const scheduleSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, 900);
  }, [save]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function newDocument() {
    const res = await fetch("/api/admin/workspace/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actionToken, scope: "personal", workspaceId }) });
    const data = await res.json();
    if (data?.id) { router.push(`/app/admin/workspace/${data.id}`); router.refresh(); }
  }

  const favorites = navDocs.filter((d) => d.is_favorite);

  const left = (
    <div className="space-y-4 rounded-md border bg-card p-3">
      <button type="button" onClick={newDocument} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"><Plus className="h-4 w-4" /> New document</button>
      {favorites.length ? (
        <div>
          <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Favorites</p>
          <NavList docs={favorites} activeId={doc.id} icon={Star} />
        </div>
      ) : null}
      {folders.length ? (
        <div>
          <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Folders</p>
          <ul className="space-y-0.5">{folders.map((f) => <li key={f.id} className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-muted-foreground"><Folder className="h-3.5 w-3.5" /> {f.name}</li>)}</ul>
        </div>
      ) : null}
      <div>
        <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Documents</p>
        <NavList docs={navDocs} activeId={doc.id} icon={FileText} />
      </div>
    </div>
  );

  const right = (
    <div className="space-y-4">
      <CommentsPanel documentId={doc.id} comments={comments} mentionable={mentionable} />
      <div className="rounded-md border bg-card p-3 text-xs text-muted-foreground">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Document info</p>
          <ShareControl documentId={doc.id} scope={doc.scope as WorkspaceScope} onChanged={() => router.refresh()} variant="button" />
        </div>
        <p>Scope: <span className="capitalize text-foreground">{doc.scope === "shared" ? "Public" : doc.scope}</span></p>
        <p>Updated: {new Date(doc.updated_at).toLocaleString()}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link href={workspaceId ? `/app/admin/workspace?ws=${workspaceId}` : "/app/admin/workspace"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Workspace
        </Link>
        <SaveStatus state={state} />
      </div>
      <WorkspaceEditorSurface
        initialValue={doc.content_json}
        onChange={(value) => { latest.current.content = value; scheduleSave(); }}
        statusSlot={undefined}
        left={left}
        right={right}
        mentionUsers={mentionable}
        titleSlot={
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); latest.current.title = e.target.value; scheduleSave(); }}
            placeholder="Untitled"
            className="mb-2 h-auto border-0 bg-transparent px-0 text-3xl font-bold shadow-none focus-visible:ring-0"
          />
        }
      />
    </div>
  );
}

function NavList({ docs, activeId, icon: Icon }: { docs: NavDoc[]; activeId: string; icon: typeof FileText }) {
  return (
    <ul className="space-y-0.5">
      {docs.slice(0, 30).map((d) => (
        <li key={d.id}>
          <Link href={`/app/admin/workspace/${d.id}`} className={`flex items-center gap-1.5 truncate rounded px-2 py-1 text-sm transition-colors hover:bg-accent ${d.id === activeId ? "bg-accent font-medium" : "text-muted-foreground"}`}>
            <Icon className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{d.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Fixed width + always rendered: the label changing (idle → Saving… → Saved) must
// not change the toolbar's width, or flex-wrap would add/remove a row and jump the page.
function SaveStatus({ state }: { state: SaveState }) {
  return (
    <span className="inline-flex w-[92px] shrink-0 items-center justify-end gap-1.5 whitespace-nowrap px-2 text-xs">
      {state === "saving" ? <><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> <span className="text-muted-foreground">Saving…</span></> : null}
      {state === "saved" ? <><Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> <span className="text-emerald-600 dark:text-emerald-400">Saved</span></> : null}
      {state === "error" ? <><AlertTriangle className="h-3.5 w-3.5 text-destructive" /> <span className="text-destructive">Failed</span></> : null}
    </span>
  );
}
