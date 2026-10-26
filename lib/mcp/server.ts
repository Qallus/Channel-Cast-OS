import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { McpCaller } from "@/lib/mcp/auth";
import { registerCommTools } from "@/lib/mcp/tools/comms";
import { registerCrmTools } from "@/lib/mcp/tools/crm";
import { registerOpsTools } from "@/lib/mcp/tools/ops";
import { registerUserTools } from "@/lib/mcp/tools/users";

const INSTRUCTIONS = `Channel Cast runs location-based audio and display advertising: devices (players and screens) at venues, advertisers and campaigns, a CRM (contacts, leads, deals, quotes, invoices, bookings), and communications (Twilio calls and SMS, Resend email, an xAI voice agent called Nicole).

Working rules:
- Look before you write: use crm_collections to learn field names, then crm_search / crm_get before crm_update.
- Anything that reaches a person outside the business (sms_send, email_send, ai_call_place, user_invite) should be confirmed with the user unless they already asked for exactly that message.
- File outcomes back: after a call, meeting or message, log it against the contact (comm_log or meeting_notes_save) so the dashboard timeline stays complete.
- Plaud recordings: read them with the Plaud connector (list_files, get_note, get_transcript), match the people to CRM contacts, then save with meeting_notes_save (pass sourceId so the same recording isn't filed twice).
- crm_delete keeps a restorable copy (crm_trash / crm_restore). Every tool call is audit-logged (mcp_audit_log).`;

export function buildServer(caller: McpCaller): McpServer {
  const server = new McpServer({ name: "channel-cast", title: "Channel Cast", version: "1.0.0" }, { instructions: INSTRUCTIONS });
  const ctx = { caller };
  registerCrmTools(server, ctx);
  registerCommTools(server, ctx);
  registerUserTools(server, ctx);
  registerOpsTools(server, ctx);
  return server;
}
