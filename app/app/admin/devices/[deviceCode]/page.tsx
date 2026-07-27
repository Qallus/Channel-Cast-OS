import { DeviceDetail } from "@/components/devices/device-detail";

export const metadata = { title: "Device · Channel Cast" };

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ deviceCode: string }>;
}) {
  const { deviceCode } = await params;
  return <DeviceDetail deviceCode={decodeURIComponent(deviceCode)} />;
}
