// Client-safe defaults for the card builder (no server imports).
import type { BusinessCard, BusinessCardSection, LeadFormSettings, SectionType } from "./types";

export const DEFAULT_LEAD_FORM: LeadFormSettings = {
  enabled: true,
  title: "Send me your info",
  description: "Share your details and I'll follow up.",
  button_label: "Send me your info",
  submit_label: "Send info",
  fields: [
    { key: "name", label: "Name", enabled: true, required: true },
    { key: "email", label: "Email", enabled: true, required: true },
    { key: "phone", label: "Phone", enabled: true, required: false },
    { key: "company", label: "Company", enabled: false, required: false },
    { key: "message", label: "Message", enabled: true, required: false },
  ],
};

export function uid(): string {
  try { return crypto.randomUUID(); } catch { return `tmp-${Math.random().toString(36).slice(2)}`; }
}

export function makeDefaultSections(): BusinessCardSection[] {
  const base: { type: SectionType; label: string; visible: boolean }[] = [
    { type: "opener", label: "Opener / splash", visible: false },
    { type: "profile_header", label: "Profile header", visible: true },
    { type: "quick_actions", label: "Quick actions", visible: true },
    { type: "slideshow", label: "Slideshow", visible: false },
    { type: "links", label: "Links & socials", visible: true },
    { type: "steps", label: "Steps / how it works", visible: false },
    { type: "lead_capture", label: "Lead capture", visible: true },
    { type: "video", label: "Intro video", visible: false },
    { type: "qr_code", label: "QR code", visible: true },
    { type: "nfc", label: "NFC tap to share", visible: false },
  ];
  return base.map((s, i) => ({
    id: uid(),
    section_type: s.type,
    label: s.label,
    content: {},
    display_order: i + 1,
    is_visible: s.visible,
    margin_top: 0,
    margin_bottom: 16,
    padding_top: 0,
    padding_bottom: 0,
  }));
}

export function makeNewCard(owner?: { name?: string; email?: string }): BusinessCard {
  const now = new Date().toISOString();
  return {
    id: "",
    owner_id: null,
    owner_email: owner?.email ?? null,
    owner_name: owner?.name ?? null,
    slug: "",
    card_name: owner?.name ? `${owner.name}'s Card` : "My Business Card",
    status: "draft",
    is_public: false,
    display_name: owner?.name ?? "",
    first_name: "",
    last_name: "",
    job_title: "",
    company_name: "Channel Cast",
    department: "",
    bio: "",
    profile_photo_url: null,
    logo_url: null,
    background_image_url: null,
    background_color: "#0b1408",
    accent_color: "#c6ff00",
    text_color: "#f6faf0",
    card_mode: "standard",
    theme_mode: "dark",
    layout_template: "classic",
    primary_phone: "",
    sms_phone: "",
    primary_email: owner?.email ?? "",
    website_url: "https://channelcast.io",
    maps_url: "",
    intro_video_url: "",
    qr_settings: { foreground: "#0b1408", background: "#ffffff", size: 512 },
    lead_form_settings: DEFAULT_LEAD_FORM,
    media_settings: {},
    automations: [],
    links: [],
    sections: makeDefaultSections(),
    nfc_status: "not_ordered",
    view_count: 0,
    click_count: 0,
    published_at: null,
    archived_at: null,
    created_at: now,
    updated_at: now,
  };
}

export const COLOR_PRESETS: { name: string; bg: string; accent: string; text: string }[] = [
  { name: "Channel Cast", bg: "#0b1408", accent: "#c6ff00", text: "#f6faf0" },
  { name: "Charcoal", bg: "#121212", accent: "#c6ff00", text: "#f7fff2" },
  { name: "Slate", bg: "#0f172a", accent: "#38bdf8", text: "#e2e8f0" },
  { name: "Ivory", bg: "#f5f7ef", accent: "#2f6b13", text: "#13201a" },
  { name: "Plum", bg: "#1e1024", accent: "#e879f9", text: "#faf5ff" },
];
