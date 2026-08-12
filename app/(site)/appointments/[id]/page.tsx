import { ManageAppointment } from "@/components/site/manage-appointment";

export const metadata = { title: "Manage appointment · Channel Cast" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <ManageAppointment id={id} />
    </div>
  );
}
