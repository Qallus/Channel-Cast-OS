import { AudioLines, BadgeCheck, Headphones, Mic, Sparkles, Wallet } from "lucide-react";

import { SolutionPage } from "@/components/site/marketing";

export const metadata = { title: "For Voice Talent · Channel Cast", description: "Produce audio spots for advertisers and get your voice on the Channel Cast network." };

export default function VoiceTalentPage() {
  return (
    <SolutionPage
      hero={{ eyebrow: "For voice talent & producers", title: "Your voice, in the room.", subtitle: "Produce audio spots for advertisers across the network — record, overlay, and deliver right inside the platform.", primary: { label: "Join as talent", href: "/register" }, secondary: { label: "Talk to us", href: "/contact" } }}
      valueTitle="Do your best audio work"
      values={[
        { icon: Mic, title: "Record in-platform", body: "Capture and edit spots with the built-in recording & overlay studio." },
        { icon: AudioLines, title: "Overlay & mix", body: "Layer voice over beds and effects and render a finished spot." },
        { icon: Headphones, title: "Deliver instantly", body: "Send finished spots straight to advertisers and their spaces." },
        { icon: Wallet, title: "Get paid for work", body: "Take on production jobs from advertisers who need a voice." },
        { icon: BadgeCheck, title: "Build a profile", body: "Showcase your range and get matched to the right campaigns." },
        { icon: Sparkles, title: "Grow with the network", body: "More spaces means more spots that need a great voice." },
      ]}
      stepsTitle="Get started"
      steps={[
        { title: "Create your profile", body: "Set up your talent profile and sample your range." },
        { title: "Take on jobs", body: "Produce spots for advertisers who need audio." },
        { title: "Deliver & earn", body: "Ship finished spots and get paid for your work." },
      ]}
      faq={[
        ["Do I need my own studio?", "The built-in studio covers recording and overlays; bring your own mic for best results."],
        ["How do I get jobs?", "Advertisers and resellers request production; your profile helps match you."],
        ["What formats are supported?", "Common audio formats (MP3/WAV and more) work across the platform."],
        ["How am I paid?", "Per production job; terms are set with the advertiser or reseller."],
      ]}
      cta={{ title: "Put your voice to work.", primary: { label: "Join as talent", href: "/register" }, secondary: { label: "Contact us", href: "/contact" } }}
    />
  );
}
