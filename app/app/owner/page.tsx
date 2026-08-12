import { OwnerOverview } from "@/components/owner/views";
import { MyAppointments } from "@/components/site/my-appointments";

export const metadata = { title: "Business · Channel Cast" };

export default function Page() {
  return (
    <div className="space-y-8">
      <OwnerOverview />
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">My appointments</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">Site walks, calls, and events you&apos;ve booked with Channel Cast.</p>
        <MyAppointments />
      </section>
    </div>
  );
}
