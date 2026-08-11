import { BookingWizard } from "@/components/site/booking-wizard";

export const metadata = {
  title: "Book an appointment · Channel Cast",
  description: "Schedule a call, consultation, or demo with the Channel Cast team.",
};

export default function BookPage() {
  return <BookingWizard />;
}
