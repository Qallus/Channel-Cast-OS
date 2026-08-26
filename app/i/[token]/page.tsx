import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { invoiceHtml, usd, fmtDate } from "@/lib/ops/invoice-html";
import { INVOICE_STATUS, invoiceTotal } from "@/lib/ops/invoices";
import { findInvoiceByToken, publicOrigin } from "@/lib/server/invoice-share";
import { PrintButton } from "./print-button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A shared invoice is private to whoever holds the link, so every branch below
// sets noindex. (Next allows `metadata` or `generateMetadata`, never both.)
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const inv = await findInvoiceByToken(token);
  if (!inv) return { title: "Invoice not found", robots: { index: false, follow: false } };
  return {
    title: `Invoice ${inv.number} — ${inv.from?.name || "Channel Cast"}`,
    description: `${usd.format(invoiceTotal(inv))} due ${fmtDate(inv.dueDate)}`,
    robots: { index: false, follow: false },
  };
}

export default async function SharedInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await findInvoiceByToken(token);
  if (!inv) notFound();

  const status = INVOICE_STATUS[inv.status];
  const paid = inv.status === "paid";

  return (
    <main className="min-h-screen bg-[#f1f5ea] px-4 py-8 print:bg-white print:p-0">
      {/* Force US Letter and keep rows/totals from splitting, exactly as the
          dashboard's print window does. */}
      <style>{`
        @page { size: 8.5in 11in; margin: 0.5in }
        @media print {
          .no-print { display: none !important }
          .sheet { box-shadow: none !important; border: 0 !important; border-radius: 0 !important; padding: 0 !important; margin: 0 !important }
          .cc-sheet { width: auto !important; padding-top: 0 !important }
          thead { display: table-header-group }
          tr, .cc-totals { break-inside: avoid; page-break-inside: avoid }
        }
      `}</style>

      <div className="mx-auto max-w-[8.5in]">
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[#14241a]">
              Invoice {inv.number} · {usd.format(invoiceTotal(inv))}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                paid ? "bg-[#dff0e0] text-[#2f7d4f]" : inv.status === "overdue" ? "bg-[#fae8e4] text-[#b3402f]" : "bg-[#e6ecdb] text-[#3c6a1b]"
              }`}
            >
              {status.label}
            </span>
          </div>
          <PrintButton />
        </div>

        <div className="sheet rounded-2xl border border-[#dde5d3] bg-white p-6 shadow-sm sm:p-10">
          <div dangerouslySetInnerHTML={{ __html: invoiceHtml(inv, publicOrigin()) }} />
        </div>

        <p className="no-print mt-4 text-center text-xs text-[#5b6b5b]">
          Questions about this invoice? Reply to {inv.from?.email || "us"} or call {inv.from?.phone || "the number above"}.
        </p>
      </div>
    </main>
  );
}
