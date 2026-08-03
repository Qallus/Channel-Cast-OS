// Lightweight blog/resources content. Swap for a CMS later — the pages read from here.
export type Post = {
  slug: string;
  title: string;
  category: string;
  date: string; // ISO
  readMins: number;
  excerpt: string;
  body: string[]; // paragraphs
};

export const POSTS: Post[] = [
  {
    slug: "what-is-motion-based-audio-advertising",
    title: "What is motion-based audio advertising?",
    category: "Guides",
    date: "2026-07-10",
    readMins: 5,
    excerpt: "A plain-language intro to playing the right audio spot the moment someone is actually present — and why presence beats impressions.",
    body: [
      "Traditional out-of-home advertising pays for a space and hopes someone walks by. Motion-based audio advertising flips that: a small device senses when a person is actually present and plays a relevant audio spot in that moment.",
      "Because playback is tied to real presence, every play corresponds to a real opportunity to be heard — not a theoretical impression. That makes reporting honest and budgets efficient.",
      "Channel Cast devices sense presence with either a USB webcam (on-device vision) or a simple PIR motion sensor, then report every play back to the dashboard in real time.",
    ],
  },
  {
    slug: "vision-vs-pir-which-sensor",
    title: "Vision or PIR: which sensor should a space use?",
    category: "Hardware",
    date: "2026-07-03",
    readMins: 4,
    excerpt: "Audience-aware campaigns need counts; simple triggers just need movement. Here's how to choose.",
    body: [
      "PIR motion sensors are inexpensive and reliable — they fire on any movement, which is perfect for spaces that just need a spot to play when someone is near.",
      "Vision devices use on-device computer vision to count how many people are present, unlocking audience-aware campaigns. Privacy-first: only anonymous counts leave the device, never images.",
      "A good rule of thumb: use PIR to deploy widely and cheaply, and vision where audience size should influence which spot plays.",
    ],
  },
  {
    slug: "how-hosts-get-paid",
    title: "How location hosts get paid",
    category: "For businesses",
    date: "2026-06-24",
    readMins: 3,
    excerpt: "Host a device where your customers already are and earn from advertisers who want to reach them.",
    body: [
      "When you host a Channel Cast device, your space becomes bookable ad inventory. Advertisers book the space, deploy their spot, and the device plays it to your present audience.",
      "Earnings accrue per booking and are visible in your owner dashboard alongside plays and fill rate. No screens, no clutter — just audio when someone is nearby.",
    ],
  },
  {
    slug: "measuring-real-plays",
    title: "Measuring real plays, not guesses",
    category: "Analytics",
    date: "2026-06-12",
    readMins: 4,
    excerpt: "Every play is reported live — motion vs scheduled, by device and audience. Here's what the numbers mean.",
    body: [
      "The dashboard separates motion-triggered plays from scheduled plays so you can see how much of your delivery is presence-driven.",
      "Pair that with per-device and per-audience breakdowns and you get a clear, defensible picture of where and when your message actually reached people.",
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
