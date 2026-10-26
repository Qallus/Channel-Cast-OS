import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z, type ZodRawShape } from "zod";

import type { McpCaller } from "@/lib/mcp/auth";
import { writeAudit } from "@/lib/mcp/audit";

export type ToolCtx = { caller: McpCaller };

type Kind = "read" | "write" | "destructive" | "outbound";

// Hints Claude uses to decide when to ask before running a tool. "outbound"
// reaches people outside the business (SMS, email, calls), so it's treated as
// non-idempotent and open-world.
const HINTS: Record<Kind, ToolAnnotations> = {
  read: { readOnlyHint: true, openWorldHint: false },
  write: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  destructive: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  outbound: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
};

export class ToolError extends Error {}

/**
 * Register one tool with audit logging and uniform error handling. The handler
 * returns plain data; it's sent back as pretty JSON.
 */
export function defineTool<S extends ZodRawShape>(
  server: McpServer,
  ctx: ToolCtx,
  name: string,
  spec: { title: string; description: string; kind: Kind; input: S },
  handler: (args: z.objectOutputType<S, z.ZodTypeAny>) => Promise<unknown>,
) {
  server.registerTool(
    name,
    { title: spec.title, description: spec.description, inputSchema: spec.input, annotations: { title: spec.title, ...HINTS[spec.kind] } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (async (args: any) => {
      const started = Date.now();
      try {
        const result = await handler(args);
        void writeAudit({ tool: name, caller: ctx.caller.email, via: ctx.caller.via, clientId: ctx.caller.clientId, args, ok: true, ms: Date.now() - started });
        return { content: [{ type: "text" as const, text: typeof result === "string" ? result : JSON.stringify(result, null, 2) }] };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        void writeAudit({ tool: name, caller: ctx.caller.email, via: ctx.caller.via, clientId: ctx.caller.clientId, args, ok: false, error: message, ms: Date.now() - started });
        return { isError: true, content: [{ type: "text" as const, text: message }] };
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  );
}

export { z };
