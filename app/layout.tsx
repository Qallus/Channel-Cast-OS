import type { Metadata } from "next";

// Tailwind entry. This MUST be built with Turbopack (`next build --turbopack`).
// The legacy webpack build path drops React 19's document preamble
// (<!DOCTYPE html><html><head>) and every head-hoisted resource — including this
// stylesheet — on Linux, which is why production rendered completely unstyled.
// Turbopack compiles the same source correctly. See package.json "build".
import "./globals.css";

export const metadata: Metadata = {
  title: "Channel Cast",
  description:
    "Channel Cast — motion-based audio advertising network, ad-space marketplace, and connected device platform.",
  icons: {
    icon: [{ url: "/logos/app-icon.svg", type: "image/svg+xml" }],
    apple: "/logos/app-icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('cc-theme');if(t==='light')document.documentElement.classList.remove('dark');else document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}`,
          }}
        />
      </head>
      <body className="overflow-x-hidden">{children}</body>
    </html>
  );
}
