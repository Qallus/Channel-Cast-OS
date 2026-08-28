"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, CalendarClock, ListVideo, Monitor, MonitorPlay, Radar, TerminalSquare, Webcam } from "lucide-react";

import { DeviceSetupFlow } from "@/components/devices/device-setup-wizard";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  { title: "Create the device (right)", body: "Name it and choose what it is — a motion-activated or scheduled audio player, or a digital display. That generates a claim code." },
  { title: "Install it on the device", body: "Download the installer the wizard gives you, double-click it on the device, and click Yes. It installs everything and registers the device." },
  { title: "Watch it connect", body: "The wizard confirms once the device checks in — usually within ~30 seconds." },
  { title: "Give it something to play", body: "For an audio player, upload a spot and hit Test play. For a screen, assign it a loop under Digital Displays → Screens." },
];

const LINKS = [
  { href: "/app/admin/devices", label: "Device Fleet", desc: "See every device, status, and open its live view.", icon: MonitorPlay },
  { href: "/app/admin/deployment-channels", label: "Deployment & schedules", desc: "Build playlists and set play windows.", icon: CalendarClock },
  { href: "/app/admin/displays", label: "Digital Displays", desc: "Creative, loops, and which screen plays what.", icon: Monitor },
  { href: "/app/admin/reports", label: "Reports & analytics", desc: "Playtime, motion vs scheduled, revenue.", icon: BarChart3 },
];

export function AddDeviceView() {
  const router = useRouter();

  return (
    <div className="space-y-5">
      <div>
        <Link href="/app/admin/devices" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Device Fleet
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Add a device</h1>
        <p className="mt-1 text-sm text-muted-foreground">Get a new player online in about a minute. Follow the steps, then run one command on the device.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_minmax(360px,440px)]">
        {/* Guide */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-foreground">How setup works</h2>
              <ol className="mt-3 space-y-3">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-brand-strong">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.title}</p>
                      <p className="text-sm text-muted-foreground">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-foreground">Before you start</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2"><Webcam className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" /> For motion mode, plug a <b className="font-medium text-foreground">USB webcam</b> into the device.</li>
                <li className="flex gap-2"><TerminalSquare className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" /> You&apos;ll need <b className="font-medium text-foreground">Administrator</b> access on the device to run the install command.</li>
                <li className="flex gap-2"><Radar className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" /> For an unattended player or screen, enable <b className="font-medium text-foreground">Windows auto-login</b> so it starts on boot.</li>
                <li className="flex gap-2"><Monitor className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" /> A digital display needs <b className="font-medium text-foreground">Edge or Chrome</b> on the PC — or run the Raspberry&nbsp;Pi command the wizard offers.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-foreground">Where things live</h2>
              <div className="mt-3 grid gap-2">
                {LINKS.map((l) => {
                  const Icon = l.icon;
                  return (
                    <Link key={l.href} href={l.href} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/40">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-brand-strong"><Icon className="h-4 w-4" /></span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{l.label}</p>
                        <p className="truncate text-xs text-muted-foreground">{l.desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Flow */}
        <div>
          <Card className="lg:sticky lg:top-20">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand-strong"><ListVideo className="h-4 w-4" /></span>
                <h2 className="text-sm font-semibold text-foreground">Set up</h2>
              </div>
              <DeviceSetupFlow onDone={() => router.push("/app/admin/devices")} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
