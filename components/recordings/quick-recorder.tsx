"use client";

import { useEffect, useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VoiceRecorder } from "@/components/recordings/voice-recorder";

// Globally-mounted recorder modal. Any surface (mobile nav, FAB, a page button)
// opens it by dispatching `window.dispatchEvent(new Event("cc-open-recorder"))`.
export function QuickRecorder() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener("cc-open-recorder", on);
    return () => window.removeEventListener("cc-open-recorder", on);
  }, []);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Quick voice recording</DialogTitle></DialogHeader>
        <div className="max-h-[80vh] overflow-y-auto">
          <VoiceRecorder onSaved={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function openRecorder() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("cc-open-recorder"));
}
