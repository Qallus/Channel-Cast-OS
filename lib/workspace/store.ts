// Server-side data layer for the collaborative Workspace, backed by the JSONB CRM
// store. Documents embed their favorites + collaborators; comments are their own
// collection. Access: admins see all; others see their own personal docs, shared
// docs, and docs they collaborate on.
import { deleteRecord, listRecords, upsertRecords } from "@/lib/server/crm-db";
import {
  EMPTY_DOC, extractPlainText,
  type Collaborator, type LinkableDoc, type MentionUser, type SearchResult, type ShareableUser,
  type WorkspaceCollaborator, type WorkspaceComment, type WorkspaceDocListItem, type WorkspaceDocument,
  type WorkspaceFolder, type WorkspaceScope, type WorkspaceSpace,
} from "./types";

export const DEFAULT_WORKSPACE_ID = "ws_general";
type Rec = { id: string } & Record<string, unknown>;
const asRec = <T,>(v: T) => v as unknown as Rec;
const now = () => new Date().toISOString();

export type WsActor = { id: string; isAdmin: boolean; name: string | null; email: string | null };

function genId(prefix: string): string {
  const rnd = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 12) : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${rnd}`;
}

async function allDocs(): Promise<WorkspaceDocument[]> {
  return (await listRecords("ws_documents")) as unknown as WorkspaceDocument[];
}

// ── People (team members + current user) ───────────────────────────────────────

export async function listPeople(actor: WsActor): Promise<ShareableUser[]> {
  const self: ShareableUser = { id: actor.id, name: actor.name || actor.email || "You", email: actor.email };
  let team: ShareableUser[] = [];
  try {
    const rows = await listRecords("team_members");
    team = rows.map((r) => ({ id: String(r.id), name: String((r.name as string) || (r.email as string) || "Member"), email: (r.email as string) ?? null }));
  } catch { /* none */ }
  const seen = new Set([self.id]); const out = [self];
  for (const p of team) if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
  return out;
}
export async function listMentionableUsers(actor: WsActor): Promise<MentionUser[]> {
  return (await listPeople(actor)).map((p) => ({ id: p.id, name: p.name }));
}

// ── Spaces ─────────────────────────────────────────────────────────────────────

export async function listWorkspaces(): Promise<WorkspaceSpace[]> {
  const rows = (await listRecords("ws_spaces")) as unknown as WorkspaceSpace[];
  if (!rows.length) {
    const general: WorkspaceSpace = { id: DEFAULT_WORKSPACE_ID, name: "General", icon: null, created_by: null, created_at: now() };
    await upsertRecords("ws_spaces", [asRec(general)]);
    return [general];
  }
  return rows.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
}

export async function createWorkspace(name: string, actorId: string): Promise<WorkspaceSpace> {
  const space: WorkspaceSpace = { id: genId("ws"), name: name.trim() || "Untitled workspace", icon: null, created_by: actorId, created_at: now() };
  await upsertRecords("ws_spaces", [asRec(space)]);
  return space;
}

// ── Folders ────────────────────────────────────────────────────────────────────

export async function listFolders(actor: WsActor, workspaceId?: string): Promise<WorkspaceFolder[]> {
  const rows = (await listRecords("ws_folders")) as unknown as WorkspaceFolder[];
  return rows
    .filter((f) => !f.archived_at)
    .filter((f) => !workspaceId || f.workspace_id === workspaceId)
    .filter((f) => f.scope === "shared" || actor.isAdmin || f.owner_id === actor.id)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createFolder(input: { name: string; scope: WorkspaceScope; parentId?: string | null; workspaceId?: string | null }, actorId: string) {
  const folder: WorkspaceFolder = {
    id: genId("wsf"), name: input.name.trim() || "Untitled folder", scope: input.scope,
    owner_id: input.scope === "personal" ? actorId : null, parent_id: input.parentId || null,
    workspace_id: input.workspaceId || DEFAULT_WORKSPACE_ID, created_at: now(), archived_at: null,
  };
  await upsertRecords("ws_folders", [asRec(folder)]);
  return { id: folder.id };
}

// ── Documents ──────────────────────────────────────────────────────────────────

function canAccessDoc(d: WorkspaceDocument, actor: WsActor): boolean {
  if (d.deleted_at) return false;
  if (actor.isAdmin) return true;
  if (d.scope === "shared") return true;
  if (d.owner_id === actor.id) return true;
  return (d.collaborators ?? []).some((c) => c.user_id === actor.id);
}

export async function listDocuments(actor: WsActor, workspaceId?: string): Promise<{ mine: WorkspaceDocListItem[]; shared: WorkspaceDocListItem[] }> {
  const [docs, folders] = await Promise.all([allDocs(), listRecords("ws_folders")]);
  const folderName = new Map((folders as unknown as WorkspaceFolder[]).map((f) => [f.id, f.name]));
  const mine: WorkspaceDocListItem[] = [];
  const shared: WorkspaceDocListItem[] = [];
  const map = (d: WorkspaceDocument): WorkspaceDocListItem => ({
    id: d.id, title: d.title, description: d.description, scope: d.scope, folder_id: d.folder_id,
    folder_name: d.folder_id ? folderName.get(d.folder_id) ?? null : null,
    owner_id: d.owner_id, owner_name: d.owner_name, status: d.status, updated_at: d.updated_at,
    updated_by_name: d.updated_by_name, is_favorite: (d.favorite_user_ids ?? []).includes(actor.id),
  });
  const visible = docs
    .filter((d) => !d.deleted_at && d.status !== "archived" && (!workspaceId || d.workspace_id === workspaceId))
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))
    .slice(0, 300);
  for (const d of visible) {
    if (d.scope === "personal" && d.owner_id === actor.id) mine.push(map(d));
    else if (d.scope === "shared") shared.push(map(d));
    else if ((d.collaborators ?? []).some((c) => c.user_id === actor.id)) shared.push(map(d));
    else if (actor.isAdmin && d.scope === "personal") mine.push(map(d));
  }
  return { mine, shared };
}

export async function getDocument(id: string, actor: WsActor): Promise<WorkspaceDocument | null> {
  const doc = (await allDocs()).find((d) => d.id === id);
  if (!doc || !canAccessDoc(doc, actor)) return null;
  return doc;
}

export async function createDocument(input: { title?: string; scope: WorkspaceScope; folderId?: string | null; content?: unknown; workspaceId?: string | null }, actor: WsActor) {
  const content = input.content ?? EMPTY_DOC;
  const ts = now();
  const doc: WorkspaceDocument = {
    id: genId("wsd"), title: input.title?.trim() || "Untitled", description: null, scope: input.scope,
    folder_id: input.folderId || null, workspace_id: input.workspaceId || DEFAULT_WORKSPACE_ID,
    owner_id: actor.id, owner_name: actor.name, content_json: content, plain_text: extractPlainText(content),
    status: "active", favorite_user_ids: [], collaborators: [], created_by: actor.id, updated_by: actor.id,
    updated_by_name: actor.name, created_at: ts, updated_at: ts, archived_at: null, deleted_at: null,
  };
  await upsertRecords("ws_documents", [asRec(doc)]);
  return { id: doc.id };
}

export async function updateDocument(id: string, input: { title?: string; content?: unknown; folderId?: string | null; scope?: WorkspaceScope; status?: string }, actor: WsActor) {
  const doc = (await allDocs()).find((d) => d.id === id);
  if (!doc) throw new Error("Document not found.");
  const next = { ...doc, updated_by: actor.id, updated_by_name: actor.name, updated_at: now() };
  if (typeof input.title === "string" && input.title.trim()) next.title = input.title.trim();
  if (input.content !== undefined) { next.content_json = input.content; next.plain_text = extractPlainText(input.content); }
  if (input.folderId !== undefined) next.folder_id = input.folderId || null;
  if (input.scope) next.scope = input.scope;
  if (input.status) { next.status = input.status; next.archived_at = input.status === "archived" ? now() : null; }
  await upsertRecords("ws_documents", [asRec(next)]);
  return { id };
}

export async function deleteDocument(id: string) {
  const doc = (await allDocs()).find((d) => d.id === id);
  if (doc) await upsertRecords("ws_documents", [asRec({ ...doc, deleted_at: now() })]);
  return { id };
}

export async function toggleFavorite(actorId: string, documentId: string, on: boolean) {
  const doc = (await allDocs()).find((d) => d.id === documentId);
  if (!doc) return { documentId, favorite: on };
  const set = new Set(doc.favorite_user_ids ?? []);
  if (on) set.add(actorId); else set.delete(actorId);
  await upsertRecords("ws_documents", [asRec({ ...doc, favorite_user_ids: [...set] })]);
  return { documentId, favorite: on };
}

// ── Sharing ────────────────────────────────────────────────────────────────────

export async function getSharing(documentId: string, actor: WsActor): Promise<{ collaborators: WorkspaceCollaborator[]; users: ShareableUser[] }> {
  const [doc, users] = await Promise.all([(await allDocs()).find((d) => d.id === documentId), listPeople(actor)]);
  const byId = new Map(users.map((u) => [u.id, u]));
  const collaborators: WorkspaceCollaborator[] = ((doc?.collaborators ?? []) as Collaborator[]).map((c) => {
    const u = byId.get(c.user_id);
    return { id: c.user_id, user_id: c.user_id, name: u?.name ?? "Unknown", email: u?.email ?? null, permission: c.permission };
  });
  return { collaborators, users };
}

export async function addCollaborator(documentId: string, userId: string, permission = "editor") {
  const doc = (await allDocs()).find((d) => d.id === documentId);
  if (!doc) return { documentId, userId };
  const collaborators = (doc.collaborators ?? []).filter((c) => c.user_id !== userId);
  collaborators.push({ user_id: userId, permission });
  await upsertRecords("ws_documents", [asRec({ ...doc, collaborators })]);
  return { documentId, userId };
}

export async function removeCollaborator(documentId: string, userId: string) {
  const doc = (await allDocs()).find((d) => d.id === documentId);
  if (!doc) return { documentId, userId };
  await upsertRecords("ws_documents", [asRec({ ...doc, collaborators: (doc.collaborators ?? []).filter((c) => c.user_id !== userId) })]);
  return { documentId, userId };
}

// ── Search + linkable docs ─────────────────────────────────────────────────────

export async function searchDocuments(actor: WsActor, q: string): Promise<SearchResult[]> {
  const term = q.trim();
  if (!term) return [];
  const lower = term.toLowerCase();
  const [docs, folders] = await Promise.all([allDocs(), listRecords("ws_folders")]);
  const folderName = new Map((folders as unknown as WorkspaceFolder[]).map((f) => [f.id, f.name]));
  const out: SearchResult[] = [];
  for (const d of docs) {
    if (!canAccessDoc(d, actor)) continue;
    const hay = `${d.title} ${d.plain_text ?? ""}`.toLowerCase();
    if (!hay.includes(lower)) continue;
    const text = d.plain_text ?? "";
    const idx = text.toLowerCase().indexOf(lower);
    const snippet = idx >= 0 ? `${idx > 20 ? "…" : ""}${text.slice(Math.max(0, idx - 20), idx + 80)}…` : text.slice(0, 90) || null;
    out.push({ id: d.id, title: d.title, folder_name: d.folder_id ? folderName.get(d.folder_id) ?? null : null, scope: d.scope, updated_at: d.updated_at, snippet });
  }
  return out.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || "")).slice(0, 40);
}

export async function listLinkableDocuments(actor: WsActor, q: string, workspaceId?: string): Promise<LinkableDoc[]> {
  const [docs, spaces] = await Promise.all([allDocs(), listWorkspaces()]);
  const spaceName = new Map(spaces.map((s) => [s.id, s.name]));
  const term = q.trim().toLowerCase();
  return docs
    .filter((d) => canAccessDoc(d, actor) && d.status !== "archived")
    .filter((d) => !workspaceId || d.workspace_id === workspaceId)
    .filter((d) => !term || (d.title || "").toLowerCase().includes(term))
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))
    .slice(0, 40)
    .map((d) => ({ id: d.id, title: d.title || "Untitled", owner_name: d.owner_name, created_at: d.created_at, workspace_id: d.workspace_id, workspace_name: spaceName.get(d.workspace_id) ?? null }));
}

// ── Comments ───────────────────────────────────────────────────────────────────

export async function listComments(documentId: string): Promise<WorkspaceComment[]> {
  const rows = (await listRecords("ws_comments")) as unknown as WorkspaceComment[];
  return rows.filter((c) => c.document_id === documentId).sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
}

export async function createComment(input: { documentId: string; body: string; quote?: string | null; parentId?: string | null; mentionedUserIds?: string[] }, actor: WsActor) {
  if (!input.body?.trim()) throw new Error("Comment body is required.");
  const comment: WorkspaceComment = {
    id: genId("wsc"), document_id: input.documentId, parent_id: input.parentId || null,
    author_id: actor.id, author_name: actor.name, body: input.body.trim(), quote: input.quote?.trim() || null,
    mentioned_user_ids: input.mentionedUserIds ?? [], resolved_at: null, created_at: now(),
  };
  await upsertRecords("ws_comments", [asRec(comment)]);
  return { id: comment.id };
}

export async function setCommentResolved(id: string, resolved: boolean) {
  const rows = (await listRecords("ws_comments")) as unknown as WorkspaceComment[];
  const c = rows.find((x) => x.id === id);
  if (c) await upsertRecords("ws_comments", [asRec({ ...c, resolved_at: resolved ? now() : null })]);
  return { id, resolved };
}

export async function deleteComment(id: string) {
  const rows = (await listRecords("ws_comments")) as unknown as WorkspaceComment[];
  const replies = rows.filter((c) => c.parent_id === id).map((c) => c.id);
  await Promise.all([id, ...replies].map((rid) => deleteRecord("ws_comments", rid)));
  return { id };
}

// ── Template prefs (hidden + favorites), stored in the settings collection ──────

type WsPrefs = { hiddenTemplateIds: string[]; favoriteTemplateIds: Record<string, string[]> };
const PREFS_ID = "workspace-prefs";

async function loadPrefs(): Promise<WsPrefs> {
  const rows = await listRecords("settings");
  const rec = rows.find((r) => r.id === PREFS_ID) as (WsPrefs & { id: string }) | undefined;
  return { hiddenTemplateIds: rec?.hiddenTemplateIds ?? [], favoriteTemplateIds: rec?.favoriteTemplateIds ?? {} };
}
async function savePrefs(prefs: WsPrefs) {
  await upsertRecords("settings", [asRec({ id: PREFS_ID, ...prefs })]);
}

export async function listHiddenTemplateIds(): Promise<string[]> {
  return (await loadPrefs()).hiddenTemplateIds;
}
export async function listFavoriteTemplateIds(userId: string): Promise<string[]> {
  return (await loadPrefs()).favoriteTemplateIds[userId] ?? [];
}
export async function hideTemplate(templateId: string, hidden: boolean) {
  const prefs = await loadPrefs();
  const set = new Set(prefs.hiddenTemplateIds);
  if (hidden) set.add(templateId); else set.delete(templateId);
  prefs.hiddenTemplateIds = [...set];
  await savePrefs(prefs);
  return { templateId };
}
export async function favoriteTemplate(userId: string, templateId: string, on: boolean) {
  const prefs = await loadPrefs();
  const set = new Set(prefs.favoriteTemplateIds[userId] ?? []);
  if (on) set.add(templateId); else set.delete(templateId);
  prefs.favoriteTemplateIds[userId] = [...set];
  await savePrefs(prefs);
  return { templateId, favorite: on };
}
