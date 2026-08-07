import {
  Activity,
  AudioLines,
  BarChart3,
  Building2,
  CircleUserRound,
  ClipboardList,
  Cpu,
  CreditCard,
  FileBarChart,
  FileText,
  FolderKanban,
  Headphones,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Radio,
  RadioTower,
  Send,
  Settings,
  Shuffle,
  UserPlus,
  Users,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  /** Marks the logout / sign-out action so the shell can style it distinctly. */
  action?: "logout";
};

export type NavGroup = {
  label: string;
  items: readonly NavItem[];
};

/**
 * Super Admin sidebar. Mirrors the Channel Cast dashboard screenshot
 * (docs/screen-shots) and the admin route map (03-page-flows/00-route-map.md).
 */
export const adminNavGroups: readonly NavGroup[] = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/app/admin" },
      { label: "Analytics", icon: BarChart3, href: "/app/admin/analytics" },
      { label: "Communications", icon: MessageSquare, href: "/app/admin/communications" },
      { label: "Contacts", icon: CircleUserRound, href: "/app/admin/contacts" },
      { label: "Leads", icon: UserPlus, href: "/app/admin/leads" },
      { label: "Pipeline", icon: Activity, href: "/app/admin/pipeline" },
      { label: "Projects", icon: FolderKanban, href: "/app/admin/projects" },
    ],
  },
  {
    label: "Channel Cast",
    items: [
      { label: "Advertising", icon: Megaphone, href: "/app/admin/advertising" },
      { label: "Audio Management", icon: AudioLines, href: "/app/admin/audio" },
      { label: "Media", icon: ImageIcon, href: "/app/admin/media" },
      { label: "Devices", icon: Headphones, href: "/app/admin/devices" },
      { label: "Operating System", icon: Cpu, href: "/app/admin/operating-system" },
      { label: "Campaigns", icon: Send, href: "/app/admin/campaigns" },
      { label: "Deployment", icon: Shuffle, href: "/app/admin/deployment-channels" },
      { label: "Radio Stations", icon: RadioTower, href: "/app/admin/radio-stations" },
      { label: "Revenue Models", icon: FileBarChart, href: "/app/admin/revenue-models" },
      { label: "Reports", icon: FileText, href: "/app/admin/reports" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Clients", icon: Building2, href: "/app/admin/clients" },
      { label: "Advertisers", icon: Radio, href: "/app/admin/advertisers" },
      { label: "Quote Requests", icon: ClipboardList, href: "/app/admin/quote-requests" },
      { label: "Billing", icon: CreditCard, href: "/app/admin/billing" },
      { label: "Documents", icon: FileText, href: "/app/admin/documents" },
      { label: "Automation", icon: Workflow, href: "/app/admin/automation" },
      { label: "Settings", icon: Settings, href: "/app/admin/settings" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Profile", icon: CircleUserRound, href: "/app/admin/profile" },
      { label: "Team", icon: Users, href: "/app/admin/team" },
      { label: "Logout", icon: LogOut, href: "/login", action: "logout" },
    ],
  },
];

export function isNavItemActive(href: string, pathname: string) {
  if (href === "/app/admin") return pathname === "/app/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
