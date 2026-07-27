import {
  Armchair,
  Eye,
  Frame,
  Monitor,
  Radar,
  Volume2,
  type LucideIcon,
} from "lucide-react";

/** Inventory tabs. Vision / Motion / Standard Audio are the primary focus;
 *  Digital Displays / Street Furniture / Wall Space round out the network. */
export type InventoryTypeId =
  | "vision"
  | "motion"
  | "standard_audio"
  | "digital_display"
  | "street_furniture"
  | "wall_space";

/** Broad behaviour class that drives spec fields, banner copy, and calculations. */
export type InventoryCategory = "audio" | "display" | "physical";

export type SpecField = {
  key: string;
  label: string;
  type: "number" | "text" | "select";
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
  /** Span the full row in the specs grid. */
  full?: boolean;
};

export type InventoryType = {
  id: InventoryTypeId;
  label: string;
  icon: LucideIcon;
  category: InventoryCategory;
  /** Singular noun used in copy, e.g. "audio player". */
  noun: string;
  /** Label for the audience unit, e.g. "listeners", "viewers", "impressions". */
  audienceUnit: string;
  /** Management banner title + subtitle. */
  bannerTitle: string;
  bannerSubtitle: string;
  /** Step C — type-specific ad specifications. */
  specFields: SpecField[];
  /** Whether a physical IoT device is linked (drives the Add Device step). */
  hasDevice: boolean;
};

const audioSpecFields: SpecField[] = [
  { key: "coverageRadius", label: "Coverage Radius (ft)", type: "number", placeholder: "0" },
  { key: "speakersInstalled", label: "Speakers Installed", type: "number", placeholder: "0" },
  { key: "spotsPerHour", label: "Spots Per Hour", type: "number", placeholder: "0" },
  { key: "spotsPerDay", label: "Spots Per Day", type: "number", placeholder: "0" },
  { key: "playHoursPerDay", label: "Play Hours/Day", type: "number", placeholder: "0" },
  { key: "estAudiencePerDay", label: "Est. Listeners/Day", type: "number", placeholder: "0" },
  { key: "adLengthOptions", label: "Ad Length Options (seconds, comma separated)", type: "text", placeholder: "15, 30, 60", defaultValue: "15, 30, 60", full: true },
];

const displaySpecFields: SpecField[] = [
  { key: "screenSize", label: "Screen Size (in)", type: "number", placeholder: "0" },
  { key: "resolution", label: "Resolution", type: "text", placeholder: "e.g., 1920x1080" },
  { key: "orientation", label: "Orientation", type: "select", options: ["Landscape", "Portrait"], defaultValue: "Landscape" },
  { key: "spotsPerHour", label: "Slots Per Hour", type: "number", placeholder: "0" },
  { key: "loopDuration", label: "Loop Duration (sec)", type: "number", placeholder: "0" },
  { key: "playHoursPerDay", label: "Display Hours/Day", type: "number", placeholder: "0" },
  { key: "estAudiencePerDay", label: "Est. Impressions/Day", type: "number", placeholder: "0" },
  { key: "adLengthOptions", label: "Creative Length Options (seconds, comma separated)", type: "text", placeholder: "8, 10, 15", defaultValue: "8, 10, 15", full: true },
];

const physicalSpecFields: SpecField[] = [
  { key: "panelWidth", label: "Panel Width (in)", type: "number", placeholder: "0" },
  { key: "panelHeight", label: "Panel Height (in)", type: "number", placeholder: "0" },
  { key: "faces", label: "Faces", type: "number", placeholder: "1" },
  { key: "illuminated", label: "Illuminated", type: "select", options: ["No", "Yes"], defaultValue: "No" },
  { key: "material", label: "Material", type: "text", placeholder: "e.g., Vinyl, Acrylic" },
  { key: "estAudiencePerDay", label: "Est. Impressions/Day", type: "number", placeholder: "0" },
];

export const INVENTORY_TYPES: InventoryType[] = [
  {
    id: "vision",
    label: "Vision",
    icon: Eye,
    category: "audio",
    noun: "AI Vision player",
    audienceUnit: "listeners",
    bannerTitle: "AI Vision Player Management",
    bannerSubtitle: "Manage computer-vision audio devices, upload audio, and deploy content",
    specFields: audioSpecFields,
    hasDevice: true,
  },
  {
    id: "motion",
    label: "Motion",
    icon: Radar,
    category: "audio",
    noun: "PIR motion player",
    audienceUnit: "listeners",
    bannerTitle: "PIR Motion Player Management",
    bannerSubtitle: "Manage motion-triggered audio devices, upload audio, and deploy content",
    specFields: audioSpecFields,
    hasDevice: true,
  },
  {
    id: "standard_audio",
    label: "Standard Audio",
    icon: Volume2,
    category: "audio",
    noun: "audio player",
    audienceUnit: "listeners",
    bannerTitle: "Audio Player Management",
    bannerSubtitle: "Manage IoT devices, upload audio, and deploy content",
    specFields: audioSpecFields,
    hasDevice: true,
  },
  {
    id: "digital_display",
    label: "Digital Displays",
    icon: Monitor,
    category: "display",
    noun: "digital display",
    audienceUnit: "viewers",
    bannerTitle: "Digital Display Management",
    bannerSubtitle: "Manage screens, upload creative, and schedule playback loops",
    specFields: displaySpecFields,
    hasDevice: true,
  },
  {
    id: "street_furniture",
    label: "Street Furniture",
    icon: Armchair,
    category: "physical",
    noun: "street furniture placement",
    audienceUnit: "impressions",
    bannerTitle: "Street Furniture Management",
    bannerSubtitle: "Manage benches, kiosks, and transit placements",
    specFields: physicalSpecFields,
    hasDevice: false,
  },
  {
    id: "wall_space",
    label: "Wall Space",
    icon: Frame,
    category: "physical",
    noun: "wall space placement",
    audienceUnit: "impressions",
    bannerTitle: "Wall Space Management",
    bannerSubtitle: "Manage murals, wall wraps, and building placements",
    specFields: physicalSpecFields,
    hasDevice: false,
  },
];

export function getInventoryType(id: InventoryTypeId): InventoryType {
  return INVENTORY_TYPES.find((t) => t.id === id) ?? INVENTORY_TYPES[0];
}

/** Location record shown in the inventory list. */
export type InventoryLocation = {
  id: string;
  type: InventoryTypeId;
  name: string;
  locationCode: string;
  address: string;
  status: "available" | "active" | "booked" | "maintenance";
  monthlyRate: number;
  dailyTraffic: number;
  monthlyImpressions: number;
  linkedDevice: string | null;
};

export function generateLocationCode(seed: string) {
  // Deterministic short code (no Date.now/random — safe for SSR + workflows).
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[hash % alphabet.length];
    hash = Math.floor(hash / alphabet.length) + (i + 1) * 7;
  }
  return `LOC-${out}`;
}
