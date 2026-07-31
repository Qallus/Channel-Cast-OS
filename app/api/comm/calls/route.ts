import { jsonError, ownedNumbers, twilioClient, twilioConfigured } from "@/lib/server/twilio";

export const runtime = "nodejs";

// GET /api/comm/calls[?voicemail=true&limit=50] — call history from Twilio.
export async function GET(request: Request) {
  if (!twilioConfigured()) return jsonError("Twilio not configured.", 501);

  const url = new URL(request.url);
  const voicemailOnly = url.searchParams.get("voicemail") === "true";
  const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 100);

  const client = twilioClient();
  const numbers = ownedNumbers();

  // Inbound (to any owned number) + outbound (from any owned number).
  const lists = await Promise.all([
    ...numbers.map((n) => client.calls.list({ to: n, limit })),
    ...numbers.map((n) => client.calls.list({ from: n, limit })),
  ]);

  const seen = new Set<string>();
  const calls = lists
    .flat()
    .filter((c) => (seen.has(c.sid) ? false : (seen.add(c.sid), true)))
    .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
    .slice(0, limit)
    .map((call) => ({
      sid: call.sid,
      to: call.to,
      from: call.from,
      status: call.status,
      direction: call.direction,
      duration: call.duration,
      price: call.price,
      priceUnit: call.priceUnit,
      dateCreated: call.dateCreated,
      startTime: call.startTime,
      endTime: call.endTime,
    }));

  const result = voicemailOnly
    ? calls.filter((c) => c.direction?.includes("inbound") && (c.status === "no-answer" || c.status === "completed"))
    : calls;

  return Response.json({ calls: result });
}
