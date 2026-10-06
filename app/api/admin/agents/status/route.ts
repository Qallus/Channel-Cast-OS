// Health of all three agent services, for the AI Agents console.
// Each check proves authorization, not just that the host answered.
import { requireUser, AuthError } from "@/lib/server/require-user";
import { hermesHealth } from "@/lib/server/agents/hermes";
import { paperclipHealth } from "@/lib/server/agents/paperclip";
import { voiceHealth } from "@/lib/server/agents/voice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user.isAdmin) return Response.json({ error: "Admins only." }, { status: 403 });
  } catch (err) {
    const e = err as AuthError;
    return Response.json({ error: e.message }, { status: e.status ?? 401 });
  }

  // One slow service should not hold up the other two.
  const [hermes, paperclip, voice] = await Promise.all([hermesHealth(), paperclipHealth(), voiceHealth()]);
  return Response.json({ hermes, paperclip, voice });
}
