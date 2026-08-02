import { notFound } from "next/navigation";

import { BookingForm } from "@/components/site/booking-form";
import { getListing } from "@/lib/marketing/marketplace";

export const metadata = { title: "Book ad space · Channel Cast" };

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = getListing(slug);
  if (!listing) notFound();
  return <BookingForm listing={listing} />;
}
