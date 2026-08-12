"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function PendingPage() {
  const router = useRouter();
  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/15 text-brand-strong"><Clock className="h-7 w-7" /></span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">Your access is pending</h1>
        <p className="mt-2 text-sm text-muted-foreground">Channel Cast is currently invite-only. Your account has been created, and the team will enable your access soon. We&apos;ll email you when it&apos;s ready.</p>
        <div className="mt-6 flex flex-col gap-2">
          <Button asChild variant="outline"><a href="mailto:hello@channelcast.io">Contact the team</a></Button>
          <Button variant="ghost" onClick={signOut}>Sign out</Button>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">Back to channelcast.io</Link>
        </div>
      </div>
    </div>
  );
}
