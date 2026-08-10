import { WorkLead } from "@/components/crm/work-lead";

export const metadata = { title: "Work Lead · Channel Cast" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkLead contactId={id} />;
}
