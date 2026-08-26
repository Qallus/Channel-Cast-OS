import { ensureShareToken, shareUrl } from "@/lib/server/invoice-share";

export const runtime = "nodejs";

// POST /api/invoices/share-link { id } → { url, token }
// Mints the public link on first use and reuses it afterwards, so a link
// already sent to a client never stops working.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  const id = body?.id?.trim();
  if (!id) return Response.json({ error: "No invoice id supplied." }, { status: 400 });

  const result = await ensureShareToken(id);
  if (!result) return Response.json({ error: "That invoice isn't saved yet, so it can't be shared." }, { status: 404 });

  return Response.json({ url: shareUrl(result.token), token: result.token });
}
