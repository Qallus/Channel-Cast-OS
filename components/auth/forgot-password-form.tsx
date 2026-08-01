"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";

import { BrandMark } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Auth isn't configured. Add the Supabase env vars and reload.");
      return;
    }
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });
    setBusy(false);
    // Show the same confirmation regardless, so we don't reveal which emails exist.
    if (resetError && !/rate limit/i.test(resetError.message)) setError(resetError.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <div>
        <BrandMark />
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand-strong">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">Check your email</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          If an account exists for that address, we&apos;ve sent a link to reset your password.
        </p>
        <Button asChild variant="outline" className="mt-6 h-11 rounded-full">
          <Link href="/login"><ArrowLeft className="h-4 w-4" /> Back to log in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <BrandMark />
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Reset your password</h1>
      <p className="mt-1 text-sm text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" required className="h-11" />
        </div>
        <Button type="submit" disabled={busy} className="h-11 w-full rounded-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send reset link
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/login" className="hover:text-foreground hover:underline">Back to log in</Link>
      </p>
    </div>
  );
}
