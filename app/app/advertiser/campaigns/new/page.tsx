import { CampaignBuilder } from "@/components/advertiser/views";
export const metadata = { title: "New campaign · Channel Cast" };
export default async function Page({ searchParams }: { searchParams: Promise<{ space?: string }> }) {
  const { space } = await searchParams;
  return <CampaignBuilder presetSlug={space} />;
}
