# Channel Cast — Supabase Auth email templates

Branded HTML for the Supabase auth emails. Paste each file's contents into
**Supabase Dashboard → Authentication → Emails → Templates**, into the matching
template's **Message body**. Keep the `{{ … }}` variables intact.

| File | Supabase template | Suggested subject | Variable used |
|------|-------------------|-------------------|---------------|
| `confirm-signup.html` | Confirm signup | `Confirm your email address · Channel Cast` | `{{ .ConfirmationURL }}` |
| `invite.html` | Invite user | `You're invited to Channel Cast` | `{{ .ConfirmationURL }}` |
| `magic-link.html` | Magic Link | `Your Channel Cast login link` | `{{ .ConfirmationURL }}` |
| `reset-password.html` | Reset Password | `Reset your Channel Cast password` | `{{ .ConfirmationURL }}` |
| `change-email.html` | Change Email Address | `Confirm your new email · Channel Cast` | `{{ .ConfirmationURL }}` |
| `reauthentication.html` | Reauthentication | `Your Channel Cast verification code` | `{{ .Token }}` |

## Notes
- The **sender name** ("Channel Cast" instead of "Supabase Auth") requires
  **Custom SMTP** — Project Settings → Authentication → SMTP Settings. The
  built-in Supabase mailer can't be renamed.
- Emails are table-based with inline styles for Gmail / Outlook / Apple Mail.
- Brand: header `#14241a`, lime mark `#c6ff00`, button `#3c6a1b`, ground `#f1f5ea`.
- Update the footer address/email if it changes.
