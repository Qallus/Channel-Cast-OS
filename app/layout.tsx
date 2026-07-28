import type { Metadata } from "next";

// globals.css powers local dev (Tailwind JIT). Production also links the
// pre-compiled /tailwind.css (public/) — the container's Tailwind step is
// unreliable, so we ship the finished stylesheet. Regenerate with `npm run build:css`.
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/tailwind.css" />
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
