import type { Metadata } from "next";

import { DisplayPlayer } from "@/components/displays/display-player";

export const dynamic = "force-dynamic";

// A screen, not a page: no chrome, never indexed, and scaled to the panel.
export const metadata: Metadata = {
  title: "Channel Cast Display",
  robots: { index: false, follow: false },
  viewport: { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false },
};

export default async function DisplayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <>
      {/* The app shell assumes a scrolling document; a display never scrolls. */}
      <style>{`html,body{margin:0;padding:0;overflow:hidden;background:#000;cursor:none}`}</style>
      <DisplayPlayer token={token} />
    </>
  );
}
