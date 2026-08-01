import { GroupDetailView } from "@/components/devices/group-detail-view";

export const metadata = { title: "Device Group · Channel Cast" };

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupDetailView groupId={id} />;
}
