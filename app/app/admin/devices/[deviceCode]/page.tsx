import { DeviceLiveMonitor } from "@/components/devices/device-live-monitor";

export const metadata = { title: "Device · Channel Cast" };

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ deviceCode: string }>;
}) {
  const { deviceCode } = await params;
  // Real devices render the live monitor; demo device codes fall back to the mock
  // detail view (handled inside DeviceLiveMonitor when the API returns 404).
  return <DeviceLiveMonitor deviceCode={decodeURIComponent(deviceCode)} />;
}
