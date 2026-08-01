"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";

import { BrandMark } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", company: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Auth isn't configured. Add the Supabase env vars and reload.");
      return;
    }
    setBusy(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          full_name: `${form.firstName} ${form.lastName}`.trim(),
          company: form.company.trim() || null,
        },
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      setBusy(false);
      return;
    }
    // If email confirmation is required, Supabase returns a user with no session.
    if (data.session) {
      router.push("/app/admin");
      router.refresh();
    } else {
      setCheckEmail(true);
      setBusy(false);
    }
  }

  if (checkEmail) {
    return (
      <div>
        <BrandMark />
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand-strong">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">Confirm your email</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We sent a confirmation link to <span className="font-medium text-foreground">{form.email}</span>. Click it to activate your account.
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
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Start managing your Channel Cast network.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="firstName" className="text-sm font-medium text-foreground">First name</label>
            <Input id="firstName" value={form.firstName} onChange={set("firstName")} autoComplete="given-name" required className="h-11" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lastName" className="text-sm font-medium text-foreground">Last name</label>
            <Input id="lastName" value={form.lastName} onChange={set("lastName")} autoComplete="family-name" required className="h-11" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="company" className="text-sm font-medium text-foreground">Company <span className="text-muted-foreground">(optional)</span></label>
          <Input id="company" value={form.company} onChange={set("company")} autoComplete="organization" className="h-11" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
          <Input id="email" type="email" value={form.email} onChange={set("email")} placeholder="you@company.com" autoComplete="email" required className="h-11" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              placeholder="Create a password"
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

        <Button type="submit" disabled={busy} className="h-11 w-full rounded-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create account
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-strong hover:underline">Log in</Link>
      </p>
    </div>
  );
}
