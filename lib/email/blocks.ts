// Email template blocks — the document the visual builder edits, plus the
// renderer that turns it into email-safe HTML.
//
// Ported from the MJG builder and re-based on Channel Cast: table-only output
// (Gmail and Outlook strip flexbox), inline styles only, and merge fields that
// resolve against contacts, leads and opportunities rather than MJG's
// participant/wave model.

export type BlockType = "header" | "columns" | "heading" | "text" | "button" | "image" | "divider" | "spacer" | "footer";
export type Align = "left" | "center" | "right";

export type EmailBlock = {
  id: string;
  type: BlockType;
  title?: string;
  text?: string;
  url?: string;
  alt?: string;
  linkUrl?: string;
  align?: Align;
  width?: number;
  height?: number;
  headingLevel?: "h1" | "h2" | "h3";
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  dividerColor?: string;
  columns?: { blocks: EmailBlock[] }[];
  padTop?: number;
  padBottom?: number;
  padX?: number;
};

export type EmailSettings = {
  width: number;
  backgroundColor: string;
  contentColor: string;
  textColor: string;
  fontFamily: string;
};

export type EmailSchema = { version: 1; settings: EmailSettings; blocks: EmailBlock[] };

export const DEFAULT_SETTINGS: EmailSettings = {
  width: 600,
  backgroundColor: "#f1f5ea",
  contentColor: "#ffffff",
  textColor: "#14241a",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

export const BLOCK_LABELS: Record<BlockType, { label: string; hint: string }> = {
  header: { label: "Header", hint: "Logo / brand bar" },
  columns: { label: "Columns", hint: "2 column layout" },
  heading: { label: "Heading", hint: "H1, H2 or H3 title" },
  text: { label: "Text", hint: "Body paragraph" },
  button: { label: "Button", hint: "CTA button with link" },
  image: { label: "Image", hint: "Image with optional link" },
  divider: { label: "Divider", hint: "Horizontal rule" },
  spacer: { label: "Spacer", hint: "Empty vertical gap" },
  footer: { label: "Footer", hint: "Address & unsubscribe" },
};

export const BLOCK_ORDER: BlockType[] = ["header", "columns", "heading", "text", "button", "image", "divider", "spacer", "footer"];

/**
 * Merge fields that resolve against Channel Cast records. MJG's set was built
 * for its six-week challenge (wave, participant_type, check_in_status) and would
 * render blank here, so the vocabulary is the CRM's instead.
 */
export const MERGE_FIELDS: { token: string; label: string; group: string }[] = [
  { token: "{{first_name}}", label: "First name", group: "Contact" },
  { token: "{{last_name}}", label: "Last name", group: "Contact" },
  { token: "{{full_name}}", label: "Full name", group: "Contact" },
  { token: "{{email}}", label: "Email", group: "Contact" },
  { token: "{{phone}}", label: "Phone", group: "Contact" },
  { token: "{{title}}", label: "Job title", group: "Contact" },
  { token: "{{company}}", label: "Company", group: "Account" },
  { token: "{{owner}}", label: "Owner", group: "Account" },
  { token: "{{opportunity_name}}", label: "Opportunity", group: "Opportunity" },
  { token: "{{stage}}", label: "Stage", group: "Opportunity" },
  { token: "{{amount}}", label: "Amount", group: "Opportunity" },
  { token: "{{close_date}}", label: "Close date", group: "Opportunity" },
  { token: "{{next_step}}", label: "Next step", group: "Opportunity" },
  { token: "{{lead_source}}", label: "Lead source", group: "Opportunity" },
  { token: "{{site_url}}", label: "Site URL", group: "Channel Cast" },
  { token: "{{unsubscribe_url}}", label: "Unsubscribe URL", group: "Channel Cast" },
];

export const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

let seq = 0;
export const blockId = () => `blk_${Date.now().toString(36)}_${(seq++).toString(36)}`;

export function createBlock(type: BlockType): EmailBlock {
  const base: EmailBlock = { id: blockId(), type, align: "left", padTop: 0, padBottom: 24, padX: 0 };
  switch (type) {
    case "header":
      return { ...base, url: "/logos/logo-email-white.png", alt: "Channel Cast", backgroundColor: "#14241a", height: 30, align: "left", padTop: 16, padBottom: 16, padX: 26 };
    case "heading":
      return { ...base, text: "Your heading", headingLevel: "h2", fontSize: 22, textColor: "#14241a" };
    case "text":
      return { ...base, text: "Write your message here. Keep it clear and concise.", fontSize: 16, textColor: "#334155" };
    case "button":
      return { ...base, text: "Click here", linkUrl: "https://channelcast.io", buttonColor: "#14241a", buttonTextColor: "#c6ff00", align: "left" };
    case "image":
      return { ...base, url: "", alt: "", width: 560 };
    case "divider":
      return { ...base, dividerColor: "#dde5d3", padBottom: 16 };
    case "spacer":
      return { ...base, height: 24, padBottom: 0 };
    case "columns":
      return { ...base, columns: [{ blocks: [createBlock("text")] }, { blocks: [createBlock("text")] }] };
    case "footer":
      return { ...base, text: "Channel Cast · Scottsdale, AZ", fontSize: 12, textColor: "#8a998a", align: "center" };
  }
}

export function createDefaultSchema(): EmailSchema {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    blocks: [createBlock("header"), createBlock("heading"), createBlock("text"), createBlock("button"), createBlock("footer")],
  };
}

const pad = (b: EmailBlock) => `padding:${b.padTop ?? 0}px ${b.padX ?? 0}px ${b.padBottom ?? 0}px`;

