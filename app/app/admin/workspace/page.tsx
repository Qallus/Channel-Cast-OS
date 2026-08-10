import { redirect } from "next/navigation";

import { WorkspaceHome } from "@/components/workspace/workspace-home";
import { requireUser, AuthError } from "@/lib/server/require-user";
import { listDocuments, listFolders, listWorkspaces, listHiddenTemplateIds, listFavoriteTemplateIds, DEFAULT_WORKSPACE_ID, type WsActor } from "@/lib/workspace/store";
import { WORKSPACE_TEMPLATES } from "@/lib/workspace/templates";

export const metadata = { title: "Workspace · Channel Cast" };
export const dynamic = "force-dynamic";

export default async function WorkspacePage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  let user;
  try { user = await requireUser(); }
  catch (err) { if (err instanceof AuthError && err.status === 401) redirect("/login?next=/app/admin/workspace"); throw err; }
  if (!user.isAdmin) redirect("/app/admin");

  const actor: WsActor = { id: user.id, isAdmin: user.isAdmin, name: user.name, email: user.email };
  const { ws } = await searchParams;
  const workspaces = await listWorkspaces();
  const currentWorkspaceId = ws && workspaces.some((w) => w.id === ws) ? ws : (workspaces[0]?.id ?? DEFAULT_WORKSPACE_ID);

  const [{ mine, shared }, folders, hiddenTemplateIds, favoriteTemplateIds] = await Promise.all([
    listDocuments(actor, currentWorkspaceId),
    listFolders(actor, currentWorkspaceId),
    listHiddenTemplateIds(),
    listFavoriteTemplateIds(user.id),
  ]);

  return (
    <WorkspaceHome
      mine={mine}
      shared={shared}
      folders={folders}
      templates={WORKSPACE_TEMPLATES.map((t) => ({ id: t.id, name: t.name, description: t.description, category: t.category }))}
      hiddenTemplateIds={hiddenTemplateIds}
      favoriteTemplateIds={favoriteTemplateIds}
      workspaces={workspaces}
      currentWorkspaceId={currentWorkspaceId}
    />
  );
}
