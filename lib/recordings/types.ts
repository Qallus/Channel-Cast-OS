// Voice recordings / meeting notes — the "Media Studio" recording foundation.
// Audio lives in the media bucket (public URL); metadata + transcript live in the
// JSONB CRM store under the "recordings" collection. A recording can be attached
// to a contact (any type), a plan, or a workspace document.

export type RecordingStatus = "draft" | "transcribed" | "archived";

export const RECORDING_STATUS: Record<RecordingStatus, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "text-warning" },
  transcribed: { label: "Transcribed", tone: "text-brand-strong" },
  archived: { label: "Archived", tone: "text-muted-foreground" },
};

export type RecordingLinkType = "none" | "contact" | "plan" | "workspace";

export const LINK_TYPES: { key: RecordingLinkType; label: string; collection?: string }[] = [
  { key: "none", label: "Not linked" },
  { key: "contact", label: "Contact / Lead", collection: "contacts" },
  { key: "plan", label: "Plan", collection: "plans" },
  { key: "workspace", label: "Workspace", collection: "ws_documents" },
];

export type Recording = {
  id: string;
  title: string;
  url: string;          // audio public URL
  mimeType: string;
  durationSec: number;
  transcript: string;
  status: RecordingStatus;
  linkType: RecordingLinkType;
  linkId: string | null;
  linkName: string | null;
  tags: string[];
  actor: string;
  createdAt: string;
};

export const seedRecordings: Recording[] = [];

export function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
