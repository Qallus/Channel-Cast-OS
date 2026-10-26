import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { enqueueCommand, getDeviceById, listDevices, liveStatus, recentActivity, type Device } from "@/lib/server/db";
import { hermesAsk, hermesHealth } from "@/lib/server/agents/hermes";
import { createTask, listTasks, paperclipHealth } from "@/lib/server/agents/paperclip";
import { voiceHealth } from "@/lib/server/agents/voice";
import { listAudit } from "@/lib/mcp/audit";
import { defineTool, ToolError, z, type ToolCtx } from "@/lib/mcp/define";

// Never hand a device's secret token to the model.
const safeDevice = (d: Device) => {
  const { deviceToken: _t, ...rest } = d;
  return { ...rest, liveStatus: liveStatus(d) };
};

export function registerOpsTools(server: McpServer, ctx: ToolCtx) {
  /* ── devices ─────────────────────────────────────────────────────── */

  defineTool(server, ctx, "devices_list", {
    title: "List devices",
    description: "Channel Cast audio players and displays with live online/offline status, location, volume and group.",
    kind: "read",
    input: { status: z.enum(["all", "online", "offline"]).optional(), query: z.string().optional() },
  }, async ({ status = "all", query }) => {
    const q = query?.toLowerCase();
    return (await listDevices()).map(safeDevice).filter((d) =>
      (status === "all" || d.liveStatus === status) && (!q || `${d.name} ${d.locationName || ""} ${d.deviceCode}`.toLowerCase().includes(q)));
  });

  defineTool(server, ctx, "device_get", {
    title: "Get a device",
    description: "One device with its recent heartbeats, playback and current deployment.",
    kind: "read",
    input: { id: z.string() },
  }, async ({ id }) => {
    const d = await getDeviceById(id);
    if (!d) throw new ToolError(`No device "${id}".`);
    return { device: safeDevice(d), activity: await recentActivity(id) };
  });

  defineTool(server, ctx, "device_command", {
    title: "Send a device command",
    description: "Queue a command for a player; it runs on the device's next heartbeat (within about a minute). set_volume {volume 0-100}; set_power / set_motion {enabled}; test_play {url, name?}; stop; next.",
    kind: "write",
    input: {
      id: z.string(),
      type: z.enum(["set_volume", "set_power", "set_motion", "test_play", "stop", "next"]),
      volume: z.number().int().min(0).max(100).optional(),
      enabled: z.boolean().optional(),
      url: z.string().url().optional(),
      name: z.string().optional(),
    },
  }, async ({ id, type, volume, enabled, url, name }) => {
    if (!(await getDeviceById(id))) throw new ToolError(`No device "${id}".`);
    const payload: Record<string, unknown> = {};
    if (type === "set_volume") { if (volume == null) throw new ToolError("set_volume needs volume."); payload.volume = volume; }
    if (type === "set_power" || type === "set_motion") { if (enabled == null) throw new ToolError(`${type} needs enabled.`); payload.enabled = enabled; }
    if (type === "test_play") { if (!url) throw new ToolError("test_play needs url."); payload.url = url; if (name) payload.name = name; }
    return { queued: true, command: await enqueueCommand(id, type, payload) };
  });

  /* ── AI agents ───────────────────────────────────────────────────── */

  defineTool(server, ctx, "agents_status", {
    title: "AI agent health",
    description: "Whether Hermes (Ollie), Paperclip and the xAI voice agent are configured and reachable.",
    kind: "read",
    input: {},
  }, async () => {
    const [hermes, paperclip, voice] = await Promise.allSettled([hermesHealth(), paperclipHealth(), voiceHealth()]);
    const v = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : { error: (r.reason as Error)?.message });
    return { hermes: v(hermes), paperclip: v(paperclip), xaiVoice: v(voice) };
  });

  defineTool(server, ctx, "hermes_ask", {
    title: "Ask Hermes (Ollie)",
    description: "Send a prompt to the Hermes agent (Ollie) running on hermesagent.channelcast.io and return its reply. Use for work Ollie owns — its own skills, memory and tools.",
    kind: "write",
    input: { prompt: z.string().min(1), system: z.string().optional() },
  }, async ({ prompt, system }) => ({ reply: await hermesAsk({ prompt, system }) }));

  defineTool(server, ctx, "paperclip_tasks", {
    title: "List Paperclip tasks",
    description: "Recent tasks (issues) in the Channel Cast company on Paperclip, the agent manager.",
    kind: "read",
    input: { limit: z.number().int().min(1).max(100).optional() },
  }, async ({ limit = 25 }) => listTasks(limit));

  defineTool(server, ctx, "paperclip_task_create", {
    title: "Create a Paperclip task",
    description: "Assign work to the Paperclip agent team. Creates one task (never retried, so no duplicates).",
    kind: "write",
    input: {
      title: z.string().min(1),
      description: z.string().min(1),
      priority: z.enum(["critical", "high", "medium", "low"]).optional(),
      status: z.enum(["backlog", "todo"]).optional(),
      recordId: z.string().optional().describe("CRM record this task is about, if any."),
    },
  }, async ({ title, description, priority, status, recordId }) =>
    createTask({ title, description, priority, status, source: "claude", recordId: recordId || `${Date.now()}` }));

  /* ── audit ───────────────────────────────────────────────────────── */

  defineTool(server, ctx, "mcp_audit_log", {
    title: "Connector audit log",
    description: "What has been done through this Channel Cast connector: tool, caller, arguments, success, newest first.",
    kind: "read",
    input: { limit: z.number().int().min(1).max(500).optional(), tool: z.string().optional() },
  }, async ({ limit = 50, tool }) => listAudit(limit, tool));
}
