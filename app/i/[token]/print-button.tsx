"use client";

import { Printer } from "lucide-react";

// The sheet is already laid out for 8.5x11 by the page's print styles, so this
// just triggers the browser's own print/save-as-PDF dialog.
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-[#14241a] px-4 py-2 text-sm font-semibold text-[#c6ff00] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14241a] focus-visible:ring-offset-2"
    >
      <Printer className="h-4 w-4" aria-hidden /> Print / Save PDF
    </button>
  );
}
