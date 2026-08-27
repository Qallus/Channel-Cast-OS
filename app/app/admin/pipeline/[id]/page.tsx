import { OpportunityDetail } from "@/components/crm/opportunity-detail";

export const metadata = { title: "Opportunity · Channel Cast" };

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OpportunityDetail id={id} />;
}
