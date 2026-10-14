// POST multipart { file } (PDF statement, receipt photo, or text/CSV) → the
// transactions Claude read from it, for the import preview. Nothing is saved here.
import { financeUser, getProfile } from "@/lib/server/finance-db";
import { FinanceAiError, extractDocument } from "@/lib/server/finance-ai";
import { allowAgentAction } from "@/lib/server/agents/throttle";

export const runtime = "nodejs";
export const maxDuration = 300;

const IMAGE = /^image\/(png|jpe?g|webp|gif)$/;

export async function POST(request: Request) {
  const user = await financeUser();
  if (user instanceof Response) return user;
  const gate = allowAgentAction(user.id);
  if (!gate.ok) return Response.json({ error: `Too many requests at once. Try again in ${gate.retryAfterSeconds}s.` }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const pasted = String(form?.get("text") ?? "");
  try {
    const profile = await getProfile(user.id);
    if (pasted.trim()) {
      return Response.json(await extractDocument({ mediaType: "text/plain", text: pasted.slice(0, 400_000) }, profile));
    }
    if (!(file instanceof File)) return Response.json({ error: "Attach a statement or receipt." }, { status: 400 });
    if (file.size > 25 * 1024 * 1024) return Response.json({ error: "File too large (max 25MB)." }, { status: 400 });
    const type = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
    if (type === "application/pdf" || IMAGE.test(type)) {
      const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      return Response.json(await extractDocument({ mediaType: type, base64, fileName: file.name }, profile));
    }
    const text = await file.text();
    return Response.json(await extractDocument({ mediaType: "text/plain", text: text.slice(0, 400_000), fileName: file.name }, profile));
  } catch (err) {
    if (err instanceof FinanceAiError) return Response.json({ error: err.message }, { status: err.status });
    return Response.json({ error: "Couldn't read that document." }, { status: 500 });
  }
}
