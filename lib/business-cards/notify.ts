// Executes a card's lead-submit automations: owner email/SMS notifications and an
// auto-reply email to the lead. Email uses Channel Cast's Resend helper; SMS uses
// Twilio when configured. Best-effort — never throws into the lead-capture path.
import { sendNotificationEmail, notificationHtml } from "@/lib/server/email";
import type { BusinessCard } from "./types";

type LeadInput = { name?: string; email?: string; phone?: string; company?: string; message?: string };

async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return;
  const creds = Buffer.from(`${sid}:${token}`).toString("base64");
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  }).catch(() => {});
}

export async function runLeadAutomations(card: BusinessCard, lead: LeadInput): Promise<void> {
  const rules = (card.automations ?? []).filter((a) => a.enabled && a.trigger === "lead_submit");
  if (!rules.length) return;

  const cardLabel = card.display_name || card.card_name || "your card";
  const ownerEmail = card.owner_email || card.primary_email || null;
  const ownerPhone = card.sms_phone || card.primary_phone || null;

  const rows: [string, string | undefined][] = [
    ["Name", lead.name || undefined],
    ["Email", lead.email || undefined],
    ["Phone", lead.phone || undefined],
    ["Company", lead.company || undefined],
    ["Message", lead.message || undefined],
  ];

  for (const rule of rules) {
    try {
      if (rule.action === "notify_owner_email" && ownerEmail) {
        await sendNotificationEmail({
          subject: `New lead from ${cardLabel}`,
          html: notificationHtml({
            heading: "New business-card lead",
            eyebrow: cardLabel,
            rows,
            message: "Someone submitted your digital business card's lead form.",
          }),
          replyTo: lead.email || undefined,
          to: [ownerEmail],
        });
      } else if (rule.action === "notify_owner_sms" && ownerPhone) {
        await sendSms(ownerPhone, `New lead on ${cardLabel}: ${lead.name || lead.email || lead.phone || "someone"} — ${(lead.message || "no message").slice(0, 100)}`);
      } else if (rule.action === "autoreply_email" && lead.email) {
        const body = rule.message?.trim() || `Thanks for reaching out! I received your details and will follow up shortly.\n\n— ${cardLabel}`;
        await sendNotificationEmail({
          subject: `Thanks for connecting with ${cardLabel}`,
          html: notificationHtml({ heading: `Thanks for connecting with ${cardLabel}`, rows: [], message: body }),
          replyTo: ownerEmail || undefined,
          to: [lead.email],
        });
      }
    } catch {
      // Never fail lead capture because an automation failed.
    }
  }
}
