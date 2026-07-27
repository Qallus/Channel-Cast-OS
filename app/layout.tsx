import type { Metadata } from "next";

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
