import { Handshake, Headphones, Layers, LineChart, Radio, Users } from "lucide-react";

import { SolutionPage } from "@/components/site/marketing";

export const metadata = { title: "For Partners · Channel Cast", description: "Produce spots, resell inventory, and bring your audio talent to a growing motion-based advertising network." };

export default function PartnersPage() {
  return (
    <SolutionPage
      hero={{ eyebrow: "For partners", title: "Build on the Channel Cast network.", subtitle: "Whether you produce audio, resell ad space, or bring devices to new locations — partner with Channel Cast and grow with the network.", primary: { label: "Become a partner", href: "/register" }, secondary: { label: "Talk to us", href: "/contact" } }}
      valueTitle="Ways to partner"
      values={[
        { icon: Handshake, title: "Resellers", body: "Sell campaigns and space to advertisers in your market and earn on every booking." },
        { icon: Headphones, title: "Audio producers", body: "Create and overlay spots for advertisers using the built-in studio tools." },
        { icon: Radio, title: "Radio stations", body: "Extend your inventory into physical spaces and repurpose your audio talent." },
        { icon: Layers, title: "Device operators", body: "Deploy and manage fleets of devices across many locations." },
        { icon: Users, title: "Agencies", body: "Run multi-space campaigns for your clients from one dashboard." },
        { icon: LineChart, title: "Shared analytics", body: "Track performance and revenue across everything you manage." },
      ]}
      stepsTitle="Get started as a partner"
      steps={[
        { title: "Tell us your focus", body: "Reselling, production, radio, or device operations — we'll set you up for it." },
        { title: "Onboard your accounts", body: "Bring your advertisers, spaces, or talent into the platform." },
        { title: "Grow & earn", body: "Scale across markets with shared tools, reporting, and revenue." },
      ]}
      faq={[
        ["Can I white-label?", "Reseller and agency options are available — reach out and we'll walk through it."],
        ["Do I need technical skills?", "No. Device setup is a one-line install, and the dashboard handles the rest."],
        ["How does revenue work?", "You earn on the campaigns and inventory you bring; terms depend on partner type."],
        ["Can radio talent be reused?", "Yes — existing spots and voice talent slot right into the studio and library."],
      ]}
      cta={{ title: "Let's grow the network together.", subtitle: "Join as a reseller, producer, radio, or device partner.", primary: { label: "Become a partner", href: "/register" }, secondary: { label: "Contact us", href: "/contact" } }}
    />
  );
}
