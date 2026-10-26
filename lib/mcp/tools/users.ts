import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { applyChange, deleteManagedUser, inviteUser, listManagedUsers, ROLES } from "@/lib/server/users-admin";
import { defineTool, ToolError, z, type ToolCtx } from "@/lib/mcp/define";

const roleArg = z.enum(ROLES as unknown as [string, ...string[]]);

export function registerUserTools(server: McpServer, ctx: ToolCtx) {
  // Machine keys act for the business, not a person, so they can read users
  // but user-management writes need a signed-in Super Admin.
  const actor = () => {
    if (ctx.caller.via !== "oauth") throw new ToolError("User management changes need a signed-in Super Admin (OAuth), not an API key.");
    return { userId: ctx.caller.userId, email: ctx.caller.email };
  };

  defineTool(server, ctx, "users_list", {
    title: "List dashboard users",
    description: "Lists Channel Cast dashboard accounts with role, access status (approved / pending / declined / blocked), suspension, last sign-in, linked contact and admin notes.",
    kind: "read",
    input: {
      status: z.enum(["all", "pending", "active", "suspended", "declined", "blocked"]).optional(),
      query: z.string().optional().describe("Match email, contact name or notes."),
    },
  }, async ({ status = "all", query }) => {
    const q = query?.toLowerCase();
    return (await listManagedUsers()).filter((u) => {
      const s = u.access === "blocked" ? "blocked" : u.suspendedUntil ? "suspended" : u.access === "approved" ? "active" : u.access;
      if (status !== "all" && s !== status) return false;
      return !q || `${u.email} ${u.contactName || ""} ${u.note}`.toLowerCase().includes(q);
    });
  });

  defineTool(server, ctx, "user_invite", {
    title: "Invite a dashboard user",
    description: "Emails an invitation to a new dashboard user with the given role. They are approved on arrival.",
    kind: "outbound",
    input: { email: z.string().email(), role: roleArg.optional(), contactId: z.string().optional(), contactName: z.string().optional() },
  }, async (args) => inviteUser(args, actor()));

  defineTool(server, ctx, "user_manage", {
    title: "Change a user's access or role",
    description: "Approve, decline, block, unblock, suspend (for `days`), lift a suspension, revoke access, or send a sign-in link to a dashboard user. Can also change `role` or set an admin `note`. Owner accounts and your own account can't be restricted.",
    kind: "destructive",
    input: {
      id: z.string().describe("User id from users_list."),
      action: z.enum(["approve", "decline", "block", "unblock", "suspend", "unsuspend", "revoke", "send_link"]).optional(),
      reason: z.string().optional().describe("Internal reason for decline / block / suspend."),
      days: z.number().int().min(1).max(365).optional().describe("Suspension length; default 7."),
      role: roleArg.optional(),
      note: z.string().optional(),
    },
  }, async ({ id, ...body }) => applyChange(id, body, actor()));

  defineTool(server, ctx, "user_delete", {
    title: "Delete a dashboard user",
    description: "Permanently deletes a dashboard account. This frees the email to sign up again — use user_manage with action \"block\" to keep someone out instead.",
    kind: "destructive",
    input: { id: z.string() },
  }, async ({ id }) => {
    await deleteManagedUser(id, actor());
    return { deleted: true, id };
  });
}
