"use client";

import { usePathname } from "next/navigation";

import { AuthShowcase } from "@/components/auth/auth-showcase";

const VISION_COPY = {
  heading: "Vision-triggered audio, tuned to who's actually there.",
  subtext: "On-device computer vision reads your audience and plays the right message at the right moment.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const copy = pathname === "/login" ? VISION_COPY : undefined;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <AuthShowcase className="hidden lg:block" heading={copy?.heading} subtext={copy?.subtext} />
      <div className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
