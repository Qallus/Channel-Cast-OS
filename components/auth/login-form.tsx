"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Eye, EyeOff, KeyRound, LifeBuoy } from "lucide-react";

import { AppIcon } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Auth is wired in a later phase; route into the console for now.
    router.push("/app/admin");
  }

  return (
    <div>
      <BrandMark />

      <h1 className="text-xl font-semibold tracking-tight text-foreground">Log in to Channel Cast</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
          <Input id="email" type="email" placeholder="you@company.com" autoComplete="email" required className="h-11" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              autoComplete="current-password"
              required
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

        <label className="flex items-center gap-3 text-sm text-muted-foreground">
          <button
            type="button"
            role="switch"
            aria-checked={keepLoggedIn}
            onClick={() => setKeepLoggedIn((v) => !v)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full outline-none ring-2 ring-brand ring-offset-2 ring-offset-background transition-colors",
              keepLoggedIn ? "bg-brand" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full shadow transition-transform",
                keepLoggedIn ? "translate-x-4 bg-brand-foreground" : "translate-x-0.5 bg-white",
              )}
            />
          </button>
          Keep me logged in for up to 30 days
        </label>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button type="submit" className="h-11 rounded-full">Log in</Button>
          <Button type="button" variant="outline" className="h-11 rounded-full" asChild>
            <Link href="/contact"><LifeBuoy className="h-4 w-4" /> Help</Link>
          </Button>
        </div>
      </form>

      <Divider />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button variant="outline" className="h-11 rounded-full">
          <KeyRound className="h-4 w-4" /> Log in with passkeys
        </Button>
        <Button variant="secondary" className="h-11 rounded-full">
          <Download className="h-4 w-4" /> Download the app
        </Button>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        New to Channel Cast?{" "}
        <Link href="/register" className="font-medium text-brand-strong hover:underline">Create an account</Link>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        <Link href="/forgot-password" className="hover:text-foreground hover:underline">Forgot your password?</Link>
      </p>
    </div>
  );
}

export function BrandMark() {
  return (
    <div className="mb-8 flex items-center gap-2.5 lg:hidden">
      <AppIcon className="h-9 w-9 rounded-lg" />
      <span className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">Channel Cast</span>
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return (
    <div className={cn("my-6 flex items-center gap-3", className)}>
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground">or</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
