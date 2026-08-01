"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";

import { BrandMark } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Auth isn't configured. Add the Supabase env vars and reload.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }
    router.push("/app/admin");
    router.refresh();
  }

  return (
    <div>
      <BrandMark />
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Set a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choose a new password for your account.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">New password</label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a new password"
              autoComplete="new-password"
              required
              minLength={6}
              className="h-11 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={busy || !password} className="h-11 w-full rounded-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Update password
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/login" className="hover:text-foreground hover:underline"><ArrowLeft className="mr-1 inline h-3.5 w-3.5" />Back to log in</Link>
      </p>
    </div>
  );
}
