import { BarChart3, CalendarClock, DollarSign, Eye, MapPin, Mic } from "lucide-react";

import { SolutionPage } from "@/components/site/marketing";

export const metadata = { title: "For Advertisers · Channel Cast", description: "Find ad space, create audio spots, book campaigns, and track real plays across the Channel Cast network." };

export default function AdvertisersPage() {
  return (
    <SolutionPage
      heroVariant="advertisers"
      hero={{ eyebrow: "For advertisers", title: "Reach people where they already are.", subtitle: "Discover physical ad space, create or record audio spots, and launch motion-triggered campaigns that play to a real, present audience.", primary: { label: "View ad space", href: "/marketplace" }, secondary: { label: "Get started", href: "/register" } }}
      valueTitle="Everything you need to run an audio campaign"
      values={[
        { icon: MapPin, title: "Find the right space", body: "Search by geography, business type, audience, budget, and device type." },
        { icon: Mic, title: "Create or record spots", body: "Upload your audio or record and overlay it in the built-in studio." },
        { icon: CalendarClock, title: "Book in minutes", body: "Pick play windows and cooldowns; deploy to the spaces you choose." },
        { icon: BarChart3, title: "Track real plays", body: "See plays as they happen — motion vs scheduled, by space and time." },
        { icon: Eye, title: "Audience-aware", body: "On vision devices, match the spot to who's actually nearby." },
        { icon: DollarSign, title: "Transparent pricing", body: "Clear rates per space; pay for the reach you book." },
      ]}
      stepsTitle="From idea to on-air in three steps"
      steps={[
        { title: "Browse the marketplace", body: "Filter ad spaces by location, audience, and budget, and shortlist the best fits." },
        { title: "Add your audio", body: "Upload a finished spot or produce one in the studio, then set your schedule." },
        { title: "Launch & track", body: "Deploy your campaign and watch plays and reach update in real time." },
      ]}
      faq={[
        ["Do I need my own hardware?", "No. Advertisers book space on the network; hosting devices is a separate, optional role for businesses."],
        ["How is audio delivered?", "Your spot streams to the booked devices and plays on their motion/schedule triggers."],
        ["Can I target by audience?", "Vision-enabled spaces can match spots to audience size; more attributes are on the roadmap."],
        ["How am I billed?", "Campaigns are booked against ad space with transparent per-space pricing and tracked plays."],
      ]}
      cta={{ title: "Put your message in the right place.", subtitle: "Browse the marketplace or start a campaign today.", primary: { label: "View ad space", href: "/marketplace" }, secondary: { label: "Request a demo", href: "/request-demo" } }}
    />
  );
}
