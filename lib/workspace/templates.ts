// Built-in Workspace templates. Content is Plate JSON; creating from a template copies it.
type Node = { type: string; children: { text: string }[]; checked?: boolean; [key: string]: unknown };
const h = (type: string, text: string): Node => ({ type, children: [{ text }] });
const p = (text = ""): Node => ({ type: "p", children: [{ text }] });
const todo = (text: string): Node => ({ type: "todo_item", checked: false, children: [{ text }] });

// Deterministic ids (no runtime randomness) — unique within a document is all that's required.
let _seq = 0;
const nid = (prefix: string) => `${prefix}-${(_seq += 1)}`;

// Channel Cast brand: lime-stepped + ink + amber accent.
const LIME = "#65a30d", LIME_DEEP = "#4d7c0f", LIME_DARK = "#3f6212", INK = "#3f3a34", AMBER = "#d97706";
const TRACKER_STATUSES = [
  { label: "Upcoming", color: LIME },
  { label: "In Progress", color: AMBER },
  { label: "Complete", color: INK },
];

const trackerRow = (name: string, opts: { owner?: string; status?: string; deadline?: string } = {}) =>
  ({ id: nid("row"), name, home: "workspace", recordId: null, href: null, ownerId: null, ownerName: opts.owner ?? "", status: opts.status ?? null, deadline: opts.deadline ? { date: opts.deadline } : null, attachment: null });
const projectTracker = (rows: ReturnType<typeof trackerRow>[]): Node =>
  ({ type: "project_tracker", statuses: TRACKER_STATUSES, rows, children: [{ text: "" }] });

const card = (text: string) => ({ id: nid("card"), text });
const column = (title: string, color: string, cards: string[] = []) => ({ id: nid("col"), title, color, cards: cards.map(card) });
const kanban = (columns: ReturnType<typeof column>[]): Node =>
  ({ type: "kanban_board", columns, children: [{ text: "" }] });

const calendar = (events: { date: string; title: string }[] = []): Node =>
  ({ type: "doc_calendar", events: events.map((e) => ({ id: nid("ev"), date: e.date, title: e.title, color: AMBER })), children: [{ text: "" }] });

export type WorkspaceTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  content: Node[];
};

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  { id: "blank", name: "Blank document", description: "Start from scratch.", category: "General", content: [p("")] },
  {
    id: "meeting-notes", name: "Client Meeting Notes", description: "Capture a conversation, decisions, and follow-ups.", category: "Meetings",
    content: [
      h("h1", "Client Meeting Notes"), p("Date: "), p("Attendees: "),
      h("h2", "Purpose"), p(""), h("h2", "Discussion"), p(""),
      h("h2", "Decisions"), p(""), h("h2", "Follow-up tasks"), todo(""), todo(""),
      h("h2", "Next meeting"), p(""),
    ],
  },
  {
    id: "advertiser-onboarding", name: "New Advertiser Onboarding", description: "Onboard a new advertiser with a checklist.", category: "Operations",
    content: [
      h("h1", "New Advertiser Onboarding"), p("Advertiser: "), p("Account owner: "),
      h("h2", "Onboarding checklist"),
      todo("Welcome email sent"), todo("Contract & billing set up"), todo("Creative / audio assets collected"),
      todo("Target locations & dayparts confirmed"), todo("First campaign scheduled"),
      h("h2", "Open questions"), p(""),
    ],
  },
  {
    id: "team-agenda", name: "Team Meeting Agenda", description: "Run a focused team meeting.", category: "Meetings",
    content: [
      h("h1", "Team Meeting Agenda"), p("Date: "), p("Attendees: "),
      h("h2", "Updates"), p(""), h("h2", "Discussion topics"), p(""),
      h("h2", "Decisions"), p(""), h("h2", "Assigned actions"), todo(""), h("h2", "Next meeting"), p(""),
    ],
  },
  {
    id: "campaign-planning", name: "Campaign Planning", description: "Plan an advertising campaign end to end.", category: "Advertising",
    content: [
      h("h1", "Campaign Planning"), h("h2", "Overview"), p("Advertiser: "), p("Flight dates: "), p("Budget: "),
      h("h2", "Targeting"), p("Locations, dayparts, and audience: "),
      h("h2", "Creative"), todo("Script written"), todo("Voiceover recorded"), todo("Audio approved"),
      h("h2", "Launch checklist"), todo("Devices assigned"), todo("Proof of play confirmed"),
      h("h2", "Reporting"), p(""),
    ],
  },
  {
    id: "sop", name: "Process / SOP", description: "Document a standard operating procedure.", category: "Operations",
    content: [
      h("h1", "Standard Operating Procedure"), p("Purpose: "), p("Owner: "),
      h("h2", "Steps"), todo(""), todo(""), h("h2", "Related files"), p(""), p("Review date: "),
    ],
  },
  {
    id: "campaign-tracker", name: "Campaign Tracker", description: "Track campaigns with owners, statuses, deadlines, and files.", category: "Advertising",
    content: [
      h("h1", "Campaign Tracker"), p("Advertiser: "), p("Account owner: "),
      h("h2", "Campaigns"),
      projectTracker([
        trackerRow("Spring launch spot", { status: "In Progress" }),
        trackerRow("Storefront daypart test", { status: "Upcoming" }),
        trackerRow("Quarterly review", { status: "Upcoming" }),
      ]),
      h("h2", "Notes"), p(""), h("h2", "Follow-ups"), todo(""),
    ],
  },
  {
    id: "content-pipeline", name: "Content & Audio Pipeline", description: "Move creative from idea to on-air, with a schedule.", category: "Marketing",
    content: [
      h("h1", "Content & Audio Pipeline"), p("Owner: "),
      h("h2", "Pipeline"),
      kanban([
        column("Ideas", LIME, ["Spot: new location launch", "Promo: seasonal offer"]),
        column("Scripting", LIME_DEEP),
        column("Recording", LIME_DARK),
        column("On air", INK),
      ]),
      h("h2", "Scheduled pieces"),
      projectTracker([ trackerRow("Blog post", { status: "Upcoming" }), trackerRow("Newsletter", { status: "Upcoming" }) ]),
      h("h2", "Publishing calendar"), calendar(),
    ],
  },
  {
    id: "launch-planner", name: "Launch Planner", description: "Plan a network or product launch — key dates, owners, and a checklist.", category: "Operations",
    content: [
      h("h1", "Launch Planner"), p("Launch: "), p("Date: "),
      h("h2", "Key dates"), calendar(),
      h("h2", "Workstreams"),
      projectTracker([
        trackerRow("Devices provisioned", { status: "In Progress" }),
        trackerRow("Marketing site live", { status: "Upcoming" }),
        trackerRow("Advertisers onboarded", { status: "Upcoming" }),
      ]),
      h("h2", "Go-live checklist"), todo("Devices online"), todo("Proof of play verified"), todo("Support ready"),
    ],
  },
];

export function getTemplateContent(id: string): Node[] | null {
  return WORKSPACE_TEMPLATES.find((t) => t.id === id)?.content ?? null;
}
