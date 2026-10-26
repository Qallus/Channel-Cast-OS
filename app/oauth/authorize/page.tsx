import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/server/roles";
import { AUTHZ_FIELDS, checkAuthorize, consentToken, readAuthorize } from "@/lib/mcp/consent";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connect to Channel Cast" };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">{children}</div>
    </div>
  );
}

function Problem({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </Shell>
  );
}

// OAuth consent for the Channel Cast MCP connector. Sign-in is the normal
// dashboard login; only Super Admins can grant a connector access.
export default async function AuthorizePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (k: string) => { const v = sp[k]; return Array.isArray(v) ? v[0] : v; };
  const req = readAuthorize(one);

  const check = await checkAuthorize(req);
  if (!check.ok) return <Problem title="Can't connect" body={check.error} />;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const qs = new URLSearchParams(Object.entries(req).filter(([, v]) => v) as [string, string][]).toString();
    redirect(`/login?next=${encodeURIComponent(`/oauth/authorize?${qs}`)}`);
  }
  if (!isSuperAdmin(data.user)) {
    return <Problem title="Super Admins only" body={`${data.user.email} can't connect Claude to Channel Cast. Sign in with a Super Admin account.`} />;
  }

  const redirectHost = new URL(req.redirect_uri).host;
  const token = consentToken(data.user.id, req);

  return (
    <Shell>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand-strong"><ShieldCheck className="h-6 w-6" /></span>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">Allow {check.client.clientName} to control Channel Cast?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        It will act as <span className="font-medium text-foreground">{data.user.email}</span>: read and change CRM records, users and devices; send SMS and email; place AI voice calls; and talk to Hermes and Paperclip. Every action is logged.
      </p>
      <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Returns to <span className="font-mono text-foreground">{redirectHost}</span>. Only continue if you started this from Claude.</p>
      <form method="post" action="/api/oauth/authorize" className="mt-6 flex gap-2">
        {AUTHZ_FIELDS.map((k) => <input key={k} type="hidden" name={k} value={req[k]} />)}
        <input type="hidden" name="consent" value={token} />
        <Button type="submit" name="decision" value="deny" variant="outline" className="flex-1">Deny</Button>
        <Button type="submit" name="decision" value="approve" className="flex-1">Allow</Button>
      </form>
    </Shell>
  );
}
