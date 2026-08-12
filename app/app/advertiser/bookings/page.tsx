import { BookingsList } from "@/components/advertiser/views";
import { MyAppointments } from "@/components/site/my-appointments";

export const metadata = { title: "Bookings · Channel Cast" };

export default function Page() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Appointments</h1>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">Calls, consultations, and events you&apos;ve booked with Channel Cast.</p>
        <MyAppointments />
      </section>
      <section>
        <BookingsList />
      </section>
    </div>
  );
}
