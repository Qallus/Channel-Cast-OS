"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock, FileSignature, Mail, MessageSquare, Mic, Phone, Receipt, Sparkles, StickyNote, Wallet,
} from "lucide-react";

import { FormField } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/**
 * What a person can add to the timeline by hand.
 *
 * Channel Cast logs the calls and texts it places itself. This covers the ones
 * it never saw — a call taken on a mobile, a contract signed across a desk, a
 * payment that landed in the bank — so the timeline is the whole history of the
 * deal rather than only the part that happened inside the app.
 */
export type LogKind =
  | "call" | "email" | "sms" | "note" | "voice" | "ai_voice" | "meeting"
  | "invoice" | "payment" | "contract";

type KindSpec = {
  label: string;
  icon: typeof Phone;
  subjectLabel: string;
  subjectPlaceholder: string;
  bodyLabel: string;
  bodyPlaceholder: string;
  direction?: boolean;
  duration?: boolean;
  amount?: boolean;
  /** A payment needs a reference and a number, not a paragraph. */
  brief?: boolean;
};

export const LOG_KINDS: Record<LogKind, KindSpec> = {
  call: {
    label: "Call", icon: Phone,
    subjectLabel: "Summary", subjectPlaceholder: "Discovery call",
    bodyLabel: "What was said", bodyPlaceholder: "Walked through pricing; sending the media plan Friday.",
    direction: true, duration: true,
  },
  email: {
    label: "Email", icon: Mail,
    subjectLabel: "Subject", subjectPlaceholder: "Media plan — Q4",
    bodyLabel: "Message", bodyPlaceholder: "Paste or summarise what was sent.",
    direction: true,
  },
  sms: {
    label: "Text", icon: MessageSquare,
    subjectLabel: "Summary", subjectPlaceholder: "Confirmed Thursday",
    bodyLabel: "Message", bodyPlaceholder: "What the text said.",
    direction: true,
  },
  note: {
    label: "Note", icon: StickyNote,
    subjectLabel: "Title", subjectPlaceholder: "Budget approved verbally",
    bodyLabel: "Note", bodyPlaceholder: "Anything worth remembering about this deal.",
  },
  voice: {
    label: "Voice note", icon: Mic,
    subjectLabel: "Title", subjectPlaceholder: "Debrief after the site visit",
    bodyLabel: "Transcript or summary", bodyPlaceholder: "What the recording covers.",
  },
  ai_voice: {
    label: "AI Agent", icon: Sparkles,
    subjectLabel: "Summary", subjectPlaceholder: "Qualification call",
    bodyLabel: "Transcript or outcome", bodyPlaceholder: "What the agent covered and what came back.",
    direction: true, duration: true,
  },
  meeting: {
    label: "Appointment", icon: CalendarClock,
    subjectLabel: "Title", subjectPlaceholder: "Site walk-through",
    bodyLabel: "Detail", bodyPlaceholder: "Who attended and what was agreed.",
  },
  invoice: {
    label: "Invoice", icon: Receipt,
    subjectLabel: "Invoice", subjectPlaceholder: "INV-1042",
    bodyLabel: "Detail", bodyPlaceholder: "What it covers.",
    amount: true, brief: true,
  },
  payment: {
    label: "Payment", icon: Wallet,
    subjectLabel: "Reference", subjectPlaceholder: "Deposit — ACH",
    bodyLabel: "Detail", bodyPlaceholder: "How it was paid.",
    amount: true, brief: true,
  },
  contract: {
    label: "Contract", icon: FileSignature,
    subjectLabel: "Document", subjectPlaceholder: "Insertion order — signed",
    bodyLabel: "Detail", bodyPlaceholder: "Terms, dates, who signed.",
    brief: true,
  },
};

export const LOG_KIND_ORDER: LogKind[] = [
  "call", "email", "sms", "note", "voice", "ai_voice", "meeting", "invoice", "payment", "contract",
];

export type LogPayload = {
  kind: LogKind;
  subject: string;
  body: string;
  occurredAt: string;
  direction?: string;
  durationSeconds?: number;
  amount?: number;
};

const today = () => new Date().toISOString().slice(0, 10);

export function LogActivityDialog({
  open, kind, onClose, onSave, saving,
}: {
  open: boolean;
  /** Pre-selected from the tab in view; null means let them pick. */
  kind: LogKind | null;
  onClose: () => void;
  onSave: (payload: LogPayload) => void;
  saving?: boolean;
}) {
  const [k, setK] = useState<LogKind>("note");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [when, setWhen] = useState(today());
  const [direction, setDirection] = useState("outbound");
  const [minutes, setMinutes] = useState("");
  const [amount, setAmount] = useState("");

  // Refill on open, so a cancelled entry leaves nothing behind.
  useEffect(() => {
    if (!open) return;
    setK(kind ?? "note");
    setSubject("");
    setBody("");
    setWhen(today());
    setDirection("outbound");
    setMinutes("");
    setAmount("");
  }, [open, kind]);

  const spec = LOG_KINDS[k];
  const Icon = spec.icon;
  const valid = useMemo(() => Boolean(subject.trim() || body.trim()) && Boolean(when), [subject, body, when]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[88vh] gap-5 overflow-y-auto sm:max-w-[34rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" /> Log {spec.label.toLowerCase()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Type">
              <Select value={k} onValueChange={(v) => setK(v as LogKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOG_KIND_ORDER.map((id) => <SelectItem key={id} value={id}>{LOG_KINDS[id].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="When">
              <Input type="date" value={when} onChange={(e) => setWhen(e.target.value)} />
            </FormField>
          </div>

          <FormField label={spec.subjectLabel}>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={spec.subjectPlaceholder} autoFocus />
          </FormField>

          {(spec.direction || spec.duration || spec.amount) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {spec.direction && (
                <FormField label="Direction">
                  <Select value={direction} onValueChange={setDirection}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
              {spec.duration && (
                <FormField label="Duration (minutes)">
                  <Input type="number" min="0" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="12" />
                </FormField>
              )}
              {spec.amount && (
                <FormField label="Amount">
                  <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1750" />
                </FormField>
              )}
            </div>
          )}

          <FormField label={spec.bodyLabel}>
            <Textarea rows={spec.brief ? 3 : 5} value={body} onChange={(e) => setBody(e.target.value)} placeholder={spec.bodyPlaceholder} />
          </FormField>

          <p className="text-xs text-muted-foreground">
            Logged entries sit in the same timeline as the calls and texts Channel Cast placed itself.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            disabled={!valid || saving}
            onClick={() => onSave({
              kind: k,
              subject: subject.trim(),
              body: body.trim(),
              occurredAt: when,
              direction: spec.direction ? direction : undefined,
              durationSeconds: spec.duration && minutes ? Math.round(Number(minutes) * 60) : undefined,
              amount: spec.amount && amount ? Number(amount) : undefined,
            })}
          >
            {saving ? "Saving…" : `Log ${spec.label.toLowerCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
