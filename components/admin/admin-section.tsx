import { CircleCheck, Plus } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminSection } from "@/lib/admin/sections";

export function AdminSection({ slug }: { slug: string }) {
  const section = getAdminSection(slug);
  if (!section) notFound();

  const Icon = section.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{section.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{section.description}</p>
          </div>
        </div>
        <Button className="shrink-0">
          <Plus className="h-4 w-4" />
          {section.action}
        </Button>
      </div>

      {/* In this module */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>In this module</CardTitle>
            <CardDescription>What {section.title} will cover</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2">
              {section.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 rounded-md border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground">
                  <CircleCheck className="h-4 w-4 shrink-0 text-brand" />
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Foundation phase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              This module is scaffolded and navigable. The full build — live data, tables, and
              workflows — is queued for an upcoming phase.
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
              Scaffolded
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
