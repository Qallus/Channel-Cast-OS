import { notFound, redirect } from "next/navigation";

import { WorkspaceEditor } from "@/components/workspace/workspace-editor";
import { requireUser, AuthError } from "@/lib/server/require-user";
import { getDocument, listDocuments, listFolders, listComments, listMentionableUsers, DEFAULT_WORKSPACE_ID, type WsActor } from "@/lib/workspace/store";

export const dynamic = "force-dynamic";

export default async function WorkspaceDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try { user = await requireUser(); }
  catch (err) { if (err instanceof AuthError && err.status === 401) redirect(`/login?next=/app/admin/workspace/${id}`); throw err; }
  if (!user.isAdmin) redirect("/app/admin");

  const actor: WsActor = { id: user.id, isAdmin: user.isAdmin, name: user.name, email: user.email };
  const doc = await getDocument(id, actor);
  if (!doc) notFound();
  const workspaceId = doc.workspace_id ?? DEFAULT_WORKSPACE_ID;

  const [{ mine, shared }, folders, comments, mentionable] = await Promise.all([
    listDocuments(actor, workspaceId),
    listFolders(actor, workspaceId),
    listComments(id),
    listMentionableUsers(actor),
  ]);

  const navDocs = [...mine, ...shared].map((d) => ({ id: d.id, title: d.title, is_favorite: d.is_favorite, folder_name: d.folder_name }));

  return (
    <WorkspaceEditor
      doc={{ id: doc.id, title: doc.title, content_json: doc.content_json, scope: doc.scope, updated_at: doc.updated_at }}
      navDocs={navDocs}
      folders={folders.map((f) => ({ id: f.id, name: f.name }))}
      comments={comments}
      mentionable={mentionable}
      workspaceId={workspaceId}
    />
  );
}
