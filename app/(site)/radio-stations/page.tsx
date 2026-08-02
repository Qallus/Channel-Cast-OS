import { Building2, LineChart, Mic, Radio, Repeat, Waypoints } from "lucide-react";

import { SolutionPage } from "@/components/site/marketing";

export const metadata = { title: "For Radio Stations · Channel Cast", description: "Extend your inventory into physical spaces and put your audio talent to work on the Channel Cast network." };

export default function RadioStationsPage() {
  return (
    <SolutionPage
      hero={{ eyebrow: "For radio stations", title: "Extend your audio beyond the airwaves.", subtitle: "Bring your production talent and advertiser relationships to physical spaces — motion-triggered spots that play to a present audience.", primary: { label: "Partner with us", href: "/register" }, secondary: { label: "Talk to us", href: "/contact" } }}
      valueTitle="A new channel for your station"
      values={[
        { icon: Radio, title: "New inventory", body: "Sell placements in cafés, gyms, salons, and more — beyond broadcast slots." },
        { icon: Mic, title: "Reuse your talent", body: "Your voice talent and existing spots slot right into the studio and library." },
        { icon: Building2, title: "Local relationships", body: "Turn your advertiser base into physical-space campaigns." },
        { icon: Repeat, title: "Repurpose spots", body: "Adapt broadcast spots into short motion-triggered plays." },
        { icon: Waypoints, title: "One dashboard", body: "Manage spaces, schedules, and campaigns in a single place." },
        { icon: LineChart, title: "Provable reach", body: "Real play counts and audience estimates for every campaign." },
      ]}
      stepsTitle="How stations join"
      steps={[
        { title: "Connect", body: "Tell us about your station, talent, and advertisers." },
        { title: "Bring your audio", body: "Load existing spots or produce new ones in the studio." },
        { title: "Sell & schedule", body: "Book physical-space campaigns and track their plays." },
      ]}
      faq={[
        ["Can I use existing spots?", "Yes — upload them to the library or adapt them in the studio."],
        ["Do I need devices?", "Devices live in the spaces; you focus on production and selling."],
        ["How is this different from broadcast?", "Plays are triggered by presence in a specific place, and every play is tracked."],
        ["What about talent?", "Your voice talent can produce spots directly for advertisers on the network."],
      ]}
      cta={{ title: "Take your station into the room.", primary: { label: "Partner with us", href: "/register" }, secondary: { label: "Contact us", href: "/contact" } }}
    />
  );
}
