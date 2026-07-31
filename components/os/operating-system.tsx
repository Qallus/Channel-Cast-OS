"use client";

import { useState } from "react";
import { CircleCheck, Cpu, Settings2, Shield, SlidersHorizontal, Wifi } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EDGE_RUNTIME, OPERATING_SYSTEMS, getOperatingSystem, type OsConfig, type OsId } from "@/lib/os/operating-systems";
import { cn } from "@/lib/utils";

export function OperatingSystem() {
  const [active, setActive] = useState<OsId>("vision");
  const os = getOperatingSystem(active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Operating System</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          The edge runtimes that power Channel Cast devices. Each OS type triggers and delivers audio differently.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
        {OPERATING_SYSTEMS.map((o) => {
          const Icon = o.icon;
          const isActive = o.id === active;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setActive(o.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4", isActive && "text-brand-strong")} />
              {o.label}
            </button>
          );
        })}
      </div>

      <OsPanel os={os} />
    </div>
  );
}

function OsPanel({ os }: { os: OsConfig }) {
  const Icon = os.icon;
  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <Card className="border-brand/20 bg-gradient-to-r from-brand/10 via-card to-card">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand-strong">
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{os.label} OS</h2>
              <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{os.tagline}</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Fleet</p>
              <p className="text-lg font-semibold text-foreground">{os.fleetCount}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Firmware</p>
              <p className="text-lg font-semibold text-foreground">{os.firmware}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">{os.overview}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Trigger events */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <SlidersHorizontal className="h-5 w-5 text-brand-strong" />
            <div>
              <CardTitle>Trigger events</CardTitle>
              <CardDescription>Events this OS emits</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {os.triggers.map((t) => (
                <Badge key={t} variant="secondary" className="font-mono text-[11px]">{t}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Capabilities */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Cpu className="h-5 w-5 text-brand-strong" />
            <div>
              <CardTitle>Capabilities</CardTitle>
              <CardDescription>What this runtime can do</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {os.capabilities.map((c) => (
                <li key={c} className="flex items-center gap-2.5 text-sm text-foreground">
                  <CircleCheck className="h-4 w-4 shrink-0 text-brand-strong" /> {c}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Runtime configuration */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Settings2 className="h-5 w-5 text-brand-strong" />
            <div>
              <CardTitle>Runtime configuration</CardTitle>
              <CardDescription>Default parameters</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {os.config.map((row) => (
              <div key={row.key} className="flex items-center justify-between border-b border-border py-1.5 text-sm last:border-0">
                <span className="text-muted-foreground">{row.key}</span>
                <span className="font-medium text-foreground">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Hardware & sensors */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Wifi className="h-5 w-5 text-brand-strong" />
            <div>
              <CardTitle>Hardware &amp; sensors</CardTitle>
              <CardDescription>Reference components</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {os.hardware.map((h) => (
                <li key={h} className="flex items-center gap-2.5 text-sm text-foreground">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" /> {h}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Playback logic */}
        <Card>
          <CardHeader>
            <CardTitle>Playback logic</CardTitle>
            <CardDescription>How this OS decides what to play</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2.5">
              {os.logic.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-foreground">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* OS-specific note */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Shield className="h-5 w-5 text-brand-strong" />
            <div>
              <CardTitle>{os.note.title}</CardTitle>
              <CardDescription>{os.note.body}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {os.note.items && (
              <ul className="space-y-2">
                {os.note.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" /> {item}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Shared edge runtime */}
      <Card>
        <CardHeader>
          <CardTitle>Edge runtime</CardTitle>
          <CardDescription>Shared responsibilities across every Channel Cast OS</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {EDGE_RUNTIME.map((r) => (
              <li key={r} className="flex items-start gap-2.5 text-sm text-foreground">
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" /> {r}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
