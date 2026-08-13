"use client";

import { usePathname } from "next/navigation";

import { AuthShowcase } from "@/components/auth/auth-showcase";
import { AuthDataFlow } from "@/components/auth/auth-dataflow";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {isLogin ? (
        <AuthDataFlow className="hidden lg:block" />
      ) : (
        <AuthShowcase className="hidden lg:block" />
      )}
      <div className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
