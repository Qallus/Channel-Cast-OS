// Pass-through: each role provides its own shell (admin / advertiser / owner).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
