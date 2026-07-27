import {
  Activity,
  AudioLines,
  BarChart3,
  Building2,
  CircleUserRound,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileText,
  FolderKanban,
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
  type LucideIcon,
} from "lucide-react";

export type AdminSection = {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Primary action label shown in the header. */
  action: string;
  /** What this module will contain — shown as a planned-features list. */
  features: string[];
};

/**
 * Config for scaffolded admin sections. Each is a real, navigable page with a
 * consistent header + "in this module" outline until it gets a full build.
 * Slugs match the hrefs in lib/nav/navigation.ts.
 */
export const ADMIN_SECTIONS: Record<string, AdminSection> = {
  // Main
  analytics: {
    title: "Analytics",
    description: "Cross-network playback, delivery, and audience analytics.",
    icon: BarChart3,
    action: "Export report",
    features: ["Playback & impression trends", "Campaign delivery pacing", "Device utilization", "Audience & visitor estimates"],
  },
  communications: {
    title: "Communications",
    description: "Inbound and outbound messages, calls, and notifications.",
    icon: MessageSquare,
    action: "New message",
    features: ["Message threads", "Call logs", "Email & SMS templates", "Notification center"],
  },
  contacts: {
    title: "Contacts",
    description: "People across advertisers, businesses, partners, and leads.",
    icon: CircleUserRound,
    action: "Add contact",
    features: ["Unified contact directory", "Roles & organizations", "Activity history", "Import / export"],
  },
  leads: {
    title: "Leads",
    description: "Inbound demand and prospecting pipeline entry.",
    icon: UserPlus,
    action: "Add lead",
    features: ["Lead capture", "Source attribution", "Qualification", "Assignment & routing"],
  },
  pipeline: {
    title: "Pipeline",
    description: "Deal stages from lead to signed placement.",
    icon: Activity,
    action: "New deal",
    features: ["Kanban deal stages", "Deal value & forecast", "Owner & next step", "Win / loss tracking"],
  },
  projects: {
    title: "Projects",
    description: "Installs, campaigns, and onboarding projects.",
    icon: FolderKanban,
    action: "New project",
    features: ["Project board", "Milestones & tasks", "Assignments", "Timeline view"],
  },

  // Channel Cast
  audio: {
    title: "Audio Management",
    description: "Audio library, recording studio, and content approvals.",
    icon: AudioLines,
    action: "Upload audio",
    features: ["Audio library", "Recording studio", "Effects & voice talent", "Content approvals"],
  },
  campaigns: {
    title: "Campaigns",
    description: "Build, schedule, and deploy audio campaigns.",
    icon: Send,
    action: "New campaign",
    features: ["Campaign builder", "Scheduling & pacing", "Targeting by location & device", "Delivery stats"],
  },
  "deployment-channels": {
    title: "Deployment Channels",
    description: "Route content to devices, radio, and partner channels.",
    icon: Shuffle,
    action: "New channel",
    features: ["Channel definitions", "Device groups", "Radio & partner feeds", "Rollout queues"],
  },
  "radio-stations": {
    title: "Radio Stations",
    description: "Radio station partners and voice / production spots.",
    icon: RadioTower,
    action: "Add station",
    features: ["Station partners", "Spot inventory", "Production requests", "Payouts"],
  },
  "revenue-models": {
    title: "Revenue Models",
    description: "Pricing, revenue share, and commission structures.",
    icon: FileBarChart,
    action: "New model",
    features: ["Pricing (monthly / CPM / per-play)", "Revenue share", "Reseller & partner commissions", "Sponsorships"],
  },
  reports: {
    title: "Reports",
    description: "Delivery, revenue, and operational reporting.",
    icon: FileText,
    action: "Build report",
    features: ["Delivery & playback reports", "Revenue & payout reports", "Device health reports", "Scheduled exports"],
  },

  // Operations
  clients: {
    title: "Clients",
    description: "Organizations and accounts across the network.",
    icon: Building2,
    action: "Add client",
    features: ["Client directory", "Account health", "Locations & devices", "Billing status"],
  },
  advertisers: {
    title: "Advertisers",
    description: "Advertiser accounts, campaigns, and spend.",
    icon: Radio,
    action: "Add advertiser",
    features: ["Advertiser directory", "Campaign & spend summary", "Onboarding status", "Contacts"],
  },
  "quote-requests": {
    title: "Quote Requests",
    description: "Deal-desk quote pipeline and SLAs.",
    icon: ClipboardList,
    action: "New quote",
    features: ["Incoming requests", "SLA timers", "Quote builder", "Convert to booking"],
  },
  billing: {
    title: "Billing",
    description: "Invoices, subscriptions, and payments.",
    icon: CreditCard,
    action: "New invoice",
    features: ["Invoices", "Subscriptions", "Payments & methods", "Dunning & retries"],
  },
  documents: {
    title: "Documents",
    description: "Contracts, agreements, and shared files.",
    icon: FileText,
    action: "Upload document",
    features: ["Contracts & agreements", "E-sign status", "File library", "Templates"],
  },
  automation: {
    title: "Automation",
    description: "Rules, triggers, and workflow automations.",
    icon: Workflow,
    action: "New automation",
    features: ["Automation rules", "Triggers & actions", "Alert routing", "Run history"],
  },
  settings: {
    title: "Settings",
    description: "Platform configuration and preferences.",
    icon: Settings,
    action: "Save changes",
    features: ["General & branding", "Roles & permissions", "Integrations", "Notifications"],
  },

  // Account
  profile: {
    title: "Profile",
    description: "Your account and preferences.",
    icon: CircleUserRound,
    action: "Edit profile",
    features: ["Personal info", "Password & security", "Active sessions", "Preferences"],
  },
  team: {
    title: "Team",
    description: "Team members, roles, and invitations.",
    icon: Users,
    action: "Invite member",
    features: ["Team directory", "Roles & permissions", "Invitations", "Activity log"],
  },
};

export function getAdminSection(slug: string): AdminSection | undefined {
  return ADMIN_SECTIONS[slug];
}
