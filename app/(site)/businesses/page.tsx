import { DollarSign, Gauge, PlugZap, ShieldCheck, Sparkles, Store } from "lucide-react";

import { SolutionPage } from "@/components/site/marketing";

export const metadata = { title: "For Businesses · Channel Cast", description: "Monetize your space. Host a Channel Cast device and earn from audio that plays to your visitors." };

export default function BusinessesPage() {
  return (
    <SolutionPage
      heroVariant="businesses"
      hero={{ eyebrow: "For businesses & ad-space owners", title: "Monetize your space with smart audio.", subtitle: "Host a Channel Cast device where your customers already are, and earn from advertisers who want to reach them — no screens, no clutter.", primary: { label: "See if you qualify", href: "/placement" }, secondary: { label: "Talk to us", href: "/contact" } }}
      valueTitle="A new revenue line from space you already have"
      values={[
        { icon: DollarSign, title: "Earn from your foot traffic", body: "Advertisers pay to reach your visitors; you share in the revenue." },
        { icon: PlugZap, title: "Simple to set up", body: "A mini-PC + USB webcam and a one-line install — online in about a minute." },
        { icon: Store, title: "You stay in control", body: "Approve categories, set play windows, and pause any time." },
        { icon: ShieldCheck, title: "Private by design", body: "On-device sensing — no images stored or uploaded, ever." },
        { icon: Gauge, title: "See your numbers", body: "Track plays and estimated audience from your dashboard." },
        { icon: Sparkles, title: "Grows with you", body: "Add locations and devices as you scale — all in one place." },
      ]}
      stepsTitle="Start earning in three steps"
      steps={[
        { title: "Add a device", body: "Register a device in the dashboard and run the one-line installer on your mini-PC." },
        { title: "Set your rules", body: "Choose acceptable ad categories, play windows, and volume for your space." },
        { title: "Get paid", body: "Advertisers book your space; you earn from every campaign that runs." },
      ]}
      faq={[
        ["What equipment do I need?", "A Windows mini-PC with a speaker, plus a USB webcam for motion. That's it."],
        ["Is it disruptive to my space?", "No — it's audio only, on your schedule, at a volume you set."],
        ["Do customers get recorded?", "No. Vision runs on the device and only counts presence; nothing is stored or sent."],
        ["Can I stop anytime?", "Yes. You can pause a device or turn it off from the dashboard instantly."],
      ]}
      cta={{ title: "Turn your space into a channel.", subtitle: "Set up your first device in minutes.", primary: { label: "Get started", href: "/register" }, secondary: { label: "How it works", href: "/how-it-works" } }}
    />
  );
}