function renderBlock(b: EmailBlock, s: EmailSettings, origin: string): string {
  const align = b.align ?? "left";
  const absolute = (u?: string) => (u && u.startsWith("/") ? origin + u : u || "");

  switch (b.type) {
    case "header":
      return `<tr><td style="background:${esc(b.backgroundColor || "#14241a")};${pad(b)}">
        ${b.url ? `<img src="${esc(absolute(b.url))}" alt="${esc(b.alt)}" height="${b.height ?? 30}" style="height:${b.height ?? 30}px;border:0;display:inline-block;vertical-align:middle" />` : ""}
        ${b.title ? `<span style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:2px;vertical-align:middle;padding-left:10px">${esc(b.title)}</span>` : ""}
      </td></tr>`;

    case "heading": {
      const size = b.fontSize ?? (b.headingLevel === "h1" ? 26 : b.headingLevel === "h3" ? 18 : 22);
      return `<tr><td style="${pad(b)};text-align:${align}">
        <div style="margin:0;color:${esc(b.textColor || s.textColor)};font-size:${size}px;font-weight:800;line-height:1.3">${esc(b.text)}</div>
      </td></tr>`;
    }

    case "text":
      return `<tr><td style="${pad(b)};text-align:${align}">
        <div style="margin:0;color:${esc(b.textColor || s.textColor)};font-size:${b.fontSize ?? 16}px;line-height:1.6;white-space:pre-wrap">${esc(b.text)}</div>
      </td></tr>`;

    case "button":
      return `<tr><td style="${pad(b)};text-align:${align}">
        <table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table"><tr>
          <td style="border-radius:10px;background:${esc(b.buttonColor || "#14241a")}">
            <a href="${esc(b.linkUrl || "#")}" style="display:inline-block;padding:11px 20px;color:${esc(b.buttonTextColor || "#c6ff00")};font-size:14px;font-weight:700;text-decoration:none;border-radius:10px">${esc(b.text || "Click here")}</a>
          </td></tr></table>
      </td></tr>`;

    case "image":
      return b.url
        ? `<tr><td style="${pad(b)};text-align:${align}">
            ${b.linkUrl ? `<a href="${esc(b.linkUrl)}">` : ""}
            <img src="${esc(absolute(b.url))}" alt="${esc(b.alt)}" width="${b.width ?? 560}" style="max-width:100%;width:${b.width ?? 560}px;border:0;display:block${align === "center" ? ";margin:0 auto" : ""}" />
            ${b.linkUrl ? "</a>" : ""}
          </td></tr>`
        : "";

    case "divider":
      return `<tr><td style="${pad(b)}"><div style="border-top:1px solid ${esc(b.dividerColor || "#dde5d3")};font-size:0;line-height:0">&nbsp;</div></td></tr>`;

    case "spacer":
      return `<tr><td style="height:${b.height ?? 24}px;font-size:0;line-height:0">&nbsp;</td></tr>`;

    case "columns": {
      const cols = b.columns ?? [];
      const w = cols.length ? Math.floor(100 / cols.length) : 100;
      return `<tr><td style="${pad(b)}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          ${cols.map((c) => `<td width="${w}%" valign="top" style="width:${w}%;padding-right:12px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${c.blocks.map((cb) => renderBlock(cb, s, origin)).join("")}</table>
          </td>`).join("")}
        </tr></table>
      </td></tr>`;
    }

    case "footer":
      return `<tr><td style="${pad(b)};text-align:${align}">
        <div style="color:${esc(b.textColor || "#8a998a")};font-size:${b.fontSize ?? 12}px;line-height:1.6">${esc(b.text)}</div>
        <div style="margin-top:6px;color:#8a998a;font-size:11px"><a href="{{unsubscribe_url}}" style="color:#8a998a">Unsubscribe</a></div>
      </td></tr>`;
  }
}

/** Render the block document to email-safe HTML. Tables only, inline styles only. */
export function schemaToHtml(schema: EmailSchema, opts: { preheader?: string; origin?: string } = {}): string {
  const s = { ...DEFAULT_SETTINGS, ...schema.settings };
  const origin = (opts.origin || "https://channelcast.io").replace(/\/$/, "");
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</div>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:0;background:${esc(s.backgroundColor)}">
  ${preheader}
  <tr><td align="center" style="padding:26px 14px;font-family:${s.fontFamily}">
    <table role="presentation" width="${s.width}" cellpadding="0" cellspacing="0" style="max-width:${s.width}px;width:100%;background:${esc(s.contentColor)};border:1px solid #dde5d3;border-radius:14px;overflow:hidden">
      ${schema.blocks.map((b) => renderBlock(b, s, origin)).join("")}
    </table>
  </td></tr>
</table>`;
}

/** Plain-text fallback, so a template always has a text part. */
export function schemaToText(schema: EmailSchema): string {
  const walk = (blocks: EmailBlock[]): string[] =>
    blocks.flatMap((b) =>
      b.type === "columns" ? (b.columns ?? []).flatMap((c) => walk(c.blocks))
      : b.type === "button" ? [`${b.text ?? ""} ${b.linkUrl ?? ""}`.trim()]
      : b.text ? [b.text]
      : [],
    );
  return walk(schema.blocks).join("\n\n").trim();
}

/** Substitute merge fields. Unknown tokens are left visible rather than blanked. */
export function applyMergeFields(input: string, values: Record<string, string | null | undefined>): string {
  return input.replace(/\{\{(\w+)\}\}/g, (whole, key: string) => {
    const v = values[key];
    return v === undefined || v === null || v === "" ? whole : String(v);
  });
}
