import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { CRM_COLLECTIONS, deleteRecord, getRecord, isCrmCollection, listRecords, upsertRecords, type CrmCollection } from "@/lib/server/crm-db";
import { supabaseAdmin } from "@/lib/server/supabase";
import { defineTool, ToolError, z, type ToolCtx } from "@/lib/mcp/define";

type Rec = { id: string } & Record<string, unknown>;

// Deleted records are copied here first so crm_restore can bring them back.
const TRASH = "mcp_trash";

const collectionArg = z.enum(CRM_COLLECTIONS as unknown as [CrmCollection, ...CrmCollection[]]);

function need(collection: string): CrmCollection {
  if (!isCrmCollection(collection)) throw new ToolError(`Unknown collection "${collection}".`);
  return collection;
}

const rid = () => (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));

function pick(r: Rec, fields?: string[]) {
  if (!fields?.length) return r;
  return Object.fromEntries([["id", r.id], ...fields.map((f) => [f, r[f]])]);
}

const norm = (v: unknown) => (v == null ? "" : String(v)).toLowerCase();

export function registerCrmTools(server: McpServer, ctx: ToolCtx) {
  defineTool(server, ctx, "crm_collections", {
    title: "List CRM collections",
    description: "Lists every Channel Cast CRM collection with its record count and the field names seen in it. Call this first to learn the shape of contacts, deals, invoices, bookings, etc. before searching or writing.",
    kind: "read",
    input: {},
  }, async () => {
    const { data, error } = await supabaseAdmin().from("crm_records").select("collection, data").in("collection", CRM_COLLECTIONS as unknown as string[]);
    if (error) throw error;
    const byCol = new Map<string, { count: number; fields: Set<string> }>();
    for (const c of CRM_COLLECTIONS) byCol.set(c, { count: 0, fields: new Set() });
    for (const row of data ?? []) {
      const e = byCol.get(row.collection as string);
      if (!e) continue;
      e.count++;
      if (e.fields.size < 60) Object.keys((row.data as Rec) || {}).forEach((k) => e.fields.add(k));
    }
    return [...byCol.entries()].map(([collection, e]) => ({ collection, count: e.count, fields: [...e.fields].sort() }));
  });

  defineTool(server, ctx, "crm_search", {
    title: "Search CRM records",
    description: "Search one CRM collection. `query` matches text anywhere in a record; `where` matches fields exactly (case-insensitive), e.g. {\"status\":\"open\",\"contactId\":\"ct_1234\"}. Returns newest-updated first unless `sortBy` is given.",
    kind: "read",
    input: {
      collection: collectionArg,
      query: z.string().optional().describe("Free text to match anywhere in the record."),
      where: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().describe("Exact field matches."),
      sortBy: z.string().optional().describe("Field to sort by, e.g. createdAt or amount."),
      sortDir: z.enum(["asc", "desc"]).optional(),
      fields: z.array(z.string()).optional().describe("Only return these fields (id is always included)."),
      limit: z.number().int().min(1).max(200).optional().describe("Default 25."),
      offset: z.number().int().min(0).optional(),
    },
  }, async ({ collection, query, where, sortBy, sortDir, fields, limit = 25, offset = 0 }) => {
    let rows = await listRecords(need(collection));
    if (where) rows = rows.filter((r) => Object.entries(where).every(([k, v]) => norm(r[k]) === norm(v)));
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
    }
    if (sortBy) {
      const dir = sortDir === "asc" ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const x = a[sortBy], y = b[sortBy];
        if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
        return norm(x).localeCompare(norm(y)) * dir;
      });
    }
    return { total: rows.length, offset, records: rows.slice(offset, offset + limit).map((r) => pick(r, fields)) };
  });

  defineTool(server, ctx, "crm_get", {
    title: "Get a CRM record",
    description: "Fetch one CRM record by collection and id.",
    kind: "read",
    input: { collection: collectionArg, id: z.string() },
  }, async ({ collection, id }) => {
    const r = await getRecord(need(collection), id);
    if (!r) throw new ToolError(`No ${collection} record with id "${id}".`);
    return r;
  });

  defineTool(server, ctx, "crm_create", {
    title: "Create a CRM record",
    description: "Create a record in a CRM collection. Match the field names already used in that collection (see crm_collections). An id is generated unless you pass one; createdAt/updatedAt are set automatically.",
    kind: "write",
    input: {
      collection: collectionArg,
      record: z.record(z.unknown()).describe("The record's fields."),
    },
  }, async ({ collection, record }) => {
    const col = need(collection);
    const id = typeof record.id === "string" && record.id ? record.id : `${col.slice(0, 3)}_${rid()}`;
    if (await getRecord(col, id)) throw new ToolError(`A ${col} record with id "${id}" already exists. Use crm_update.`);
    const now = new Date().toISOString();
    const rec: Rec = { createdAt: now, ...record, id, updatedAt: now };
    await upsertRecords(col, [rec]);
    return rec;
  });

  defineTool(server, ctx, "crm_update", {
    title: "Update a CRM record",
    description: "Change fields on an existing CRM record. Only the fields in `changes` are touched; list field names in `remove` to delete them. Returns the updated record.",
    kind: "write",
    input: {
      collection: collectionArg,
      id: z.string(),
      changes: z.record(z.unknown()).describe("Fields to set."),
      remove: z.array(z.string()).optional().describe("Field names to delete."),
    },
  }, async ({ collection, id, changes, remove }) => {
    const col = need(collection);
    const cur = await getRecord(col, id);
    if (!cur) throw new ToolError(`No ${col} record with id "${id}".`);
    const next: Rec = { ...cur, ...changes, id, updatedAt: new Date().toISOString() };
    for (const k of remove ?? []) if (k !== "id") delete next[k];
    await upsertRecords(col, [next]);
    return next;
  });

  defineTool(server, ctx, "crm_delete", {
    title: "Delete a CRM record",
    description: "Delete a CRM record. A copy is kept in the trash, so crm_restore can undo it.",
    kind: "destructive",
    input: { collection: collectionArg, id: z.string() },
  }, async ({ collection, id }) => {
    const col = need(collection);
    const cur = await getRecord(col, id);
    if (!cur) throw new ToolError(`No ${col} record with id "${id}".`);
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin().from("crm_records").upsert(
      { collection: TRASH, id: `${col}:${id}`, data: { id: `${col}:${id}`, collection: col, record: cur, deletedAt: now, deletedBy: ctx.caller.email }, updated_at: now },
      { onConflict: "collection,id" },
    );
    if (error) throw error;
    await deleteRecord(col, id);
    return { deleted: true, collection: col, id, restorable: true };
  });

  defineTool(server, ctx, "crm_trash", {
    title: "List deleted CRM records",
    description: "Lists CRM records deleted through this connector, newest first, so they can be restored.",
    kind: "read",
    input: { limit: z.number().int().min(1).max(200).optional() },
  }, async ({ limit = 25 }) => {
    const { data, error } = await supabaseAdmin().from("crm_records").select("data").eq("collection", TRASH).order("updated_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => {
      const d = r.data as { collection: string; record: Rec; deletedAt: string; deletedBy: string };
      return { collection: d.collection, id: d.record?.id, name: d.record?.name ?? d.record?.title ?? d.record?.company ?? null, deletedAt: d.deletedAt, deletedBy: d.deletedBy };
    });
  });

  defineTool(server, ctx, "crm_restore", {
    title: "Restore a deleted CRM record",
    description: "Bring back a record removed with crm_delete.",
    kind: "write",
    input: { collection: collectionArg, id: z.string() },
  }, async ({ collection, id }) => {
    const col = need(collection);
    const key = `${col}:${id}`;
    const { data, error } = await supabaseAdmin().from("crm_records").select("data").eq("collection", TRASH).eq("id", key).maybeSingle();
    if (error) throw error;
    const rec = (data?.data as { record?: Rec } | undefined)?.record;
    if (!rec) throw new ToolError(`Nothing in the trash for ${col} "${id}".`);
    if (await getRecord(col, id)) throw new ToolError(`A ${col} record with id "${id}" exists again; not overwriting it.`);
    await upsertRecords(col, [rec]);
    await supabaseAdmin().from("crm_records").delete().eq("collection", TRASH).eq("id", key);
    return { restored: true, record: rec };
  });
}
