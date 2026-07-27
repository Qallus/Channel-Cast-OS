import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Role wiring comes with Supabase auth in a later phase; the shell is
  // role-aware via props so this is the only place to swap in the real role.
  return <DashboardShell roleLabel="Super Admin">{children}</DashboardShell>;
}
