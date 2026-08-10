// Collaborative Workspace types, adapted for Channel Cast's JSONB CRM store.
// A document's Plate value lives in `content_json`; `plain_text` is derived for search.

export type WorkspaceScope = "personal" | "shared";

export type WorkspaceSpace = { id: string; name: string; icon: string | null; created_by?: string | null; created_at?: string };

export type WorkspaceFolder = {
  id: string;
  name: string;
  scope: WorkspaceScope;
  owner_id: string | null;
  parent_id: string | null;
  workspace_id: string;
  created_at: string;
  archived_at?: string | null;
};

export type Collaborator = { user_id: string; permission: string };

// Stored document record (collection "ws_documents").
export type WorkspaceDocument = {
  id: string;
  title: string;
  description: string | null;
  scope: WorkspaceScope;
  folder_id: string | null;
  workspace_id: string;
  owner_id: string | null;
  owner_name: string | null;
  content_json: unknown;
  plain_text: string;
  status: string;
  favorite_user_ids: string[];
  collaborators: Collaborator[];
  created_by: string | null;
  updated_by: string | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
};

export type WorkspaceDocListItem = {
  id: string;
  title: string;
  description: string | null;
  scope: WorkspaceScope;
  folder_id: string | null;
  folder_name: string | null;
  owner_id: string | null;
  owner_name: string | null;
  status: string;
  updated_at: string;
  updated_by_name: string | null;
  is_favorite: boolean;
};

export type WorkspaceComment = {
  id: string;
  document_id: string;
  parent_id: string | null;
  author_id: string | null;
  author_name: string | null;
  body: string;
  quote: string | null;
  mentioned_user_ids: string[];
  resolved_at: string | null;
  created_at: string;
};

export type MentionUser = { id: string; name: string };
export type ShareableUser = { id: string; name: string; email: string | null };
export type WorkspaceCollaborator = { id: string; user_id: string; name: string; email: string | null; permission: string };

export type SearchResult = { id: string; title: string; folder_name: string | null; scope: string; updated_at: string; snippet: string | null };
export type LinkableDoc = { id: string; title: string; owner_name: string | null; created_at: string; workspace_id: string | null; workspace_name: string | null };

/** Empty Plate value (one empty paragraph). */
export const EMPTY_DOC: unknown[] = [{ type: "p", children: [{ text: "" }] }];

/** Flatten Plate/Slate nodes to plain text (for search + previews). */
export function extractPlainText(nodes: unknown): string {
  const out: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walk = (n: any) => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (n && typeof n === "object") {
      if (typeof n.text === "string") out.push(n.text);
      if (Array.isArray(n.children)) n.children.forEach(walk);
    }
  };
  walk(nodes);
  return out.join(" ").replace(/\s+/g, " ").trim();
}
