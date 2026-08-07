// Push all branded auth email templates + subjects to Supabase via the
// Management API. Your access token stays in your shell env — never in code.
//
// Usage (PowerShell):
//   $env:SUPABASE_ACCESS_TOKEN="sbp_xxx"; node scripts/apply-email-templates.mjs
// Usage (bash):
//   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/apply-email-templates.mjs
//
// Create a token at: https://supabase.com/dashboard/account/tokens
// Project ref defaults to this project; override with SUPABASE_PROJECT_REF.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF || "tphpvtoisbssjulvzbhj";

if (!TOKEN) {
  console.error("Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const emailDir = join(here, "..", "docs", "email");
const read = (f) => readFileSync(join(emailDir, f), "utf8").replace(/^\s*<!--[\s\S]*?-->\s*/, "").trim();

// [file, subject-field, content-field, subject]
const TEMPLATES = [
  ["confirm-signup.html", "mailer_subjects_confirmation", "mailer_templates_confirmation_content", "Confirm your email address · Channel Cast"],
  ["invite.html", "mailer_subjects_invite", "mailer_templates_invite_content", "You're invited to Channel Cast"],
  ["magic-link.html", "mailer_subjects_magic_link", "mailer_templates_magic_link_content", "Your Channel Cast login link"],
  ["reset-password.html", "mailer_subjects_recovery", "mailer_templates_recovery_content", "Reset your Channel Cast password"],
  ["change-email.html", "mailer_subjects_email_change", "mailer_templates_email_change_content", "Confirm your new email · Channel Cast"],
  ["reauthentication.html", "mailer_subjects_reauthentication", "mailer_templates_reauthentication_content", "Your Channel Cast verification code"],
];

const body = {};
for (const [file, subjKey, contentKey, subject] of TEMPLATES) {
  body[subjKey] = subject;
  body[contentKey] = read(file);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

if (res.ok) {
  console.log(`✅ Applied ${TEMPLATES.length} email templates + subjects to project ${REF}.`);
} else {
  console.error(`❌ Failed (${res.status}):`, await res.text());
  process.exit(1);
}
