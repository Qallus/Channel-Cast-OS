import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Dashboard · Channel Cast" };

export default function GeneralDashboardPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          General overview. Role-specific dashboards (advertiser, ad-space owner, reseller,
          partner) plug in here as they are built.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <LayoutDashboard className="h-5 w-5 text-brand-strong" />
          <div>
            <CardTitle>Super Admin command center</CardTitle>
            <CardDescription>The network-wide operations view is ready to preview.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/app/admin">
              Open Super Admin
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
