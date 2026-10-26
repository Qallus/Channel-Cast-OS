# Channel Cast MCP connector

Lets Claude operate Channel Cast: CRM, users, communications, devices and the AI agents.

- **Endpoint:** `https://os.channelcast.io/api/mcp` (Streamable HTTP, stateless)
- **Code:** `app/api/mcp/route.ts`, `lib/mcp/*` (tools in `lib/mcp/tools/`)
- **Sign-in:** OAuth 2.1 (PKCE + dynamic client registration). The consent screen is
  `/oauth/authorize` and uses the normal dashboard login; only Super Admins can approve.

## Connect

**claude.ai / Claude Desktop / mobile:** Settings → Connectors → Add custom connector →
name `Channel Cast`, URL `https://os.channelcast.io/api/mcp`. Leave the OAuth client ID and
secret blank (Claude registers itself). Sign in and click **Allow**.

**Claude Code:** `claude mcp add --transport http channel-cast https://os.channelcast.io/api/mcp`,
then run `/mcp` to sign in.

**Machine callers (Hermes, Paperclip, scripts):** set `MCP_API_TOKENS` on the app in Coolify as
`label:secret` pairs, comma-separated, each secret at least 32 characters
(`openssl rand -hex 32`). Callers send `Authorization: Bearer <secret>`. Machine keys can do
everything except change users.

**Plaud:** add Plaud's own connector ("Plaud Web MCP" in Claude's connector directory) next to
this one. Claude reads recordings there and files them here with `meeting_notes_save`.

## Tools

| Area | Tools |
|---|---|
| CRM (all 31 collections) | `crm_collections`, `crm_search`, `crm_get`, `crm_create`, `crm_update`, `crm_delete`, `crm_trash`, `crm_restore` |
| Communications | `comm_history`, `phone_numbers`, `sms_send`, `email_send`, `ai_call_place`, `comm_log`, `meeting_notes_save` |
| Users | `users_list`, `user_invite`, `user_manage`, `user_delete` |
| Devices | `devices_list`, `device_get`, `device_command` |
| Agents | `agents_status`, `hermes_ask`, `paperclip_tasks`, `paperclip_task_create` |
| Audit | `mcp_audit_log` |

Tools that reach people outside the business (SMS, email, calls, invites) are marked open-world
and deletes are marked destructive, so Claude asks before running them.

## Safety

- Every tool call is written to `crm_records` collection `mcp_audit` (read it with `mcp_audit_log`).
- `crm_delete` copies the record to `mcp_trash` first; `crm_restore` undoes it.
- Access tokens last 1 hour, refresh tokens 30 days and rotate on use. Tokens are stored only
  as SHA-256 hashes.
- Each call re-checks the account: blocking or demoting a user in User Management cuts off
  their connector immediately.
- OAuth rows (`mcp_oauth_*`), the audit log and the trash live in `crm_records` collections that
  are not in `CRM_COLLECTIONS`, so `/api/crm` can't reach them.

## Optional env

- `MCP_PUBLIC_ORIGIN` — override the origin used in OAuth metadata (default: the request host).
- `MCP_OAUTH_SECRET` — HMAC key for consent forms (default: derived from the Supabase service key).
- `MCP_API_TOKENS` — machine keys, see above.

## Not yet connected

- **OpenClaw** — no service or code in the app yet.
- **Slack** — no app code yet (only as a Hermes channel).
- **Finance workbook** — deliberately excluded; it holds personal tax data.
