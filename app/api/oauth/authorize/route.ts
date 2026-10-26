import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/server/roles";
import { checkAuthorize, readAuthorize, verifyConsentToken } from "@/lib/mcp/consent";
import { issueCode, originOf, resourceUrl } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

const page = (msg: string, status = 400) =>
  new Response(`<!doctype html><meta charset="utf-8"><title>Channel Cast</title><body style="font-family:system-ui;padding:40px;max-width:480px;margin:auto"><h1 style="font-size:20px">Can't connect</h1><p>${msg}</p></body>`, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

// POST /api/oauth/authorize — receives the consent form's Allow / Deny.
export async function POST(req: Request) {
  const origin = originOf(req);
  // Same-origin form posts only.
  const from = req.headers.get("origin");
  if (from && from !== origin) return page("This request didn't come from the Channel Cast consent screen.", 403);

  const form = await req.formData();
  const r = readAuthorize((k) => form.get(k) as string | null);
  const check = await checkAuthorize(r);
  if (!check.ok) return page(check.error);

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || !isSuperAdmin(user)) return page("Sign in as a Super Admin to connect Claude.", 403);
  if (!verifyConsentToken(String(form.get("consent") || ""), user.id, r)) return page("This consent screen expired. Start the connection again from Claude.", 403);

  const back = new URL(r.redirect_uri);
  if (r.state) back.searchParams.set("state", r.state);
  back.searchParams.set("iss", origin);

  if (form.get("decision") !== "approve") {
    back.searchParams.set("error", "access_denied");
    return Response.redirect(back.toString(), 303);
  }

  const code = await issueCode({
    clientId: r.client_id, redirectUri: r.redirect_uri, codeChallenge: r.code_challenge,
    userId: user.id, email: user.email || "", scope: r.scope || "channelcast",
    resource: resourceUrl(origin), // the only resource this server issues tokens for
  });
  back.searchParams.set("code", code);
  return Response.redirect(back.toString(), 303);
}
