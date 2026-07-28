import type { Metadata } from "next";

// globals.css goes through Tailwind's PostCSS plugin — works in local dev, but
// comes up EMPTY in our Docker build (Tailwind doesn't run there), so it emits
// no stylesheet in production. tailwind.generated.css is the pre-compiled, plain
// CSS output (run `npm run build:css` to refresh it). Imported as a normal module,
// Next bundles it the same way it bundles Leaflet's CSS — a path that DOES work in
// the container — and always emits the <link>. That's what actually styles prod.
import "./globals.css";
import "./tailwind.generated.css";

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
