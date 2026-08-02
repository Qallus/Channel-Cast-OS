import { enqueueCommand, liveStatus, listDevices } from "@/lib/server/db";

export const runtime = "nodejs";

const SYSTEM =
  "You are the Channel Cast assistant — an operator's copilot for a motion-based audio advertising network. " +
  "Help with clients, advertisers, campaigns, devices, calls/SMS, billing, and navigating the dashboard. Be concise and practical. " +
  "You can control players with the provided tools. Rules for device control: " +
  "1) Always call list_devices first to resolve which device the user means (match on name or code, case-insensitive). " +
  "2) A command only reaches a device that is currently ONLINE — the on-site agent picks it up on its next check-in. " +
  "If the target device is OFFLINE, do NOT claim you turned it on. Explain that the player isn't connected right now, " +
  "so the command can't reach it, and that it needs to be powered on / signed in on-site (or the agent restarted) before cloud controls work. " +
  "You may still queue the command so it applies the moment it reconnects — if you do, say so plainly. " +
  "3) 'Turn on' means set_power on (resume playback); it does NOT physically power a machine that is off.";

type Msg = { role: "user" | "assistant"; content: unknown };

const TOOLS = [
  {
    name: "list_devices",
    description: "List all players with their name, code, and whether they're online right now. Call this first to resolve which device the user means.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "control_device",
    description:
      "Queue a control command for one device. It's delivered on the device's next check-in, so it only takes effect while the device is online.",
    input_schema: {
      type: "object",
      properties: {
        device: { type: "string", description: "Device name or code (e.g. 'Mini PC' or 'CC-AV-SNHN')." },
        action: {
          type: "string",
          enum: ["on", "off", "play", "stop", "next", "volume", "camera_on", "camera_off"],
          description: "on/off = resume/pause playback; play = test-play now; volume needs value 0-100.",
        },
        value: { type: "number", description: "Only for action=volume: 0-100." },
      },
      required: ["device", "action"],
    },
  },
];

async function runTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  if (name === "list_devices") {
    const devices = await listDevices();
    return {
      devices: devices.map((d) => ({ name: d.name, code: d.deviceCode, online: liveStatus(d) === "online" })),
    };
  }
  if (name === "control_device") {
    const devices = await listDevices();
    const q = String(input.device || "").trim().toLowerCase();
    const dev =
      devices.find((d) => d.deviceCode?.toLowerCase() === q) ||
      devices.find((d) => d.name?.toLowerCase() === q) ||
      devices.find((d) => d.name?.toLowerCase().includes(q) || d.deviceCode?.toLowerCase().includes(q));
    if (!dev) return { error: `No device matching "${input.device}". Ask the user to check the name.` };

    const action = String(input.action);
    const map: Record<string, { type: string; payload: Record<string, unknown> }> = {
      on: { type: "set_power", payload: { enabled: true } },
      off: { type: "set_power", payload: { enabled: false } },
      play: { type: "test_play", payload: {} },
      stop: { type: "stop", payload: {} },
      next: { type: "next", payload: {} },
      camera_on: { type: "set_motion", payload: { enabled: true } },
      camera_off: { type: "set_motion", payload: { enabled: false } },
      volume: { type: "set_volume", payload: { volume: Math.max(0, Math.min(100, Number(input.value) || 0)) } },
    };
    const c = map[action];
    if (!c) return { error: `Unknown action "${action}".` };

    await enqueueCommand(dev.id, c.type, c.payload);
    const online = liveStatus(dev) === "online";
    return {
      queued: true,
      device: dev.name,
      action,
      online,
      note: online
        ? "Device is online — it will apply within a few seconds."
        : "Device is OFFLINE — the command is queued but will NOT take effect until the player reconnects (powered on and signed in on-site).",
    };
  }
  return { error: "Unknown tool." };
}

// POST /api/agent/chat { messages } → { reply }. Claude with device-control tools.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { messages?: Msg[] } | null;
  const incoming = (body?.messages || []).filter((m) => m && m.content);
  if (!incoming.length) return Response.json({ error: "No message." }, { status: 400 });

  const anthropic = process.env.ANTHROPIC_API_KEY;
  const openai = process.env.OPENAI_API_KEY;

  try {
    if (anthropic) {
      // Normalize prior turns (which may be plain strings) into Claude content blocks.
      const messages: { role: string; content: unknown }[] = incoming.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: typeof m.content === "string" ? m.content : m.content,
      }));

      for (let hop = 0; hop < 5; hop++) {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": anthropic, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 1024, system: SYSTEM, tools: TOOLS, messages }),
        });
        const data = await res.json();
        if (!res.ok) return Response.json({ error: data?.error?.message || "Claude request failed." }, { status: 502 });

        const blocks: { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }[] = data.content || [];
        const toolUses = blocks.filter((b) => b.type === "tool_use");

        if (data.stop_reason !== "tool_use" || !toolUses.length) {
          const reply = blocks.map((b) => (b.type === "text" ? b.text || "" : "")).join("").trim();
          return Response.json({ reply, model: "claude-sonnet-5" });
        }

        // Run the requested tools and feed results back for another hop.
        messages.push({ role: "assistant", content: blocks });
        const results = [];
        for (const t of toolUses) {
          const out = await runTool(t.name || "", t.input || {});
          results.push({ type: "tool_result", tool_use_id: t.id, content: JSON.stringify(out) });
        }
        messages.push({ role: "user", content: results });
      }
      return Response.json({ reply: "I wasn't able to finish that action — please try again.", model: "claude-sonnet-5" });
    }

    if (openai) {
      const flat = incoming.map((m) => ({ role: m.role, content: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }));
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${openai}` },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: SYSTEM }, ...flat] }),
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data?.error?.message || "OpenAI request failed." }, { status: 502 });
      return Response.json({ reply: data.choices?.[0]?.message?.content?.trim() || "", model: "gpt-4o-mini" });
    }

    return Response.json({ error: "No AI key configured. Add ANTHROPIC_API_KEY or OPENAI_API_KEY." }, { status: 501 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Agent error." }, { status: 500 });
  }
}
