// Invoice rendering — shared by the print window (client) and outbound email
// (server), so a printed invoice and an emailed one can never drift apart.

import { DEFAULT_LOGO, Invoice, invoiceSubtotal, invoiceTotal, lineAmount } from "@/lib/ops/invoices";

export const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const fmtDate = (iso: string) =>
  iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

export const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Absolute origin for assets. Falls back to the browser's when not supplied. */
function resolveOrigin(origin?: string): string {
  if (origin) return origin.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return (process.env.NEXT_PUBLIC_APP_URL || "https://channelcast.io").split(",")[0].trim().replace(/\/$/, "");
}

const absolute = (url: string, origin: string) => (url.startsWith("/") ? origin + url : url);

// ── Print / preview markup ────────────────────────────────────────────────────
// Flexbox is fine here: this renders in a real browser window, not an inbox.
export function invoiceHtml(inv: Invoice, origin?: string): string {
  const base = resolveOrigin(origin);
  const sub = invoiceSubtotal(inv);
  const tax = sub * ((inv.taxRate || 0) / 100);
  const total = invoiceTotal(inv);
  const logo = absolute(inv.logoUrl || DEFAULT_LOGO, base);
  const rows = (inv.lineItems ?? []).map((li) =>
    `<tr style="border-bottom:1px solid #eef2e9"><td style="padding:8px 0">${esc(li.description || "—")}</td><td style="padding:8px 0;text-align:right">${li.qty}</td><td style="padding:8px 0;text-align:right">${li.included ? "Included" : usd.format(li.rate)}</td><td style="padding:8px 0;text-align:right;font-weight:600">${li.included ? "Included" : usd.format(lineAmount(li))}</td></tr>`).join("");
  return `<div class="cc-sheet" style="width:7.5in;max-width:100%;margin:0 auto;padding-top:28px;color:#14241a;font-size:14px;line-height:1.5">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px">
    <div style="display:flex;align-items:center;gap:12px">
      <img src="${esc(logo)}" alt="" style="height:48px;width:48px;object-fit:contain"/>
      <div><div style="font-size:18px;font-weight:700">${esc(inv.from?.name || "Channel Cast")}</div>
      <div style="font-size:12px;color:#5b6b5b">${[inv.from?.email, inv.from?.phone].filter(Boolean).map(esc).join(" · ")}</div>
      ${inv.from?.address ? `<div style="font-size:12px;color:#5b6b5b">${esc(inv.from.address)}</div>` : ""}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:24px;font-weight:800">INVOICE</div>
      <div style="font-size:13px;color:#5b6b5b">${esc(inv.number)}</div>
      <div style="font-size:12px;color:#5b6b5b;margin-top:4px">Issued ${fmtDate(inv.issueDate)}</div>
      <div style="font-size:12px;color:#5b6b5b">Due ${fmtDate(inv.dueDate)}</div>
    </div>
  </div>
  <div style="margin-top:24px">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#8a998a">Bill to</div>
    <div style="font-weight:600">${esc(inv.billTo?.name || inv.client)}</div>
    ${inv.billTo?.company ? `<div>${esc(inv.billTo.company)}</div>` : ""}
    ${inv.billTo?.email ? `<div style="font-size:12px;color:#5b6b5b">${esc(inv.billTo.email)}</div>` : ""}
    ${inv.billTo?.address ? `<div style="font-size:12px;color:#5b6b5b;white-space:pre-wrap">${esc(inv.billTo.address)}</div>` : ""}
  </div>
  <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px">
    <thead><tr style="border-bottom:1px solid #dde5d3;text-align:left;font-size:11px;text-transform:uppercase;color:#8a998a">
      <th style="padding:8px 0">Description</th><th style="padding:8px 0;text-align:right">Qty</th><th style="padding:8px 0;text-align:right">Rate</th><th style="padding:8px 0;text-align:right">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="cc-totals" style="margin-top:16px;margin-left:auto;max-width:280px;font-size:14px">
    <div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:#5b6b5b">Subtotal</span><span>${usd.format(sub)}</span></div>
    ${(inv.taxRate || 0) > 0 ? `<div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:#5b6b5b">Tax (${inv.taxRate}%)</span><span>${usd.format(tax)}</span></div>` : ""}
    ${(inv.discount || 0) > 0 ? `<div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:#5b6b5b">Discount</span><span>−${usd.format(inv.discount || 0)}</span></div>` : ""}
    <div style="display:flex;justify-content:space-between;padding:6px 0 0;border-top:1px solid #dde5d3;font-weight:700;font-size:16px"><span>Total</span><span>${usd.format(total)}</span></div>
  </div>
  ${(inv.notes || inv.terms) ? `<div style="margin-top:24px;border-top:1px solid #dde5d3;padding-top:12px;font-size:12px;color:#5b6b5b">${inv.notes ? `<div><b style="color:#14241a">Notes:</b> ${esc(inv.notes)}</div>` : ""}${inv.terms ? `<div style="margin-top:4px"><b style="color:#14241a">Terms:</b> ${esc(inv.terms)}</div>` : ""}</div>` : ""}
</div>`;
}

// ── Email markup ──────────────────────────────────────────────────────────────
// Deliberately NOT the print markup: Gmail and Outlook strip flexbox, so this is
// table-only with inline styles. SVG logos don't render in mail clients either,
// so the mark sits on a dark bar using the hosted PNG.
export function invoiceEmailHtml(inv: Invoice, opts: { origin?: string; message?: string } = {}): string {
  const base = resolveOrigin(opts.origin);
  const sub = invoiceSubtotal(inv);
  const tax = sub * ((inv.taxRate || 0) / 100);
  const total = invoiceTotal(inv);
  const from = inv.from?.name || "Channel Cast";

  const rows = (inv.lineItems ?? []).map((li) => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid #eef2e9;color:#14241a;font-size:14px;line-height:1.45;">${esc(li.description || "—")}</td>
      <td style="padding:9px 0 9px 12px;border-bottom:1px solid #eef2e9;text-align:right;color:${li.included ? "#3c6a1b" : "#14241a"};font-size:13px;font-weight:600;white-space:nowrap;">${li.included ? "Included" : usd.format(lineAmount(li))}</td>
    </tr>`).join("");

  const totalRow = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:${strong ? "8px 0 0" : "3px 0"};${strong ? "border-top:1px solid #dde5d3;" : ""}color:${strong ? "#14241a" : "#8a998a"};font-size:${strong ? "15px" : "13px"};font-weight:${strong ? "700" : "400"};">${esc(label)}</td>
      <td style="padding:${strong ? "8px 0 0" : "3px 0"};${strong ? "border-top:1px solid #dde5d3;" : ""}text-align:right;color:#14241a;font-size:${strong ? "16px" : "13px"};font-weight:${strong ? "700" : "600"};white-space:nowrap;">${esc(value)}</td>
    </tr>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:0;background:#f1f5ea;">
  <tr><td align="center" style="padding:26px 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #dde5d3;border-radius:14px;overflow:hidden;">

      <tr><td style="background:#14241a;padding:16px 24px;">
        <img src="${base}/logos/logo-email-white.png" alt="" width="28" height="28" style="display:inline-block;height:28px;width:28px;vertical-align:middle;border:0;" />
        <span style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:1px;vertical-align:middle;padding-left:10px;">${esc(from)}</span>
        <span style="float:right;color:#c6ff00;font-size:13px;font-weight:700;letter-spacing:1.5px;padding-top:6px;">INVOICE</span>
      </td></tr>

      <tr><td style="padding:24px 24px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:top;">
              <p style="margin:0 0 3px;color:#8a998a;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Bill to</p>
              <p style="margin:0;color:#14241a;font-size:15px;font-weight:700;">${esc(inv.billTo?.name || inv.client)}</p>
              ${inv.billTo?.company ? `<p style="margin:2px 0 0;color:#14241a;font-size:13px;">${esc(inv.billTo.company)}</p>` : ""}
            </td>
            <td style="vertical-align:top;text-align:right;white-space:nowrap;">
              <p style="margin:0;color:#14241a;font-size:17px;font-weight:800;">${esc(inv.number)}</p>
              <p style="margin:3px 0 0;color:#8a998a;font-size:12px;">Issued ${esc(fmtDate(inv.issueDate))}</p>
              <p style="margin:1px 0 0;color:#8a998a;font-size:12px;">Due ${esc(fmtDate(inv.dueDate))}</p>
            </td>
          </tr>
        </table>
      </td></tr>

      ${opts.message ? `<tr><td style="padding:8px 24px 0;">
        <div style="padding:12px 14px;background:#f7faf1;border:1px solid #dde5d3;border-radius:10px;color:#14241a;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(opts.message)}</div>
      </td></tr>` : ""}

      <tr><td style="padding:18px 24px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:0 0 6px;border-bottom:1px solid #dde5d3;color:#8a998a;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Description</td>
            <td style="padding:0 0 6px 12px;border-bottom:1px solid #dde5d3;text-align:right;color:#8a998a;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Amount</td>
          </tr>
          ${rows}
        </table>
      </td></tr>

      <tr><td style="padding:14px 24px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td></td><td width="220" style="width:220px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${totalRow("Subtotal", usd.format(sub))}
              ${(inv.taxRate || 0) > 0 ? totalRow(`Tax (${inv.taxRate}%)`, usd.format(tax)) : ""}
              ${(inv.discount || 0) > 0 ? totalRow("Discount", `−${usd.format(inv.discount || 0)}`) : ""}
              ${totalRow("Total", usd.format(total), true)}
            </table>
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:20px 24px 24px;">
        ${inv.terms ? `<p style="margin:0;color:#8a998a;font-size:12px;line-height:1.6;"><b style="color:#14241a;">Terms:</b> ${esc(inv.terms)}</p>` : ""}
        <p style="margin:14px 0 0;color:#8a998a;font-size:12px;line-height:1.6;">
          ${esc(from)}${inv.from?.address ? ` &middot; ${esc(inv.from.address)}` : ""}<br/>
          ${[inv.from?.email, inv.from?.phone].filter(Boolean).map(esc).join(" &middot; ")}
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>`;
}

/** Default subject line for an emailed invoice. */
export const invoiceEmailSubject = (inv: Invoice) =>
  `Invoice ${inv.number} from ${inv.from?.name || "Channel Cast"} — ${usd.format(invoiceTotal(inv))} due ${fmtDate(inv.dueDate)}`;

/** Default SMS body. Kept short so it stays within two segments. */
export function invoiceSmsText(inv: Invoice): string {
  const who = inv.from?.name || "Channel Cast";
  const paid = inv.status === "paid";
  return paid
    ? `${who}: Invoice ${inv.number} for ${usd.format(invoiceTotal(inv))} is marked paid. Thank you! A copy is in your email.`
    : `${who}: Invoice ${inv.number} for ${usd.format(invoiceTotal(inv))} is due ${fmtDate(inv.dueDate)}. Full invoice sent by email. Questions? Just reply.`;
}
