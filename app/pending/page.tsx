"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Clock, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

// What the visitor sees depends on the decision recorded in User Management.
const COPY = {
  pending: { icon: Clock, title: "Your access is pending", body: "Channel Cast is currently invite-only. Your account has been created, and the team will enable your access soon. We'll email you when it's ready." },
  declined: { icon: XCircle, title: "Your request wasn't approved", body: "Thanks for your interest in Channel Cast. We aren't able to enable access for this account right now. If you think this is a mistake, contact the team." },
  blocked: { icon: Ban, title: "This account is disabled", body: "Access to Channel Cast has been disabled for this account. Contact the team if you have questions." },
} as const;

export default function PendingPage() {
  const router = useRouter();
  const [state, setState] = useState<keyof typeof COPY>("pending");

  useEffect(() => {
    getSupabaseBrowserClient()?.auth.getUser().then(({ data }) => {
      const a = data.user?.user_metadata?.access;
      if (a === "declined" || a === "blocked") setState(a);
    });
  }, []);

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  const { icon: Icon, title, body } = COPY[state];
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${state === "pending" ? "bg-brand/15 text-brand-strong" : "bg-destructive/15 text-destructive"}`}><Icon className="h-7 w-7" /></span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Button asChild variant="outline"><a href="mailto:hello@channelcast.io">Contact the team</a></Button>
          <Button variant="ghost" onClick={signOut}>Sign out</Button>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">Back to channelcast.io</Link>
        </div>
      </div>
    </div>
  );
}
