export type MemberStatus = "active" | "invited" | "inactive";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: MemberStatus;
  phone: string;
  location: string;
  notes: string;
  createdAt: string;
};

export const MEMBER_STATUS: Record<MemberStatus, { label: string; tone: string }> = {
  active: { label: "Active", tone: "bg-success/15 text-success" },
  invited: { label: "Invited", tone: "bg-brand/15 text-brand" },
  inactive: { label: "Inactive", tone: "bg-muted text-muted-foreground" },
};
export const MEMBER_STATUS_ORDER: MemberStatus[] = ["active", "invited", "inactive"];

export const DEPARTMENTS = ["Leadership", "Sales", "Deal Desk", "Operations", "Engineering", "Marketing", "Support"];

export const seedTeam: TeamMember[] = [
  { id: "tm_alex", name: "Alex Rivera", email: "alex@channelcast.example", role: "Super Admin", department: "Leadership", status: "active", phone: "+1 512 555 0100", location: "Austin, TX", notes: "Runs the network. Owns key accounts.", createdAt: "2025-10-01T00:00:00.000Z" },
  { id: "tm_jordan", name: "Jordan Cole", email: "jordan@channelcast.example", role: "Account Director", department: "Sales", status: "active", phone: "+1 512 555 0101", location: "Austin, TX", notes: "Largest book of business.", createdAt: "2025-10-15T00:00:00.000Z" },
  { id: "tm_maya", name: "Maya Chen", email: "maya@channelcast.example", role: "Deal Desk Analyst", department: "Deal Desk", status: "active", phone: "+1 415 555 0102", location: "San Diego, CA", notes: "Owns quote SLAs and pricing.", createdAt: "2026-01-08T00:00:00.000Z" },
  { id: "tm_devon", name: "Devon Park", email: "devon@channelcast.example", role: "Field Ops Manager", department: "Operations", status: "active", phone: "+1 602 555 0103", location: "Phoenix, AZ", notes: "Coordinates device installs.", createdAt: "2026-02-20T00:00:00.000Z" },
  { id: "tm_sana", name: "Sana Malik", email: "sana@channelcast.example", role: "Platform Engineer", department: "Engineering", status: "active", phone: "+1 206 555 0104", location: "Remote", notes: "Owns the device API + agent.", createdAt: "2026-03-05T00:00:00.000Z" },
  { id: "tm_leo", name: "Leo Martins", email: "leo@channelcast.example", role: "Content Producer", department: "Marketing", status: "active", phone: "+1 305 555 0105", location: "Miami, FL", notes: "Voice + production in the Media Studio.", createdAt: "2026-04-12T00:00:00.000Z" },
  { id: "tm_priya", name: "Priya Shah", email: "priya.s@channelcast.example", role: "Support Lead", department: "Support", status: "invited", phone: "", location: "Remote", notes: "Invitation sent — starts next month.", createdAt: "2026-07-25T00:00:00.000Z" },
  { id: "tm_ray", name: "Ray Osei", email: "ray@channelcast.example", role: "Account Executive", department: "Sales", status: "invited", phone: "", location: "Denver, CO", notes: "Invite pending acceptance.", createdAt: "2026-07-28T00:00:00.000Z" },
  { id: "tm_nina", name: "Nina Vogel", email: "nina@channelcast.example", role: "Ops Coordinator", department: "Operations", status: "inactive", phone: "+1 312 555 0107", location: "Chicago, IL", notes: "On leave.", createdAt: "2026-01-30T00:00:00.000Z" },
];
