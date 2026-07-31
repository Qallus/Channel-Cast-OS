"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";

import { BrandMark } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);

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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
        }}
        className="mt-6 space-y-4"
      >
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
          <Input id="email" type="email" placeholder="you@company.com" autoComplete="email" required className="h-11" />
        </div>
        <Button type="submit" className="h-11 w-full rounded-full">Send reset link</Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/login" className="hover:text-foreground hover:underline">Back to log in</Link>
      </p>
    </div>
  );
}
