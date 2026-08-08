"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Building2, Handshake, Headphones, Mail, MapPin, Megaphone, Phone, Radio, Sparkles, Store, X } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QualificationForm } from "@/components/site/qualification-form";
import { NicoleCallModal } from "@/components/site/nicole-voice";
import { cn } from "@/lib/utils";

type Option = { label: string; note: string; icon: typeof MapPin; href?: string; action?: "placement" };

const OPTIONS: Option[] = [
  { label: "Free placement sites", note: "See if your location qualifies", icon: MapPin, action: "placement" },
  { label: "Advertisers", note: "Reach a present audience", icon: Megaphone, href: "/advertisers" },
  { label: "Partners", note: "Build on the network", icon: Handshake, href: "/partners" },
  { label: "Marketplace", note: "Browse ad space", icon: Store, href: "/marketplace" },
  { label: "List your space", note: "Monetize your location", icon: Building2, href: "/businesses" },
  { label: "Radio stations", note: "Exclusive market access", icon: Radio, href: "/radio-stations" },
];

export function SupportFab() {
  const [open, setOpen] = useState(false); // support panel
  const [drawer, setDrawer] = useState(false); // get-started slide-out
  const [modal, setModal] = useState(false); // placement form modal
  const [nicole, setNicole] = useState(false); // voice agent call
  const pathname = usePathname();

  // Marketplace + listing pages have their own sticky bottom bars — keep them clear.
  if (pathname?.startsWith("/marketplace")) return null;

  return (
    <>
      {/* Support panel + FAB */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
        {open && (
          <div className="w-[320px] max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="p-5">
              <p className="text-base font-semibold text-foreground">Channel Cast Support</p>
              <p className="mt-0.5 text-sm text-muted-foreground">We are open Monday – Friday 8:00 am to 5:00 pm.</p>
            </div>
            <a href="tel:+14809999906" className="flex items-center gap-3 border-t border-border px-5 py-3.5 transition-colors hover:bg-accent">
              <Phone className="h-4 w-4 shrink-0 text-brand-strong" /><span className="text-sm text-foreground">(480) 999-9906</span>
            </a>
            <a href="mailto:hello@channelcast.io" className="flex items-center gap-3 border-t border-border px-5 py-3.5 transition-colors hover:bg-accent">
              <Mail className="h-4 w-4 shrink-0 text-brand-strong" /><span className="text-sm text-foreground">hello@channelcast.io</span>
            </a>
            <button onClick={() => { setOpen(false); setNicole(true); }} className="flex w-full items-center gap-3 border-t border-border px-5 py-3.5 text-left transition-colors hover:bg-accent">
              <Sparkles className="h-4 w-4 shrink-0 text-brand-strong" /><span className="text-sm text-foreground">Talk to Nicole AI</span>
            </button>
            <div className="border-t border-border p-4">
              <Button className="w-full" onClick={() => { setOpen(false); setDrawer(true); }}>Get started <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          {!open && (
            <button onClick={() => setOpen(true)} className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-lg transition-transform hover:scale-[1.03]">
              <span className="text-foreground">Need Help?</span> <span className="text-brand-strong">Contact us</span>
            </button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close support" : "Open support"}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-xl transition-transform hover:scale-105"
          >
            {open ? <X className="h-6 w-6" /> : <Headphones className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Get-started right slide-out */}
      {drawer && <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" onClick={() => setDrawer(false)} aria-hidden />}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col bg-card shadow-2xl transition-transform duration-300",
          drawer ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!drawer}
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-strong">Get started</p>
            <p className="text-lg font-semibold text-foreground">What brings you here?</p>
          </div>
          <button onClick={() => setDrawer(false)} aria-label="Close" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-col gap-2 overflow-y-auto p-4">
          {OPTIONS.map((o) => {
            const Icon = o.icon;
            const inner = (
              <span className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:border-brand-strong/40 hover:bg-accent">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-brand-strong"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{o.label}</span>
                  <span className="block text-xs text-muted-foreground">{o.note}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </span>
            );
            return o.action === "placement" ? (
              <button key={o.label} onClick={() => { setDrawer(false); setModal(true); }} className="text-left">{inner}</button>
            ) : (
              <Link key={o.label} href={o.href!} onClick={() => setDrawer(false)}>{inner}</Link>
            );
          })}
        </div>
      </aside>

      {/* Nicole voice agent */}
      <NicoleCallModal open={nicole} onClose={() => setNicole(false)} />

      {/* Placement form modal */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>See if you qualify for free placement</DialogTitle>
          </DialogHeader>
          <QualificationForm bare />
        </DialogContent>
      </Dialog>
    </>
  );
}
